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

const isSafeUrl = (url) => {
  if (typeof url !== 'string') return false
  try {
    const u = new URL(url.trim())
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch { return false }
}

/** Accepts http(s) absolute URLs OR site-relative paths produced by our /uploads endpoint. */
const isSafeImageUrl = (url) =>
  typeof url === 'string' &&
  (isSafeUrl(url) || /^\/(uploads|news-images)\//.test(url.trim()))

function serialize(t) {
  return {
    id: t.id,
    name: t.name,
    role: t.role || '',
    message: t.message,
    imageUrl: t.imageUrl || null,
    linkedinUrl: t.linkedinUrl || null,
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

  if (need('name')) {
    const v = String(body.name ?? '').trim()
    if (!v) errors.push('name is required')
    else if (v.length > 255) errors.push('name must be 255 characters or fewer')
    else out.name = v
  }
  if (need('message')) {
    const v = String(body.message ?? '').trim()
    if (!v) errors.push('message is required')
    else if (v.length > 4000) errors.push('message must be 4000 characters or fewer')
    else out.message = v
  }
  if (has('role')) {
    out.role = String(body.role ?? '').trim().slice(0, 255)
  }
  if (has('imageUrl')) {
    const v = body.imageUrl == null ? '' : String(body.imageUrl).trim()
    if (v && !isSafeImageUrl(v)) errors.push('imageUrl must be an http(s) URL or uploaded path')
    else out.imageUrl = v || null
  }
  if (has('linkedinUrl')) {
    const v = body.linkedinUrl == null ? '' : String(body.linkedinUrl).trim()
    if (v && !isSafeUrl(v)) errors.push('linkedinUrl must be an http(s) URL')
    else if (v.length > 500) errors.push('linkedinUrl must be 500 characters or fewer')
    else out.linkedinUrl = v || null
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

/** Public — homepage CME Live tab. Active only, sorted by displayOrder. */
export async function listPublicTestimonials(req, res) {
  try {
    const rows = await all(
      `SELECT id, name, role, message, imageUrl, linkedinUrl, displayOrder, isActive,
              createdDate, updatedDate
       FROM testimonials
       WHERE isActive = 1
       ORDER BY displayOrder, id DESC`,
    )
    return res.json({ ok: true, testimonials: rows.map(serialize) })
  } catch (err) {
    console.error('[testimonials] public list failed:', err)
    return res.status(500).json({ error: 'Failed to load testimonials' })
  }
}

/** Admin — list all (active + inactive). */
export async function listAllTestimonials(req, res) {
  try {
    const rows = await all(
      `SELECT id, name, role, message, imageUrl, linkedinUrl, displayOrder, isActive,
              createdDate, updatedDate
       FROM testimonials
       ORDER BY displayOrder, id DESC`,
    )
    return res.json({ ok: true, testimonials: rows.map(serialize) })
  } catch (err) {
    console.error('[testimonials] admin list failed:', err)
    return res.status(500).json({ error: 'Failed to load testimonials' })
  }
}

export async function createTestimonial(req, res) {
  const { errors, value } = validate(req.body || {}, { partial: false })
  if (errors.length) return res.status(400).json({ error: errors.join('; ') })

  try {
    const now = new Date().toISOString()
    const actor = req.user?.email ?? 'admin'
    const r = await run(
      `INSERT INTO testimonials
       (name, role, message, imageUrl, linkedinUrl, displayOrder, isActive,
        createdDate, createdBy, updatedDate, updatedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        value.name,
        value.role ?? '',
        value.message,
        value.imageUrl ?? null,
        value.linkedinUrl ?? null,
        value.displayOrder ?? 0,
        value.isActive ?? 1,
        now, actor, now, actor,
      ],
    )
    const row = await get(
      `SELECT id, name, role, message, imageUrl, linkedinUrl, displayOrder, isActive,
              createdDate, updatedDate
       FROM testimonials WHERE id = ?`,
      [r.lastInsertRowid],
    )
    return res.status(201).json({ ok: true, testimonial: serialize(row) })
  } catch (err) {
    console.error('[testimonials] create failed:', err)
    return res.status(500).json({ error: 'Failed to create testimonial' })
  }
}

export async function updateTestimonial(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })

  const { errors, value } = validate(req.body || {}, { partial: true })
  if (errors.length) return res.status(400).json({ error: errors.join('; ') })

  const fields = Object.keys(value)
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' })

  try {
    const existing = await get('SELECT id, imageUrl FROM testimonials WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'Testimonial not found' })

    const set = fields.map((k) => `${k} = ?`).join(', ')
    const params = fields.map((k) => value[k])
    params.push(new Date().toISOString(), req.user?.email ?? 'admin', id)

    await run(
      `UPDATE testimonials SET ${set}, updatedDate = ?, updatedBy = ? WHERE id = ?`,
      params,
    )

    if (Object.prototype.hasOwnProperty.call(value, 'imageUrl') && existing.imageUrl && existing.imageUrl !== value.imageUrl) {
      await deleteUploadedFile(existing.imageUrl)
    }

    const row = await get(
      `SELECT id, name, role, message, imageUrl, linkedinUrl, displayOrder, isActive,
              createdDate, updatedDate
       FROM testimonials WHERE id = ?`,
      [id],
    )
    return res.json({ ok: true, testimonial: serialize(row) })
  } catch (err) {
    console.error('[testimonials] update failed:', err)
    return res.status(500).json({ error: 'Failed to update testimonial' })
  }
}

export async function deleteTestimonial(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' })
  try {
    const existing = await get('SELECT id, imageUrl FROM testimonials WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'Testimonial not found' })
    await run('DELETE FROM testimonials WHERE id = ?', [id])
    await deleteUploadedFile(existing.imageUrl)
    return res.json({ ok: true })
  } catch (err) {
    console.error('[testimonials] delete failed:', err)
    return res.status(500).json({ error: 'Failed to delete testimonial' })
  }
}
