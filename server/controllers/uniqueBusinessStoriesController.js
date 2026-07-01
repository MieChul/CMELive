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
  } catch { /* already gone â€” ignore */ }
}

/** Accepts http(s) absolute URLs OR site-relative paths under /uploads or /news-images. */
const isSafeMediaUrl = (url) => {
  if (typeof url !== 'string') return false
  const s = url.trim()
  if (/^\/(uploads|news-images)\//.test(s)) return true
  try {
    const u = new URL(s)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch { return false }
}

function serialize(t) {
  return {
    id: t.id,
    heading: t.heading,
    subheading: t.subheading || '',
    domain: t.domain || '',
    imageUrl: t.imageUrl || null,
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

  if (need('heading')) {
    const v = String(body.heading ?? '').trim()
    if (!v) errors.push('heading is required')
    else if (v.length > 255) errors.push('heading must be 255 characters or fewer')
    else out.heading = v
  }
  if (has('subheading')) {
    out.subheading = String(body.subheading ?? '').trim().slice(0, 500)
  }
  if (has('domain')) {
    out.domain = String(body.domain ?? '').trim().slice(0, 120)
  }
  if (need('imageUrl')) {
    const v = body.imageUrl == null ? '' : String(body.imageUrl).trim()
    if (!v) errors.push('imageUrl (image) is required')
    else if (!isSafeMediaUrl(v)) errors.push('imageUrl must be an http(s) URL or uploaded path')
    else out.imageUrl = v
  } else if (has('imageUrl')) {
    const v = body.imageUrl == null ? '' : String(body.imageUrl).trim()
    if (!v) errors.push('imageUrl (image) is required')
    else if (!isSafeMediaUrl(v)) errors.push('imageUrl must be an http(s) URL or uploaded path')
    else out.imageUrl = v
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
        ? true
        : false
  }
  return { errors, value: out }
}

const SELECT_COLS = `id, heading, subheading, domain, "imageUrl",
                     "displayOrder", "isActive", "createdDate", "updatedDate"`

/** Public â€” homepage Unique Business section. Active only, sorted by displayOrder. */
export async function listPublicStories(req, res) {
  try {
    const rows = await all(
      `SELECT ${SELECT_COLS}
       FROM uniqueBusinessStories
       WHERE "isActive" = true
       ORDER BY "displayOrder", id DESC`,
    )
    return res.json({ ok: true, stories: rows.map(serialize) })
  } catch (err) {
    console.error('[uniqueBusinessStories] public list failed:', err)
    return res.status(500).json({ error: 'Failed to load stories' })
  }
}

/** Admin â€” list all (active + inactive). */
export async function listAllStories(req, res) {
  try {
    const rows = await all(
      `SELECT ${SELECT_COLS}
       FROM uniqueBusinessStories
       ORDER BY "displayOrder", id DESC`,
    )
    return res.json({ ok: true, stories: rows.map(serialize) })
  } catch (err) {
    console.error('[uniqueBusinessStories] admin list failed:', err)
    return res.status(500).json({ error: 'Failed to load stories' })
  }
}

export async function createStory(req, res) {
  const { errors, value } = validate(req.body || {}, { partial: false })
  if (errors.length) return res.status(400).json({ error: errors.join('; ') })

  try {
    const order = value.displayOrder ?? 0
    const clash = await get(
      'SELECT id FROM uniqueBusinessStories WHERE "displayOrder" = ?',
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
      `INSERT INTO uniqueBusinessStories
       (heading, subheading, domain, "imageUrl",
        "displayOrder", "isActive", "createdDate", "createdBy", "updatedDate", "updatedBy")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        value.heading,
        value.subheading ?? '',
        value.domain ?? '',
        value.imageUrl,
        order,
        value.isActive ?? true,
        now, actor, now, actor,
      ],
    )
    const row = await get(
      `SELECT ${SELECT_COLS} FROM uniqueBusinessStories WHERE id = ?`,
      [r.lastInsertRowid],
    )
    return res.status(201).json({ ok: true, story: serialize(row) })
  } catch (err) {
    console.error('[uniqueBusinessStories] create failed:', err)
    return res.status(500).json({ error: 'Failed to create story' })
  }
}

const STORY_FIELD_SQL = {
  heading:      '"heading" = ?',
  subheading:   '"subheading" = ?',
  domain:       '"domain" = ?',
  imageUrl:     '"imageUrl" = ?',
  displayOrder: '"displayOrder" = ?',
  isActive:     '"isActive" = ?',
}

export async function updateStory(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })

  const { errors, value } = validate(req.body || {}, { partial: true })
  if (errors.length) return res.status(400).json({ error: errors.join('; ') })

  const fields = Object.keys(value)
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' })

  try {
    const existing = await get('SELECT id, "imageUrl" FROM uniqueBusinessStories WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'Story not found' })

    if (Object.prototype.hasOwnProperty.call(value, 'displayOrder')) {
      const clash = await get(
        'SELECT id FROM uniqueBusinessStories WHERE "displayOrder" = ? AND id <> ?',
        [value.displayOrder, id],
      )
      if (clash) {
        return res.status(409).json({
          error: `Display order ${value.displayOrder} is already in use. Choose a unique number.`,
        })
      }
    }

    await run(
      `UPDATE uniqueBusinessStories SET
        "heading"      = COALESCE(?, "heading"),
        "subheading"   = COALESCE(?, "subheading"),
        "domain"       = COALESCE(?, "domain"),
        "imageUrl"     = COALESCE(?, "imageUrl"),
        "displayOrder" = COALESCE(?, "displayOrder"),
        "isActive"     = COALESCE(?, "isActive"),
        "updatedDate"  = ?,
        "updatedBy"    = ?
       WHERE id = ?`,
      [
        value.heading      ?? null,
        value.subheading   ?? null,
        value.domain       ?? null,
        value.imageUrl     ?? null,
        value.displayOrder ?? null,
        value.isActive     ?? null,
        new Date().toISOString(),
        req.user?.email ?? 'admin',
        id,
      ],
    )

    if (Object.prototype.hasOwnProperty.call(value, 'imageUrl') && existing.imageUrl && existing.imageUrl !== value.imageUrl) {
      await deleteUploadedFile(existing.imageUrl)
    }

    const row = await get(
      `SELECT ${SELECT_COLS} FROM uniqueBusinessStories WHERE id = ?`,
      [id],
    )
    return res.json({ ok: true, story: serialize(row) })
  } catch (err) {
    console.error('[uniqueBusinessStories] update failed:', err)
    return res.status(500).json({ error: 'Failed to update story' })
  }
}

export async function deleteStory(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })
  try {
    const existing = await get('SELECT id, "imageUrl" FROM uniqueBusinessStories WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'Story not found' })
    await run('DELETE FROM uniqueBusinessStories WHERE id = ?', [id])
    await deleteUploadedFile(existing.imageUrl)
    return res.json({ ok: true })
  } catch (err) {
    console.error('[uniqueBusinessStories] delete failed:', err)
    return res.status(500).json({ error: 'Failed to delete story' })
  }
}

