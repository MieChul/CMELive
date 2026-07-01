import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { get } from '../config/db.js'
import { SESSION_COOKIE_NAME } from '../config/cookies.js'

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME]
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
    const user = await get('SELECT id, email, "displayName", "isAdmin", "createdDate" FROM users WHERE id = ?', [payload.userId])
    if (!user) return res.status(401).json({ error: 'User not found' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

/**
 * Requires an authenticated session AND isAdmin === true.
 * Returns 401 for missing/invalid tokens, 403 for authenticated non-admins.
 */
export async function requireAdmin(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
    const user = await get('SELECT id, email, "displayName", "isAdmin", "createdDate" FROM users WHERE id = ?', [payload.userId])
    if (!user) return res.status(401).json({ error: 'Unauthorized' })
    if (!config.bypassAdminAuth && !user.isAdmin) return res.status(403).json({ error: 'Forbidden' })
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

/**
 * Authenticates AI agent requests via a shared secret in the Authorization header.
 * Expects: Authorization: Bearer <NEWS_AGENT_API_KEY>
 * Uses timing-safe comparison to prevent key enumeration via timing attacks.
 */
export function requireApiKey(req, res, next) {
  const { newsAgentApiKey } = config
  if (!newsAgentApiKey) {
    return res.status(503).json({ error: 'Agent endpoint not configured' })
  }

  const authHeader = req.headers.authorization || ''
  const supplied = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!supplied) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Hash both keys to get equal-length buffers before comparing — prevents
  // both timing leaks and length disclosure.
  const expectedHash = crypto.createHash('sha256').update(newsAgentApiKey).digest()
  const suppliedHash = crypto.createHash('sha256').update(supplied).digest()

  if (!crypto.timingSafeEqual(suppliedHash, expectedHash)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}

/**
 * Optional auth - sets req.user if valid token
 */
export async function optionalAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME]
  if (!token) return next()
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
    const user = await get('SELECT id, email, "displayName", "isAdmin", "createdDate" FROM users WHERE id = ?', [payload.userId])
    if (user) req.user = user
  } catch {
    // ignore
  }
  next()
}
