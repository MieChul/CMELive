import { Router } from 'express'
import { requireAuth, requireAdmin, requireApiKey, optionalAuth } from '../middleware/auth.js'
import { postNews, getNews, updateNews, deleteNews, getPublicNews, recordView, recordShare, likeNews } from '../controllers/newsController.js'

const r = Router()

// Public endpoints — no auth required but use optionalAuth to identify logged-in users
r.get('/public', optionalAuth, getPublicNews)
r.post('/:id/view', recordView)
r.post('/:id/share', recordShare)
r.post('/:id/like', optionalAuth, likeNews)

// AI agent inserts news via shared API key (Authorization: Bearer <NEWS_AGENT_API_KEY>)
r.post('/', requireApiKey, postNews)

// Admin-only mutations
r.put('/:id', requireAdmin, updateNews)
r.delete('/:id', requireAdmin, deleteNews)

// Any authenticated user can read (admin UI + potential future public feed)
r.get('/', requireAuth, getNews)

export default r
