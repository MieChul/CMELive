import { runNewsAgent } from '../services/newsAgentService.js'
import { get as dbGet, run as dbRun } from '../config/db.js'
import { config } from '../config/env.js'
import { SOURCE_CATALOG, SOURCE_TIERS, DEFAULT_ENABLED_SOURCES } from '../data/sourceCatalog.js'
import cron from 'node-cron'

const isSafeUrl = (url) => /^https?:\/\/.{4,}/.test(String(url || '').trim())

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

const ALLOWED_CONFIG_KEYS = new Set([
  'autoFetch', 'cronExpression', 'maxPerBatch', 'minAiScore',
  'enableImages', 'imagesPerArticle', 'enabledSources', 'customSources', 'categories', 'keywords',
])

async function readDbConfig() {
  try {
    const row = await dbGet("SELECT value FROM admin_config WHERE key = 'agent_config'")
    return row ? { ...DEFAULT_AGENT_CONFIG, ...JSON.parse(row.value) } : DEFAULT_AGENT_CONFIG
  } catch {
    return DEFAULT_AGENT_CONFIG
  }
}

async function writeDbConfig(value, updatedBy) {
  const now = new Date().toISOString()
  const existing = await dbGet("SELECT 1 AS x FROM admin_config WHERE key = 'agent_config'")
  if (existing) {
    await dbRun(
      "UPDATE admin_config SET value = ?, updatedDate = ?, updatedBy = ? WHERE key = 'agent_config'",
      [value, now, updatedBy],
    )
  } else {
    await dbRun(
      "INSERT INTO admin_config (key, value, updatedDate, updatedBy) VALUES ('agent_config', ?, ?, ?)",
      [value, now, updatedBy],
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
    const dbCfg = await readDbConfig()

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
      await writeDbConfig(JSON.stringify(merged), req.user?.email ?? 'admin')
    }

    const result = await runNewsAgent({ maxArticles, minAiScore, enabledSources, enableImages: dbCfg.enableImages })
    return res.json({ ok: true, ...result })
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
    const cfg = await readDbConfig()
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

    const current = await readDbConfig()
    const merged = { ...current, ...sanitized }

    await writeDbConfig(JSON.stringify(merged), req.user?.email ?? 'admin')

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
  return res.json({ ok: true, catalog: SOURCE_CATALOG, tiers: SOURCE_TIERS })
}
