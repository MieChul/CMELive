import { callGemini, isConfigured } from './geminiService.js'
import { config } from '../config/env.js'

const REVIEW_SYSTEM = `You are an expert survey methodologist. Evaluate each question for:
1. Clarity - unambiguous, easy to understand
2. Relevance - relates to the survey title and description
3. Answerability - respondents can realistically answer
4. Bias - neutral, not leading
5. Specificity - actionable insights
6. Grammar & tone - professional

Return a JSON object with key "items" (array). Each element must be:
{
  "questionId": string|number (match input id),
  "score": number 0-100,
  "issues": string[],
  "suggestion": {
    "type": "rephrase" | "rewrite" | "none",
    "rephrasedQuestion"?: string,
    "explanation"?: string,
    "rewritePrompt"?: string,
    "guidance"?: string[]
  }
}
If score >= 70, set suggestion.type to "none" and omit rephrase fields.
If score 40-69 use "rephrase" with a polished question the user can accept.
If score < 40 use "rewrite" with clear guidance.`

/**
 * @param {object} param0
 * @param {string} param0.surveyTitle
 * @param {string} param0.surveyDescription
 * @param {{ id: string|number, text: string, type: string }[]} param0.questions
 */
export async function reviewQuestions({ surveyTitle, surveyDescription, questions }) {
  if (!isConfigured()) {
    console.warn('[AI] Gemini not configured – GOOGLE_CREDENTIALS_JSON or GOOGLE_VERTEX_PROJECT_ID not set. Returning fallback scores.')
    return {
      items: questions.map((q) => ({
        questionId: q.id,
        score: 100,
        issues: [],
        suggestion: { type: 'none' },
        fallback: true,
        message: 'Gemini not configured; scores defaulted.',
      })),
    }
  }
  const userContent = JSON.stringify({
    title: surveyTitle,
    description: surveyDescription,
    questions: questions.map((q) => ({ id: q.id, text: q.text, type: q.type })),
  })
  console.log('[AI] review – model="gemini-2.0-flash" backend=Vertex AI')
  const raw = await callGemini(REVIEW_SYSTEM, userContent)
  if (!raw) throw new Error('Empty AI response from Gemini')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    const m = raw.match(/\{[\s\S]*\}/)
    parsed = m ? JSON.parse(m[0]) : { items: [] }
  }
  if (parsed && !parsed.items && Array.isArray(parsed.questions)) {
    parsed = { items: parsed.questions }
  }
  return parsed
}

/**
 * @param {string} text
 */
export async function analyzeSentiment(text) {
  if (!text || !String(text).trim()) {
    return { label: 'neutral', score: 0.5 }
  }
  if (!isConfigured()) {
    return { label: 'neutral', score: 0.5, fallback: true }
  }
  const raw = await callGemini(
    `Classify sentiment. Return JSON: { "label": "positive"|"negative"|"neutral", "score": number 0-1 }`,
    String(text).slice(0, 4000),
  )
  if (!raw) return { label: 'neutral', score: 0.5 }
  const p = JSON.parse(raw)
  let label = String(p.label || p.sentiment || 'neutral').toLowerCase()
  if (!['positive', 'negative', 'neutral'].includes(label)) label = 'neutral'
  return { label, score: p.score != null ? Number(p.score) : 0.5 }
}

// Fallback RSS sources for the /api/ai/latest-news widget AND the news agent legacy mode
const FALLBACK_RSS_SOURCES = [
  'https://news.google.com/rss/search?q=artificial+intelligence+when:7d&hl=en-IN&gl=IN&ceid=IN:en',
  'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',
  'https://venturebeat.com/category/ai/feed/',
  'https://www.wired.com/feed/tag/ai/latest/rss',
]

// Alias used by getLatestAiNews / getLatestAiNewsDebug (keeps the name distinct for clarity)
const AI_NEWS_RSS_SOURCES = FALLBACK_RSS_SOURCES

const DEFAULT_AI_KEYWORDS = [
  'ai', 'artificial intelligence', 'llm', 'gpt', 'machine learning',
  'generative', 'openai', 'anthropic', 'gemini', 'copilot',
  'media', 'streaming', 'entertainment', 'adtech',
]

const NEWS_API_URL = 'https://newsapi.org/v2/everything'

function parseRssTag(xmlChunk, tagName, { stripUrls = false } = {}) {
  const m = xmlChunk.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'))
  if (!m) return ''
  let value = m[1]
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .replace(/<[^>]+>/g, ' ')        // strip HTML tags before entity decode
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')        // strip again — catches tags revealed by entity decode
  if (stripUrls) {
    value = value.replace(/https?:\/\/\S+/g, '') // remove bare URLs (Google RSS leaks them in description)
  }
  return value.replace(/\s+/g, ' ').trim()
}

function toShortText(text, max = 170) {
  const value = String(text || '').trim()
  if (!value) return ''
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trim()}…`
}

/**
 * Extracts an image URL from a single RSS <item> or Atom <entry> chunk.
 * Checks (in priority order):
 *   1. <enclosure> with an image MIME type
 *   2. <media:thumbnail url="...">
 *   3. <media:content> with medium="image" or image/* type
 * Returns null if no image found.
 */
function parseRssItemImage(raw) {
  // <enclosure url="..." type="image/jpeg" />  (RSS 2.0)
  const encMatch = raw.match(/<enclosure([^>]+)>/i)
  if (encMatch) {
    const attrs = encMatch[1]
    const encType = (attrs.match(/type=["']([^"']+)["']/i) || [])[1] || ''
    const encUrl  = (attrs.match(/url=["']([^"']+)["']/i)  || [])[1] || ''
    if (encType.startsWith('image/') && /^https?:\/\//.test(encUrl)) return encUrl
  }
  // <media:thumbnail url="..." />  (Media RSS)
  const thumbMatch = raw.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)
  if (thumbMatch && /^https?:\/\//.test(thumbMatch[1])) return thumbMatch[1]
  // <media:content url="..." medium="image">  or  type="image/..."
  const mediaMatch = raw.match(/<media:content([^>]+)>/i)
  if (mediaMatch) {
    const attrs = mediaMatch[1]
    const mUrl    = (attrs.match(/url=["']([^"']+)["']/i)    || [])[1] || ''
    const mMedium = (attrs.match(/medium=["']([^"']+)["']/i) || [])[1] || ''
    const mType   = (attrs.match(/type=["']([^"']+)["']/i)   || [])[1] || ''
    if (/^https?:\/\//.test(mUrl) && (mMedium === 'image' || mType.startsWith('image/'))) return mUrl
  }
  return null
}

function parseRssItems(xml) {
  const items = []
  const rssItems = xml.match(/<item>[\s\S]*?<\/item>/gi) || []
  for (const raw of rssItems) {
    const title = parseRssTag(raw, 'title')
    let link = ''
    const directUrl = raw.match(/<link>(https?:\/\/[^<\s]+)<\/link>/i)
    if (directUrl) link = directUrl[1].trim()
    if (!link) {
      const hrefAttr = raw.match(/<link[^>]+href=["']([^"']+)["']/i)
      if (hrefAttr) link = hrefAttr[1].trim()
    }
    if (!link) {
      const guid = raw.match(/<guid[^>]*>(https?:\/\/[^<\s]+)<\/guid>/i)
      if (guid) link = guid[1].trim()
    }
    const description = parseRssTag(raw, 'description') || parseRssTag(raw, 'content:encoded')
    const sourceName = parseRssTag(raw, 'source') || null
    // Extract publication date — critical for preventing AI from hallucinating wrong years
    const pubDateRaw = parseRssTag(raw, 'pubDate') || parseRssTag(raw, 'dc:date') || null
    const pubDate = pubDateRaw ? normalisePubDate(pubDateRaw) : null
    if (!title || !link) continue
    items.push({ title, description, link, imageUrl: parseRssItemImage(raw), sourceName, pubDate })
  }
  return items
}

function parseAtomEntries(xml) {
  const items = []
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) || []
  for (const raw of entries) {
    const title = parseRssTag(raw, 'title')
    const summary = parseRssTag(raw, 'summary', { stripUrls: true }) || parseRssTag(raw, 'content', { stripUrls: true })
    const directLink = parseRssTag(raw, 'link')
    const hrefMatch = raw.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)
    const link = (hrefMatch?.[1] || directLink || '').trim()
    // Atom uses <updated> or <published> for dates
    const pubDateRaw = parseRssTag(raw, 'published') || parseRssTag(raw, 'updated') || null
    const pubDate = pubDateRaw ? normalisePubDate(pubDateRaw) : null
    if (!title || !link) continue
    items.push({ title, description: summary, link, imageUrl: parseRssItemImage(raw), pubDate })
  }
  return items
}

// Convert any recognisable date string to a short human-readable form ("May 29, 2026").
// Returns null when parsing fails rather than throwing.
function normalisePubDate(raw) {
  try {
    const d = new Date(raw.trim())
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return null
  }
}

function makeRelevanceFilter(keywords) {
  const kws = (keywords && keywords.length > 0) ? keywords.map((k) => k.toLowerCase().trim()) : DEFAULT_AI_KEYWORDS
  return (item) => {
    const text = `${item.title || ''} ${item.description || ''}`.toLowerCase()
    // A multi-word phrase (e.g. "media and entertainment") matches if the full phrase appears
    // OR all meaningful words (>3 chars) in the phrase all appear. Single-word keywords
    // must appear verbatim. ANY keyword matching is sufficient to pass.
    return kws.some((kw) => {
      if (text.includes(kw)) return true
      if (kw.includes(' ')) {
        const words = kw.split(/\s+/).filter((w) => w.length > 3)
        return words.length > 0 && words.every((w) => text.includes(w))
      }
      return false
    })
  }
}

async function fetchFeedItems(url, { filter = null } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        'User-Agent': 'CME-Live-NewsFetcher/1.0',
      },
    })
    if (!res.ok) throw new Error(`Feed request failed (${res.status})`)
    const xml = await res.text()
    let parsed = [...parseRssItems(xml), ...parseAtomEntries(xml)].filter((i) => i.title && i.link)
    if (filter) parsed = parsed.filter(filter)
    return parsed.map((item) => ({
      title: toShortText(item.title, 200),
      description: toShortText(item.description || '', 1200),
      link: item.link,
      imageUrl: item.imageUrl || null,
      sourceName: item.sourceName || null,
      pubDate: item.pubDate || null,
    }))
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchNewsApiItems({ keywords } = {}) {
  const apiKey = (process.env.NEWS_API_KEY || '').trim()
  if (!apiKey) return []

  const kws = (keywords && keywords.length > 0) ? keywords : ['artificial intelligence', 'media streaming', 'generative ai', 'large language model']
  const query = kws.slice(0, 4).map((k) => `"${k}"`).join(' OR ')
  const filter = makeRelevanceFilter(kws)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const params = new URLSearchParams({
      q: query,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: '25',
      apiKey,
    })
    const res = await fetch(`${NEWS_API_URL}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`NewsAPI request failed (${res.status})`)
    const payload = await res.json()
    const articles = Array.isArray(payload?.articles) ? payload.articles : []
    return articles
      .map((item) => ({
        title: toShortText(item?.title || '', 200),
        description: toShortText(item?.description || item?.content || '', 1200),
        link: String(item?.url || '').trim(),
      }))
      .filter((item) => item.title && item.link)
      .filter(filter)
  } finally {
    clearTimeout(timeout)
  }
}

const GOOGLE_CSE_URL = 'https://www.googleapis.com/customsearch/v1'

/**
 * Fetches news articles via Google Custom Search API (GCP).
 * Returns up to 10 items per call (CSE hard limit).
 * Silently returns [] when GOOGLE_CSE_API_KEY / GOOGLE_CSE_ID are not configured
 * or when the daily free quota (100 queries) is exhausted.
 */
async function fetchGoogleCseItems({ keywords } = {}) {
  const apiKey = config.googleCse?.apiKey
  const cx     = config.googleCse?.cx
  if (!apiKey || !cx) return []

  const kws = (keywords && keywords.length > 0)
    ? keywords
    : ['artificial intelligence', 'media streaming', 'generative ai', 'large language model']

  // Build an OR query from the top 5 keywords (CSE supports native OR syntax)
  const query = kws.slice(0, 5).join(' OR ')
  const filter = makeRelevanceFilter(kws)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx,
      q: query,
      num: '10',           // max per request
      dateRestrict: 'd7',  // past 7 days
      sort: 'date',
    })
    const res = await fetch(`${GOOGLE_CSE_URL}?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (res.status === 429) {
      console.warn('[AI] Google CSE: daily quota exceeded (100 req/day free tier)')
      return []
    }
    if (res.status === 403) {
      console.warn('[AI] Google CSE: API key rejected or Custom Search API not enabled in GCP project')
      return []
    }
    if (!res.ok) throw new Error(`Google CSE request failed (${res.status})`)

    const payload = await res.json()
    const items = Array.isArray(payload?.items) ? payload.items : []

    return items
      .map((item) => {
        // Extract best available image from Google's pagemap metadata
        const imgSrc = item?.pagemap?.cse_image?.[0]?.src
          || item?.pagemap?.cse_thumbnail?.[0]?.src
          || null
        return {
          title:       toShortText(item?.title   || '', 200),
          description: toShortText(item?.snippet || '', 1200),
          link:        String(item?.link || '').trim(),
          imageUrl:    imgSrc && /^https:\/\//.test(imgSrc) ? imgSrc : null,
        }
      })
      .filter((item) => item.title && item.link && /^https?:\/\//.test(item.link))
      .filter(filter)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Fetches raw news articles from configured sources (no AI processing).
 * Used by the news agent to collect articles for DB storage.
 *
 * @param {number} [limit=25]
 * @param {{ enabledSources?: string[], customSources?: {rssUrl:string,label:string}[], keywords?: string[] }} [options]
 * @returns {Promise<{title: string, description: string, link: string}[]>}
 */
export async function collectRawArticles(limit = 25, options = {}) {
  const { enabledSources, customSources = [], keywords } = options
  const rawItems = []
  const seen = new Set()

  const addItem = (item) => {
    if (rawItems.length >= limit) return false
    const key = `${item.title}::${item.link}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    rawItems.push(item)
    return true
  }

  const isSafeUrl = (url) => /^https?:\/\/.{4,}/.test(String(url || '').trim())

  // If specific sources are configured, use the catalog; otherwise fall back to legacy RSS
  if (enabledSources && enabledSources.length > 0) {
    const { SOURCE_CATALOG } = await import('../data/sourceCatalog.js')

    // NewsAPI (broad keyword-based fetch)
    if (enabledSources.includes('newsapi')) {
      try {
        const items = await fetchNewsApiItems({ keywords })
        for (const item of items) { if (!addItem(item)) break }
      } catch (err) { console.warn('[AI] NewsAPI failed:', err?.message) }
    }

    // Google Custom Search (GCP) — web-wide discovery, includes images from pagemap
    if (enabledSources.includes('googlecse')) {
      try {
        const items = await fetchGoogleCseItems({ keywords })
        for (const item of items) { if (!addItem(item)) break }
      } catch (err) { console.warn('[AI] Google CSE failed:', err?.message) }
    }

    // RSS-backed catalog sources — apply keyword filter when keywords are configured so
    // only on-domain articles from broad feeds are collected.
    const rssSources = enabledSources
      .filter((k) => k !== 'newsapi' && k !== 'googlecse' && SOURCE_CATALOG[k]?.rss)
      .map((k) => SOURCE_CATALOG[k].rss)

    // Build a filter for RSS feeds — only active when keywords are set by admin
    const rssFilter = (keywords && keywords.length > 0) ? makeRelevanceFilter(keywords) : null

    // Fetch all RSS sources in parallel, then interleave round-robin so each source
    // contributes equally — prevents all slots filling from a single prolific source.
    if (rssSources.length > 0) {
      const settled = await Promise.allSettled(
        rssSources.map(async (rssUrl) => {
          try { return await fetchFeedItems(rssUrl, { filter: rssFilter }) }
          catch (err) { console.warn(`[AI] RSS failed: ${rssUrl}`, err?.message); return [] }
        })
      )
      const sourceLists = settled
        .filter((r) => r.status === 'fulfilled' && r.value.length > 0)
        .map((r) => r.value)

      // Round-robin: take 1 item per source per round until limit reached
      let round = 0
      let anyAdded = true
      while (rawItems.length < limit && anyAdded) {
        anyAdded = false
        for (const list of sourceLists) {
          if (round < list.length) {
            if (addItem(list[round])) anyAdded = true
            if (rawItems.length >= limit) break
          }
        }
        round++
      }
    }

    // Custom sources added by admin (only http/https — SSRF guard)
    for (const custom of customSources) {
      if (!custom.rssUrl || !isSafeUrl(custom.rssUrl) || rawItems.length >= limit) continue
      try {
        const items = await fetchFeedItems(custom.rssUrl)
        for (const item of items) { if (!addItem(item)) break }
      } catch (err) { console.warn(`[AI] Custom RSS failed: ${custom.rssUrl}`, err?.message) }
    }
  } else {
    // Legacy fallback — use AI keyword filter on generic feeds
    const filter = makeRelevanceFilter(keywords)
    try {
      const items = await fetchNewsApiItems({ keywords })
      for (const item of items) { if (!addItem(item)) break }
    } catch (err) { console.warn('[AI] NewsAPI failed:', err?.message) }

    for (const sourceUrl of FALLBACK_RSS_SOURCES) {
      if (rawItems.length >= limit) break
      try {
        const items = await fetchFeedItems(sourceUrl, { filter })
        for (const item of items) { if (!addItem(item)) break }
      } catch (err) { console.warn(`[AI] RSS failed: ${sourceUrl}`, err?.message) }
    }
  }

  return rawItems
}

/**
 * Fetches latest AI-related headlines and returns card-ready news items.
 * @returns {Promise<{ items: { title: string, description: string, link: string }[] }>}
 */
export async function getLatestAiNews() {
  const rawItems = []
  const seen = new Set()
  const errors = []

  try {
    const newsApiItems = await fetchNewsApiItems()
    for (const item of newsApiItems) {
      const dedupeKey = `${item.title}::${item.link}`.toLowerCase()
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      rawItems.push(item)
    }
  } catch (err) {
    errors.push(`newsapi -> ${err?.message || String(err)}`)
    console.warn('[AI latest-news] NewsAPI source failed:', err?.message || err)
  }

  for (const sourceUrl of AI_NEWS_RSS_SOURCES) {
    try {
      const sourceItems = await fetchFeedItems(sourceUrl)
      for (const item of sourceItems) {
        const dedupeKey = `${item.title}::${item.link}`.toLowerCase()
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        rawItems.push(item)
      }
      if (rawItems.length >= 12) break
    } catch (err) {
      errors.push(`${sourceUrl} -> ${err?.message || String(err)}`)
      console.warn(`[AI latest-news] source failed: ${sourceUrl}`, err?.message || err)
    }
  }

  if (!rawItems.length) {
    const details = errors.length ? ` | Sources: ${errors.join(' ; ')}` : ''
    throw new Error(`Unable to fetch live AI news from configured sources${details}`)
  }

  if (!isConfigured()) {
    return {
      items: rawItems.slice(0, 4).map((item) => ({
        title: toShortText(item.title, 60),
        description: toShortText(item.description || 'Latest AI development in the media and technology ecosystem.', 150),
        link: item.link,
      })),
      fallback: true,
      source: 'rss',
    }
  }

  try {
    const allowedLinks = new Set(rawItems.map((item) => item.link))
    const raw = await callGemini(
      'You are a news editor. Return strict JSON with key "items" as an array of exactly 4 objects. Each object: {"title": string, "description": string, "link": string}. Keep title <= 65 chars and description <= 160 chars. Use only provided links and keep claims factual based on supplied headlines/snippets.',
      JSON.stringify({ topic: 'Latest AI-related news', articles: rawItems }),
    )

    if (!raw) throw new Error('Empty Gemini latest-news response')

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      const m = raw.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : null
    }

    const aiItems = Array.isArray(parsed?.items) ? parsed.items : []
    const validated = aiItems
      .map((item) => ({
        title: toShortText(item?.title || '', 65),
        description: toShortText(item?.description || '', 160),
        link: String(item?.link || '').trim(),
      }))
      .filter((item) => item.title && item.description && item.link && allowedLinks.has(item.link))
      .slice(0, 4)

    if (validated.length === 4) {
      return { items: validated }
    }
  } catch (err) {
    console.warn('[AI latest-news] falling back to RSS content:', err?.message || err)
  }

  return {
    items: rawItems.slice(0, 4).map((item) => ({
      title: toShortText(item.title, 65),
      description: toShortText(item.description || 'Latest AI development in the media and technology ecosystem.', 160),
      link: item.link,
    })),
    fallback: true,
    source: 'rss',
  }
}

/**
 * Returns diagnostics for AI news providers (connectivity + item counts).
 */
export async function getLatestAiNewsDebug() {
  const diagnostics = []
  const items = []
  const seen = new Set()

  const hasNewsApiKey = Boolean((process.env.NEWS_API_KEY || '').trim())
  const geminiConfigured = isConfigured()

  if (!hasNewsApiKey) {
    diagnostics.push({
      name: 'newsapi',
      url: NEWS_API_URL,
      status: 'skipped',
      itemCount: 0,
      error: 'NEWS_API_KEY not configured',
    })
  } else {
    try {
      const newsApiItems = await fetchNewsApiItems()
      diagnostics.push({
        name: 'newsapi',
        url: NEWS_API_URL,
        status: 'ok',
        itemCount: newsApiItems.length,
      })
      for (const item of newsApiItems) {
        const dedupeKey = `${item.title}::${item.link}`.toLowerCase()
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        items.push(item)
      }
    } catch (err) {
      diagnostics.push({
        name: 'newsapi',
        url: NEWS_API_URL,
        status: 'error',
        itemCount: 0,
        error: err?.message || String(err),
      })
    }
  }

  for (const sourceUrl of AI_NEWS_RSS_SOURCES) {
    try {
      const sourceItems = await fetchFeedItems(sourceUrl)
      diagnostics.push({
        name: 'rss',
        url: sourceUrl,
        status: 'ok',
        itemCount: sourceItems.length,
      })
      for (const item of sourceItems) {
        const dedupeKey = `${item.title}::${item.link}`.toLowerCase()
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)
        items.push(item)
      }
    } catch (err) {
      diagnostics.push({
        name: 'rss',
        url: sourceUrl,
        status: 'error',
        itemCount: 0,
        error: err?.message || String(err),
      })
    }
  }

  const successCount = diagnostics.filter((s) => s.status === 'ok').length
  return {
    timestamp: new Date().toISOString(),
    configured: {
      newsApiKey: hasNewsApiKey,
      gemini: geminiConfigured,
    },
    totals: {
      sources: diagnostics.length,
      reachableSources: successCount,
      uniqueItems: items.length,
    },
    sources: diagnostics,
    sampleItems: items.slice(0, 4),
  }
}
