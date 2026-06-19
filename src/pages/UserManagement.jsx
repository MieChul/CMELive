import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Search, X, ChevronDown, RefreshCw, Shield, User as UserIcon, Mail, Calendar } from 'lucide-react'
import { admin } from '../services/api'
import './UserManagement.css'

/* Available roles. Extend here when more roles are added on the backend. */
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
]

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?'

const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const roleSummary = (roles) =>
  roles.length === 0 ? 'User' : roles.map((r) => ROLE_OPTIONS.find((o) => o.value === r)?.label || r).join(', ')

/* ─── Inline role dropdown (checkbox multi-select, persists on toggle) ── */
function RoleDropdown({ user, onChange }) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const toggle = async (role) => {
    if (saving) return
    const next = user.roles.includes(role) ? user.roles.filter((r) => r !== role) : [...user.roles, role]
    setSaving(true)
    try {
      const { data } = await admin.updateUserRole(user.id, next)
      onChange(data.user)
      toast.success(`Role updated for ${data.user.displayName}`)
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="um-dd" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`um-dd__btn ${open ? 'um-dd__btn--open' : ''} ${user.isAdmin ? 'um-dd__btn--admin' : ''}`}
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {saving
          ? <RefreshCw size={13} className="spin" />
          : (user.isAdmin && <Shield size={12} />)}
        <span className="um-dd__label">{roleSummary(user.roles)}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="um-dd__panel" role="listbox">
          {ROLE_OPTIONS.map((opt) => {
            const checked = user.roles.includes(opt.value)
            return (
              <label key={opt.value} className={`um-dd__item ${checked ? 'um-dd__item--checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={saving}
                  onChange={() => toggle(opt.value)}
                />
                <span className="um-dd__box" aria-hidden="true" />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── View-only details modal ──────────────────────────────────────────── */
function UserDetailsModal({ user, onClose }) {
  return (
    <div className="um-modal__backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="um-modal" role="dialog" aria-modal="true" aria-labelledby="um-modal-title">
        <header className="um-modal__head">
          <div className="um-modal__id">
            {user.profilePicUrl
              ? <img className="um-modal__avatar" src={user.profilePicUrl} alt="" />
              : <div className="um-modal__avatar um-modal__avatar--ph">{initials(user.displayName)}</div>}
            <div>
              <h2 id="um-modal-title" className="um-modal__name">{user.displayName}</h2>
              <p className="um-modal__email">{user.email}</p>
            </div>
          </div>
          <button type="button" className="um-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="um-modal__body">
          <div className="um-field">
            <label className="um-field__label"><UserIcon size={12} /> Display name</label>
            <div className="um-field__val">{user.displayName}</div>
          </div>

          <div className="um-field">
            <label className="um-field__label"><Mail size={12} /> Email</label>
            <div className="um-field__val">{user.email}</div>
          </div>

          <div className="um-field">
            <label className="um-field__label"><Shield size={12} /> Role</label>
            <div className="um-field__val">
              <span className={`um-chip ${user.isAdmin ? 'um-chip--admin' : 'um-chip--user'}`}>
                {user.isAdmin && <Shield size={11} />}
                {roleSummary(user.roles)}
              </span>
            </div>
          </div>

          <div className="um-field">
            <label className="um-field__label"><Shield size={12} /> SSO Object ID</label>
            <div className="um-field__val um-field__val--mono">{user.ssoObjectId || '—'}</div>
          </div>

          <div className="um-field um-field--row">
            <div>
              <label className="um-field__label"><Calendar size={12} /> Created</label>
              <div className="um-field__val">{fmtDate(user.createdDate)}</div>
            </div>
            <div>
              <label className="um-field__label"><Calendar size={12} /> Updated</label>
              <div className="um-field__val">{fmtDate(user.updatedDate)}</div>
            </div>
          </div>
        </div>

        <footer className="um-modal__foot">
          <button type="button" className="um-btn um-btn--primary" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  )
}

/* ─── Main page ────────────────────────────────────────────────────────── */
export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await admin.listUsers()
      setUsers(data.users || [])
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q),
    )
  }, [users, query])

  const handleRoleChange = (updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    setSelected((cur) => (cur && cur.id === updated.id ? updated : cur))
  }

  return (
    <div className="adm-section um-section">
      <div className="adm-section__top">
        <div>
          <h1 className="adm-section__title">
            <span className="title-spark">User</span> Management
          </h1>
          <p className="adm-section__sub">
            <Shield size={11} style={{ opacity: 0.5 }} /> Manage access · {users.length} user{users.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="um-toolbar">
          <div className="um-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" className="um-search__clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>
          <button type="button" className="um-btn um-btn--ghost" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="um-card">
        {loading && (
          <div className="adm-state"><RefreshCw size={18} className="spin" /><span>Loading users…</span></div>
        )}

        {!loading && error && (
          <div className="adm-state adm-state--err">{error}</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="adm-state">No users match your search.</div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="um-table" role="table">
            <div className="um-thead" role="row">
              <div role="columnheader">User</div>
              <div role="columnheader">Email</div>
              <div role="columnheader">Role</div>
            </div>
            {filtered.map((u) => (
              <div
                key={u.id}
                className="um-row"
                role="row"
                tabIndex={0}
                onClick={() => setSelected(u)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(u) } }}
              >
                <div className="um-row__user" role="cell">
                  {u.profilePicUrl
                    ? <img className="um-avatar" src={u.profilePicUrl} alt="" />
                    : <div className="um-avatar um-avatar--ph">{initials(u.displayName)}</div>}
                  <span className="um-row__name">{u.displayName}</span>
                </div>
                <div className="um-row__email" role="cell">{u.email}</div>
                <div role="cell">
                  <RoleDropdown user={u} onChange={handleRoleChange} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <UserDetailsModal user={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
