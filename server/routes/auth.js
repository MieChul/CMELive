import { Router } from 'express'
import {
  postLocalLogin,
  getSsoLogin,
  getSsoCallback,
  getSsoStatus,
  getMe,
  postLogout
} from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'
import { config } from '../config/env.js'

const r = Router()

/**
 * Block local (passwordless) sign-in when org uses SSO so accounts cannot be created anonymously.
 */
function requireLocalAuthEnabled(_req, res, next) {
  if (config.enableSso) {
    return res.status(404).json({ error: 'Not found' })
  }
  next()
}

r.post('/local', requireLocalAuthEnabled, postLocalLogin)

r.get('/sso/login', getSsoLogin)
r.get('/callback', getSsoCallback)
r.get('/sso/status', getSsoStatus)

r.get('/me', requireAuth, getMe)
r.post('/logout', postLogout)

export default r
