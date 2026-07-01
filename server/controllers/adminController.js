import { runNewsAgent } from '../services/newsAgentService.js'
import { get as dbGet, run as dbRun } from '../config/db.js'
import { config } from '../config/env.js'
import {
  SOURCE_CATALOG, SOURCE_TIERS, DEFAULT_ENABLED_SOURCES,
  TRENDS_SOURCE_CATALOG, TRENDS_SOURCE_TIERS, DEFAULT_TRENDS_ENABLED_SOURCES,
} from '../data/sourceCatalog.js'
import cron from 'node-cron'

const PRIVATE_HOST_RE = /^(localhost$|127\.|0\.0\.0\.0$|::1$|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|fc[\da-f]{2}:|fd[\da-f]{2}:)/i

const isSafeUrl = (rawUrl) => {
  const url = String(rawUrl || '').trim()
  if (!/^https?:\/\/.{4,}/.test(url)) return false
  try {
    const { hostname } = new URL(url)
    if (PRIVATE_HOST_RE.test(hostname)) return false
    return true
  } catch {
    return false
  }
}

const DEFAULT_AGENT_CONFIG = {
  autoFetch: true,
  cronExpression: '0 8 * * *',
  maxPerBatch: 5,
  minAiScore: 50,
  enableImages: false,
  imagesPerArticle: 3,
  enabledSources: DEFAULT_ENABLED_SOURCES,
  customSources: [],   // [{ key, label, rssUrl, tier }]
  categories: ['AI Research', 'Industry News', 'Products & Tools', 'Policy & Ethics', 'Science', 'Business'],
  keywords: ['artificial intelligence', 'machine learning', 'LLM', 'GPT', 'neural network', 'deep learning', 'media', 'streaming', 'adtech'],
}

const DEFAULT_TRENDS_CONFIG = {
  autoFetch: true,
  cronExpression: '0 8 * * *',
  maxPerBatch: 5,
  minAiScore: 50,
  enableImages: false,
  imagesPerArticle: 3,
  enabledSources: DEFAULT_TRENDS_ENABLED_SOURCES,
  customSources: [],
  categories: ['World', 'Politics', 'Business', 'Technology', 'Science', 'Sports', 'Health', 'Culture'],
  keywords: [],   // empty = no keyword gate; general world news passes through
}

// Map a feedType to its admin_config storage key + defaults
const FEED_META = {
  ai:     { key: 'agent_config',  defaults: DEFAULT_AGENT_CONFIG },
  trends: { key: 'trends_config', defaults: DEFAULT_TRENDS_CONFIG },
}

function resolveFeed(req) {
  const ft = String(req.query?.feedType ?? req.body?.feedType ?? 'ai').toLowerCase()
  return FEED_META[ft] ? ft : 'ai'
}

const ALLOWED_CONFIG_KEYS = new Set([
  'autoFetch', 'cronExpression', 'maxPerBatch', 'minAiScore',
  'enableImages', 'imagesPerArticle', 'enabledSources', 'customSources', 'categories', 'keywords',
])

async function readDbConfig(feedType = 'ai') {
  const { key, defaults } = FEED_META[feedType] || FEED_META.ai
  try {
    const row = await dbGet('SELECT value FROM admin_config WHERE key = ?', [key])
    return row ? { ...defaults, ...JSON.parse(row.value) } : defaults
  } catch {
    return defaults
  }
}

async function writeDbConfig(value, updatedBy, feedType = 'ai') {
  const { key } = FEED_META[feedType] || FEED_META.ai
  const now = new Date().toISOString()
  const existing = await dbGet('SELECT 1 AS x FROM admin_config WHERE key = ?', [key])
  if (existing) {
    await dbRun(
      'UPDATE admin_config SET value = ?, "updatedDate" = ?, "updatedBy" = ? WHERE key = ?',
      [value, now, updatedBy, key],
    )
  } else {
    await dbRun(
      'INSERT INTO admin_config (key, value, "updatedDate", "updatedBy") VALUES (?, ?, ?, ?)',
      [key, value, now, updatedBy],
    )
  }
}

/**
 * POST /api/admin/news-agent/run
 * Manually triggers the news agent. Admin-only.
 * Body may contain one-time overrides: { maxArticles, minAiScore, enabledSources, saveAsDefault }
 */
export async function triggerNewsAgent(req, res) {
  try {
    const feedType = resolveFeed(req)
    const dbCfg = await readDbConfig(feedType)

    // Support one-time body overrides from the confirmation modal
    const body = req.body || {}
    const saveAsDefault = Boolean(body.saveAsDefault)

    const maxArticles = Number.isFinite(Number(body.maxArticles)) && Number(body.maxArticles) > 0
      ? Math.min(Number(body.maxArticles), 25)
      : (Number(req.query.max) > 0 ? Math.min(Number(req.query.max), 25) : dbCfg.maxPerBatch)

    const minAiScore = Number.isFinite(Number(body.minAiScore))
      ? Math.max(0, Math.min(100, Number(body.minAiScore)))
      : dbCfg.minAiScore

    const enabledSources = Array.isArray(body.enabledSources) ? body.enabledSources : dbCfg.enabledSources

    // Persist overrides if requested
    if (saveAsDefault && Object.keys(body).length > 1) {
      const merged = { ...dbCfg, maxPerBatch: maxArticles, minAiScore, enabledSources }
      await writeDbConfig(JSON.stringify(merged), req.user?.email ?? 'admin', feedType)
    }

    // Respond immediately — agent can take minutes (Gemini + Imagen calls per article)
    // and Cloud Run will kill the connection if we wait for it to finish.
    res.json({ ok: true, message: 'Agent started', feedType, maxArticles, minAiScore })

    runNewsAgent({ maxArticles, minAiScore, enabledSources, enableImages: dbCfg.enableImages, feedType })
      .then(result => console.log('[admin] news-agent complete:', result))
      .catch(err => console.error('[admin] news-agent failed:', err?.message || err))
  } catch (err) {
    console.error('[admin] news-agent trigger failed:', err)
    return res.status(500).json({
      error: 'Agent run failed',
      detail: config.isProduction ? undefined : err?.message,
    })
  }
}

/**
 * GET /api/admin/config
 * Returns the current agent configuration. Admin-only.
 */
export async function getAgentConfig(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const cfg = await readDbConfig(resolveFeed(req))
    return res.json({ ok: true, config: cfg })
  } catch (err) {
    console.error('[admin] getAgentConfig error:', err)
    return res.status(500).json({ error: 'Failed to load configuration' })
  }
}

/**
 * PUT /api/admin/config
 * Updates (merges) the agent configuration. Admin-only.
 */
export async function updateAgentConfig(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store')
    const feedType = resolveFeed(req)
    const incoming = req.body || {}
    const sanitized = {}
    for (const [k, v] of Object.entries(incoming)) {
      if (ALLOWED_CONFIG_KEYS.has(k)) sanitized[k] = v
    }

    if ('maxPerBatch' in sanitized)      sanitized.maxPerBatch      = Math.max(1, Math.min(25, Number(sanitized.maxPerBatch) || 5))
    if ('minAiScore' in sanitized)       sanitized.minAiScore       = Math.max(0, Math.min(100, Number(sanitized.minAiScore) || 50))
    if ('imagesPerArticle' in sanitized) sanitized.imagesPerArticle = Math.max(1, Math.min(5, Number(sanitized.imagesPerArticle) || 3))
    if ('autoFetch' in sanitized)        sanitized.autoFetch        = Boolean(sanitized.autoFetch)
    if ('enableImages' in sanitized)     sanitized.enableImages     = Boolean(sanitized.enableImages)
    if ('cronExpression' in sanitized) {
      const expr = String(sanitized.cronExpression || '').trim().slice(0, 100)
      if (expr && !cron.validate(expr)) {
        return res.status(400).json({ error: 'Invalid cron expression' })
      }
      sanitized.cronExpression = expr
    }
    if ('categories' in sanitized && !Array.isArray(sanitized.categories))
      return res.status(400).json({ error: 'categories must be an array' })
    if ('keywords' in sanitized && !Array.isArray(sanitized.keywords))
      return res.status(400).json({ error: 'keywords must be an array' })
    if ('enabledSources' in sanitized && !Array.isArray(sanitized.enabledSources))
      return res.status(400).json({ error: 'enabledSources must be an array' })
    if ('customSources' in sanitized && !Array.isArray(sanitized.customSources))
      return res.status(400).json({ error: 'customSources must be an array' })
    if ('customSources' in sanitized) {
      for (const s of sanitized.customSources) {
        if (s.rssUrl && !isSafeUrl(s.rssUrl)) {
          return res.status(400).json({ error: 'Custom source rssUrl must be an http/https URL' })
        }
      }
      sanitized.customSources = sanitized.customSources.map((s) => ({
        key:    String(s.key    || '').slice(0, 60),
        label:  String(s.label  || '').slice(0, 100),
        rssUrl: String(s.rssUrl || '').slice(0, 2048),
        tier:   String(s.tier   || 'custom'),
      }))
    }

    const current = await readDbConfig(feedType)
    const merged = { ...current, ...sanitized }

    await writeDbConfig(JSON.stringify(merged), req.user?.email ?? 'admin', feedType)

    return res.json({ ok: true, config: merged })
  } catch (err) {
    console.error('[admin] updateAgentConfig error:', err)
    return res.status(500).json({ error: 'Failed to save configuration' })
  }
}

/**
 * GET /api/admin/source-catalog
 * Returns the full source catalog + tier metadata for the frontend. Admin-only.
 */
export async function getSourceCatalog(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (resolveFeed(req) === 'trends') {
    return res.json({ ok: true, catalog: TRENDS_SOURCE_CATALOG, tiers: TRENDS_SOURCE_TIERS })
  }
  return res.json({ ok: true, catalog: SOURCE_CATALOG, tiers: SOURCE_TIERS })
}
