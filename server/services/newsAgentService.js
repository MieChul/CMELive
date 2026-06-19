/**
 * AI News Agent
 *
 * Fetches AI-related articles from RSS/Google CSE, uses Gemini 2.0 Flash (Vertex AI)
 * to generate structured summaries with AI scores, optionally generates images via
 * Imagen 3 (Vertex AI), and inserts pending news records into the database.
 *
 * Entry point: runNewsAgent()
 */
import { getAccessToken, callGemini, isConfigured } from './geminiService.js'
import { readdir } from 'fs/promises'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import { run, get } from '../config/db.js'
import { config } from '../config/env.js'
import { collectRawArticles } from './openaiService.js'
import { saveImage } from './imageStorageService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const MAX_TITLE       = 500
const MAX_EXCERPT     = 5000
const MAX_SUMMARY     = 10000
const MAX_IMPERATIVE  = 2000
const MAX_CATEGORY    = 100
const MAX_SOURCE      = 255
const MAX_TAGS        = 500
const MAX_DATE        = 50
const MAX_URL         = 2048
const MAX_IMAGE_URL   = 1000
const MAX_IMAGE_ALT   = 500

function clamp(value, max) {
  return value ? String(value).trim().slice(0, max) : null
}

// Strips HTML tags + bare URLs from a string (mirrors frontend cleanText).
function cleanedText(value) {
  if (!value) return ''
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Truncate at the last sentence boundary (. ! ?) within maxWords words.
// Returns the text unchanged if it's already short enough.
function truncateAtSentence(text, maxWords = 60) {
  if (!text) return ''
  const words = text.trim().split(/\s+/)
  if (words.length <= maxWords) return text.trim()
  const candidate = words.slice(0, maxWords).join(' ')
  const match = candidate.match(/^([\s\S]*[.!?])/)
  return match ? match[1].trim() : candidate + '…'
}

function extractSourceName(url) {
  try {
    const { hostname } = new URL(url)
    return hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

const CATEGORY_COLORS = {
  'AI Research':       ['#7C3AED', '#4F46E5'],
  'Industry News':     ['#F2665B', '#C94840'],
  'Business':          ['#0EA5E9', '#0284C7'],
  'Products & Tools':  ['#10B981', '#059669'],
  'Policy & Ethics':   ['#F59E0B', '#D97706'],
  'Science':           ['#8B5CF6', '#6D28D9'],
}

function getCategoryPlaceholder(category) {
  const [c1, c2] = CATEGORY_COLORS[category] || ['#F2665B', '#C94840']
  const letter = (category || 'N')[0].toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="800" height="450" fill="url(#g)"/><text x="400" y="235" font-family="system-ui,sans-serif" font-size="180" fill="rgba(255,255,255,0.12)" text-anchor="middle" dominant-baseline="middle" font-weight="800">${letter}</text><text x="400" y="360" font-family="system-ui,sans-serif" font-size="28" fill="rgba(255,255,255,0.4)" text-anchor="middle" font-weight="600" letter-spacing="4">${(category || 'NEWS').toUpperCase()}</text></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/* ─── DB config helper ────────────────────────────────────────────────────── */

async function getDbAgentConfig() {
  try {
    const row = await get("SELECT value FROM admin_config WHERE key = ?", ['agent_config'])
    return row ? JSON.parse(row.value) : null
  } catch {
    return null
  }
}

/* ─── Vertex AI / Imagen 3 ────────────────────────────────────────────────── */

/**
 * Generates a photorealistic image via Google Imagen 3 (Vertex AI).
 * Returns the GCS proxy path on success, null on any failure.
 */
async function generateImageWithImagen(imagePrompt, imagesDir) {
  const { projectId, location } = config.vertexAi
  if (!projectId) return null

  const token = await getAccessToken()
  if (!token) return null

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`
  const prompt = `Photorealistic editorial news photograph: ${imagePrompt}. Professional camera, natural lighting, real-world setting. No text overlay, no watermarks, no logos, no cartoons, no illustrations.`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45000) // Imagen can be slow on cold start
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          safetyFilterLevel: 'block_some',
          personGeneration: 'allow_adult',
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Imagen API error (${res.status}): ${body.slice(0, 200)}`)
    }

    const payload = await res.json()
    const b64 = payload?.predictions?.[0]?.bytesBase64Encoded
    if (!b64) throw new Error('No image bytes in Imagen response')

    const filename = `${crypto.randomUUID()}.png`
    return await saveImage(Buffer.from(b64, 'base64'), filename, imagesDir)
  } finally {
    clearTimeout(timeout)
  }
}

/* ─── Local image library ─────────────────────────────────────────────────── */

/**
 * Picks the most relevant image filename from the local image library using Gemini.
 * Returns a server-relative URL (/image-library/<filename>) or null on any failure.
 * Only called when useLocalLibrary is enabled in admin Agent Config.
 */
async function pickLibraryImage(imagePrompt, libraryDir) {
  let files
  try {
    files = await readdir(libraryDir)
  } catch {
    console.warn('[agent] Image library directory not found:', libraryDir)
    return null
  }

  const imageFiles = files.filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
  if (!imageFiles.length) {
    console.warn('[agent] Image library is empty:', libraryDir)
    return null
  }

  if (!isConfigured()) return null

  try {
    const raw = await callGemini(
      'You are an image curator. Given an article topic description and a list of available image filenames, select the single most visually relevant image. Return JSON: { "filename": string | null }. Return null filename if no image is a reasonable match.',
      JSON.stringify({ topic: imagePrompt, availableImages: imageFiles }),
    )
    if (!raw) return null
    let parsed
    try { parsed = JSON.parse(raw) } catch { return null }
    const chosen = parsed?.filename
    if (!chosen || !imageFiles.includes(chosen)) return null
    console.log(`[agent] Library image selected: ${chosen}`)
    return `/image-library/${chosen}`
  } catch (err) {
    console.warn('[agent] Library image pick failed:', err?.message)
    return null
  }
}

/* ─── AI content generation ───────────────────────────────────────────────── */

const CONTENT_SYSTEM = `You are a news editor for a professional media platform serving media & entertainment executives and AI practitioners.

You will receive: the verbatim article title, the full source content from the RSS feed, the publication date, and the canonical source URL.

YOUR TASK: Condense the source content into a readable excerpt and summary, then classify and annotate the article.

GROUNDING RULES — no exceptions:
- Every fact, name, date, year, number, statistic, and claim in your output MUST come directly from the provided title or content. Do not add anything from your training data.
- If the source says 2026, write 2026. If it says 2025, write 2025. Never substitute a different year from memory.
- If a specific name, company, figure, or event is not mentioned in the provided content, do not mention it in your output.
- If the source content is sparse (short RSS teaser), write a proportionally shorter excerpt and summary — do not pad with assumed context.
- No bias, no framing beyond what the source states, no editorialising.

FIELD RULES:
- excerpt: Condense to ≤60 words, fluent and readable. Only facts from the provided content. Complete sentences — not abrupt.
- summary: Condense to ≤180 words. Comprehensive but strictly grounded in the provided content. If content is short, summary will be short.
- domainImperative: Read the article and assess whether it contains business or strategic content relevant to media & entertainment executives. If yes, write 2-3 sentences drawing only from what the article states. If no relevant business/strategic content exists, return exactly: "No business or strategic implications identified in this article for media & entertainment executives."
- aiTechImperative: Read the article and assess whether it contains technical content relevant to AI practitioners or engineers. If yes, write 2-3 sentences drawing only from what the article states. If no relevant technical content exists, return exactly: "No technical insights identified in this article for AI practitioners or engineers."
- aiScore: Score the article's relevance and significance for media & entertainment executives and AI practitioners. This is a relevance score — not a confidence score for writing quality. If the RSS content is sparse and you cannot fully assess relevance, score conservatively (50 or below) so admin can review. 90+ = breakthrough story, clearly on-topic, rich content; 70-89 = clearly relevant and important; 50-69 = relevant but minor or niche; below 50 = marginally relevant, off-topic, or content too sparse to assess.

Return strict JSON with exactly these fields:
{
  "excerpt": string (≤60 words, condensed from provided content only),
  "summary": string (≤180 words, condensed from provided content only),
  "category": "AI Research" | "Industry News" | "Products & Tools" | "Policy & Ethics" | "Science" | "Business",
  "tags": string (3-5 comma-separated keywords taken from the article content),
  "aiScore": number (integer 0-100),
  "imagePrompt": string (15-25 words describing a generic real-world editorial photograph fitting this story; no text, no logos, no cartoons),
  "domainImperative": string (always a non-empty string — insight from the article, or the standard not-applicable message),
  "aiTechImperative": string (always a non-empty string — insight from the article, or the standard not-applicable message)
}`

async function generateArticleContent(raw) {
  const sourceContent = cleanedText(raw.description || '')

  const rawResponse = await callGemini(CONTENT_SYSTEM, JSON.stringify({
    title: raw.title,
    content: sourceContent,
    publicationDate: raw.pubDate || null,
    sourceUrl: raw.link || null,
  }))

  if (!rawResponse) throw new Error('Empty AI response')

  let parsed
  try {
    parsed = JSON.parse(rawResponse)
  } catch {
    const m = rawResponse.match(/\{[\s\S]*\}/)
    parsed = m ? JSON.parse(m[0]) : null
  }
  if (!parsed?.category) throw new Error('Invalid AI response structure')

  if (typeof parsed.aiScore !== 'number' || !Number.isFinite(parsed.aiScore)) {
    parsed.aiScore = 50
  }
  parsed.aiScore = Math.max(0, Math.min(100, Math.round(parsed.aiScore)))

  // Title always comes verbatim from the RSS source — AI never rewrites it
  return {
    title:            raw.title,
    excerpt:          parsed.excerpt || truncateAtSentence(sourceContent || raw.title, 60),
    summary:          parsed.summary || truncateAtSentence(sourceContent || raw.title, 200),
    category:         parsed.category || 'Industry News',
    tags:             parsed.tags || '',
    aiScore:          parsed.aiScore,
    imagePrompt:      parsed.imagePrompt || raw.title,
    domainImperative: parsed.domainImperative || 'No business or strategic implications identified in this article for media & entertainment executives.',
    aiTechImperative: parsed.aiTechImperative || 'No technical insights identified in this article for AI practitioners or engineers.',
  }
}

/* ─── Main agent ──────────────────────────────────────────────────────────── */

/**
 * Runs the news agent: fetches articles, generates AI content + images,
 * inserts pending records into the DB.
 *
 * @param {{ maxArticles?: number, enableImages?: boolean }} [opts]
 * @returns {Promise<{ fetched: number, inserted: number, skipped: number, errors: number, batchId: string }>}
 */
export async function runNewsAgent({ maxArticles, enableImages, enabledSources: srcOverride, minAiScore: scoreOverride } = {}) {
  // Read DB config with env var fallbacks; caller-supplied values take precedence
  const dbCfg = await getDbAgentConfig()
  const limit = maxArticles ?? dbCfg?.maxPerBatch ?? config.agent.maxPerRun
  const imagesEnabled = enableImages ?? dbCfg?.enableImages ?? config.agent.enableImages
  const imagesPerArticle = Math.max(1, Math.min(5, Number(dbCfg?.imagesPerArticle) || 3))
  const useLocalLibrary = dbCfg?.useLocalLibrary ?? false
  const libraryDir = config.agent.imageLibraryDir
  const enabledSources = srcOverride ?? dbCfg?.enabledSources
  const minAiScore = scoreOverride ?? dbCfg?.minAiScore ?? 0
  const keywords = dbCfg?.keywords ?? []
  const imagesDir = config.agent.imagesDir
  const batchId = crypto.randomUUID()

  // Post-AI keyword domain gate: checks only actual article content — title, excerpt,
  // summary, tags. Imperatives are intentionally excluded because they now always contain
  // a non-null string (including boilerplate "not applicable" messages that contain
  // common topic words like "media", "AI", "business" which would produce false passes).
  function passesStrictDomainCheck(aiContent) {
    if (!keywords || keywords.length === 0) return true
    const haystack = [
      aiContent.title,
      aiContent.excerpt,
      aiContent.summary,
      aiContent.tags,
    ].filter(Boolean).join(' ').toLowerCase()

    return keywords.some((kw) => {
      const kwLower = kw.toLowerCase().trim()
      if (!kwLower) return false
      if (haystack.includes(kwLower)) return true
      // Multi-word phrase: all meaningful words (>3 chars) must all appear
      if (kwLower.includes(' ')) {
        const words = kwLower.split(/\s+/).filter((w) => w.length > 3)
        return words.length > 0 && words.every((w) => haystack.includes(w))
      }
      return false
    })
  }

  console.log(`[agent] Starting run (max=${limit}, images=${imagesEnabled}, useLocalLibrary=${useLocalLibrary}, minScore=${minAiScore}, keywords=[${keywords.join(', ')}], batch=${batchId.slice(0, 8)})`)

  const rawArticles = await collectRawArticles(limit * 3, {
    enabledSources,
    customSources:  dbCfg?.customSources,
    keywords:       dbCfg?.keywords,
  })
  const results = {
    fetched: rawArticles.length,
    inserted: 0,
    skipped: 0,
    alreadySeen: 0,
    belowScore: 0,
    domainMismatch: 0,
    errors: 0,
    batchId,
    keywords,
    minAiScore,
  }
  let processed = 0

  for (const raw of rawArticles) {
    if (processed >= limit) break

    try {
      // Dedup by URL
      if (raw.link) {
        const existing = await get('SELECT id FROM news WHERE url = ?', [raw.link])
        if (existing) {
          results.skipped++
          results.alreadySeen++
          continue
        }
      }

      processed++

      // Generate structured AI content with score
      const rawCleanContent = cleanedText(raw.description || '')
      let aiContent = {
        title:            raw.title,
        excerpt:          truncateAtSentence(rawCleanContent || raw.title, 60),
        summary:          truncateAtSentence(rawCleanContent || raw.title, 200),
        domainImperative: 'No business or strategic implications identified in this article for media & entertainment executives.',
        aiTechImperative: 'No technical insights identified in this article for AI practitioners or engineers.',
        category:         'Industry News',
        tags:             '',
        aiScore:          50,
        imagePrompt:      raw.title,
      }

      if (isConfigured()) {
        try {
          aiContent = await generateArticleContent(raw)
        } catch (err) {
          console.warn('[agent] AI content generation failed, using raw text:', err?.message)
        }
      }

      // Skip articles below the min score threshold
      if (aiContent.aiScore < minAiScore) {
        results.skipped++
        results.belowScore++
        console.log(`[agent] Skipped (score=${aiContent.aiScore} < min=${minAiScore}): "${(aiContent.title || raw.title).slice(0, 60)}"`)
        continue
      }

      // Strict domain check — title/excerpt/summary/tags must match at least one keyword.
      if (!passesStrictDomainCheck(aiContent)) {
        results.skipped++
        results.domainMismatch++
        console.log(`[agent] Skipped (no keyword match): "${(aiContent.title || raw.title).slice(0, 60)}"`)
        continue
      }

      // Validate the article has meaningful renderable content (mirrors frontend cleanText).
      const finalTitle = aiContent.title || raw.title
      const finalExcerpt = aiContent.excerpt || raw.description || ''
      const cleanedTitle = cleanedText(finalTitle)
      const cleanedExcerpt = cleanedText(finalExcerpt)
      if (!cleanedTitle || cleanedTitle.length < 10) {
        results.skipped++
        console.log(`[agent] Skipped (empty/invalid title after cleanup): "${finalTitle?.slice(0, 60) || '<empty>'}"`)
        continue
      }

      // Build images array.
      // Two modes controlled by useLocalLibrary in admin Agent Config:
      //
      // Library mode (useLocalLibrary=true):
      //   1. RSS image if the feed provided one
      //   2. Gemini picks the most relevant image from server/public/image-library/
      //   3. Category gradient placeholder if library is empty or Gemini can't pick
      //
      // Imagen 3 mode (default, useLocalLibrary=false):
      //   1. Generate imagesPerArticle images via Vertex AI Imagen 3
      //   2. Append RSS image as a bonus slot
      //   3. Category gradient placeholder if all generation failed
      const imagesList = []

      if (imagesEnabled) {
        if (useLocalLibrary) {
          // ── Library mode ──────────────────────────────────────────────────
          if (raw.imageUrl) {
            imagesList.push({
              url: clamp(raw.imageUrl, MAX_IMAGE_URL),
              alt: clamp(aiContent.title || raw.title, MAX_IMAGE_ALT),
              isDefault: true,
              source: 'rss',
            })
          } else {
            const libraryUrl = await pickLibraryImage(aiContent.imagePrompt, libraryDir)
            if (libraryUrl) {
              imagesList.push({
                url: clamp(libraryUrl, MAX_IMAGE_URL),
                alt: clamp(aiContent.imagePrompt, MAX_IMAGE_ALT),
                isDefault: true,
                source: 'library',
              })
            }
          }
        } else {
          // ── Imagen 3 mode (default) ───────────────────────────────────────
          const aiImageErrors = []
          for (let i = 0; i < imagesPerArticle; i++) {
            let aiUrl = null
            try {
              aiUrl = await generateImageWithImagen(aiContent.imagePrompt, imagesDir)
              if (aiUrl) console.log(`[agent] Imagen 3 image ${i + 1}/${imagesPerArticle} generated`)
            } catch (err) {
              const msg = err?.message || String(err)
              aiImageErrors.push(`imagen#${i + 1}: ${msg}`)
              console.warn(`[agent] Imagen 3 attempt ${i + 1} failed:`, msg)
            }
            if (aiUrl) {
              imagesList.push({
                url: clamp(aiUrl, MAX_IMAGE_URL),
                alt: clamp(aiContent.imagePrompt, MAX_IMAGE_ALT),
                isDefault: imagesList.length === 0,
                source: 'ai',
              })
            }
          }
          if (aiImageErrors.length === imagesPerArticle) {
            console.warn(`[agent] All ${imagesPerArticle} Imagen 3 attempts failed. Causes: ${aiImageErrors.join(' | ')}`)
          }
          // Bonus: append RSS source image if available
          if (raw.imageUrl) {
            imagesList.push({
              url: clamp(raw.imageUrl, MAX_IMAGE_URL),
              alt: clamp(aiContent.title || raw.title, MAX_IMAGE_ALT),
              isDefault: imagesList.length === 0,
              source: 'rss',
            })
          }
        }
      }

      // Ensure every article has at least one image — category gradient placeholder
      if (imagesList.length === 0) {
        const placeholderUrl = getCategoryPlaceholder(aiContent.category)
        imagesList.push({
          url: placeholderUrl,
          alt: `${aiContent.category || 'News'} illustration`,
          isDefault: true,
          source: 'placeholder',
        })
      }

      // Ensure exactly one default
      if (!imagesList.some((img) => img.isDefault)) imagesList[0].isDefault = true

      const defaultImage = imagesList.find((img) => img.isDefault) || imagesList[0]
      const imageUrl = defaultImage.url
      const imageAlt = defaultImage.alt

      const now = new Date().toISOString()
      const publishedDate = new Date().toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })

      await run(
        `INSERT INTO news
           (title, excerpt, summary, domainImperative, aiTechImperative,
            category, source, status,
            url, imageUrl, imageAlt, tags, publishedDate,
            aiScore, batchId, images,
            createdBy, updatedBy, createdDate, updatedDate)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, 'agent', 'agent', ?, ?)`,
        [
          clamp(cleanedTitle, MAX_TITLE),
          clamp(cleanedExcerpt || cleanedTitle, MAX_EXCERPT),
          clamp(aiContent.summary, MAX_SUMMARY),
          clamp(aiContent.domainImperative, MAX_IMPERATIVE),
          clamp(aiContent.aiTechImperative, MAX_IMPERATIVE),
          clamp(aiContent.category, MAX_CATEGORY),
          clamp(raw.sourceName || extractSourceName(raw.link), MAX_SOURCE),
          clamp(raw.link, MAX_URL),
          imageUrl || null,
          imageAlt || null,
          clamp(aiContent.tags, MAX_TAGS),
          clamp(publishedDate, MAX_DATE),
          aiContent.aiScore ?? 50,
          batchId,
          JSON.stringify(imagesList),
          now,
          now,
        ],
      )

      results.inserted++
      console.log(`[agent] Inserted (score=${aiContent.aiScore}): "${(aiContent.title || raw.title).slice(0, 60)}"`)
    } catch (err) {
      results.errors++
      console.error('[agent] Failed to process article:', err?.message || err)
    }
  }

  console.log(`[agent] Run complete:`, results)
  return results
}
