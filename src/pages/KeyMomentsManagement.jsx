import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RefreshCw, Play, Search, X, CheckCircle, XCircle, Pencil,
  Film, Clock, ExternalLink, Eye, Heart, Share2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { keyMoments as keyMomentsApi } from '../services/api'
// Delete action removed for Key Moments per request
import '../pages/TestimonialsManagement.css'
import './KeyMomentsManagement.css'

const STATUS_LABEL = { all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }
const STATUS_LIST  = ['all', 'pending', 'approved', 'rejected']

function formatDuration(sec) {
  if (!sec || sec <= 0) return null
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function StatusChip({ status }) {
  return <span className={`km-chip km-chip--${status}`}>{STATUS_LABEL[status] || status}</span>
}

function MetadataPanel({ metadata }) {
  if (!metadata) return null

  const {
    text,
    topic,
    subtopics,
    entities,
  } = metadata

  return (
    <div className="km-metadata-block">
      {(topic || (Array.isArray(subtopics) && subtopics.length > 0)) && (
        <div className="km-section">
          <h5 className="km-section-title">Topics</h5>
          <div className="km-chips-row">
            {topic && <span className="km-chip km-chip--topic">{topic}</span>}
            {Array.isArray(subtopics) && subtopics.map((s) => (
              <span key={s} className="km-chip km-chip--subtopic">{s}</span>
            ))}
          </div>
        </div>
      )}

      {text && (
        <div className="km-section">
          <h5 className="km-section-title">Transcript</h5>
          <div className="km-transcript">{text}</div>
        </div>
      )}

      {Array.isArray(entities) && entities.length > 0 && (
        <div className="km-section">
          <h5 className="km-section-title">Entities</h5>
          <div className="km-chips-row">
            {entities.map((e) => <span key={e} className="km-chip km-chip--entity">{e}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Edit / view drawer ──────────────────────────────────────────────── */
function KeyMomentDrawer({ item, onClose, onSaved, onStatusChange, onDelete }) {
  const [form, setForm] = useState({
    title: item.title || '',
    description: item.description || '',
    category: item.category || '',
    tags: item.tags || '',
  })
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [videoErr, setVideoErr] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await keyMomentsApi.update(item.id, form)
      toast.success('Key moment updated')
      onSaved(data.keyMoment)
      setEditMode(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="km-overlay" onClick={onClose}>
      <div className="km-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="km-drawer__head">
          <div>
            <h3>{item.title || 'Untitled key moment'}</h3>
            <p>{item.category || 'Uncategorized'} · fetched {new Date(item.fetchedAt).toLocaleString()}</p>
          </div>
          <button type="button" className="km-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="km-drawer__body">
          {(item.playbackUrl || item.localVideoUrl || item.remoteVideoUrl) && !videoErr ? (
            <video src={item.playbackUrl || item.localVideoUrl || item.remoteVideoUrl || ''} controls preload="metadata"
              poster={item.thumbnailUrl || undefined} className="km-drawer__video"
              onError={() => setVideoErr(true)} />
          ) : (
            <div className="km-drawer__video km-drawer__video--missing">
              <Film size={28} /> <span>Video not available</span>
            </div>
          )}

          <div className="km-drawer__meta-row">
            <StatusChip status={item.status} />
            {item.durationSeconds && (
              <span className="km-meta-pill"><Clock size={11} /> {formatDuration(item.durationSeconds)}</span>
            )}
            {item.capturedAt && (
              <span className="km-meta-pill">Captured: {item.capturedAt}</span>
            )}
            {item.remoteVideoUrl && (
              <a href={item.remoteVideoUrl} target="_blank" rel="noopener noreferrer"
                className="km-meta-pill km-meta-pill--link">
                <ExternalLink size={11} /> Source
              </a>
            )}
          </div>

          {item.status === 'approved' && (
            <div className="km-engagement-row">
              <span className="km-eng-pill"><Eye size={11} /> {(item.views ?? 0).toLocaleString()} views</span>
              <span className="km-eng-pill"><Heart size={11} /> {(item.likes ?? 0).toLocaleString()} likes</span>
              <span className="km-eng-pill"><Share2 size={11} /> {(item.shares ?? 0).toLocaleString()} shares</span>
            </div>
          )}

          {!editMode ? (
            <>
              <h4 className="km-section-title">Description</h4>
              <p className="km-desc">{item.description || <em>No description provided.</em>}</p>
              {item.tags && (
                <>
                  <h4 className="km-section-title">Tags</h4>
                  <div className="km-tags">
                    {item.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                      <span key={t} className="km-tag">{t}</span>
                    ))}
                  </div>
                </>
              )}
              {item.s3Path && (
                <p className="km-path"><strong>S3 path:</strong> <code>{item.s3Path}</code></p>
              )}
              <MetadataPanel metadata={item.metadata} />
            </>
          ) : (
            <>
              <label className="km-field"><span>Title</span>
                <input type="text" value={form.title} onChange={set('title')} maxLength={500} />
              </label>
              <label className="km-field"><span>Description</span>
                <textarea rows={5} value={form.description} onChange={set('description')} maxLength={8000} />
              </label>
              <div className="km-field-row">
                <label className="km-field"><span>Category</span>
                  <input type="text" value={form.category} onChange={set('category')} maxLength={100} />
                </label>
                <label className="km-field"><span>Tags (comma-separated)</span>
                  <input type="text" value={form.tags} onChange={set('tags')} maxLength={500} />
                </label>
              </div>
            </>
          )}
        </div>

        <div className="km-drawer__foot">
          {!editMode ? (
            <>
              <span style={{ flex: 1 }} />
              {item.status !== 'rejected' && (
                <button type="button" className="km-btn km-btn--reject"
                  onClick={() => onStatusChange(item, 'rejected')}>
                  <XCircle size={14} /> Reject
                </button>
              )}
              {item.status !== 'approved' && (
                <button type="button" className="km-btn km-btn--approve"
                  onClick={() => onStatusChange(item, 'approved')}>
                  <CheckCircle size={14} /> Approve
                </button>
              )}
              <button type="button" className="km-btn km-btn--primary"
                onClick={() => setEditMode(true)}>
                <Pencil size={14} /> Edit
              </button>
            </>
          ) : (
            <>
              <span style={{ flex: 1 }} />
              <button type="button" className="km-btn km-btn--ghost"
                onClick={() => setEditMode(false)} disabled={saving}>Cancel</button>
              <button type="button" className="km-btn km-btn--primary"
                onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function KeyMomentsManagement() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fetching, setFetching] = useState(false)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data } = await keyMomentsApi.adminList()
      setItems(data.keyMoments || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load key moments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => ({
    all:      items.length,
    pending:  items.filter((i) => i.status === 'pending').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
  }), [items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      if (filter !== 'all' && i.status !== filter) return false
      if (!q) return true
      return [i.title, i.description, i.category, i.tags]
        .filter(Boolean).some((v) => v.toLowerCase().includes(q))
    })
  }, [items, filter, query])

  const fetchNow = async () => {
    setFetching(true)
    const t = toast.loading('Fetching key moments…')
    try {
      const { data } = await keyMomentsApi.fetchNow({ limit: 25 })
      const { inserted = 0, skipped = 0, failed = 0, fetched = 0 } = data.summary || {}
      toast.success(
        `Done — ${inserted} new, ${skipped} skipped, ${failed} failed (out of ${fetched})`,
        { id: t },
      )
      await load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fetch failed', { id: t })
    } finally {
      setFetching(false)
    }
  }

  const upsert = (updated) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    setActive((cur) => (cur && cur.id === updated.id ? updated : cur))
  }

  const changeStatus = async (item, status) => {
    try {
      const { data } = await keyMomentsApi.update(item.id, { status })
      upsert(data.keyMoment)
      toast.success(`Marked as ${status}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed')
    }
  }

  const remove = async (item) => {
    try {
      await keyMomentsApi.remove(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      if (active?.id === item.id) setActive(null)
      setConfirmDelete(null)
      toast.success('Key moment deleted')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <section className="adm-section km-page">
      <div className="adm-section__top">
        <div>
          <h1 className="adm-section__title">
            <span className="title-spark">Key</span> Moments
          </h1>
          <p className="adm-section__sub">
            <Film size={11} style={{ opacity: 0.5 }} />
            Created By SmartClip Generator· {items.length} stored
          </p>
        </div>
        <div className="km-toolbar">
          <div className="km-search">
            <Search size={14} />
            <input type="text" placeholder="Search title, tags…"
              value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && (
              <button type="button" className="km-search__clear" onClick={() => setQuery('')}>
                <X size={13} />
              </button>
            )}
          </div>
          <button type="button" className="km-btn km-btn--ghost"
            onClick={load} disabled={loading} title="Refresh">
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button type="button" className="km-btn km-btn--primary"
            onClick={fetchNow} disabled={fetching}>
            {fetching
              ? <><RefreshCw size={14} className="spin" /> Fetching…</>
              : <><Play size={14} /> Fetch Now</>}
          </button>
        </div>
      </div>

      <div className="km-content">
      <div className="km-filters">
        {STATUS_LIST.map((s) => (
          <button key={s} type="button"
            className={`km-filter ${filter === s ? 'km-filter--active' : ''}`}
            onClick={() => setFilter(s)}>
            {STATUS_LABEL[s]} <span className="km-filter__count">{counts[s]}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="km-state"><RefreshCw size={16} className="spin" /> Loading key moments…</div>
      )}
      {!loading && error && <div className="km-state km-state--err">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="km-empty">
          <Film size={32} />
          <p>{items.length === 0
            ? 'No key moments fetched yet. Click "Fetch Now" to pull from the AWS feed.'
            : 'No key moments match the current filter.'}</p>
          {items.length === 0 && (
            <button type="button" className="km-btn km-btn--primary"
              onClick={fetchNow} disabled={fetching}>
              <Play size={14} /> Fetch Now
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <ul className="km-grid">
          {filtered.map((item) => (
            <li key={item.id} className={`km-card km-card--${item.status}`}>
              <button type="button" className="km-card__media" onClick={() => setActive(item)}>
                {item.thumbnailUrl
                  ? <img src={item.thumbnailUrl} alt={item.title} />
                  : item.playbackUrl
                    ? <video src={item.playbackUrl} preload="metadata" muted playsInline />
                    : <div className="km-card__media-empty"><Film size={28} /></div>}
                <span className="km-card__play"><Play size={16} fill="currentColor" /></span>
                {item.durationSeconds && (
                  <span className="km-card__duration">{formatDuration(item.durationSeconds)}</span>
                )}
                <StatusChip status={item.status} />
              </button>
              <div className="km-card__body">
                <div className="km-card__title">{item.title || 'Untitled'}</div>
                <div className="km-card__cat-row">
                  {item.category && <div className="km-card__cat">{item.category}</div>}
                  {item.status === 'approved' && (item.views > 0 || item.likes > 0 || item.shares > 0) && (
                    <div className="km-card__stats">
                      <span className="km-card__stat"><Eye size={10}/> {(item.views ?? 0).toLocaleString()}</span>
                      <span className="km-card__stat"><Heart size={10}/> {(item.likes ?? 0).toLocaleString()}</span>
                      <span className="km-card__stat"><Share2 size={10}/> {(item.shares ?? 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <p className="km-card__desc">{item.description || 'No description.'}</p>
              </div>
              <div className="km-card__actions">
                <button type="button" className="km-btn km-btn--ghost km-btn--sm"
                  onClick={() => setActive(item)}>
                  <Eye size={13} /> View
                </button>
                {item.status !== 'approved' && (
                  <button type="button" className="km-btn km-btn--approve km-btn--sm"
                    onClick={() => changeStatus(item, 'approved')}>
                    <CheckCircle size={13} /> Approve
                  </button>
                )}
                {item.status !== 'rejected' && (
                  <button type="button" className="km-btn km-btn--reject km-btn--sm"
                    onClick={() => changeStatus(item, 'rejected')}>
                    <XCircle size={13} /> Reject
                  </button>
                )}
                
              </div>
            </li>
          ))}
        </ul>
      )}

      </div>

      {active && (
        <KeyMomentDrawer
          item={active}
          onClose={() => setActive(null)}
          onSaved={upsert}
          onStatusChange={changeStatus}
        />
      )}
    </section>
  )
}
