import { config } from './env.js'

export const SESSION_COOKIE_NAME = 'token'

/** httpOnly session cookie (matches set/clear in authController). */
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
    maxAge: 7 * 24 * 3600 * 1000,
  }
}

export function getClearCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
  }
}
