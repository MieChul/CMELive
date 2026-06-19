import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import './AuthGate.css'

/**
 * Wraps all routes that require an authenticated session.
 * - SSO on: auto-redirect to Microsoft (except when returning with ?sso= or ?error=)
 * - SSO off: unauthenticated users are sent to /login
 */
export default function ProtectedLayout() {
  const { loading, isAuthenticated, ssoEnabled, refresh } = useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Clear Microsoft OAuth query params and refresh session after callback (/?sso=success)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const ssoResult = params.get('sso')
    const error = params.get('error')

    if (ssoResult === 'success') {
      ;(async () => {
        toast.success('Signed in with Microsoft')
        await refresh()
        navigate({ pathname: location.pathname, search: '' }, { replace: true })
      })()
    } else if (error) {
      if (error === 'signin_failed') {
        toast.error('Microsoft sign-in failed. Please try again.')
      } else {
        toast.error('Sign-in failed. Please try again.')
      }
      navigate({ pathname: location.pathname, search: '' }, { replace: true })
    }
  }, [location.pathname, location.search, navigate, refresh])

  // Microsoft SSO: send unauthenticated users to the IdP
  useEffect(() => {
    if (!loading && !isAuthenticated && ssoEnabled && !redirecting) {
      const params = new URLSearchParams(location.search)
      if (!params.has('sso') && !params.has('error')) {
        setRedirecting(true)
        setTimeout(() => {
          window.location.href = '/api/auth/sso/login'
        }, 100)
      }
    }
  }, [loading, isAuthenticated, ssoEnabled, redirecting, location.search])

  if (loading) {
    return (
      <div className="auth-gate__loading">
        <div className="auth-gate__spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Outlet />
  }

  if (ssoEnabled) {
    return (
      <div className="auth-gate__loading">
        <div className="auth-gate__spinner" />
        <p>Redirecting to Microsoft sign-in...</p>
      </div>
    )
  }

  // Local dev: require login at /login
  return <Navigate to="/login" replace state={{ from: location }} />
}
