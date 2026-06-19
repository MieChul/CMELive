import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '..', '.env') })
dotenv.config()

const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'

const jwtFromEnv = (process.env.JWT_SECRET || '').trim()
if (isProduction) {
  if (!jwtFromEnv || jwtFromEnv.length < 32) {
    console.error(
      '[FATAL] JWT_SECRET must be set in production to a long random value (at least 32 characters).',
    )
    process.exit(1)
  }
}
const jwtSecret = isProduction ? jwtFromEnv : jwtFromEnv || 'dev-secret-change-in-production'

// OAuth redirect (reply) URL – must be registered in Azure AD App Registration
// (Authentication → Web → Redirect URIs). Use exact match including http/https, port, path.
// Must be set via AZURE_AD_REDIRECT_URI environment variable in production.
function getRedirectUri() {
  const fromEnv = (process.env.AZURE_AD_REDIRECT_URI || '').trim()
  if (fromEnv) return fromEnv
  if (isProduction) {
    console.error('[FATAL] AZURE_AD_REDIRECT_URI must be set in production.')
    process.exit(1)
  }
  return 'http://localhost:3001/api/auth/callback'
}

// Frontend URL for redirects after auth
// Must be set via FRONTEND_URL environment variable in production.
function getFrontendUrl() {
  const fromEnv = (process.env.FRONTEND_URL || '').trim()
  if (fromEnv) return fromEnv
  if (isProduction) {
    console.error('[FATAL] FRONTEND_URL must be set in production.')
    process.exit(1)
  }
  return 'http://localhost:5173'
}

// Comma-separated list of emails that get isAdmin=true in local dev (SSO bypassed).
// In production, admin role is controlled exclusively via Azure AD App Roles.
const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

// Secret key for AI agent calls to POST /api/news.
// Must be at least 32 characters in production. Set via NEWS_AGENT_API_KEY env var.
const newsAgentApiKey = (process.env.NEWS_AGENT_API_KEY || '').trim()

// BYPASS_ADMIN_AUTH=true: grants admin to ALL authenticated users. Dev/testing only — remove before go-live.
const bypassAdminAuth = process.env.BYPASS_ADMIN_AUTH === 'true'
if (isProduction && newsAgentApiKey.length > 0 && newsAgentApiKey.length < 32) {
  console.error('[FATAL] NEWS_AGENT_API_KEY must be at least 32 characters in production.')
  process.exit(1)
}

// ── News agent scheduler + image generation ──────────────────────────────────
// NEWS_IMAGES_DIR: absolute path to save Imagen 3 generated images.
const agentImagesDir = (process.env.NEWS_IMAGES_DIR || '').trim()
  || join(__dirname, '..', 'public', 'news-images')

// IMAGE_LIBRARY_DIR: absolute path to a folder of pre-existing images the agent
//   can pick from instead of generating with Imagen 3. Enable via useLocalLibrary
//   in admin Agent Config. Defaults to server/public/image-library/.
const agentImageLibraryDir = (process.env.IMAGE_LIBRARY_DIR || '').trim()
  || join(__dirname, '..', 'public', 'image-library')

// NEWS_AGENT_CRON: cron expression for the scheduled agent run.
//   Default: '0 8 * * *' = 8:00 AM UTC daily.
//   Set to empty string to disable the cron job.
const agentCronExpression = (process.env.NEWS_AGENT_CRON ?? '0 8 * * *').trim()

// NEWS_MAX_PER_RUN: max articles inserted per agent run (1-25).
const agentMaxPerRun = Math.max(1, Math.min(Number(process.env.NEWS_MAX_PER_RUN) || 10, 25))

// ENABLE_DALLE_IMAGES=true: generate an AI image per article via Imagen 3 (Vertex AI).
//   Images cost ~$0.02 each. Off by default.
const enableDalleImages = process.env.ENABLE_DALLE_IMAGES === 'true'

// Google Custom Search Engine — used by the news agent as a GCP-native article source.
// Both vars required to enable: GOOGLE_CSE_API_KEY (GCP API key) + GOOGLE_CSE_ID (Programmable Search Engine ID / cx).
const googleCseApiKey = (process.env.GOOGLE_CSE_API_KEY || '').trim()
const googleCseCx     = (process.env.GOOGLE_CSE_ID    || '').trim()

// Google Cloud Storage — persists AI-generated images in production.
// GCS_BUCKET_NAME: name of the GCS bucket (must be pre-created; set allUsers:Storage Object Viewer for public access).
// GOOGLE_CREDENTIALS_JSON: reused from Vertex AI service account — no new credential needed.
const gcsBucketName = (process.env.GCS_BUCKET_NAME || '').trim()

// Google Vertex AI (Imagen 3) — photorealistic image generation.
// GOOGLE_VERTEX_PROJECT_ID: your GCP project ID (e.g. "my-project-123456")
// GOOGLE_VERTEX_LOCATION:   Vertex AI region, defaults to "us-central1"
// GOOGLE_CREDENTIALS_JSON:  full content of a GCP service account JSON key file
//   (paste the entire JSON as a single string; Azure handles it fine)
const vertexProjectId      = (process.env.GOOGLE_VERTEX_PROJECT_ID || '').trim()
const vertexLocation       = (process.env.GOOGLE_VERTEX_LOCATION   || 'us-central1').trim()
const vertexCredentialsJson = (process.env.GOOGLE_CREDENTIALS_JSON || '').trim()

// Mission: AI Possible — Key Moments ingestion (AWS API Gateway → S3).
// KEYMOMENT_API_BASE_URL: base URL of the Key Moments API (e.g. https://xxx.execute-api.us-east-2.amazonaws.com).
//   The service appends /key-moment-metadata and /presigned-url paths automatically.
// KEYMOMENT_API_KEY:      optional API key sent as x-api-key header to the AWS API Gateway.
// KEYMOMENT_ASSETS_DIR:   optional absolute path where downloaded videos are stored
//                         (defaults to server/uploads/key-moments inside the repo).
const keyMomentsApiBase     = (process.env.KEYMOMENT_API_BASE_URL || '').trim().replace(/\/+$/, '')
const keyMomentsApiKey      = (process.env.KEYMOMENT_API_KEY || '').trim()
const keyMomentsAssetsDir   = (process.env.KEYMOMENT_ASSETS_DIR   || '').trim()
  || join(__dirname, '..', 'uploads', 'key-moments')

export const config = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret,
  nodeEnv,
  isProduction,
  enableSso: process.env.ENABLE_SSO === 'true',
  adminEmails,
  newsAgentApiKey,
  bypassAdminAuth,
  frontendUrl: getFrontendUrl(),
  azureAd: {
    tenantId: (process.env.AZURE_AD_TENANT_ID || '').trim() || null,
    clientId: (process.env.AZURE_AD_CLIENT_ID || '').trim() || null,
    clientSecret: (process.env.AZURE_AD_CLIENT_SECRET || '').trim() || null,
    redirectUri: getRedirectUri(),
    // Microsoft OAuth endpoints
    get authorizeUrl() {
      return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`
    },
    get tokenUrl() {
      return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`
    },
    scopes: 'openid profile email User.Read',
  },
  googleCse: {
    apiKey: googleCseApiKey,
    cx: googleCseCx,
  },
  vertexAi: {
    projectId:       vertexProjectId,
    location:        vertexLocation,
    credentialsJson: vertexCredentialsJson,
  },
  gcs: {
    bucketName:      gcsBucketName,
    credentialsJson: vertexCredentialsJson,
  },
  agent: {
    imagesDir: agentImagesDir,
    imageLibraryDir: agentImageLibraryDir,
    cronExpression: agentCronExpression,
    maxPerRun: agentMaxPerRun,
    enableImages: enableDalleImages,
  },
  keyMoments: {
    apiBaseUrl: keyMomentsApiBase,
    apiKey: keyMomentsApiKey,
    assetsDir: keyMomentsAssetsDir,
  },
}
