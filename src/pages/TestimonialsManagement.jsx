import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Pencil, Trash2, X, Upload, ExternalLink, Eye, EyeOff,
  Search, RefreshCw, MessageSquareQuote,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { testimonials as testimonialsApi } from '../services/api'
import './TestimonialsManagement.css'

const EMPTY_FORM = {
  name: '',
  role: '',
  message: '',
  imageUrl: '',
  linkedinUrl: '',
  displayOrder: 0,
  isActive: true,
}

function fileToInitial(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]).join('').toUpperCase()
}

function TestimonialFormModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id)
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(initial || {}) }))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const onPickImage = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\//.test(file.type)) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller')
      return
    }
    setUploading(true)
    try {
      const { data } = await testimonialsApi.uploadImage(file)
      set('imageUrl', data.imageUrl)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.message.trim()) {
      toast.error('Name and message are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        message: form.message.trim(),
        imageUrl: form.imageUrl?.trim() || null,
        linkedinUrl: form.linkedinUrl?.trim() || null,
        displayOrder: Number(form.displayOrder) || 0,
        isActive: !!form.isActive,
      }
      const { data } = isEdit
        ? await testimonialsApi.update(initial.id, payload)
        : await testimonialsApi.create(payload)
      toast.success(isEdit ? 'Testimonial updated' : 'Testimonial added')
      onSaved(data.testimonial)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="tm-modal__backdrop" onClick={onClose}>
      <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
        <header className="tm-modal__head">
          <h3>{isEdit ? 'Edit Testimonial' : 'New Testimonial'}</h3>
          <button type="button" className="tm-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <form className="tm-form" onSubmit={onSubmit}>
          <div className="tm-form__row tm-form__row--media">
            <div className="tm-avatar tm-avatar--lg">
              {form.imageUrl
                ? <img src={form.imageUrl} alt={form.name || 'Preview'} />
                : <span>{fileToInitial(form.name)}</span>}
            </div>
            <div className="tm-upload">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPickImage}
                hidden
              />
              <button
                type="button"
                className="tm-btn tm-btn--ghost"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload size={16} />
                {uploading ? 'Uploading…' : form.imageUrl ? 'Replace image' : 'Upload image'}
              </button>
              {form.imageUrl && (
                <button
                  type="button"
                  className="tm-btn tm-btn--link"
                  onClick={() => set('imageUrl', '')}
                >
                  Remove
                </button>
              )}
              <p className="tm-hint">PNG, JPG, GIF, or WebP — up to 5MB.</p>
            </div>
          </div>

          <label className="tm-field">
            <span>Name <em>*</em></span>
            <input
              type="text"
              maxLength={255}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Phil Wiser"
              required
            />
          </label>

          <label className="tm-field">
            <span>Role / Company</span>
            <input
              type="text"
              maxLength={255}
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              placeholder="CTO, Paramount"
            />
          </label>

          <label className="tm-field">
            <span>Message <em>*</em></span>
            <textarea
              rows={6}
              maxLength={4000}
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
              placeholder="What does the client say about CME Live?"
              required
            />
            <small className="tm-counter">{form.message.length}/4000</small>
          </label>

          <label className="tm-field">
            <span>LinkedIn URL</span>
            <input
              type="url"
              maxLength={500}
              value={form.linkedinUrl}
              onChange={(e) => set('linkedinUrl', e.target.value)}
              placeholder="https://www.linkedin.com/in/username"
            />
          </label>

          <div className="tm-form__row tm-form__row--two">
            <label className="tm-field">
              <span>Display order</span>
              <input
                type="number"
                min={0}
                max={9999}
                value={form.displayOrder}
                onChange={(e) => set('displayOrder', e.target.value)}
              />
            </label>

            <label className="tm-field tm-field--toggle">
              <span>Visible to users</span>
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                className={`tm-switch ${form.isActive ? 'tm-switch--on' : ''}`}
                onClick={() => set('isActive', !form.isActive)}
              >
                <span className="tm-switch__thumb" />
              </button>
            </label>
          </div>

          <footer className="tm-modal__foot">
            <button type="button" className="tm-btn tm-btn--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="tm-btn tm-btn--primary" disabled={saving || uploading}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add testimonial'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

export default function TestimonialsManagement() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)   // testimonial object or {} for new
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data } = await testimonialsApi.adminList()
      setItems(data.testimonials || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load testimonials')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((t) =>
      [t.name, t.role, t.message].filter(Boolean).some((v) => v.toLowerCase().includes(q)),
    )
  }, [items, query])

  const onSaved = (saved) => {
    setItems((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id)
      if (idx === -1) return [saved, ...prev]
      const next = prev.slice()
      next[idx] = saved
      return next
    })
  }

  const onToggleActive = async (item) => {
    try {
      const { data } = await testimonialsApi.update(item.id, { isActive: !item.isActive })
      onSaved(data.testimonial)
      toast.success(data.testimonial.isActive ? 'Now visible on CME Live' : 'Hidden from CME Live')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    }
  }

  const onDelete = async (item) => {
    if (!window.confirm(`Delete testimonial from ${item.name}? This cannot be undone.`)) return
    try {
      await testimonialsApi.remove(item.id)
      setItems((prev) => prev.filter((t) => t.id !== item.id))
      toast.success('Testimonial deleted')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <section className="adm-section tm-section">
      <div className="adm-section__top">
        <div>
          <h1 className="adm-section__title">
            <span className="title-spark">Client</span> Testimonials
          </h1>
          <p className="adm-section__sub">
            <MessageSquareQuote size={11} style={{ opacity: 0.5 }} /> Customer Signal · {items.length} testimonial{items.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="tm-toolbar">
          <div className="tm-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search by name, role or message"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" className="tm-search__clear" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </div>
          <button type="button" className="tm-btn tm-btn--ghost" onClick={load} disabled={loading} title="Refresh">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button type="button" className="tm-btn tm-btn--primary" onClick={() => setEditing({})}>
            <Plus size={14} />
            <span>New testimonial</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="tm-state"><RefreshCw size={16} className="spin" /> Loading testimonials…</div>
      )}
      {!loading && error && <div className="tm-state tm-state--err">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="tm-empty">
          <p>No testimonials yet.</p>
          <button type="button" className="tm-btn tm-btn--primary" onClick={() => setEditing({})}>
            <Plus size={14} /> Add the first one
          </button>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <ul className="tm-grid">
          {filtered.map((t) => (
            <li key={t.id} className={`tm-card ${t.isActive ? '' : 'tm-card--inactive'}`}>
              <div className="tm-card__head">
                <div className="tm-avatar">
                  {t.imageUrl
                    ? <img src={t.imageUrl} alt={t.name} />
                    : <span>{fileToInitial(t.name)}</span>}
                </div>
                <div className="tm-card__id">
                  <div className="tm-card__name">{t.name}</div>
                  {t.role && <div className="tm-card__role">{t.role}</div>}
                </div>
                <span className={`tm-chip ${t.isActive ? 'tm-chip--on' : 'tm-chip--off'}`}>
                  {t.isActive ? 'Visible' : 'Hidden'}
                </span>
              </div>

              <p className="tm-card__quote">{t.message}</p>

              <div className="tm-card__meta">
                <span>Order: {t.displayOrder}</span>
                {t.linkedinUrl && (
                  <a href={t.linkedinUrl} target="_blank" rel="noopener noreferrer" className="tm-card__link">
                    LinkedIn <ExternalLink size={12} />
                  </a>
                )}
              </div>

              <div className="tm-card__actions">
                <button type="button" className="tm-btn tm-btn--ghost" onClick={() => onToggleActive(t)}>
                  {t.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                  {t.isActive ? 'Hide' : 'Show'}
                </button>
                <button type="button" className="tm-btn tm-btn--ghost" onClick={() => setEditing(t)}>
                  <Pencil size={14} /> Edit
                </button>
                <button type="button" className="tm-btn tm-btn--danger" onClick={() => onDelete(t)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <TestimonialFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </section>
  )
}
