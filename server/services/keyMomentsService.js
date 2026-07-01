/**
 * Key Moments ingestion service.
 *
 * Pulls a list of clips from the Mission: AI Possible metadata endpoint,
 * downloads each video file from the S3-backed video endpoint, persists
 * the file under src/assets/keyMoments/, and inserts a row in keyMoments.
 *
 * The upstream metadata shape is intentionally tolerated (lots of variants
 * are unwrapped) so the admin can ingest whatever the AWS API returns.
 */
import { existsSync, mkdirSync, createWriteStream } from 'fs'
import { stat, unlink } from 'fs/promises'
import { join, basename, extname } from 'path'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { config } from '../config/env.js'
import { all, get, run } from '../config/db.js'

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function getKeyMomentsConfig() {
  const base = (config.keyMoments.apiBaseUrl || (process.env.KEYMOMENT_API_BASE_URL || '').trim()).replace(/\/+$/, '')
  const apiKey = config.keyMoments.apiKey || (process.env.KEYMOMENT_API_KEY || '').trim()
  return {
    metadataUrl: base ? `${base}/key-moment-metadata` : '',
    videoBaseUrl: base ? `${base}/presigned-url` : '',
    apiKey,
    assetsDir: config.keyMoments.assetsDir,
  }
}

function parseJsonMaybe(value) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/** Pull the first non-empty value from an object given a list of candidate keys. */
function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k]
    if (v !== undefined && v !== null && v !== '') return v
  }
  return null
}

/** Coerce the upstream metadata payload into a plain array of clip objects. */
function normalizeMetadataPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    for (const key of ['items', 'data', 'results', 'keyMoments', 'moments', 'clips', 'records']) {
      if (Array.isArray(payload[key])) return payload[key]
    }
    // Sometimes API Gateway wraps the body as a JSON string
    if (typeof payload.body === 'string') {
      try { return normalizeMetadataPayload(JSON.parse(payload.body)) } catch { /* ignore */ }
    }
  }
  return []
}

/** Extract the canonical fields we care about from a single metadata entry. */
function shapeClip(raw) {
  const s3Path = pick(raw, ['s3Path', 's3_path', 's3Key', 's3_key', 'videoKey', 'key', 'path', 'videoPath'])
  const externalId = pick(raw, ['id', 'momentId', 'clipId', 'uuid', 'eventId']) ?? s3Path
  const title = pick(raw, ['title', 'titles', 'name', 'headline', 'caption']) ?? ''
  const description = pick(raw, ['description', 'summary', 'text', 'transcript', 'caption', 'subtitle']) ?? ''
  const category = pick(raw, ['category', 'topic', 'type', 'sport', 'genre']) ?? ''
  const domain = pick(raw, ['domain', 'domainName', 'source', 'sourceName', 'channel', 'channelName', 'network', 'show', 'program']) ?? ''
  const thumbnailUrl = pick(raw, ['thumbnail', 'thumbnailUrl', 'image', 'imageUrl', 'poster'])
  const durationSeconds = Number(pick(raw, ['duration', 'durationSeconds', 'lengthSeconds', 'length']))
    || Math.max(0, Number(raw?.end_time ?? 0) - Number(raw?.start_time ?? 0))
    || null
  const capturedAt = pick(raw, ['timestamp', 'capturedAt', 'createdAt', 'startTime', 'eventTime'])
    ?? pick(raw, ['start_time'])
  let tags = pick(raw, ['tags', 'hashtags', 'subtopics', 'labels', 'keywords'])
  if (Array.isArray(tags)) tags = tags.join(', ')
  else if (tags && typeof tags === 'object') tags = Object.values(tags).join(', ')
  return {
    externalId: externalId != null ? String(externalId) : null,
    title: String(title).slice(0, 500),
    description: String(description).slice(0, 8000),
    category: String(category).slice(0, 100),
    domain: String(domain || deriveDomainFromS3Path(s3Path)).slice(0, 255),
    thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : null,
    s3Path: s3Path ? String(s3Path) : '',
    durationSeconds,
    capturedAt: capturedAt ? String(capturedAt) : null,
    tags: tags ? String(tags).slice(0, 500) : '',
  }
}

function parseS3Path(s3Path) {
  const match = String(s3Path || '').match(/^s3:\/\/([^/]+)\/(.+)$/i)
  if (!match) return { bucket: '', key: '' }
  return { bucket: match[1], key: match[2] }
}

function deriveDomainFromS3Path(s3Path) {
  const { key } = parseS3Path(s3Path)
  const firstSegment = String(key || '').split('/').filter(Boolean)[0] || ''
  return firstSegment
}

function extractPlaybackUrl(payload) {
  const value = parseJsonMaybe(payload)
  if (!value) return ''
  if (typeof value === 'string') {
    return /^https?:\/\//i.test(value.trim()) ? value.trim() : ''
  }
  if (typeof value?.body === 'string') {
    const nested = extractPlaybackUrl(value.body)
    if (nested) return nested
  }
  if (value?.data) {
    const nested = extractPlaybackUrl(value.data)
    if (nested) return nested
  }
  for (const key of ['url', 'playbackUrl', 'videoUrl', 'presignedUrl', 'presigned_url', 'signedUrl', 'signed_url', 'downloadUrl', 'download_url']) {
    const candidate = value?.[key]
    if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate.trim())) {
      return candidate.trim()
    }
  }
  return ''
}

async function requestPresignedVideoUrl(videoBaseUrl, s3Path, apiKey) {
  if (!videoBaseUrl || !s3Path) {
    console.warn(`[keyMoments] presigned URL skipped: videoBaseUrl=${videoBaseUrl ? 'set' : 'MISSING'}, s3Path=${s3Path ? 'set' : 'MISSING'}`)
    return ''
  }

  const headers = {}
  if (apiKey) headers['x-api-key'] = apiKey

  // Try multiple request formats since different API Gateway configs parse bodies differently
  const attempts = [
    // Attempt 1: POST with JSON body (standard)
    () => fetch(videoBaseUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ s3_path: s3Path }),
    }),
    // Attempt 2: POST with query parameter
    () => fetch(`${videoBaseUrl}?s3_path=${encodeURIComponent(s3Path)}`, {
      method: 'POST',
      headers,
    }),
    // Attempt 3: GET with query parameter
    () => fetch(`${videoBaseUrl}?s3_path=${encodeURIComponent(s3Path)}`, {
      method: 'GET',
      headers,
    }),
  ]

  for (let i = 0; i < attempts.length; i++) {
    try {
      const res = await attempts[i]()
      const text = await res.text()
      if (!res.ok) {
        if (i === 0) console.warn(`[keyMoments] presigned URL attempt ${i + 1} returned ${res.status}: ${text.slice(0, 200)}`)
        continue
      }
      const url = extractPlaybackUrl(text)
      if (url) {
        if (i > 0) console.log(`[keyMoments] presigned URL succeeded on attempt ${i + 1} for s3Path=${s3Path}`)
        return url
      }
      console.warn(`[keyMoments] presigned URL attempt ${i + 1} returned OK but no URL extracted: ${text.slice(0, 200)}`)
    } catch (err) {
      console.error(`[keyMoments] presigned URL attempt ${i + 1} failed for s3Path=${s3Path}:`, err.message)
    }
  }

  console.error(`[keyMoments] all presigned URL attempts failed for s3Path=${s3Path}`)
  return ''
}

function buildCandidateVideoUrls(videoBase, s3Path) {
  const urls = new Set()
  if (/^https?:\/\//i.test(s3Path)) urls.add(s3Path)

  const { bucket, key } = parseS3Path(s3Path)
  const base = String(videoBase || '').replace(/\/+$/, '')

  if (base && key) {
    urls.add(`${base}/${key}`)
    urls.add(`${base}/${basename(key)}`)
    urls.add(`${base}/?s3_path=${encodeURIComponent(s3Path)}`)
    urls.add(`${base}/video?s3_path=${encodeURIComponent(s3Path)}`)
    urls.add(`${base}/key-moment-video?s3_path=${encodeURIComponent(s3Path)}`)
  }

  if (bucket && key) {
    urls.add(`https://${bucket}.s3.us-east-2.amazonaws.com/${key}`)
    urls.add(`https://${bucket}.s3.amazonaws.com/${key}`)
  }

  return [...urls]
}

function sanitizeFilenameFromPath(s3Path, externalId) {
  const tail = basename(s3Path || '') || `${externalId || 'clip'}.mp4`
  const ext = extname(tail) || '.mp4'
  const stem = tail.slice(0, tail.length - ext.length).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
  return `${stem || 'clip'}-${Date.now()}${ext}`
}

async function downloadVideo(url, destPath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Video download failed (${res.status}): ${url}`)
  ensureDir(join(destPath, '..'))
  const tmp = `${destPath}.part`
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp))
  // rename atomically
  const { rename } = await import('fs/promises')
  await rename(tmp, destPath)
}

async function tryDownloadVideo(urls, destPath) {
  const errors = []
  for (const url of urls) {
    try {
      await downloadVideo(url, destPath)
      return { ok: true, url }
    } catch (err) {
      errors.push(err.message)
    }
  }
  return { ok: false, url: urls[0] || '', error: errors[errors.length - 1] || 'No video URL candidates found' }
}

export async function resolveKeyMomentPlaybackUrl(moment) {
  if (moment?.localVideoUrl) return moment.localVideoUrl

  const { videoBaseUrl, apiKey } = getKeyMomentsConfig()
  const presignedUrl = await requestPresignedVideoUrl(videoBaseUrl, moment?.s3Path, apiKey)
  if (presignedUrl) return presignedUrl

  if (moment?.remoteVideoUrl && /^https?:\/\//i.test(moment.remoteVideoUrl)) {
    return moment.remoteVideoUrl
  }

  console.warn(`[keyMoments] no presigned or remote URL for moment id=${moment?.id}, s3Path=${moment?.s3Path} â€” fallback to candidate URLs`)
  const candidates = buildCandidateVideoUrls(videoBaseUrl, moment?.s3Path)
  return candidates[0] || ''
}

/**
 * Diagnostic function: tests every step of playback resolution and returns a detailed report.
 */
export async function diagnosePlayback(moment) {
  const result = {
    s3Path: moment?.s3Path || null,
    localVideoUrl: moment?.localVideoUrl || null,
    remoteVideoUrl: moment?.remoteVideoUrl || null,
    steps: [],
  }

  // Step 1: local
  if (moment?.localVideoUrl) {
    result.steps.push({ step: 'localVideoUrl', value: moment.localVideoUrl, note: 'Would redirect to this' })
    result.resolvedUrl = moment.localVideoUrl
    return result
  }
  result.steps.push({ step: 'localVideoUrl', value: null, note: 'Not available â€” video not downloaded during ingest' })

  // Step 2: presigned URL
  const { videoBaseUrl, apiKey } = getKeyMomentsConfig()
  result.config = { videoBaseUrl: videoBaseUrl || 'NOT SET', apiKeySet: !!apiKey }

  if (!videoBaseUrl || !moment?.s3Path) {
    result.steps.push({ step: 'presignedUrl', error: `Skipped: videoBaseUrl=${videoBaseUrl ? 'set' : 'MISSING'}, s3Path=${moment?.s3Path ? 'set' : 'MISSING'}` })
  } else {
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (apiKey) headers['x-api-key'] = apiKey
      const res = await fetch(videoBaseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ s3_path: moment.s3Path }),
      })
      const text = await res.text()
      result.steps.push({
        step: 'presignedUrl',
        endpoint: videoBaseUrl,
        requestBody: { s3_path: moment.s3Path },
        responseStatus: res.status,
        responseBody: text.slice(0, 500),
      })
      if (res.ok) {
        const extracted = extractPlaybackUrl(text)
        result.steps.push({ step: 'extractPlaybackUrl', extractedUrl: extracted || 'EMPTY â€” could not parse URL from response' })
        if (extracted) {
          // Test if the URL actually works
          try {
            const probe = await fetch(extracted, { method: 'HEAD' })
            result.steps.push({ step: 'probePresignedUrl', url: extracted.slice(0, 200), status: probe.status, ok: probe.ok })
          } catch (e) {
            result.steps.push({ step: 'probePresignedUrl', url: extracted.slice(0, 200), error: e.message })
          }
          result.resolvedUrl = extracted
          return result
        }
      }
    } catch (err) {
      result.steps.push({ step: 'presignedUrl', error: err.message })
    }
  }

  // Step 3: remoteVideoUrl
  if (moment?.remoteVideoUrl && /^https?:\/\//i.test(moment.remoteVideoUrl)) {
    result.steps.push({ step: 'remoteVideoUrl', value: moment.remoteVideoUrl })
    result.resolvedUrl = moment.remoteVideoUrl
    return result
  }
  result.steps.push({ step: 'remoteVideoUrl', value: moment?.remoteVideoUrl || null, note: 'Not a valid URL' })

  // Step 4: candidate URLs
  const candidates = buildCandidateVideoUrls(videoBaseUrl, moment?.s3Path)
  result.steps.push({ step: 'candidateUrls', candidates: candidates.slice(0, 5) })
  result.resolvedUrl = candidates[0] || ''

  return result
}

/**
 * Two-phase ingest:
 *   Phase 1 â€” fetch metadata list, insert new rows (deduped by externalId), status=pending.
 *   Phase 2 â€” for each newly inserted row, download video from S3 and UPDATE localVideoUrl.
 *
 * @param {{ limit?: number, force?: boolean }} [options]
 * @returns {Promise<{fetched:number, inserted:number, downloaded:number, skippedVideo:number, skipped:number, failed:number, errors:string[]}>}
 */
export async function runKeyMomentsIngest({ limit = 25, force = false } = {}) {
  const { metadataUrl, videoBaseUrl: videoBase, apiKey, assetsDir } = getKeyMomentsConfig()

  if (!metadataUrl) throw new Error('KEYMOMENT_METADATA_URL is not configured')
  if (!videoBase)   throw new Error('KEYMOMENT_VIDEO_URL is not configured')

  ensureDir(assetsDir)

  // â”€â”€ Phase 1: fetch metadata, insert new rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchHeaders = {}
  if (apiKey) fetchHeaders['x-api-key'] = apiKey
  const res = await fetch(metadataUrl, { headers: fetchHeaders })
  if (!res.ok) throw new Error(`Metadata fetch failed (${res.status})`)
  const payload = await res.json()
  const items = normalizeMetadataPayload(payload).slice(0, Math.max(1, Math.min(limit, 100)))

  const summary = { fetched: items.length, inserted: 0, downloaded: 0, skippedVideo: 0, skipped: 0, failed: 0, errors: [] }
  const now = new Date().toISOString()

  const newRows = []

  for (const raw of items) {
    try {
      const clip = shapeClip(raw)
      if (!clip.s3Path) {
        summary.skipped++
        summary.errors.push(`Skipped item without s3 path: ${JSON.stringify(raw).slice(0, 120)}`)
        continue
      }

      if (!force && clip.externalId) {
        const existing = await get('SELECT id FROM "keyMoments" WHERE "externalId" = ?', [clip.externalId])
        if (existing) { summary.skipped++; continue }
      }

      const result = await run(
        `INSERT INTO "keyMoments"
          ("externalId", title, description, category, domain, tags, "thumbnailUrl", "s3Path",
           "remoteVideoUrl", "localVideoUrl", "durationSeconds", "capturedAt", "rawMetadata",
           status, "fetchedAt", "createdDate", "updatedDate")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          clip.externalId,
          clip.title || basename(clip.s3Path, extname(clip.s3Path)),
          clip.description,
          clip.category,
          clip.domain,
          clip.tags,
          clip.thumbnailUrl,
          clip.s3Path,
          '',    // remoteVideoUrl â€” filled in phase 2
          null,  // localVideoUrl  â€” filled in phase 2
          clip.durationSeconds,
          clip.capturedAt,
          JSON.stringify(raw).slice(0, 20000),
          now, now, now,
        ],
      )
      summary.inserted++
      newRows.push({ id: result.lastInsertRowid, s3Path: clip.s3Path })
    } catch (err) {
      summary.failed++
      summary.errors.push(err.message)
    }
  }

  // â”€â”€ Phase 2: download video for each newly inserted row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (const { id, s3Path } of newRows) {
    try {
      const presignedUrl = await requestPresignedVideoUrl(videoBase, s3Path, apiKey)
      const candidateUrls = [...new Set([presignedUrl, ...buildCandidateVideoUrls(videoBase, s3Path)].filter(Boolean))]
      const filename = sanitizeFilenameFromPath(s3Path, id)
      const dest = join(assetsDir, filename)

      const download = await tryDownloadVideo(candidateUrls, dest)

      await run(
        `UPDATE "keyMoments" SET "remoteVideoUrl" = ?, "localVideoUrl" = ?, "updatedDate" = ? WHERE id = ?`,
        [download.url, download.ok ? `/uploads/key-moments/${filename}` : null, new Date().toISOString(), id],
      )

      if (download.ok) {
        summary.downloaded++
      } else {
        summary.skippedVideo++
        summary.errors.push(`Video download failed for id=${id} (${s3Path}): ${download.error}`)
      }
    } catch (err) {
      summary.skippedVideo++
      summary.errors.push(`Video update failed for id=${id}: ${err.message}`)
    }
  }

  return summary
}

/** Remove the on-disk video file referenced by a key moment row. Best-effort. */
export async function deleteKeyMomentFile(localVideoUrl) {
  if (!localVideoUrl) return
  const prefix = '/uploads/key-moments/'
  if (!localVideoUrl.startsWith(prefix)) return
  const filename = localVideoUrl.slice(prefix.length)
  if (!filename || filename.includes('/') || filename.includes('..')) return
  const full = join(config.keyMoments.assetsDir, filename)
  try {
    const s = await stat(full)
    if (s.isFile()) await unlink(full)
  } catch { /* file already gone â€” ignore */ }
}

export async function listAllKeyMoments() {
  return all(
    `SELECT id, "externalId", title, description, category, domain, tags, "thumbnailUrl",
            "s3Path", "remoteVideoUrl", "localVideoUrl", "durationSeconds", "capturedAt", "rawMetadata",
            status, "reviewedBy", "reviewedAt", "fetchedAt", views, likes, shares, "createdDate", "updatedDate"
       FROM "keyMoments"
      ORDER BY "fetchedAt" DESC, id DESC`,
  )
}

export async function listApprovedKeyMoments() {
  return all(
    `SELECT id, "externalId", title, description, category, domain, tags, "thumbnailUrl",
            "s3Path", "remoteVideoUrl", "localVideoUrl", "durationSeconds", "capturedAt", "rawMetadata",
            status, "fetchedAt", views, likes, shares, "createdDate", "updatedDate"
       FROM "keyMoments"
      WHERE status = 'approved'
      ORDER BY "fetchedAt" DESC, id DESC`,
  )
}

