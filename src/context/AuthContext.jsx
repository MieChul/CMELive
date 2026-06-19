import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { auth } from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

const PLACEHOLDER_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' fill='%23333'/%3E%3Ccircle cx='64' cy='46' r='26' fill='%23fff'/%3E%3Cellipse cx='64' cy='100' rx='42' ry='28' fill='%23fff'/%3E%3C/svg%3E"

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ssoEnabled, setSsoEnabled] = useState(false)
  const [ssoChecked, setSsoChecked] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const { data } = await auth.me()
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const checkSsoStatus = useCallback(async () => {
    try {
      const { data } = await auth.ssoStatus()
      setSsoEnabled(data.enabled && data.configured)
    } catch {
      setSsoEnabled(false)
    } finally {
      setSsoChecked(true)
    }
  }, [])

  useEffect(() => {
    Promise.all([refresh(), checkSsoStatus()])
  }, [refresh, checkSsoStatus])

  const localLogin = useCallback(async (email, displayName, profilePicUrl) => {
    const { data } = await auth.local({ email, displayName, profilePicUrl: profilePicUrl || undefined })
    setUser(data.user)
    // Session is httpOnly cookie only (no localStorage token)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await auth.logout()
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem('token')
    } catch {
      /* ignore */
    }
    setUser(null)
    toast.success('Signed out')

    if (ssoEnabled) {
      window.location.href = '/api/auth/sso/login'
    } else {
      window.location.href = '/login'
    }
  }, [ssoEnabled])

  const displayAvatar = useCallback((u) => u?.profilePicUrl || PLACEHOLDER_AVATAR, [])

  const value = useMemo(
    () => ({
      user,
      loading: loading || !ssoChecked,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(user?.isAdmin),
      ssoEnabled,
      localLogin,
      logout,
      refresh,
      displayAvatar,
    }),
    [user, loading, ssoChecked, ssoEnabled, refresh, localLogin, logout, displayAvatar],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { PLACEHOLDER_AVATAR }
