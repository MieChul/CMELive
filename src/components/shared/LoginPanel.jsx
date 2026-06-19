import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import './shared-exchange.css'

export default function LoginPanel({ compact = false }) {
  const { user, isAuthenticated, localLogin, logout, ssoEnabled, refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [showLocalForm, setShowLocalForm] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Handle SSO callback results
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const ssoResult = params.get('sso')
    const error = params.get('error')

    if (ssoResult === 'success') {
      toast.success('Signed in with Microsoft')
      refresh() // Refresh user data from cookie
      // Clean up URL
      navigate(location.pathname, { replace: true })
    } else if (error) {
      toast.error(error)
      navigate(location.pathname, { replace: true })
    }
  }, [location, navigate, refresh])

  if (isAuthenticated) {
    return (
      <div className="login-panel login-panel--authed">
        <span className="login-greeting">Hi, {user.displayName}</span>
        <button type="button" className="btn btn-ghost" onClick={() => logout()}>
          Sign out
        </button>
      </div>
    )
  }

  const handleMicrosoftLogin = () => {
    // Redirect to backend SSO login endpoint
    window.location.href = '/api/auth/sso/login'
  }

  return (
    <div className={`login-wrap ${compact ? 'login-wrap--compact' : ''}`}>
      <div className={`login-panel ${compact ? 'login-panel--compact' : ''}`}>
        {/* Microsoft SSO Button */}
        {ssoEnabled && (
          <>
            <button
              type="button"
              className="btn-microsoft"
              onClick={handleMicrosoftLogin}
            >
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
              Sign in with Microsoft
            </button>

            {!showLocalForm && (
              <button
                type="button"
                className="btn-toggle-local"
                onClick={() => setShowLocalForm(true)}
              >
                Or sign in with email
              </button>
            )}
          </>
        )}

        {/* Local sign-in form */}
        {(showLocalForm || !ssoEnabled) && (
          <form
            className="login-form"
            onSubmit={async (e) => {
              e.preventDefault()
              try {
                await localLogin(email, name)
                setEmail('')
                setName('')
              } catch (err) {
                toast.error(err?.response?.data?.error || 'Sign in failed')
              }
            }}
          >
            {ssoEnabled && (
              <button
                type="button"
                className="btn-back"
                onClick={() => setShowLocalForm(false)}
              >
                ← Back to Microsoft sign in
              </button>
            )}
            <input
              className="login-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="login-input"
              type="text"
              placeholder="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button className="btn btn-primary" type="submit">
              Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
