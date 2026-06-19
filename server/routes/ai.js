import { Router } from 'express'
import { getLatestNews, getLatestNewsDebug, postReview } from '../controllers/aiController.js'
import { requireAuth } from '../middleware/auth.js'

const r = Router()
r.get('/latest-news', getLatestNews)
r.get('/latest-news/debug', getLatestNewsDebug)
r.post('/review', requireAuth, postReview)

export default r
