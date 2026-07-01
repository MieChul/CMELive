import './config/env.js'
import { getImageSignedUrl, getObjectSignedUrl } from './services/imageStorageService.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from './config/env.js'
import { runMigrations, get as dbGet } from './config/db.js'
import authRoutes from './routes/auth.js'
import surveyRoutes from './routes/surveys.js'
import aiRoutes from './routes/ai.js'
import newsRoutes from './routes/news.js'
import adminRoutes from './routes/admin.js'
import { testimonialsPublicRoutes, testimonialsAdminRoutes } from './routes/testimonials.js'
import { cornerOfficePublicRoutes, cornerOfficeAdminRoutes } from './routes/cornerOffice.js'
import { keyMomentsPublicRoutes, keyMomentsAdminRoutes } from './routes/keyMoments.js'
import { uniqueBusinessStoriesPublicRoutes, uniqueBusinessStoriesAdminRoutes } from './routes/uniqueBusinessStories.js'
import { runNewsAgent } from './services/newsAgentService.js'
import cron from 'node-cron'
const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()

if (config.isProduction) {
  app.set('trust proxy', 1)
}

// Custom key generator for rate limiting — Azure proxies may pass IP:port; strip the port.
const rateLimitKeyGenerator = (req) => {
  const raw = req.ip || req.socket?.remoteAddress || 'unknown'
  // Handle IPv6-mapped IPv4 and strip port if present (e.g. "::ffff:1.2.3.4:12345" or "1.2.3.4:12345")
  const match = raw.match(/(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/)
  if (match) return match[1]
  // IPv6 with port in brackets: [::1]:12345
  const v6match = raw.match(/^\[([^\]]+)\]:\d+$/)
  if (v6match) return v6match[1]
  // Plain IPv6 or fallback
  return raw.replace(/:\d+$/, '')
}

const rateLimitOpts = { validate: { ipv6SubnetOrKeyGenerator: false, keyGeneratorIpFallback: false } }

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // uploads served cross-origin in dev
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
)

// Permissions-Policy: restrict browser features not used by this app
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=(), ambient-light-sensor=(), autoplay=(), fullscreen=(self), picture-in-picture=()',
  )
  next()
})

const productionOrigins = [config.frontendUrl].filter(Boolean)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true)
      if (!config.isProduction) {
        // Allow any localhost/127.0.0.1 port in dev (Vite picks an available port)
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true)
        }
      }
      if (productionOrigins.includes(origin)) return callback(null, true)
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  }),
)
app.use(config.isProduction ? morgan('combined') : morgan('dev'))
app.use(cookieParser())
app.use(express.json({ limit: '512kb' }))
app.use('/uploads', express.static(join(__dirname, 'uploads')))
app.use('/news-images', express.static(config.agent.imagesDir))
app.use('/image-library', express.static(config.agent.imageLibraryDir))
app.use('/assets/key-moments', express.static(config.keyMoments.assetsDir))

const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))

const authRateLimit = rateLimit({
  ...rateLimitOpts,
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKeyGenerator,
  message: { error: 'Too many sign-in attempts. Please try again later.' },
})
const authStrictRateLimit = rateLimit({
  ...rateLimitOpts,
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKeyGenerator,
  message: { error: 'Too many sign-in attempts. Please try again later.' },
})
app.use('/api/auth', authRateLimit)
app.use('/api/auth', (req, res, next) => {
  if (req.path === '/local' && req.method === 'POST') {
    return authStrictRateLimit(req, res, next)
  }
  next()
})
app.use(
  '/api/ai',
  rateLimit({
    ...rateLimitOpts,
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: rateLimitKeyGenerator,
    message: { error: 'Too many requests. Please try again later.' },
  }),
)

const surveyWriteRateLimit = rateLimit({
  ...rateLimitOpts,
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKeyGenerator,
  message: { error: 'Too many requests. Please try again later.' },
})
const surveyRespondRateLimit = rateLimit({
  ...rateLimitOpts,
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKeyGenerator,
  message: { error: 'Too many requests. Please try again later.' },
})
app.use('/api/surveys', (req, res, next) => {
  if (req.method === 'POST' && /^\/\d+\/respond$/.test(req.path)) {
    return surveyRespondRateLimit(req, res, next)
  }
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return surveyWriteRateLimit(req, res, next)
  }
  next()
})

const engagementRateLimit = rateLimit({
  ...rateLimitOpts,
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKeyGenerator,
  message: { error: 'Too many requests. Please try again later.' },
})
app.use((req, res, next) => {
  if (req.method === 'POST' && /^\/api\/(news|key-moments)\/\d+\/(view|share|like)$/.test(req.path)) {
    return engagementRateLimit(req, res, next)
  }
  next()
})

app.get('/api/health', (req, res) => res.json({ ok: true }))

const SAFE_FILENAME_RE = /^[a-zA-Z0-9_-]{1,200}\.(png|jpg|jpeg|webp|gif)$/
const SAFE_FOLDER_RE = /^[a-zA-Z0-9_-]+$/
const SAFE_MEDIA_FILENAME_RE = /^[a-zA-Z0-9_.-]{1,200}$/

// Proxy for all GCS-backed media (images + videos uploaded via admin)
// 4-hour TTL for videos so streaming doesn't expire mid-watch
app.get('/api/media/:folder/:filename', async (req, res) => {
  try {
    const { folder, filename } = req.params
    if (!SAFE_FOLDER_RE.test(folder) || !SAFE_MEDIA_FILENAME_RE.test(filename)) {
      return res.status(400).json({ error: 'Invalid path' })
    }
    const objectPath = `${folder}/${filename}`
    const isVideo = /\.(mp4|webm|mov)$/i.test(filename)
    const ttl = isVideo ? 4 * 60 * 60 * 1000 : 15 * 60 * 1000
    const signedUrl = await getObjectSignedUrl(objectPath, ttl)
    if (!signedUrl) return res.status(404).json({ error: 'Not found' })
    res.redirect(302, signedUrl)
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

app.get('/api/images/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    if (!SAFE_FILENAME_RE.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' })
    }
    const signedUrl = await getImageSignedUrl(filename)
    if (!signedUrl) return res.status(404).json({ error: 'Image not found' })
    res.redirect(302, signedUrl)
  } catch {
    res.status(404).json({ error: 'Image not found' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/surveys', surveyRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/news', newsRoutes)
app.use('/api/testimonials', testimonialsPublicRoutes)
app.use('/api/corner-office', cornerOfficePublicRoutes)
app.use('/api/key-moments', keyMomentsPublicRoutes)
app.use('/api/unique-business-stories', uniqueBusinessStoriesPublicRoutes)
app.use(
  '/api/admin',
  rateLimit({
    ...rateLimitOpts,
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: rateLimitKeyGenerator,
    message: { error: 'Too many requests. Please try again later.' },
  }),
)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/testimonials', testimonialsAdminRoutes)
app.use('/api/admin/corner-office', cornerOfficeAdminRoutes)
app.use('/api/admin/key-moments', keyMomentsAdminRoutes)
app.use('/api/admin/unique-business-stories', uniqueBusinessStoriesAdminRoutes)

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next()
  }
  res.sendFile(join(distPath, 'index.html'))
})

app.use((err, req, res, _next) => {
  console.error(err)
  if (res.headersSent) return
  const isCors = err && (err.message === 'Not allowed by CORS' || String(err?.message).includes('CORS'))
  if (isCors) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (config.isProduction) {
    return res.status(500).json({ error: 'An unexpected error occurred' })
  }
  res.status(500).json({ error: err.message || 'Server error' })
})

;(async () => {
  try {
    await runMigrations()
  } catch (err) {
    console.error('[DB] Migration failed:', err)
    process.exit(1)
  }

  // Schedule daily news agent
  if (config.agent.cronExpression) {
    if (cron.validate(config.agent.cronExpression)) {
      cron.schedule(config.agent.cronExpression, async () => {
        console.log('[cron] News agent starting...')
        try {
          // Respect admin config auto-fetch toggle (AI feed)
          const cfgRow = await dbGet("SELECT value FROM admin_config WHERE key = 'agent_config'")
          let runAi = true
          if (cfgRow) {
            const dbCfg = JSON.parse(cfgRow.value)
            if (dbCfg.autoFetch === false) runAi = false
          }
          if (runAi) {
            const result = await runNewsAgent({ feedType: 'ai' })
            console.log('[cron] News agent complete:', result)
          } else {
            console.log('[cron] Auto-fetch disabled for AI feed — skipping run')
          }

          // Respect admin config auto-fetch toggle (Trends feed)
          const trendsRow = await dbGet("SELECT value FROM admin_config WHERE key = 'trends_config'")
          let runTrends = true
          if (trendsRow) {
            const trendsCfg = JSON.parse(trendsRow.value)
            if (trendsCfg.autoFetch === false) runTrends = false
          }
          if (runTrends) {
            const trendsResult = await runNewsAgent({ feedType: 'trends' })
            console.log('[cron] Trends agent complete:', trendsResult)
          } else {
            console.log('[cron] Auto-fetch disabled for Trends feed — skipping run')
          }
        } catch (err) {
          console.error('[cron] News agent failed:', err?.message || err)
        }
      })
      console.log(`[cron] News agent scheduled: ${config.agent.cronExpression}`)
    } else {
      console.warn(`[cron] Invalid NEWS_AGENT_CRON expression: "${config.agent.cronExpression}" — agent will not run automatically`)
    }
  }

  const httpServer = app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`)
    if (config.enableSso) {
      const { redirectUri, clientId, tenantId } = config.azureAd
      console.log('[SSO] Microsoft login enabled.')
      console.log(
        `[SSO] Add this exact Web redirect URI in Azure AD → App registration → Authentication: ${redirectUri}`,
      )
      if (!tenantId || !clientId) console.warn('[SSO] Missing AZURE_AD_TENANT_ID or AZURE_AD_CLIENT_ID')
    }
  })

  httpServer.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(
        `Port ${config.port} is already in use. Stop the other process (e.g. netstat -ano | findstr :${config.port} then taskkill /PID <pid> /F) or set PORT in .env to another value.`,
      )
    } else {
      console.error(err)
    }
    process.exit(1)
  })
})()
