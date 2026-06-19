import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { config } from '../config/env.js'
import { get, run } from '../config/db.js'
import { getSessionCookieOptions, getClearCookieOptions, SESSION_COOKIE_NAME } from '../config/cookies.js'

function signToken(userId) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' })
}

/**
 * Extracts the `roles` claim from a Microsoft access token without verifying
 * the signature. Safe here because the token was received directly from
 * Microsoft's token endpoint over a server-side HTTPS request (confidential
 * client flow) — we are not trusting a token supplied by the browser.
 */
function extractAzureRoles(accessToken) {
  try {
    const parts = String(accessToken).split('.')
    if (parts.length !== 3) return []
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return Array.isArray(payload.roles) ? payload.roles : []
  } catch {
    return []
  }
}

const stateStore = new Map()

/** Generic OAuth error query – client shows a fixed user-facing message, not IdP text */
const OAUTH_ERR_QUERY = 'signin_failed'

/**
 * Local dev login / register (disabled when ENABLE_SSO=true — see routes)
 */
export async function postLocalLogin(req, res) {
  const { email, displayName, profilePicUrl } = req.body || {}
  if (!email || !displayName) {
    return res.status(400).json({ error: 'email and displayName are required' })
  }
  const norm = String(email).trim().toLowerCase()
  if (norm.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) {
    return res.status(400).json({ error: 'Invalid email address' })
  }
  const cleanName = String(displayName).trim().slice(0, 100)
  if (!cleanName) {
    return res.status(400).json({ error: 'displayName must be 100 characters or fewer' })
  }
  // profilePicUrl from local login: only accept HTTPS URLs or reject silently
  const safePicUrl =
    typeof profilePicUrl === 'string' && /^https:\/\/.{4,}/.test(profilePicUrl.trim())
      ? profilePicUrl.trim().slice(0, 500)
      : null
  // isAdmin is driven by ADMIN_EMAILS in local dev; Azure AD App Roles own this in prod.
  const isAdmin = config.adminEmails.includes(norm) ? 1 : 0

  let user = await get('SELECT * FROM users WHERE email = ?', [norm])
  if (!user) {
    const r = await run(
      `INSERT INTO users (email, displayName, profilePicUrl, isAdmin, createdBy, updatedBy)
       VALUES (?, ?, ?, ?, 'local', 'local')`,
      [norm, cleanName, safePicUrl, isAdmin],
    )
    user = await get('SELECT * FROM users WHERE id = ?', [r.lastInsertRowid])
  } else {
    // DB is the authoritative source for isAdmin after account creation —
    // the Admin User Management UI controls roles. We no longer re-sync
    // isAdmin from ADMIN_EMAILS on every login.
    await run(
      `UPDATE users SET profilePicUrl = COALESCE(?, profilePicUrl), updatedBy = 'local' WHERE id = ?`,
      [safePicUrl, user.id],
    )
    user = await get('SELECT * FROM users WHERE id = ?', [user.id])
  }
  const token = signToken(user.id)
  res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions())
  // Token only in httpOnly cookie (no JSON body) — see Security Hardening
  return res.json({ user: serializeUser(user) })
}

/**
 * GET /api/auth/sso/login - Redirect to Microsoft login
 */
export async function getSsoLogin(req, res) {
  if (!config.enableSso) {
    return res.status(400).json({ error: 'SSO is disabled' })
  }

  const { tenantId, clientId, clientSecret, redirectUri, scopes, authorizeUrl } = config.azureAd

  if (!tenantId || !clientId) {
    return res.status(500).json({ error: 'SSO not configured. Missing Tenant ID or Client ID.' })
  }

  const replyUrl = String(redirectUri || '').trim()
  if (!replyUrl) {
    console.error(
      '[SSO] AZURE_AD_REDIRECT_URI is empty. Set it in .env to match Azure AD (e.g. http://localhost:3001/api/auth/callback).',
    )
    return res.status(500).json({ error: 'SSO misconfigured: redirect URI is empty' })
  }

  if (!clientSecret) {
    return res.status(500).json({ error: 'SSO not configured. Missing Client Secret (Web app / confidential client).' })
  }

  const state = crypto.randomBytes(32).toString('hex')
  stateStore.set(state, { createdAt: Date.now() })

  const tenMinutesAgo = Date.now() - 10 * 60 * 1000
  for (const [key, value] of stateStore.entries()) {
    if (value.createdAt < tenMinutesAgo) {
      stateStore.delete(key)
    }
  }

  const params = new URLSearchParams()
  params.set('client_id', String(clientId))
  params.set('response_type', 'code')
  params.set('redirect_uri', replyUrl)
  params.set('response_mode', 'query')
  params.set('scope', scopes)
  params.set('state', state)
  params.set('prompt', 'select_account')

  const authUrl = `${authorizeUrl}?${params.toString()}`
  res.redirect(authUrl)
}

/**
 * GET /api/auth/callback - Handle OAuth callback from Microsoft
 */
export async function getSsoCallback(req, res) {
  const { code, state, error } = req.query
  const loginErrorUrl = `${config.frontendUrl}/login?error=${OAUTH_ERR_QUERY}`

  if (error) {
    console.error('SSO Error:', error, req.query.error_description)
    return res.redirect(loginErrorUrl)
  }

  if (!state || !stateStore.has(state)) {
    return res.redirect(loginErrorUrl)
  }
  stateStore.delete(state)

  if (!code) {
    return res.redirect(loginErrorUrl)
  }

  try {
    const { clientId, clientSecret, redirectUri, tokenUrl } = config.azureAd
    const replyUrl = String(redirectUri || '').trim()

    const tokenBody = new URLSearchParams()
    tokenBody.set('client_id', String(clientId))
    tokenBody.set('client_secret', String(clientSecret))
    tokenBody.set('code', String(code))
    tokenBody.set('redirect_uri', replyUrl)
    tokenBody.set('grant_type', 'authorization_code')

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('[SSO] Token exchange failed:', errorData)
      return res.redirect(loginErrorUrl)
    }

    const tokens = await tokenResponse.json()
    const { access_token } = tokens

    // Microsoft Graph is the cryptographically-verified identity source.
    // We do not use the ID token claims (base64-decodable, not signature-verified here).
    // A missing or erroring Graph call is a hard failure — no unverified fallback.
    if (!access_token) {
      console.error('[SSO] Token exchange did not return access_token')
      return res.redirect(loginErrorUrl)
    }

    // Azure AD App Roles are embedded in the access token's `roles` claim.
    // Safe to read here because this token came directly from Microsoft's
    // token endpoint via a confidential-client server-side flow.
    const roles = extractAzureRoles(access_token)

    let graphData
    try {
      const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (!graphResponse.ok) {
        const body = await graphResponse.text().catch(() => '')
        console.error('[SSO] Graph API returned', graphResponse.status, body.slice(0, 200))
        return res.redirect(loginErrorUrl)
      }
      graphData = await graphResponse.json()
    } catch (e) {
      console.error('[SSO] Graph API error:', e)
      return res.redirect(loginErrorUrl)
    }

    // Graph response fields (authoritative, cryptographically verified by Microsoft)
    const oid = graphData.id  // Azure AD Object ID
    const email = (graphData.mail || graphData.userPrincipalName || '').toLowerCase().trim()
    const rawName = graphData.displayName || graphData.givenName || email.split('@')[0]
    const displayName = String(rawName).trim().slice(0, 100)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('[SSO] Invalid or missing email from Graph API')
      return res.redirect(loginErrorUrl)
    }

    // Azure AD App Role OR ADMIN_EMAILS env var grants admin — ADMIN_EMAILS is a fallback
    // for when the App Role hasn't been configured in Azure AD yet.
    const isAdmin = (roles.includes('Admin') || config.adminEmails.includes(email)) ? 1 : 0

    let user = oid ? await get('SELECT * FROM users WHERE ssoObjectId = ?', [oid]) : null
    if (!user) user = await get('SELECT * FROM users WHERE email = ?', [email])

    if (!user) {
      const r = await run(
        `INSERT INTO users (email, displayName, profilePicUrl, ssoObjectId, isAdmin, createdBy, updatedBy)
         VALUES (?, ?, ?, ?, ?, 'sso', 'sso')`,
        [email, displayName, null, oid || null, isAdmin],
      )
      user = await get('SELECT * FROM users WHERE id = ?', [r.lastInsertRowid])
    } else {
      // DB is the authoritative source for isAdmin after account creation —
      // the Admin User Management UI controls roles. We no longer re-sync
      // isAdmin from Azure AD App Roles or ADMIN_EMAILS on every login.
      await run(
        `UPDATE users SET displayName = COALESCE(?, displayName),
         ssoObjectId = COALESCE(?, ssoObjectId), updatedBy = 'sso' WHERE id = ?`,
        [displayName, oid, user.id],
      )
      user = await get('SELECT * FROM users WHERE id = ?', [user.id])
    }

    const token = signToken(user.id)

    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions())

    res.redirect(`${config.frontendUrl}/?sso=success`)
  } catch (err) {
    console.error('SSO callback error:', err)
    return res.redirect(loginErrorUrl)
  }
}

/**
 * GET /api/auth/sso/status
 */
export async function getSsoStatus(req, res) {
  const { tenantId, clientId, clientSecret } = config.azureAd
  return res.json({
    enabled: config.enableSso,
    configured: Boolean(tenantId && clientId && clientSecret),
  })
}

export async function getMe(req, res) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  return res.json({ user: serializeUser(req.user) })
}

export async function postLogout(req, res) {
  res.clearCookie(SESSION_COOKIE_NAME, getClearCookieOptions())
  return res.json({ ok: true })
}

function serializeUser(u) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    profilePicUrl: u.profilePicUrl,
    isAdmin: config.bypassAdminAuth ? true : Boolean(u.isAdmin),
  }
}
