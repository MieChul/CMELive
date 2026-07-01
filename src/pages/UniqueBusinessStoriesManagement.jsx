import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Pencil, Trash2, X, Upload, Eye, EyeOff,
  Search, RefreshCw, Image as ImageIcon, Tag,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { uniqueBusinessStories as ubsApi } from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import '../pages/TestimonialsManagement.css'
import './UniqueBusinessStoriesManagement.css'

const EMPTY_FORM = {
  heading: '',
  subheading: '',
  domain: '',
  imageUrl: '',
  displayOrder: 0,
  isActive: true,
}

function StoryFormModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id)
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(initial || {}) }))
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const imgRef = useRef(null)

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
    setUploadingImg(true)
    try {
      const { data } = await ubsApi.uploadImage(file)
      set('imageUrl', data.imageUrl)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploadingImg(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.heading.trim()) {
      toast.error('Heading is required')
      return
    }
    if (!form.imageUrl) {
      toast.error('Image is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        heading: form.heading.trim(),
        subheading: form.subheading.trim(),
        domain: form.domain.trim(),
        imageUrl: form.imageUrl.trim(),
        displayOrder: Number(form.displayOrder) || 0,
        isActive: !!form.isActive,
      }
      const { data } = isEdit
        ? await ubsApi.update(initial.id, payload)
        : await ubsApi.create(payload)
      toast.success(isEdit ? 'Story updated' : 'Story added')
      onSaved(data.story)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || uploadingImg

  return (
    <div className="tm-modal__backdrop" onClick={onClose}>
      <div className="tm-modal ubs-modal" onClick={(e) => e.stopPropagation()}>
        <header className="tm-modal__head">
          <h3>{isEdit ? 'Edit Story' : 'New Story'}</h3>
          <button type="button" className="tm-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <form className="tm-form" onSubmit={onSubmit}>
          {/* Image */}
          <div className="ubs-media-block">
            <span className="ubs-media-block__label">Image <em>*</em></span>
            <div className="ubs-media-block__row">
              <div className="ubs-image-preview">
                {form.imageUrl
                  ? <img src={form.imageUrl} alt={form.heading || 'Preview'} />
                  : <div className="ubs-image-preview__empty"><ImageIcon size={28} /></div>}
              </div>
              <div className="ubs-media-block__actions">
                <input ref={imgRef} type="file" accept="image/*" onChange={onPickImage} hidden />
                <button type="button" className="tm-btn tm-btn--ghost"
                  onClick={() => imgRef.current?.click()} disabled={uploadingImg}>
                  <Upload size={16} />
                  {uploadingImg ? 'Uploading…' : form.imageUrl ? 'Replace image' : 'Upload image'}
                </button>
                {form.imageUrl && (
                  <button type="button" className="tm-btn tm-btn--link"
                    onClick={() => set('imageUrl', '')}>
                    Remove
                  </button>
                )}
                <p className="tm-hint">PNG, JPG, GIF, or WebP — up to 5MB.</p>
              </div>
            </div>
          </div>

          <label className="tm-field">
            <span>Domain</span>
            <input type="text" maxLength={120} value={form.domain}
              onChange={(e) => set('domain', e.target.value)}
              placeholder="E.g., Media & Entertainment" />
          </label>

          <label className="tm-field">
            <span>Heading <em>*</em></span>
            <input type="text" maxLength={255} value={form.heading}
              onChange={(e) => set('heading', e.target.value)}
              placeholder="E.g., AI-native thinking" required />
          </label>

          <label className="tm-field">
            <span>Subheading</span>
            <input type="text" maxLength={500} value={form.subheading}
              onChange={(e) => set('subheading', e.target.value)}
              placeholder="E.g., A short supporting line about the story" />
          </label>

          <div className="tm-form__row tm-form__row--two">
            <label className="tm-field">
              <span>Display order <em>*</em></span>
              <input type="number" min={0} max={9999} value={form.displayOrder}
                onChange={(e) => set('displayOrder', e.target.value)} />
              <small className="tm-hint">Must be unique. Lower numbers appear first.</small>
            </label>

            <label className="tm-field tm-field--toggle">
              <span>Visible on homepage</span>
              <button type="button" role="switch" aria-checked={form.isActive}
                className={`tm-switch ${form.isActive ? 'tm-switch--on' : ''}`}
                onClick={() => set('isActive', !form.isActive)}>
                <span className="tm-switch__thumb" />
              </button>
            </label>
          </div>

          <footer className="tm-modal__foot">
            <button type="button" className="tm-btn tm-btn--ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="tm-btn tm-btn--primary" disabled={busy}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add story'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

export default function UniqueBusinessStoriesManagement() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data } = await ubsApi.adminList()
      setItems(data.stories || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load stories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((t) =>
      [t.heading, t.subheading, t.domain].filter(Boolean).some((v) => v.toLowerCase().includes(q)),
    )
  }, [items, query])

  const upsert = (saved) => {
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
      const { data } = await ubsApi.update(item.id, { isActive: !item.isActive })
      upsert(data.story)
      toast.success(data.story.isActive ? 'Now visible on homepage' : 'Hidden from homepage')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    }
  }

  const onDelete = async (item) => {
    try {
      await ubsApi.remove(item.id)
      setItems((prev) => prev.filter((t) => t.id !== item.id))
      setConfirmDelete(null)
      toast.success('Story deleted')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <section className="adm-section tm-section">
      <div className="adm-section__top">
        <div>
          <h1 className="adm-section__title">
            <span className="title-spark">Unique Business</span> Stories
          </h1>
          <p className="adm-section__sub">
            <Tag size={11} style={{ opacity: 0.5 }} /> Homepage story cards · {items.length} stor{items.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <div className="tm-toolbar">
          <div className="tm-search">
            <Search size={14} />
            <input type="text" placeholder="Search by heading, subheading or domain"
              value={query} onChange={(e) => setQuery(e.target.value)} />
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
            <span>New story</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="tm-state"><RefreshCw size={16} className="spin" /> Loading stories…</div>
      )}
      {!loading && error && <div className="tm-state tm-state--err">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="tm-empty">
          <p>No Unique Business stories yet.</p>
          <button type="button" className="tm-btn tm-btn--primary" onClick={() => setEditing({})}>
            <Plus size={14} /> Add the first one
          </button>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <ul className="tm-grid ubs-grid">
          {filtered.map((t) => (
            <li key={t.id} className={`tm-card ubs-card-adm ${t.isActive ? '' : 'tm-card--inactive'}`}>
              <div className="ubs-card-adm__media">
                {t.imageUrl
                  ? <img src={t.imageUrl} alt={t.heading} className="ubs-card-adm__img" />
                  : <div className="ubs-card-adm__img ubs-card-adm__img--empty"><ImageIcon size={32} /></div>}
                {t.domain && <span className="ubs-card-adm__domain">{t.domain}</span>}
                <span className={`tm-chip ${t.isActive ? 'tm-chip--on' : 'tm-chip--off'} ubs-card-adm__chip`}>
                  {t.isActive ? 'Visible' : 'Hidden'}
                </span>
              </div>

              <div className="ubs-card-adm__body">
                <div className="ubs-card-adm__title">{t.heading}</div>
                {t.subheading && <div className="ubs-card-adm__sub">{t.subheading}</div>}
                <div className="ubs-card-adm__meta">
                  <span>Order: {t.displayOrder}</span>
                </div>
              </div>

              <div className="ubs-card-adm__actions">
                <button
                  type="button"
                  className="ubs-act ubs-act--toggle"
                  onClick={() => onToggleActive(t)}
                  title={t.isActive ? 'Hide from homepage' : 'Show on homepage'}
                >
                  {t.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                  <span>{t.isActive ? 'Hide' : 'Show'}</span>
                </button>
                <button
                  type="button"
                  className="ubs-act ubs-act--edit"
                  onClick={() => setEditing(t)}
                  title="Edit story"
                >
                  <Pencil size={15} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className="ubs-act ubs-act--delete"
                  onClick={() => setConfirmDelete(t)}
                  title="Delete story"
                >
                  <Trash2 size={15} />
                  <span>Delete</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <StoryFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={upsert}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Story"
          message={`Delete "${confirmDelete.heading}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          isDanger={true}
          onConfirm={() => onDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </section>
  )
}
