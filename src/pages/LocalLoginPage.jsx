import { useState, useEffect } from 'react'
import { useNavigate, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import '../components/AuthGate.css'

/**
 * Shown at /login when ENABLE_SSO is false. Full-page glass sign-in.
 */
export default function LocalLoginPage() {
  const { user, loading, isAuthenticated, ssoEnabled, localLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // OAuth failure (generic code from server — do not surface IdP error text)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const err = params.get('error')
    if (err) {
      if (err === 'signin_failed') {
        toast.error('Microsoft sign-in failed. Please try again.')
      } else {
        toast.error('Sign-in failed. Please try again.')
      }
      navigate('/login', { replace: true })
    }
  }, [location.search, navigate])

  // Microsoft SSO: this route should not be used; send user to IdP
  useEffect(() => {
    if (!loading && ssoEnabled && !isAuthenticated) {
      window.location.href = '/api/auth/sso/login'
    }
  }, [loading, ssoEnabled, isAuthenticated])

  const handleLocalLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !name.trim()) {
      toast.error('Please enter both email and name')
      return
    }
    setSubmitting(true)
    try {
      await localLogin(email.trim(), name.trim())
      toast.success('Signed in successfully')
      const to = location.state?.from?.pathname || '/'
      navigate(to, { replace: true })
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="auth-gate__loading">
        <div className="auth-gate__spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (ssoEnabled) {
    return (
      <div className="auth-gate__loading">
        <div className="auth-gate__spinner" />
        <p>Redirecting to Microsoft sign-in...</p>
      </div>
    )
  }

  return (
    <div className="auth-gate">
      <div className="auth-gate__backdrop" />
      <div className="auth-gate__modal">
        <div className="auth-gate__glass">
          <div className="auth-gate__header">
            <div className="auth-gate__logo">
              <span className="auth-gate__ltm">LTM</span>
              <span className="auth-gate__ai">AI</span>
              <span className="auth-gate__cme">CME Live</span>
            </div>
            <h1>Welcome</h1>
            <p>Sign in to continue to CME Live</p>
          </div>

          <form className="auth-gate__form" onSubmit={handleLocalLogin}>
            <div className="auth-gate__field">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="auth-gate__field">
              <label htmlFor="auth-name">Display Name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-gate__submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="auth-gate__btn-spinner" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="auth-gate__footer">By signing in, you agree to our terms of service</p>
        </div>
      </div>
    </div>
  )
}
