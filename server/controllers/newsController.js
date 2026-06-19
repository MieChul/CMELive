import { run, all, get } from '../config/db.js'

const VALID_STATUSES = new Set(['pending', 'approved', 'rejected'])

const MAX_TITLE       = 500
const MAX_EXCERPT     = 5000
const MAX_SUMMARY     = 10000
const MAX_IMPERATIVE  = 2000
const MAX_CATEGORY    = 100
const MAX_SOURCE      = 255
const MAX_DATE        = 50
const MAX_URL         = 2048
const MAX_IMAGE_URL   = 1000
const MAX_IMAGE_ALT   = 500
const MAX_TAGS        = 500
const MAX_IMAGES      = 65535

function safeJsonImages(val) {
  if (!val) return null
  if (typeof val === 'string') {
    try { JSON.parse(val); return val } catch { return null }
  }
  if (Array.isArray(val)) return JSON.stringify(val)
  return null
}

function normalizeStatus(s) {
  const v = String(s || '').toLowerCase()
  return VALID_STATUSES.has(v) ? v : 'pending'
}

function parseId(raw) {
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function clamp(value, max) {
  return value ? String(value).trim().slice(0, max) : null
}

/**
 * POST /api/news
 * Called by the AI agent (API key auth). Inserts one news record.
 */
export async function postNews(req, res) {
  try {
    const {
      title, excerpt, summary, domainImperative, aiTechImperative,
      category, source, status, publishedDate,
      url, imageUrl, imageAlt, tags, aiScore, batchId, images,
    } = req.body || {}

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'title is required' })
    }
    if (!excerpt || !String(excerpt).trim()) {
      return res.status(400).json({ error: 'excerpt is required' })
    }

    const score = Math.max(0, Math.min(100, Number(aiScore) || 0))

    const result = await run(
      `INSERT INTO news
         (title, excerpt, summary, domainImperative, aiTechImperative,
          category, source, status, publishedDate,
          url, imageUrl, imageAlt, tags, aiScore, batchId, images, createdBy, updatedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'agent', 'agent')`,
      [
        clamp(title, MAX_TITLE),
        clamp(excerpt, MAX_EXCERPT),
        clamp(summary, MAX_SUMMARY),
        clamp(domainImperative, MAX_IMPERATIVE),
        clamp(aiTechImperative, MAX_IMPERATIVE),
        clamp(category, MAX_CATEGORY),
        clamp(source, MAX_SOURCE),
        normalizeStatus(status),
        clamp(publishedDate, MAX_DATE),
        clamp(url, MAX_URL),
        clamp(imageUrl, MAX_IMAGE_URL),
        clamp(imageAlt, MAX_IMAGE_ALT),
        clamp(tags, MAX_TAGS),
        score,
        clamp(batchId, 36),
        safeJsonImages(images),
      ],
    )

    return res.status(201).json({ ok: true, id: result.lastInsertRowid })
  } catch (err) {
    console.error('[news] postNews error:', err)
    return res.status(500).json({ error: 'Failed to insert news' })
  }
}

/**
 * GET /api/news
 * Returns all news items ordered by aiScore desc (admin view).
 * Includes likes, views, shares for real stats display.
 */
export async function getNews(req, res) {
  try {
    const items = await all(
      `SELECT id, title, excerpt, summary, domainImperative, aiTechImperative,
              category, source, status,
              url, imageUrl, imageAlt, tags, publishedDate, createdDate,
              aiScore, batchId, images, likes, views, shares
       FROM news
       ORDER BY aiScore DESC, id DESC`,
    )
    return res.json({ ok: true, items })
  } catch (err) {
    console.error('[news] getNews error:', err)
    return res.status(500).json({ error: 'Failed to fetch news' })
  }
}

/**
 * PUT /api/news/:id
 * Admin edits an existing news record.
 */
export async function updateNews(req, res) {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Invalid news id' })

    const {
      title, excerpt, summary, domainImperative, aiTechImperative,
      category, source, status, publishedDate,
      url, imageUrl, imageAlt, tags, aiScore, images,
    } = req.body || {}

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'title is required' })
    }
    if (!excerpt || !String(excerpt).trim()) {
      return res.status(400).json({ error: 'excerpt is required' })
    }

    const now = new Date().toISOString()
    const updatedBy = req.user?.email ?? 'admin'
    const score = aiScore !== undefined
      ? Math.max(0, Math.min(100, Number(aiScore) || 0))
      : undefined

    const result = await run(
      `UPDATE news
       SET title = ?, excerpt = ?, summary = ?,
           domainImperative = ?, aiTechImperative = ?,
           category = ?, source = ?,
           status = ?, publishedDate = ?, url = ?, imageUrl = ?, imageAlt = ?, tags = ?,
           ${score !== undefined ? 'aiScore = ?,' : ''}
           images = ?,
           updatedDate = ?, updatedBy = ?
       WHERE id = ?`,
      [
        clamp(title, MAX_TITLE),
        clamp(excerpt, MAX_EXCERPT),
        clamp(summary, MAX_SUMMARY),
        clamp(domainImperative, MAX_IMPERATIVE),
        clamp(aiTechImperative, MAX_IMPERATIVE),
        clamp(category, MAX_CATEGORY),
        clamp(source, MAX_SOURCE),
        normalizeStatus(status),
        clamp(publishedDate, MAX_DATE),
        clamp(url, MAX_URL),
        clamp(imageUrl, MAX_IMAGE_URL),
        clamp(imageAlt, MAX_IMAGE_ALT),
        clamp(tags, MAX_TAGS),
        ...(score !== undefined ? [score] : []),
        safeJsonImages(images),
        now,
        updatedBy,
        id,
      ],
    )

    if (result.changes === 0) {
      return res.status(404).json({ error: 'News item not found' })
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('[news] updateNews error:', err)
    return res.status(500).json({ error: 'Failed to update news' })
  }
}

/**
 * DELETE /api/news/:id
 * Admin permanently removes a news item.
 */
export async function deleteNews(req, res) {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Invalid news id' })

    const result = await run('DELETE FROM news WHERE id = ?', [id])

    if (result.changes === 0) {
      return res.status(404).json({ error: 'News item not found' })
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('[news] deleteNews error:', err)
    return res.status(500).json({ error: 'Failed to delete news' })
  }
}

/**
 * GET /api/news/public
 * Returns approved news items for the public homepage carousel.
 * Includes domainImperative, aiTechImperative, summary for Learn More popup.
 */
export async function getPublicNews(req, res) {
  try {
    const items = await all(
      `SELECT id, title, excerpt, summary, domainImperative, aiTechImperative,
              category, source, publishedDate,
              url, imageUrl, imageAlt, tags, likes, views, shares
       FROM news
       WHERE status = 'approved'
       ORDER BY aiScore DESC, id DESC`,
    )

    if (req.user?.email) {
      const userEmail = req.user.email
      for (const item of items) {
        const liked = await get(
          'SELECT id FROM user_likes WHERE userId = ? AND newsId = ?',
          [userEmail, item.id]
        )
        item.userLiked = !!liked
      }
    }

    return res.json({ ok: true, items })
  } catch (err) {
    console.error('[news] getPublicNews error:', err)
    return res.status(500).json({ error: 'Failed to fetch news' })
  }
}

/**
 * POST /api/news/:id/view
 * Increments the view counter. Called when user opens Learn More popup.
 */
export async function recordView(req, res) {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Invalid news id' })

    const existing = await get('SELECT id FROM news WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'News item not found' })

    await run('UPDATE news SET views = views + 1 WHERE id = ?', [id])
    return res.json({ ok: true })
  } catch (err) {
    console.error('[news] recordView error:', err)
    return res.status(500).json({ error: 'Failed to record view' })
  }
}

/**
 * POST /api/news/:id/share
 * Increments the share counter.
 */
export async function recordShare(req, res) {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Invalid news id' })

    const existing = await get('SELECT id FROM news WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'News item not found' })

    await run('UPDATE news SET shares = shares + 1 WHERE id = ?', [id])
    const updated = await get('SELECT shares FROM news WHERE id = ?', [id])
    return res.json({ ok: true, shares: updated?.shares ?? 0 })
  } catch (err) {
    console.error('[news] recordShare error:', err)
    return res.status(500).json({ error: 'Failed to record share' })
  }
}

/**
 * POST /api/news/:id/like
 * Handles like/unlike for an article.
 */
export async function likeNews(req, res) {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ error: 'Invalid news id' })

    const existing = await get('SELECT id, likes FROM news WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ error: 'News item not found' })

    const unlike = String(req.body?.action || '').toLowerCase() === 'unlike'
    const userId = req.user?.email

    if (userId) {
      if (unlike) {
        const alreadyLiked = await get(
          'SELECT id FROM user_likes WHERE userId = ? AND newsId = ?',
          [userId, id]
        )
        if (alreadyLiked) {
          await run('DELETE FROM user_likes WHERE userId = ? AND newsId = ?', [userId, id])
          await run('UPDATE news SET likes = MAX(0, likes - 1) WHERE id = ?', [id])
        }
      } else {
        const alreadyLiked = await get(
          'SELECT id FROM user_likes WHERE userId = ? AND newsId = ?',
          [userId, id]
        )
        if (!alreadyLiked) {
          await run('INSERT INTO user_likes (userId, newsId) VALUES (?, ?)', [userId, id])
          await run('UPDATE news SET likes = likes + 1 WHERE id = ?', [id])
        }
      }
    } else {
      if (unlike) {
        await run('UPDATE news SET likes = MAX(0, likes - 1) WHERE id = ?', [id])
      } else {
        await run('UPDATE news SET likes = likes + 1 WHERE id = ?', [id])
      }
    }

    const updated = await get('SELECT likes FROM news WHERE id = ?', [id])

    let userLiked = false
    if (userId) {
      const liked = await get(
        'SELECT id FROM user_likes WHERE userId = ? AND newsId = ?',
        [userId, id]
      )
      userLiked = !!liked
    }

    return res.json({ ok: true, likes: updated?.likes ?? 0, userLiked })
  } catch (err) {
    console.error('[news] likeNews error:', err)
    return res.status(500).json({ error: 'Failed to update like' })
  }
}
