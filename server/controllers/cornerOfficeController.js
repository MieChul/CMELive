import { unlink, stat } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { all, get, run } from '../config/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOAD_ROOT = join(__dirname, '..', 'uploads')

async function deleteUploadedFile(url) {
  if (!url || typeof url !== 'string') return
  const prefix = '/uploads/'
  if (!url.startsWith(prefix)) return
  const rel = url.slice(prefix.length)
  if (!rel || rel.includes('..') || rel.includes('\0')) return
  const full = join(UPLOAD_ROOT, rel)
  try {
    const s = await stat(full)
    if (s.isFile()) await unlink(full)
  } catch { /* already gone — ignore */ }
}

/** Accepts http(s) absolute URLs OR site-relative paths under /uploads. */
const isSafeMediaUrl = (url) => {
  if (typeof url !== 'string') return false
  const s = url.trim()
  if (/^\/(uploads|news-images)\//.test(s)) return true
  try {
    const u = new URL(s)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch { return false }
}

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
// Permissive but bounded: hex, rgb(a), or simple css color keyword (letters only).
const isSafeColor = (v) => {
  const s = String(v).trim()
  if (!s || s.length > 60) return false
  if (HEX_COLOR.test(s)) return true
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i.test(s)) return true
  if (/^[a-zA-Z]{3,30}$/.test(s)) return true
  return false
}

function serialize(t) {
  return {
    id: t.id,
    title: t.title,
    subtitle: t.subtitle || '',
    imageUrl: t.imageUrl || null,
    videoUrl: t.videoUrl || null,
    numberColor: t.numberColor || '#F2665B',
    borderColor: t.borderColor || 'rgba(89,22,139,0.3)',
    displayOrder: Number(t.displayOrder ?? 0),
    isActive: !!t.isActive,
    createdDate: t.createdDate,
    updatedDate: t.updatedDate,
  }
}

function validate(body, { partial = false } = {}) {
  const errors = []
  const out = {}
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k)
  const need = (k) => !partial || has(k)

  if (need('title')) {
    const v = String(body.title ?? '').trim()
    if (!v) errors.push('title is required')
    else if (v.length > 255) errors.push('title must be 255 characters or fewer')
    else out.title = v
  }
  if (has('subtitle')) {
    out.subtitle = String(body.subtitle ?? '').trim().slice(0, 500)
  }
  if (need('imageUrl')) {
    const v = body.imageUrl == null ? '' : String(body.imageUrl).trim()
    if (!v) errors.push('imageUrl (cover image) is required')
    else if (!isSafeMediaUrl(v)) errors.push('imageUrl must be an http(s) URL or uploaded path')
    else out.imageUrl = v
  } else if (has('imageUrl')) {
    const v = body.imageUrl == null ? '' : String(body.imageUrl).trim()
    if (!v) errors.push('imageUrl (cover image) is required')
    else if (!isSafeMediaUrl(v)) errors.push('imageUrl must be an http(s) URL or uploaded path')
    else out.imageUrl = v
  }
  if (need('videoUrl')) {
    const v = body.videoUrl == null ? '' : String(body.videoUrl).trim()
    if (!v) errors.push('videoUrl is required')
    else if (!isSafeMediaUrl(v)) errors.push('videoUrl must be an http(s) URL or uploaded path')
    else out.videoUrl = v
  } else if (has('videoUrl')) {
    const v = body.videoUrl == null ? '' : String(body.videoUrl).trim()
    if (!v) errors.push('videoUrl is required')
    else if (!isSafeMediaUrl(v)) errors.push('videoUrl must be an http(s) URL or uploaded path')
    else out.videoUrl = v
  }
  if (has('numberColor')) {
    const v = String(body.numberColor ?? '').trim()
    if (v && !isSafeColor(v)) errors.push('numberColor must be a valid CSS color')
    else out.numberColor = v || '#F2665B'
  }
  if (has('borderColor')) {
    const v = String(body.borderColor ?? '').trim()
    if (v && !isSafeColor(v)) errors.push('borderColor must be a valid CSS color')
    else out.borderColor = v || 'rgba(89,22,139,0.3)'
  }
  if (has('displayOrder')) {
    const n = Number(body.displayOrder)
    if (!Number.isFinite(n)) errors.push('displayOrder must be a number')
    else out.displayOrder = Math.max(0, Math.min(9999, Math.trunc(n)))
  }
  if (has('isActive')) {
    out.isActive =
      body.isActive === true ||
      body.isActive === 1 ||
      body.isActive === '1' ||
      body.isActive === 'true'
        ? 1
        : 0
  }
  return { errors, value: out }
}

const SELECT_COLS = `id, title, subtitle, imageUrl, videoUrl, numberColor, borderColor,
                     displayOrder, isActive, createdDate, updatedDate`

/** Public — homepage Corner Office section. Active only, sorted by displayOrder. */
export async function listPublicConversations(req, res) {
  try {
    const rows = await all(
      `SELECT ${SELECT_COLS}
       FROM cornerOfficeConversations
       WHERE isActive = 1
       ORDER BY displayOrder, id DESC`,
    )
    return res.json({ ok: true, conversations: rows.map(serialize) })
  } catch (err) {
    console.error('[cornerOffice] public list failed:', err)
    return res.status(500).json({ error: 'Failed to load conversations' })
  }
}

/** Admin — list all (active + inactive). */
export async function listAllConversations(req, res) {
  try {
    const rows = await all(
      `SELECT ${SELECT_COLS}
       FROM cornerOfficeConversations
       ORDER BY displayOrder, id DESC`,
    )
    return res.json({ ok: true, conversations: rows.map(serialize) })
  } catch (err) {
    console.error('[cornerOffice] admin list failed:', err)
    return res.status(500).json({ error: 'Failed to load conversations' })
  }
}

export async function createConversation(req, res) {
  const { errors, value } = validate(req.body || {}, { partial: false })
  if (errors.length) return res.status(400).json({ error: errors.join('; ') })

  try {
    const order = value.displayOrder ?? 0
    const clash = await get(
      'SELECT id FROM cornerOfficeConversations WHERE displayOrder = ?',
      [order],
    )
    if (clash) {
      return res.status(409).json({
        error: `Display order ${order} is already in use. Choose a unique number.`,
      })
    }

    const now = new Date().toISOString()
    const actor = req.user?.email ?? 'admin'
    const r = await run(
      `INSERT INTO cornerOfficeConversations
       (title, subtitle, imageUrl, videoUrl, numberColor, borderColor,
        displayOrder, isActive, createdDate, createdBy, updatedDate, updatedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        value.title,
        value.subtitle ?? '',
        value.imageUrl,
        value.videoUrl,
        value.numberColor ?? '#F2665B',
        value.borderColor ?? 'rgba(89,22,139,0.3)',
        order,
        value.isActive ?? 1,
        now, actor, now, actor,
      ],
    )
    const row = await get(
      `SELECT ${SELECT_COLS} FROM cornerOfficeConversations WHERE id = ?`,
      [r.lastInsertRowid],
    )
    return res.status(201).json({ ok: true, conversation: serialize(row) })
  } catch (err) {
    console.error('[cornerOffice] create failed:', err)
    return res.status(500).json({ error: 'Failed to create conversation' })
  }
}

export async function updateConversation(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })

  const { errors, value } = validate(req.body || {}, { partial: true })
  if (errors.length) return res.status(400).json({ error: errors.join('; ') })

  const fields = Object.keys(value)
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' })

  try {
    const existing = await get('SELECT id, imageUrl, videoUrl FROM cornerOfficeConversations WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'Conversation not found' })

    if (Object.prototype.hasOwnProperty.call(value, 'displayOrder')) {
      const clash = await get(
        'SELECT id FROM cornerOfficeConversations WHERE displayOrder = ? AND id <> ?',
        [value.displayOrder, id],
      )
      if (clash) {
        return res.status(409).json({
          error: `Display order ${value.displayOrder} is already in use. Choose a unique number.`,
        })
      }
    }

    const set = fields.map((k) => `${k} = ?`).join(', ')
    const params = fields.map((k) => value[k])
    params.push(new Date().toISOString(), req.user?.email ?? 'admin', id)

    await run(
      `UPDATE cornerOfficeConversations SET ${set}, updatedDate = ?, updatedBy = ? WHERE id = ?`,
      params,
    )

    if (Object.prototype.hasOwnProperty.call(value, 'imageUrl') && existing.imageUrl && existing.imageUrl !== value.imageUrl) {
      await deleteUploadedFile(existing.imageUrl)
    }
    if (Object.prototype.hasOwnProperty.call(value, 'videoUrl') && existing.videoUrl && existing.videoUrl !== value.videoUrl) {
      await deleteUploadedFile(existing.videoUrl)
    }

    const row = await get(
      `SELECT ${SELECT_COLS} FROM cornerOfficeConversations WHERE id = ?`,
      [id],
    )
    return res.json({ ok: true, conversation: serialize(row) })
  } catch (err) {
    console.error('[cornerOffice] update failed:', err)
    return res.status(500).json({ error: 'Failed to update conversation' })
  }
}

export async function deleteConversation(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })
  try {
    const existing = await get('SELECT id, imageUrl, videoUrl FROM cornerOfficeConversations WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'Conversation not found' })
    await run('DELETE FROM cornerOfficeConversations WHERE id = ?', [id])
    await deleteUploadedFile(existing.imageUrl)
    await deleteUploadedFile(existing.videoUrl)
    return res.json({ ok: true })
  } catch (err) {
    console.error('[cornerOffice] delete failed:', err)
    return res.status(500).json({ error: 'Failed to delete conversation' })
  }
}
