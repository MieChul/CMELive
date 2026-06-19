import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Pencil, Trash2, X, Upload, Eye, EyeOff,
  Search, RefreshCw, Film, Play,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cornerOffice as cornerOfficeApi } from '../services/api'
import '../pages/TestimonialsManagement.css'
import './CornerOfficeManagement.css'

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  imageUrl: '',
  videoUrl: '',
  displayOrder: 0,
  isActive: true,
}

const MAX_VIDEO_MB = 500

const pad2 = (n) => String(n).padStart(2, '0')

function ConversationFormModal({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial?.id)
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...(initial || {}) }))
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingVid, setUploadingVid] = useState(false)
  const [vidProgress, setVidProgress] = useState(0)
  const imgRef = useRef(null)
  const vidRef = useRef(null)

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
      const { data } = await cornerOfficeApi.uploadImage(file)
      set('imageUrl', data.imageUrl)
      toast.success('Cover image uploaded')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploadingImg(false)
    }
  }

  const onPickVideo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^video\//.test(file.type)) {
      toast.error('Please choose a video file')
      return
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Video must be ${MAX_VIDEO_MB}MB or smaller`)
      return
    }
    setUploadingVid(true)
    setVidProgress(0)
    try {
      const { data } = await cornerOfficeApi.uploadVideo(file, (ev) => {
        if (ev.total) setVidProgress(Math.round((ev.loaded / ev.total) * 100))
      })
      set('videoUrl', data.videoUrl)
      toast.success('Video uploaded')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploadingVid(false)
      setVidProgress(0)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.imageUrl) {
      toast.error('Cover image is required')
      return
    }
    if (!form.videoUrl) {
      toast.error('Video is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        imageUrl: form.imageUrl.trim(),
        videoUrl: form.videoUrl.trim(),
        displayOrder: Number(form.displayOrder) || 0,
        isActive: !!form.isActive,
      }
      const { data } = isEdit
        ? await cornerOfficeApi.update(initial.id, payload)
        : await cornerOfficeApi.create(payload)
      toast.success(isEdit ? 'Conversation updated' : 'Conversation added')
      onSaved(data.conversation)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || uploadingImg || uploadingVid

  return (
    <div className="tm-modal__backdrop" onClick={onClose}>
      <div className="tm-modal co-modal" onClick={(e) => e.stopPropagation()}>
        <header className="tm-modal__head">
          <h3>{isEdit ? 'Edit Conversation' : 'New Conversation'}</h3>
          <button type="button" className="tm-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <form className="tm-form" onSubmit={onSubmit}>
          {/* Cover image */}
          <div className="co-media-block">
            <span className="co-media-block__label">Cover image</span>
            <div className="co-media-block__row">
              <div className="co-image-preview">
                {form.imageUrl
                  ? <img src={form.imageUrl} alt={form.title || 'Preview'} />
                  : <div className="co-image-preview__empty"><Film size={28} /></div>}
              </div>
              <div className="co-media-block__actions">
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

          {/* Video */}
          <div className="co-media-block">
            <span className="co-media-block__label">Video (MP4)</span>
            <div className="co-media-block__row">
              <div className="co-video-preview">
                {form.videoUrl
                  ? <video src={form.videoUrl} controls preload="metadata" />
                  : <div className="co-video-preview__empty"><Play size={28} /></div>}
              </div>
              <div className="co-media-block__actions">
                <input ref={vidRef} type="file" accept="video/mp4,video/webm,video/quicktime"
                  onChange={onPickVideo} hidden />
                <button type="button" className="tm-btn tm-btn--ghost"
                  onClick={() => vidRef.current?.click()} disabled={uploadingVid}>
                  <Upload size={16} />
                  {uploadingVid ? `Uploading… ${vidProgress}%` : form.videoUrl ? 'Replace video' : 'Upload video'}
                </button>
                {form.videoUrl && (
                  <button type="button" className="tm-btn tm-btn--link"
                    onClick={() => set('videoUrl', '')}>
                    Remove
                  </button>
                )}
                <p className="tm-hint">MP4, WebM or MOV — up to 500MB.</p>
                {uploadingVid && (
                  <div className="co-progress">
                    <div className="co-progress__bar" style={{ width: `${vidProgress}%` }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <label className="tm-field">
            <span>Title <em>*</em></span>
            <input type="text" maxLength={255} value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Neural Networks" required />
          </label>

          <label className="tm-field">
            <span>Subtitle</span>
            <input type="text" maxLength={500} value={form.subtitle}
              onChange={(e) => set('subtitle', e.target.value)}
              placeholder="Deep learning architecture" />
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
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add conversation'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

export default function CornerOfficeManagement() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // conversation object or {} for new
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data } = await cornerOfficeApi.adminList()
      setItems(data.conversations || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((t) =>
      [t.title, t.subtitle].filter(Boolean).some((v) => v.toLowerCase().includes(q)),
    )
  }, [items, query])

  // Index used to compute the auto-number (01, 02, …) — based on active+order, matching public view.
  const numberIndex = useMemo(() => {
    const active = items
      .filter((t) => t.isActive)
      .sort((a, b) => (a.displayOrder - b.displayOrder) || (b.id - a.id))
    const map = new Map()
    active.forEach((t, i) => map.set(t.id, pad2(i + 1)))
    return map
  }, [items])

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
      const { data } = await cornerOfficeApi.update(item.id, { isActive: !item.isActive })
      upsert(data.conversation)
      toast.success(data.conversation.isActive ? 'Now visible on homepage' : 'Hidden from homepage')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    }
  }

  const onDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    try {
      await cornerOfficeApi.remove(item.id)
      setItems((prev) => prev.filter((t) => t.id !== item.id))
      toast.success('Conversation deleted')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <section className="adm-section tm-section">
      <div className="adm-section__top">
        <div>
          <h1 className="adm-section__title">
            <span className="title-spark">Corner Office</span> Conversations
          </h1>
          <p className="adm-section__sub">
            <Film size={11} style={{ opacity: 0.5 }} /> Homepage video cards · {items.length} conversation{items.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="tm-toolbar">
          <div className="tm-search">
            <Search size={14} />
            <input type="text" placeholder="Search by title or subtitle"
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
            <span>New conversation</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="tm-state"><RefreshCw size={16} className="spin" /> Loading conversations…</div>
      )}
      {!loading && error && <div className="tm-state tm-state--err">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="tm-empty">
          <p>No Corner Office conversations yet.</p>
          <button type="button" className="tm-btn tm-btn--primary" onClick={() => setEditing({})}>
            <Plus size={14} /> Add the first one
          </button>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <ul className="tm-grid co-grid">
          {filtered.map((t) => {
            const number = numberIndex.get(t.id) || '—'
            return (
              <li key={t.id} className={`tm-card co-card ${t.isActive ? '' : 'tm-card--inactive'}`}>
                <div className="co-card__media">
                  {t.imageUrl
                    ? <img src={t.imageUrl} alt={t.title} className="co-card__img" />
                    : <div className="co-card__img co-card__img--empty"><Film size={32} /></div>}
                  <div className="co-card__media-overlay" />
                  {t.videoUrl && (
                    <div className="co-card__play"><Play size={20} fill="currentColor" /></div>
                  )}
                  <span className="co-card__num">
                    {t.isActive ? number : '–'}
                  </span>
                  <span className={`tm-chip ${t.isActive ? 'tm-chip--on' : 'tm-chip--off'} co-card__chip`}>
                    {t.isActive ? 'Visible' : 'Hidden'}
                  </span>
                </div>

                <div className="co-card__body">
                  <div className="co-card__title">{t.title}</div>
                  {t.subtitle && <div className="co-card__sub">{t.subtitle}</div>}
                  <div className="co-card__meta">
                    <span>Order: {t.displayOrder}</span>
                    {!t.videoUrl && <span className="co-card__warn">No video</span>}
                  </div>
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
            )
          })}
        </ul>
      )}

      {editing && (
        <ConversationFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={upsert}
        />
      )}
    </section>
  )
}
