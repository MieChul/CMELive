import { get, run } from '../config/db.js'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import {
  runKeyMomentsIngest,
  listAllKeyMoments,
  listApprovedKeyMoments,
  resolveKeyMomentPlaybackUrl,
  deleteKeyMomentFile,
  diagnosePlayback,
} from '../services/keyMomentsService.js'

const ALLOWED_STATUS = new Set(['pending', 'approved', 'rejected'])

function parseMetadata(rawMetadata) {
  if (!rawMetadata) return null
  if (typeof rawMetadata === 'object') return rawMetadata
  try {
    return JSON.parse(rawMetadata)
  } catch {
    return null
  }
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function normalizeKeyMomentMetadata(row) {
  const raw = parseMetadata(row?.rawMetadata) || {}
  const topic = String(raw.topic || row?.category || '').trim()
  const subtopics = toStringArray(raw.subtopics)
  const entities = toStringArray(raw.entities)
  const hashtags = toStringArray(raw.hashtags || raw.tags)
  const transcript = String(raw.text || raw.transcript || '').trim()
  const summary = String(raw.summary || row?.description || '').trim()
  const sentiment = String(raw.sentiment || '').trim().toLowerCase() || null
  const decisionSource = String(raw.decision_source || raw.decisionSource || '').trim() || null
  const clipNumber = Number(raw.clip_number ?? raw.clipNumber)
  const startTime = Number(raw.start_time ?? raw.startTime)
  const endTime = Number(raw.end_time ?? raw.endTime)

  return {
    topic,
    subtopics,
    entities,
    hashtags,
    transcript,
    text: transcript,
    summary,
    sentiment,
    decisionSource,
    clipNumber: Number.isFinite(clipNumber) ? clipNumber : null,
    startTime: Number.isFinite(startTime) ? startTime : null,
    endTime: Number.isFinite(endTime) ? endTime : null,
    raw,
  }
}

function withPlaybackPath(row, playbackUrl) {
  return {
    ...row,
    playbackUrl,
  }
}

function serialize(r) {
  if (!r) return null
  const metadata = normalizeKeyMomentMetadata(r)
  return {
    id: r.id,
    externalId: r.externalId || null,
    title: r.title || '',
    description: r.description || '',
    category: r.category || '',
    domain: r.domain || '',
    tags: r.tags || '',
    thumbnailUrl: r.thumbnailUrl || null,
    s3Path: r.s3Path || '',
    remoteVideoUrl: r.remoteVideoUrl || '',
    localVideoUrl: r.localVideoUrl || null,
    playbackUrl: r.playbackUrl || null,
    metadata,
    durationSeconds: r.durationSeconds ?? null,
    capturedAt: r.capturedAt || null,
    status: r.status || 'pending',
    reviewedBy: r.reviewedBy || null,
    reviewedAt: r.reviewedAt || null,
    fetchedAt: r.fetchedAt,
    createdDate: r.createdDate,
    updatedDate: r.updatedDate,
    views: r.views ?? 0,
    likes: r.likes ?? 0,
    shares: r.shares ?? 0,
  }
}

function serializePublic(r) {
  if (!r) return null
  const metadata = normalizeKeyMomentMetadata(r)
  return {
    id: r.id,
    title: r.title || '',
    description: r.description || '',
    category: r.category || '',
    domain: r.domain || '',
    tags: r.tags || '',
    thumbnailUrl: r.thumbnailUrl || null,
    playbackUrl: r.playbackUrl || null,
    metadata,
    durationSeconds: r.durationSeconds ?? null,
    capturedAt: r.capturedAt || null,
    createdDate: r.createdDate,
    views: r.views ?? 0,
    likes: r.likes ?? 0,
    shares: r.shares ?? 0,
  }
}

async function streamPlaybackResponse(res, playbackUrl, rangeHeader) {
  const headers = {}
  if (rangeHeader) headers.Range = rangeHeader

  const upstream = await fetch(playbackUrl, { headers })
  if (!upstream.ok && upstream.status !== 206) {
    console.error(`[keyMoments] upstream fetch returned ${upstream.status} for URL: ${playbackUrl.slice(0, 200)}`)
    throw new Error(`Playback fetch failed (${upstream.status})`)
  }

  res.status(upstream.status)

  for (const [key, value] of upstream.headers.entries()) {
    if (['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified'].includes(key.toLowerCase())) {
      res.setHeader(key, value)
    }
  }

  if (!res.getHeader('content-type')) {
    res.setHeader('content-type', 'video/mp4')
  }

  await pipeline(Readable.fromWeb(upstream.body), res)
}

export async function listKeyMoments(req, res) {
  try {
    const rows = await listAllKeyMoments()
    return res.json({
      ok: true,
      keyMoments: rows.map((row) => serialize(withPlaybackPath(row, `/api/admin/key-moments/${row.id}/playback`))),
    })
  } catch (err) {
    console.error('[keyMoments] list failed:', err)
    return res.status(500).json({ error: 'Failed to load key moments' })
  }
}

export async function listPublicKeyMoments(req, res) {
  try {
    const rows = await listApprovedKeyMoments()
    return res.json({
      ok: true,
      keyMoments: rows.map((row) => serializePublic(withPlaybackPath(row, `/api/key-moments/${row.id}/playback`))),
    })
  } catch (err) {
    console.error('[keyMoments] public list failed:', err)
    return res.status(500).json({ error: 'Failed to load key moments' })
  }
}

async function getPlaybackRow(id) {
  return get(
    `SELECT id, status, s3Path, remoteVideoUrl, localVideoUrl
       FROM keyMoments
      WHERE id = ?`,
    [id],
  )
}

async function handlePlayback(req, res, { requireApproved }) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })

  const row = await getPlaybackRow(id)
  if (!row || (requireApproved && row.status !== 'approved')) {
    return res.status(404).json({ error: 'Key moment not found' })
  }

  if (row.localVideoUrl) {
    return res.redirect(302, row.localVideoUrl)
  }

  const playbackUrl = await resolveKeyMomentPlaybackUrl(row)
  if (!playbackUrl) {
    return res.status(404).json({ error: 'Playback unavailable' })
  }

  await streamPlaybackResponse(res, playbackUrl, req.headers.range)
}

export async function streamPublicKeyMomentPlayback(req, res) {
  try {
    await handlePlayback(req, res, { requireApproved: true })
  } catch (err) {
    console.error('[keyMoments] playback failed:', err)
    if (res.headersSent) return
    return res.status(502).json({ error: 'Failed to load video playback' })
  }
}

export async function streamAdminKeyMomentPlayback(req, res) {
  try {
    await handlePlayback(req, res, { requireApproved: false })
  } catch (err) {
    console.error('[keyMoments] admin playback failed:', err)
    if (res.headersSent) return
    return res.status(502).json({ error: 'Failed to load video playback' })
  }
}

export async function fetchKeyMoments(req, res) {
  try {
    const limit = Math.max(1, Math.min(Number(req.body?.limit) || 25, 100))
    const force = req.body?.force === true
    const summary = await runKeyMomentsIngest({ limit, force })
    return res.json({ ok: true, summary })
  } catch (err) {
    console.error('[keyMoments] fetch failed:', err)
    return res.status(500).json({ error: err.message || 'Fetch failed' })
  }
}

export async function updateKeyMoment(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })

  const body = req.body || {}
  const fields = []
  const values = []
  const errors = []

  const setStr = (key, max) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const v = body[key] == null ? '' : String(body[key])
      if (v.length > max) errors.push(`${key} must be ${max} characters or fewer`)
      else { fields.push(`${key} = ?`); values.push(v) }
    }
  }
  setStr('title', 500)
  setStr('description', 8000)
  setStr('category', 100)
  setStr('domain', 255)
  setStr('tags', 500)

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    const s = String(body.status).toLowerCase()
    if (!ALLOWED_STATUS.has(s)) errors.push('status must be pending, approved, or rejected')
    else {
      fields.push('status = ?'); values.push(s)
      fields.push('reviewedBy = ?'); values.push(req.user?.email || 'admin')
      fields.push('reviewedAt = ?'); values.push(new Date().toISOString())
    }
  }

  if (errors.length) return res.status(400).json({ error: errors.join('; ') })
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' })

  try {
    const existing = await get('SELECT id FROM keyMoments WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'Key moment not found' })
    values.push(new Date().toISOString(), id)
    await run(
      `UPDATE keyMoments SET ${fields.join(', ')}, updatedDate = ? WHERE id = ?`,
      values,
    )
    const row = await get(
      `SELECT * FROM keyMoments WHERE id = ?`,
      [id],
    )
    return res.json({ ok: true, keyMoment: serialize(row) })
  } catch (err) {
    console.error('[keyMoments] update failed:', err)
    return res.status(500).json({ error: 'Failed to update key moment' })
  }
}

export async function recordKeyMomentView(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })
  try {
    const existing = await get('SELECT id FROM keyMoments WHERE id = ? AND status = ?', [id, 'approved'])
    if (!existing) return res.status(404).json({ error: 'Key moment not found' })
    await run('UPDATE keyMoments SET views = views + 1 WHERE id = ?', [id])
    return res.json({ ok: true })
  } catch (err) {
    console.error('[keyMoments] recordView error:', err)
    return res.status(500).json({ error: 'Failed to record view' })
  }
}

export async function recordKeyMomentShare(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })
  try {
    const existing = await get('SELECT id FROM keyMoments WHERE id = ? AND status = ?', [id, 'approved'])
    if (!existing) return res.status(404).json({ error: 'Key moment not found' })
    await run('UPDATE keyMoments SET shares = shares + 1 WHERE id = ?', [id])
    const updated = await get('SELECT shares FROM keyMoments WHERE id = ?', [id])
    return res.json({ ok: true, shares: updated?.shares ?? 0 })
  } catch (err) {
    console.error('[keyMoments] recordShare error:', err)
    return res.status(500).json({ error: 'Failed to record share' })
  }
}

export async function likeKeyMoment(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })
  try {
    const existing = await get('SELECT id, likes FROM keyMoments WHERE id = ? AND status = ?', [id, 'approved'])
    if (!existing) return res.status(404).json({ error: 'Key moment not found' })

    const unlike = String(req.body?.action || '').toLowerCase() === 'unlike'
    const userId = req.user?.email

    if (userId) {
      if (unlike) {
        const already = await get('SELECT id FROM user_km_likes WHERE userId = ? AND momentId = ?', [userId, id])
        if (already) {
          await run('DELETE FROM user_km_likes WHERE userId = ? AND momentId = ?', [userId, id])
          await run('UPDATE keyMoments SET likes = MAX(0, likes - 1) WHERE id = ?', [id])
        }
      } else {
        const already = await get('SELECT id FROM user_km_likes WHERE userId = ? AND momentId = ?', [userId, id])
        if (!already) {
          await run('INSERT INTO user_km_likes (userId, momentId) VALUES (?, ?)', [userId, id])
          await run('UPDATE keyMoments SET likes = likes + 1 WHERE id = ?', [id])
        }
      }
    } else {
      if (unlike) {
        await run('UPDATE keyMoments SET likes = MAX(0, likes - 1) WHERE id = ?', [id])
      } else {
        await run('UPDATE keyMoments SET likes = likes + 1 WHERE id = ?', [id])
      }
    }

    const updated = await get('SELECT likes FROM keyMoments WHERE id = ?', [id])
    let userLiked = false
    if (userId) {
      const liked = await get('SELECT id FROM user_km_likes WHERE userId = ? AND momentId = ?', [userId, id])
      userLiked = !!liked
    }
    return res.json({ ok: true, likes: updated?.likes ?? 0, userLiked })
  } catch (err) {
    console.error('[keyMoments] likeKeyMoment error:', err)
    return res.status(500).json({ error: 'Failed to update like' })
  }
}

export async function deleteKeyMoment(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })
  try {
    const row = await get('SELECT localVideoUrl FROM keyMoments WHERE id = ?', [id])
    if (!row) return res.status(404).json({ error: 'Key moment not found' })
    await run('DELETE FROM keyMoments WHERE id = ?', [id])
    await deleteKeyMomentFile(row.localVideoUrl)
    return res.json({ ok: true })
  } catch (err) {
    console.error('[keyMoments] delete failed:', err)
    return res.status(500).json({ error: 'Failed to delete key moment' })
  }
}

export async function diagnoseKeyMomentPlayback(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })
  try {
    const row = await get(
      `SELECT id, s3Path, remoteVideoUrl, localVideoUrl, status FROM keyMoments WHERE id = ?`,
      [id],
    )
    if (!row) return res.status(404).json({ error: 'Key moment not found' })
    const diagnosis = await diagnosePlayback(row)
    return res.json({ ok: true, id, ...diagnosis })
  } catch (err) {
    console.error('[keyMoments] diagnose failed:', err)
    return res.status(500).json({ error: err.message })
  }
}
