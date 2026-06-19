import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Newspaper, Users, Settings, Sparkles, Eye, Pencil,
  CheckCircle, XCircle, Trash2, X, ExternalLink, Play, RefreshCw,
  Zap, Globe, Filter, Hash, Star, Activity, ChevronRight, Clock,
  TrendingUp, Plus, Minus, AlertCircle, Rss, ChevronDown, ChevronUp,
  Home, Image, Upload, ImagePlus, Film, MoreVertical,
  Heart, Share2, BarChart3,
  PanelLeftClose, PanelLeftOpen, MessageSquareQuote,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { news, admin } from '../services/api'
import UserManagement from './UserManagement.jsx'
import TestimonialsManagement from './TestimonialsManagement.jsx'
import CornerOfficeManagement from './CornerOfficeManagement.jsx'
import KeyMomentsManagement from './KeyMomentsManagement.jsx'
import './AdminPage.css'

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const cleanText = (t) => t ? t.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : ''

const CAT_COLORS = {
  'AI Research':      ['#7C3AED', '#4F46E5'],
  'Industry News':    ['#F2665B', '#C94840'],
  'Business':         ['#0EA5E9', '#0284C7'],
  'Products & Tools': ['#10B981', '#059669'],
  'Policy & Ethics':  ['#F59E0B', '#D97706'],
  'Science':          ['#8B5CF6', '#6D28D9'],
}

const STATUS_COLORS = { pending: '#FFB347', approved: '#00E5A0', rejected: '#FF6B6B' }

/* ─── LTM Logo ───────────────────────────────────────────────────────────── */
function LtmLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="12" viewBox="0 0 64 16" fill="none" aria-label="LTM">
      <path d="M4.88421 12.3211H16.8421V16.0011H4.21053C1.88463 16.0011 0 14.2107 0 12.0011V0.00105629H4.21053V11.6811C4.21053 12.0347 4.512 12.3211 4.88421 12.3211ZM14.1474 3.68106H21.8947C22.2669 3.68106 22.5684 3.96746 22.5684 4.32106V16.0011H26.7789V4.32106C26.7789 3.96746 27.0804 3.68106 27.4526 3.68106H35.2V0.00105629H14.1474V3.68106ZM56.4093 0.00105629C56.4093 0.00105629 56.0387 -0.0229437 55.8518 0.157856C55.6211 0.381856 55.3836 0.996256 55.3836 0.996256L51.3684 10.6779L47.3533 0.996256C47.3533 0.996256 47.1158 0.381856 46.8851 0.157856C46.6981 -0.0229437 46.3276 0.00105629 46.3276 0.00105629H38.7368V15.9979H42.9474V3.81546C42.9474 3.59466 43.1528 3.41546 43.3617 3.41546C43.7878 3.41546 43.9663 3.90026 44.1819 4.42186C44.3975 4.94346 48.7983 15.3947 48.7983 15.3947C48.9499 15.7611 49.3238 16.0027 49.7381 16.0027H52.9987C53.4131 16.0027 53.787 15.7611 53.9385 15.3947C53.9385 15.3947 58.3394 4.94346 58.555 4.42186C58.7705 3.90026 58.9491 3.41546 59.3752 3.41546C59.8013 3.41546 59.7895 3.59466 59.7895 3.81546V16.0011H64V0.00105629H56.4093Z" fill="#F2665B"/>
    </svg>
  )
}

/* ─── Animated Wave Background ───────────────────────────────────────────── */
function WaveBackground() {
  return (
    <div className="wave-bg" aria-hidden="true">
      <div className="wave-orb wave-orb--1" />
      <div className="wave-orb wave-orb--2" />
      <div className="wave-orb wave-orb--3" />
      <div className="wave-strip" />
    </div>
  )
}

/* ─── Film Strip Decoration ──────────────────────────────────────────────── */
function FilmStrip() {
  return (
    <div className="film-strip" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="film-strip__hole" />
      ))}
    </div>
  )
}

/* ─── Score Ring ─────────────────────────────────────────────────────────── */
function ScoreRing({ score = 0, size = 54 }) {
  const s = Math.max(0, Math.min(100, score))
  const r = size / 2 - 5
  const circ = 2 * Math.PI * r
  const fill = (s / 100) * circ
  const color = s >= 75 ? '#00E5A0' : s >= 50 ? '#FFB347' : '#FF6B6B'
  const cx = size / 2
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <span className="score-ring__val" style={{ color, fontSize: size < 48 ? 10 : 12 }}>{s}</span>
    </div>
  )
}

/* ─── Toggle ─────────────────────────────────────────────────────────────── */
function Toggle({ on, onChange, disabled = false }) {
  return (
    <label className={`tgl ${disabled ? 'tgl--off' : ''}`}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="tgl__track"><span className="tgl__thumb" /></span>
    </label>
  )
}

/* ─── Status chip ────────────────────────────────────────────────────────── */
const SL = { all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }
function Chip({ status }) {
  return <span className={`chip chip--${status}`}>{SL[status] ?? status}</span>
}

/* ─── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, Icon, color }) {
  return (
    <div className="stat" style={{ '--c': color }}>
      <div className="stat__glow" />
      <div className="stat__icon"><Icon size={16} /></div>
      <div className="stat__val">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  )
}

/* ─── Image Gallery ──────────────────────────────────────────────────────── */
function ImageGallery({ images, onSetDefault, onRemove, onAdd }) {
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = () => {
    const url = newUrl.trim()
    if (!url) return
    onAdd({ url, alt: 'Custom image', isDefault: images.length === 0, source: 'manual' })
    setNewUrl('')
    setAdding(false)
  }

  return (
    <div className="img-gallery">
      <div className="img-gallery__label">
        <Image size={13} />
        <span>Images</span>
        <span className="img-gallery__count">{images.length}</span>
      </div>
      {images.length > 0 ? (
        <div className="img-gallery__grid">
          {images.map((img, idx) => (
            <div key={idx} className={`img-tile ${img.isDefault ? 'img-tile--default' : ''}`}>
              <img src={img.url} alt={img.alt || ''} className="img-tile__img" loading="lazy"
                onError={(e) => { e.currentTarget.style.opacity = '0.3' }} />
              <div className="img-tile__overlay">
                {img.source && <span className="img-tile__src">{img.source}</span>}
              </div>
              {img.isDefault && <span className="img-tile__badge">Default</span>}
              <div className="img-tile__actions">
                {!img.isDefault && (
                  <button type="button" className="img-tile__btn img-tile__btn--default"
                    onClick={() => onSetDefault(idx)} title="Set as default">
                    <Star size={11} />
                  </button>
                )}
                <button type="button" className="img-tile__btn img-tile__btn--remove"
                  onClick={() => onRemove(idx)} title="Remove">
                  <X size={11} />
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="img-tile img-tile--add" onClick={() => setAdding(true)}>
            <ImagePlus size={18} />
            <span>Add</span>
          </button>
        </div>
      ) : (
        <div className="img-gallery__empty">
          <Film size={20} />
          <span>No images yet</span>
          <button type="button" className="btn-ghost btn--sm" onClick={() => setAdding(true)}>
            Add Image URL
          </button>
        </div>
      )}

      {adding && (
        <div className="img-gallery__add-form">
          <input type="url" placeholder="https://example.com/image.jpg"
            value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            autoFocus />
          <div className="img-gallery__add-btns">
            <button type="button" className="btn-ghost btn--sm" onClick={() => setAdding(false)}>Cancel</button>
            <button type="button" className="btn-coral btn--sm" onClick={handleAdd}>Add</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   RIGHT PANEL (slide-in from right — replaces center modals)
   ═══════════════════════════════════════════════════════════════════════════ */
function RightPanel({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])

  return (
    <div className="rp-overlay" onClick={onClose}>
      <div className="rp" onClick={(e) => e.stopPropagation()}>
        <div className="rp__head">
          <div className="rp__head-text">
            <h3 className="rp__title">{title}</h3>
            {subtitle && <p className="rp__sub">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="rp__body">{children}</div>
        {footer && <div className="rp__foot">{footer}</div>}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   RUN AGENT PANEL
   ═══════════════════════════════════════════════════════════════════════════ */
function RunAgentPanel({ cfg, catalog, tiers, onClose, onRun }) {
  const [mode, setMode] = useState('saved')
  const [batchSize, setBatchSize] = useState(cfg.maxPerBatch ?? 5)
  const [minScore, setMinScore] = useState(cfg.minAiScore ?? 50)
  const [tierFilter, setTierFilter] = useState('all')
  const [saveDefault, setSaveDefault] = useState(false)
  const [running, setRunning] = useState(false)

  const activeCount = (cfg.enabledSources || []).length
  const totalCount  = catalog ? Object.keys(catalog).length : 0
  const catCount    = (cfg.categories || []).length

  const handleRun = async () => {
    setRunning(true)
    let body = {}
    if (mode === 'custom') {
      body.maxArticles = batchSize
      body.minAiScore  = minScore
      if (tierFilter !== 'all' && catalog) {
        body.enabledSources = (cfg.enabledSources || []).filter(
          (k) => catalog[k]?.tier === tierFilter,
        )
      }
      if (saveDefault) body.saveAsDefault = true
    }
    await onRun(body)
    setRunning(false)
    onClose()
  }

  const scoreColor = minScore >= 75 ? '#00E5A0' : minScore >= 50 ? '#FFB347' : '#FF6B6B'

  return (
    <RightPanel
      title="Run News Agent"
      subtitle="Fetch and process the next batch of articles"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-coral" onClick={handleRun} disabled={running}>
            {running ? <><RefreshCw size={14} className="spin" /> Running…</> : <><Play size={14} /> Run Agent</>}
          </button>
        </>
      }
    >
      {/* Config summary */}
      <div className="run-summary">
        <div className="run-stat"><span style={{ color: '#F2665B' }}>{activeCount}<small>/{totalCount}</small></span><label>Sources</label></div>
        <div className="run-stat"><span style={{ color: '#FFB347' }}>{cfg.maxPerBatch ?? 5}</span><label>Per batch</label></div>
        <div className="run-stat"><span style={{ color: '#A78BFA' }}>{catCount}</span><label>Categories</label></div>
        <div className="run-stat"><span style={{ color: '#00E5A0' }}>{cfg.minAiScore ?? 50}+</span><label>Min score</label></div>
      </div>

      {/* Mode selector */}
      <div className="run-modes">
        <label className={`run-mode ${mode === 'saved' ? 'active' : ''}`}>
          <input type="radio" name="rmode" checked={mode === 'saved'} onChange={() => setMode('saved')} />
          <div>
            <div className="run-mode__title">Use saved configuration</div>
            <div className="run-mode__sub">Run exactly as configured — fastest option</div>
          </div>
        </label>
        <label className={`run-mode ${mode === 'custom' ? 'active' : ''}`}>
          <input type="radio" name="rmode" checked={mode === 'custom'} onChange={() => setMode('custom')} />
          <div>
            <div className="run-mode__title">Customize this run</div>
            <div className="run-mode__sub">Override parameters for this fetch only</div>
          </div>
        </label>
      </div>

      {/* Custom overrides */}
      {mode === 'custom' && (
        <div className="run-overrides">
          <label className="form-field">
            <div className="form-field__top">
              <span>Batch size</span>
              <strong style={{ color: '#F2665B' }}>{batchSize} articles</strong>
            </div>
            <input type="range" min="1" max="25" step="1" value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="ag-slider" style={{ '--fill': '#F2665B' }} />
            <div className="ag-slider-marks"><span>1</span><span>25</span></div>
          </label>

          <label className="form-field">
            <div className="form-field__top">
              <span>Min AI Score</span>
              <strong style={{ color: scoreColor }}>{minScore}</strong>
            </div>
            <input type="range" min="0" max="100" step="5" value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="ag-slider" style={{ '--fill': scoreColor }} />
            <div className="ag-slider-marks"><span>0</span><span>50</span><span>100</span></div>
          </label>

          {tiers && (
            <label className="form-field">
              <span>Source tier filter</span>
              <div className="tier-chips">
                <button type="button" className={`tier-pill ${tierFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTierFilter('all')}>All tiers</button>
                {tiers.map((t) => (
                  <button key={t.id} type="button"
                    className={`tier-pill ${tierFilter === t.id ? 'active' : ''}`}
                    style={{ '--tc': t.color }}
                    onClick={() => setTierFilter(t.id)}>
                    {t.label.split('—')[1]?.trim() ?? t.id}
                  </button>
                ))}
              </div>
            </label>
          )}

          <label className="run-save-toggle">
            <input type="checkbox" checked={saveDefault} onChange={(e) => setSaveDefault(e.target.checked)} />
            <span>Save as new default configuration</span>
          </label>
        </div>
      )}
    </RightPanel>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   VIEW DIALOG
   ═══════════════════════════════════════════════════════════════════════════ */
function ViewDialog({ item, rank, onClose, onEdit, onStatusChange }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])

  const tags = item.tags ? item.tags.split(',').map((t) => t.trim()).filter(Boolean) : []

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="view-dlg" onClick={(e) => e.stopPropagation()}>
        {item.imageUrl ? (
          <div className="view-dlg__img-wrap">
            <img src={item.imageUrl} alt={item.imageAlt || item.title} className="view-dlg__img" />
            <div className="view-dlg__img-fade" />
            <button type="button" className="view-dlg__img-close" onClick={onClose}><X size={15} /></button>
            <div className="view-dlg__img-meta">
              <ScoreRing score={item.aiScore || 0} size={50} />
              {rank && <span className="view-dlg__rank">#{rank}</span>}
            </div>
          </div>
        ) : (
          <div className="view-dlg__no-img">
            <div className="view-dlg__score-row">
              <ScoreRing score={item.aiScore || 0} size={46} />
              {rank && <span className="view-dlg__rank">#{rank}</span>}
            </div>
            <button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        )}

        <div className="view-dlg__body">
          <div className="view-dlg__meta">
            <Chip status={item.status} />
            {item.category && <span className="view-dlg__cat">{item.category}</span>}
            {item.publishedDate && <span className="view-dlg__date">{item.publishedDate}</span>}
          </div>
          <h2 className="view-dlg__title">{cleanText(item.title)}</h2>
          <p className="view-dlg__excerpt">{cleanText(item.excerpt)}</p>
          {item.summary && <><div className="view-dlg__divider" /><p className="view-dlg__summary">{item.summary}</p></>}

          <div className="view-dlg__imperatives">
            <div className="imperative-card imperative-card--domain">
              <div className="imperative-card__header">
                <span className="imperative-card__icon">🏢</span>
                <span className="imperative-card__label">Domain Imperative</span>
                <span className="imperative-card__badge">For Executives</span>
              </div>
              <p className="imperative-card__text">{item.domainImperative || 'No business or strategic implications identified in this article for media & entertainment executives.'}</p>
            </div>
            <div className="imperative-card imperative-card--tech">
              <div className="imperative-card__header">
                <span className="imperative-card__icon">⚡</span>
                <span className="imperative-card__label">AI Tech Imperative</span>
                <span className="imperative-card__badge">For Engineers</span>
              </div>
              <p className="imperative-card__text">{item.aiTechImperative || 'No technical insights identified in this article for AI practitioners or engineers.'}</p>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="view-dlg__tags">{tags.map((t) => <span key={t} className="view-dlg__tag">{t}</span>)}</div>
          )}
          <div className="view-dlg__src-row">
            {item.source && <span className="view-dlg__src">{item.source}</span>}
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="view-dlg__link">
                <ExternalLink size={12} /> Read original
              </a>
            )}
          </div>

          {(item.views > 0 || item.likes > 0 || item.shares > 0) && (
            <div className="view-dlg__engagement">
              <span className="view-dlg__eng-stat"><Eye size={12} /> {(item.views ?? 0).toLocaleString()} views</span>
              <span className="view-dlg__eng-stat"><Heart size={12} /> {(item.likes ?? 0).toLocaleString()} likes</span>
              <span className="view-dlg__eng-stat"><Share2 size={12} /> {(item.shares ?? 0).toLocaleString()} shares</span>
            </div>
          )}
        </div>

        <div className="view-dlg__actions">
          <button type="button" className="btn-ghost" onClick={() => { onClose(); onEdit(item) }}>Edit</button>
          {item.status !== 'rejected' && (
            <button type="button" className="btn-reject" onClick={() => { onStatusChange(item, 'rejected'); onClose() }}>Reject</button>
          )}
          {item.status !== 'approved' && (
            <button type="button" className="btn-approve" onClick={() => { onStatusChange(item, 'approved'); onClose() }}>
              <CheckCircle size={14} /> Approve
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   EDIT PANEL (right-slide drawer)
   ═══════════════════════════════════════════════════════════════════════════ */
function EditPanel({ item, onClose, onSaved }) {
  const parseImages = (raw) => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    try { return JSON.parse(raw) } catch { return [] }
  }

  const [form, setForm] = useState({
    title: item.title || '',
    excerpt: item.excerpt || '',
    summary: item.summary || '',
    domainImperative: item.domainImperative || '',
    aiTechImperative: item.aiTechImperative || '',
    category: item.category || '',
    source: item.source || '',
    status: item.status || 'pending',
    publishedDate: item.publishedDate || '',
    url: item.url || '',
    imageUrl: item.imageUrl || '',
    imageAlt: item.imageAlt || '',
    tags: item.tags || '',
    aiScore: item.aiScore ?? 50,
  })
  const [images, setImages] = useState(parseImages(item.images))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleSetDefault = (idx) => {
    setImages((prev) => prev.map((img, i) => ({ ...img, isDefault: i === idx })))
    const img = images[idx]
    if (img) setForm((p) => ({ ...p, imageUrl: img.url, imageAlt: img.alt || '' }))
  }

  const handleRemoveImage = (idx) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      if (prev[idx]?.isDefault && next.length > 0) next[0].isDefault = true
      return next
    })
  }

  const handleAddImage = (img) => {
    setImages((prev) => {
      const next = [...prev, img]
      if (img.isDefault) {
        setForm((p) => ({ ...p, imageUrl: img.url, imageAlt: img.alt || '' }))
      }
      return next
    })
  }

  const save = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.excerpt.trim()) { setError('Excerpt is required.'); return }
    setSaving(true); setError('')
    try {
      const defaultImg = images.find((img) => img.isDefault) || images[0]
      const payload = {
        ...form,
        aiScore: Number(form.aiScore),
        imageUrl: defaultImg?.url || form.imageUrl,
        imageAlt: defaultImg?.alt || form.imageAlt,
        images,
      }
      await news.update(item.id, payload)
      onSaved({ ...item, ...payload })
    } catch (err) { setError(err?.response?.data?.error || 'Save failed.') }
    finally { setSaving(false) }
  }

  return (
    <RightPanel
      title="Edit Article"
      subtitle={item.source ? `From ${item.source}` : undefined}
      onClose={onClose}
      footer={
        <>
          {error && <p className="form-error" style={{ flex: 1 }}>{error}</p>}
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-coral" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      }
    >
      <label className="form-field"><span>Title</span>
        <input type="text" value={form.title} onChange={set('title')} maxLength={500} /></label>

      <label className="form-field"><span>Excerpt (60-word snippet)</span>
        <textarea rows={3} value={form.excerpt} onChange={set('excerpt')} maxLength={5000} /></label>

      <label className="form-field"><span>Full Summary</span>
        <textarea rows={5} value={form.summary} onChange={set('summary')} maxLength={10000} /></label>

      <div className="imperative-edit-row">
        <label className="form-field imperative-edit-field imperative-edit-field--domain">
          <span className="imperative-edit-label">
            <span>🏢</span> Domain Imperative
            <em className="imperative-edit-hint">For executives — business &amp; strategic impact</em>
          </span>
          <textarea rows={3} value={form.domainImperative} onChange={set('domainImperative')} maxLength={2000}
            placeholder="What this means for media &amp; entertainment leaders, their revenue models, and competitive position…" />
        </label>
        <label className="form-field imperative-edit-field imperative-edit-field--tech">
          <span className="imperative-edit-label">
            <span>⚡</span> AI Tech Imperative
            <em className="imperative-edit-hint">For engineers — technical significance</em>
          </span>
          <textarea rows={3} value={form.aiTechImperative} onChange={set('aiTechImperative')} maxLength={2000}
            placeholder="Architecture advances, model capabilities, infrastructure implications, or engineering trade-offs…" />
        </label>
      </div>

      {/* Image Gallery */}
      <ImageGallery
        images={images}
        onSetDefault={handleSetDefault}
        onRemove={handleRemoveImage}
        onAdd={handleAddImage}
      />

      <div className="form-row">
        <label className="form-field"><span>Category</span>
          <select value={form.category} onChange={set('category')}>
            <option value="">— Select —</option>
            {['AI Research','Industry News','Products & Tools','Policy & Ethics','Science','Business'].map(c=>(
              <option key={c} value={c}>{c}</option>))}
          </select></label>
        <label className="form-field"><span>Status</span>
          <select value={form.status} onChange={set('status')}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select></label>
      </div>

      <div className="form-row">
        <label className="form-field"><span>AI Score (0–100)</span>
          <input type="number" min="0" max="100" value={form.aiScore}
            onChange={(e) => setForm(p=>({...p,aiScore:Math.max(0,Math.min(100,Number(e.target.value)))}))} /></label>
        <label className="form-field"><span>Published Date</span>
          <input type="text" value={form.publishedDate} onChange={set('publishedDate')} placeholder="May 23, 2026" maxLength={50} /></label>
      </div>

      <label className="form-field"><span>Tags (comma-separated)</span>
        <input type="text" value={form.tags} onChange={set('tags')} maxLength={500} /></label>

      <label className="form-field"><span>Source Name</span>
        <input type="text" value={form.source} onChange={set('source')} maxLength={255} /></label>

      <label className="form-field"><span>Source URL</span>
        <input type="url" value={form.url} onChange={set('url')} maxLength={2048} placeholder="https://…" /></label>
    </RightPanel>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SOURCE CONFIG PANEL  (compact chip-grid layout)
   ═══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_CFG = {
  autoFetch: true, cronExpression: '0 8 * * *', maxPerBatch: 5, minAiScore: 50,
  enableImages: false, imagesPerArticle: 3,
  enabledSources: [], customSources: [],
  categories: ['AI Research','Industry News','Products & Tools','Policy & Ethics','Science','Business'],
  keywords: ['artificial intelligence','machine learning','LLM','GPT','neural network','media','streaming'],
}

function SourceConfigPanel({ cfg, catalog, tiers, onCfgChange, dirty, onSave, saving, onRunAgent, agentRunning }) {
  const [addingCustom, setAddingCustom] = useState(false)
  const [newSrc, setNewSrc] = useState({ label: '', rssUrl: '' })

  const enabled = cfg.enabledSources || []
  const isOn = (k) => enabled.includes(k)
  const toggle = (k) => onCfgChange('enabledSources', isOn(k) ? enabled.filter(x=>x!==k) : [...enabled, k])
  const toggleAll = (tid) => {
    const keys = Object.entries(catalog).filter(([,v])=>v.tier===tid).map(([k])=>k)
    const allOn = keys.every(k=>isOn(k))
    onCfgChange('enabledSources', allOn ? enabled.filter(k=>!keys.includes(k)) : [...new Set([...enabled,...keys])])
  }
  const addCustom = () => {
    if (!newSrc.label.trim()||!newSrc.rssUrl.trim()) return toast.error('Label and URL required')
    onCfgChange('customSources',[...(cfg.customSources||[]),{key:`custom_${Date.now()}`,...newSrc,tier:'custom'}])
    setNewSrc({label:'',rssUrl:''}); setAddingCustom(false); toast.success('Source added')
  }
  const rmCustom = (k) => onCfgChange('customSources',(cfg.customSources||[]).filter(s=>s.key!==k))

  const scoreColor = (cfg.minAiScore??50)>=75?'#00E5A0':(cfg.minAiScore??50)>=50?'#FFB347':'#FF6B6B'
  const totalSources = catalog ? Object.keys(catalog).length : 0

  return (
    <div className="src-cfg">
      {/* ── Header ── */}
      <div className="src-cfg__head">
        <div>
          <h3 className="src-cfg__title">Sources &amp; Agent Config</h3>
          <p className="src-cfg__sub">
            {enabled.length}/{totalSources} sources active · {cfg.maxPerBatch??5} articles/batch · Score ≥ {cfg.minAiScore??50}
          </p>
        </div>
        <div className="src-cfg__actions">
          {dirty && <button type="button" className="btn-save" onClick={onSave} disabled={saving}>{saving?'Saving…':'Save Config'}</button>}
          <button type="button" className={`btn-coral ${agentRunning?'btn-coral--running':''}`} onClick={onRunAgent} disabled={agentRunning}>
            {agentRunning?<><RefreshCw size={14} className="spin"/>Running…</>:<><Play size={14}/>Run Agent</>}
          </button>
        </div>
      </div>

      {/* ── Compact knobs (6-cell grid) ── */}
      <div className="sc-quick">
        <div className="sc-knob">
          <span className="sc-knob__lbl"><Zap size={10}/>Auto Fetch</span>
          <Toggle on={cfg.autoFetch??true} onChange={v=>onCfgChange('autoFetch',v)}/>
        </div>
        <div className="sc-knob sc-knob--2x">
          <span className="sc-knob__lbl"><Clock size={10}/>Cron Schedule</span>
          <input type="text" className="sc-knob__inp" value={cfg.cronExpression||'0 8 * * *'}
            onChange={e=>onCfgChange('cronExpression',e.target.value)} disabled={!cfg.autoFetch} placeholder="0 8 * * *"/>
        </div>
        <div className="sc-knob">
          <div className="sc-knob__row"><span className="sc-knob__lbl"><Activity size={10}/>Batch</span><strong style={{color:'#F2665B'}}>{cfg.maxPerBatch??5}</strong></div>
          <input type="range" min="1" max="25" step="1" value={cfg.maxPerBatch??5} onChange={e=>onCfgChange('maxPerBatch',Number(e.target.value))} className="ag-slider" style={{'--fill':'#F2665B'}}/>
        </div>
        <div className="sc-knob">
          <div className="sc-knob__row"><span className="sc-knob__lbl"><Star size={10}/>Min Score</span><strong style={{color:scoreColor}}>{cfg.minAiScore??50}</strong></div>
          <input type="range" min="0" max="100" step="5" value={cfg.minAiScore??50} onChange={e=>onCfgChange('minAiScore',Number(e.target.value))} className="ag-slider" style={{'--fill':scoreColor}}/>
        </div>
        <div className="sc-knob">
          <span className="sc-knob__lbl"><Sparkles size={10}/>AI Images</span>
          <Toggle on={cfg.enableImages??false} onChange={v=>onCfgChange('enableImages',v)}/>
          <span className="sc-knob__hint">DALL-E key needed</span>
        </div>
        <div className="sc-knob">
          <div className="sc-knob__row"><span className="sc-knob__lbl"><Image size={10}/>Per Article</span><strong style={{color:'#A78BFA'}}>{cfg.imagesPerArticle??3}</strong></div>
          <input type="range" min="1" max="5" step="1" value={cfg.imagesPerArticle??3} onChange={e=>onCfgChange('imagesPerArticle',Number(e.target.value))} className="ag-slider" style={{'--fill':'#A78BFA'}}/>
        </div>
      </div>

      {/* ── Compact source chip grid ── */}
      <div className="sc-grid">
        <div className="sc-grid__hdr">
          <span>News Sources</span>
          <div className="sc-grid__hdr-right">
            <button
              type="button"
              className="sc-select-all"
              onClick={() => {
                const allKeys = Object.keys(catalog)
                const everyOn = allKeys.length > 0 && allKeys.every((k) => isOn(k))
                onCfgChange('enabledSources', everyOn ? [] : allKeys)
              }}
            >
              {Object.keys(catalog).length > 0 && Object.keys(catalog).every((k) => isOn(k))
                ? <><Minus size={11}/> Deselect All</>
                : <><Plus size={11}/> Select All</>}
            </button>
            <span style={{color:'var(--coral)',fontWeight:700}}>{enabled.length}/{totalSources} active</span>
          </div>
        </div>

        {tiers.map(tier=>{
          const srcs = Object.entries(catalog).filter(([,v])=>v.tier===tier.id)
          const cnt  = srcs.filter(([k])=>isOn(k)).length
          const allOn= cnt===srcs.length && srcs.length>0
          return (
            <div key={tier.id} className="sc-grid__row">
              <div className="sc-grid__label">
                <span className="sc-grid__dot" style={{background:tier.color}}/>
                <span className="sc-grid__name">{tier.label.split('—')[1]?.trim()??tier.id}</span>
                <span className="sc-grid__cnt" style={{color:tier.color}}>{cnt}/{srcs.length}</span>
                <button type="button" className="sc-grid__all" onClick={()=>toggleAll(tier.id)} title={allOn?'Disable all':'Enable all'}>
                  {allOn?<Minus size={9}/>:<Plus size={9}/>}
                </button>
              </div>
              <div className="sc-chips">
                {srcs.map(([k,src])=>{
                  const on=isOn(k)
                  return (
                    <button key={k} type="button" className={`sc-chip ${on?'sc-chip--on':''}`} style={on?{'--tc':tier.color}:{}} onClick={()=>toggle(k)}>
                      {src.label}
                      {src.rss
                        ? <em className="sc-badge sc-badge--rss">RSS</em>
                        : src.apiType==='google-cse'
                          ? <em className="sc-badge sc-badge--gcse">GCP</em>
                          : <em className="sc-badge sc-badge--api">API</em>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Custom sources row */}
        <div className="sc-grid__row">
          <div className="sc-grid__label">
            <span className="sc-grid__dot" style={{background:'#555'}}/>
            <span className="sc-grid__name">Custom</span>
            <span className="sc-grid__cnt" style={{color:'#666'}}>{(cfg.customSources||[]).length}</span>
            <button type="button" className="sc-grid__all" onClick={()=>setAddingCustom(p=>!p)} title="Add custom source"><Plus size={9}/></button>
          </div>
          <div className="sc-chips">
            {(cfg.customSources||[]).map(s=>(
              <button key={s.key} type="button" className="sc-chip sc-chip--on" style={{'--tc':'#888'}}>
                {s.label||s.rssUrl.slice(0,20)}
                <span className="sc-chip-rm" onClick={e=>{e.stopPropagation();rmCustom(s.key)}}><X size={9}/></span>
              </button>
            ))}
            {!(cfg.customSources||[]).length&&!addingCustom&&(
              <span className="sc-chips-empty">No custom sources — click + to add an RSS feed</span>
            )}
          </div>
        </div>

        {addingCustom&&(
          <div className="sc-add-form">
            <input type="text" placeholder="Source name (e.g. Variety)" value={newSrc.label} onChange={e=>setNewSrc(p=>({...p,label:e.target.value}))}/>
            <input type="url" placeholder="RSS URL (https://…/feed/)" value={newSrc.rssUrl} onChange={e=>setNewSrc(p=>({...p,rssUrl:e.target.value}))}/>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <button type="button" className="btn-ghost btn--sm" onClick={()=>setAddingCustom(false)}>Cancel</button>
              <button type="button" className="btn-coral btn--sm" onClick={addCustom}>Add</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Categories + Keywords side-by-side ── */}
      <div className="sc-footer">
        <div className="sc-footer__col">
          <div className="sc-col-hdr"><Filter size={11}/>Categories</div>
          <div className="sc-chips sc-chips--wrap">
            {['AI Research','Industry News','Products & Tools','Policy & Ethics','Science','Business'].map(cat=>{
              const on=(cfg.categories||[]).includes(cat)
              const [cc]=CAT_COLORS[cat]||['#F2665B']
              return (
                <button key={cat} type="button" className={`sc-chip ${on?'sc-chip--on':''}`} style={on?{'--tc':cc}:{}}
                  onClick={()=>{const c=cfg.categories||[];onCfgChange('categories',c.includes(cat)?c.filter(x=>x!==cat):[...c,cat])}}>
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
        <div className="sc-footer__col">
          <div className="sc-col-hdr"><Hash size={11}/>Keywords <small style={{color:'var(--text-3)',fontWeight:400,fontSize:10}}>{(cfg.keywords||[]).length} active</small></div>
          <textarea className="sc-kw-area" rows={3}
            value={(cfg.keywords||[]).join(', ')}
            onChange={e=>onCfgChange('keywords',e.target.value.split(',').map(k=>k.trim()).filter(Boolean))}
            placeholder="artificial intelligence, media, streaming, LLM…"/>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   NAV — Analytics removed per requirement
   ═══════════════════════════════════════════════════════════════════════════ */
const NAV = [
  { id: 'news',     label: 'News',     Icon: Newspaper },
  { id: 'users',    label: 'Users',    Icon: Users },
  {
    id: 'cmeLive', label: 'CME Live', Icon: Film,
    children: [
      { id: 'testimonials', label: 'Testimonials', Icon: MessageSquareQuote },
      { id: 'cornerOffice', label: 'Corner Office', Icon: Film },
    ],
  },
  {
    id: 'missionAiPossible', label: 'Mission: AI Possible', Icon: Sparkles,
    children: [
      { id: 'keyMoments', label: 'Key Moments', Icon: Film },
    ],
  },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

const NAV_FLAT = NAV.flatMap((n) => n.children ? [n, ...n.children] : [n])
const CHILD_TO_PARENT = new Map(
  NAV.filter((n) => n.children).flatMap((n) => n.children.map((c) => [c.id, n.id])),
)

function ComingSoon({ label }) {
  return (
    <div className="coming-soon">
      <Film size={40} className="coming-soon__icon" />
      <h3>{label}</h3>
      <p>This module is in production and will be available soon.</p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('news')
  const [newsTab, setNewsTab]             = useState('feed')
  const [rows, setRows]                   = useState([])
  const [loading, setLoading]             = useState(true)
  const [fetchError, setFetchError]       = useState('')
  const [activeFilter, setActiveFilter]   = useState('all')
  const [viewingItem, setViewingItem]     = useState(null)
  const [editingItem, setEditingItem]     = useState(null)
  const [showRunPanel, setShowRunPanel]   = useState(false)
  const [agentRunning, setAgentRunning]   = useState(false)
  const [imgErrors, setImgErrors]         = useState({})

  const [cfg, setCfg]         = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [tiers, setTiers]     = useState([])
  const [cfgDirty, setCfgDirty] = useState(false)
  const [cfgSaving, setCfgSaving] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const [menuPos,  setMenuPos]  = useState(null)
  const [statsOpen, setStatsOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const close = () => { setOpenMenu(null); setMenuPos(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const loadNews = useCallback(async () => {
    setLoading(true); setFetchError('')
    setImgErrors({})
    try {
      const { data } = await news.list()
      setRows(data.items || [])
    } catch { setFetchError('Failed to load articles.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    admin.getConfig().then(({ data }) => setCfg({ ...DEFAULT_CFG, ...data.config })).catch(() => setCfg(DEFAULT_CFG))
    admin.getSourceCatalog().then(({ data }) => { setCatalog(data.catalog); setTiers(data.tiers || []) }).catch(() => {})
    loadNews()
  }, [loadNews])

  const counts = useMemo(() => ({
    all: rows.length,
    pending:  rows.filter((r) => r.status === 'pending').length,
    approved: rows.filter((r) => r.status === 'approved').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
  }), [rows])

  const engagementTotals = useMemo(() => ({
    likes:  rows.reduce((s, r) => s + (r.likes  ?? 0), 0),
    views:  rows.reduce((s, r) => s + (r.views  ?? 0), 0),
    shares: rows.reduce((s, r) => s + (r.shares ?? 0), 0),
  }), [rows])

  const avgScore = useMemo(() => {
    if (!rows.length) return 0
    return Math.round(rows.reduce((s, r) => s + (r.aiScore || 0), 0) / rows.length)
  }, [rows])

  const filteredRows = useMemo(() => {
    const base = activeFilter === 'all' ? rows : rows.filter((r) => r.status === activeFilter)
    return [...base].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
  }, [rows, activeFilter])

  const getRank = (row) => filteredRows.findIndex((r) => r.id === row.id) + 1

  const handleStatusChange = async (row, status) => {
    try {
      await news.update(row.id, { ...row, status })
      setRows((p) => p.map((r) => r.id === row.id ? { ...r, status } : r))
      if (viewingItem?.id === row.id) setViewingItem((p) => p ? { ...p, status } : p)
      toast.success(`Article ${status}.`)
    } catch { toast.error('Status update failed.') }
  }

  const handleDelete = async (row) => {
    try {
      await news.remove(row.id)
      setRows((p) => p.filter((r) => r.id !== row.id))
      toast.success('Deleted.')
    } catch { toast.error('Delete failed.') }
  }

  const handleRunAgent = async (body = {}) => {
    setAgentRunning(true)
    try {
      const { data } = await admin.runNewsAgent(body)
      if (data.inserted > 0) {
        toast.success(`${data.inserted} new article${data.inserted > 1 ? 's' : ''} added`)
        loadNews()
      } else if (data.fetched === 0) {
        toast.error('No articles fetched from any source. Check that sources are enabled in Config.')
      } else {
        const reasons = []
        if (data.alreadySeen > 0)    reasons.push(`${data.alreadySeen} already in feed`)
        if (data.domainMismatch > 0) reasons.push(`${data.domainMismatch} did not match keywords`)
        if (data.belowScore > 0)     reasons.push(`${data.belowScore} scored below threshold (min ${data.minAiScore ?? 50})`)
        if (data.errors > 0)         reasons.push(`${data.errors} errors`)
        const kws = Array.isArray(data.keywords) && data.keywords.length > 0
          ? ` · Active keywords: ${data.keywords.join(', ')}`
          : ''
        const suggestion = data.domainMismatch > 0 || data.fetched === 0
          ? ' Add more keywords or enable more sources in Config.'
          : ''
        toast(`Fetched ${data.fetched} — 0 inserted. ${reasons.join(', ')}${kws}.${suggestion}`, { icon: 'ℹ️', duration: 7000 })
      }
    } catch (err) { toast.error(err?.response?.data?.error || 'Agent run failed') }
    finally { setAgentRunning(false) }
  }

  const openRunPanel = () => setShowRunPanel(true)

  const onCfgChange = (key, val) => { setCfg((p) => ({ ...p, [key]: val })); setCfgDirty(true) }
  const saveConfig = async () => {
    setCfgSaving(true)
    try {
      await admin.updateConfig(cfg)
      toast.success('Configuration saved')
      setCfgDirty(false)
    } catch { toast.error('Failed to save config') }
    finally { setCfgSaving(false) }
  }

  return (
    <div className={`adm-root ${sidebarCollapsed ? 'adm-root--collapsed' : ''}`}>
      <WaveBackground />

      {/* ── Sidebar ── */}
      <aside className={`adm-sidebar ${sidebarCollapsed ? 'adm-sidebar--collapsed' : ''}`}>
        <button
          type="button"
          className="adm-sidebar__toggle"
          onClick={() => setSidebarCollapsed((p) => !p)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
        <div className="adm-sidebar__brand">
          <LtmLogo />
          <div className="adm-brand-text">
            <span className="adm-brand-ai">AI</span>
            <span className="adm-brand-name">CME Live</span>
          </div>
          <span className="adm-badge">ADMIN</span>
        </div>

        <nav className="adm-sidebar__nav">
          {NAV.map((item) => {
            const { id, label, Icon, children } = item
            const isChildActive = children?.some((c) => c.id === activeSection)
            const isActive = activeSection === id || isChildActive
            const expanded = !!children && isChildActive
            const onClick = () => {
              if (children?.length) {
                // Activate first child if no child is currently active
                if (!isChildActive) setActiveSection(children[0].id)
              } else {
                setActiveSection(id)
              }
            }
            return (
              <div key={id} className="adm-nav-group">
                <button type="button"
                  className={`adm-nav ${isActive ? 'adm-nav--active' : ''}`}
                  onClick={onClick}>
                  <Icon size={17} strokeWidth={1.8} />
                  <span className="adm-nav__label">{label}</span>
                  {children
                    ? <ChevronDown size={13} className={`adm-nav__arrow ${expanded ? 'adm-nav__arrow--open' : ''}`} />
                    : (isActive && <ChevronRight size={13} className="adm-nav__arrow" />)}
                </button>
                {children && expanded && (
                  <div className="adm-nav__children">
                    {children.map((c) => (
                      <button key={c.id} type="button"
                        className={`adm-nav adm-nav--child ${activeSection === c.id ? 'adm-nav--active' : ''}`}
                        onClick={() => setActiveSection(c.id)}>
                        <c.Icon size={14} strokeWidth={1.8} />
                        <span className="adm-nav__label">{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="adm-sidebar__bottom">
          <button type="button" className="adm-nav adm-nav--home" onClick={() => navigate('/')}>
            <Home size={17} strokeWidth={1.8} />
            <span className="adm-nav__label">Back to Site</span>
          </button>
          <div className="adm-sidebar__foot">
            <Activity size={11} style={{ color: '#00E5A0' }} />
            <span>System Online</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="adm-main">
        <FilmStrip />

        {/* NEWS MODULE */}
        {activeSection === 'news' && (
          <div className="adm-section">
            <div className="adm-section__top">
              <div>
                <h1 className="adm-section__title">
                  <span className="title-spark">News</span> Management
                </h1>
                <p className="adm-section__sub">
                  <Film size={11} style={{ opacity: 0.5 }} /> AI-curated media intelligence · ranked by relevance score
                </p>
              </div>
              <div className="adm-tabs-actions">
                {newsTab === 'feed' && (
                  <button type="button" className={`btn-coral ${agentRunning ? 'btn-coral--running' : ''}`}
                    onClick={openRunPanel} disabled={agentRunning}>
                    {agentRunning ? <><RefreshCw size={14} className="spin"/>Running…</> : <><Play size={14}/>Fetch Articles</>}
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="adm-tabs">
              <button type="button" className={`adm-tab ${newsTab === 'feed' ? 'active' : ''}`}
                onClick={() => setNewsTab('feed')}>
                <Newspaper size={14}/> Feed
              </button>
              <button type="button" className={`adm-tab ${newsTab === 'config' ? 'active' : ''}`}
                onClick={() => setNewsTab('config')}>
                <Zap size={14}/> Sources &amp; Config
              </button>
            </div>

            {/* FEED TAB */}
            {newsTab === 'feed' && (
              <div className="feed-body">
                <div className={`stats-accordion ${statsOpen ? 'stats-accordion--open' : ''}`}>
                  <button type="button" className="stats-accordion__head" onClick={() => setStatsOpen((p) => !p)}>
                    <div className="stats-accordion__head-left">
                      <BarChart3 size={14} />
                      <span>Overview</span>
                      <span className="stats-accordion__hint">
                        {counts.all} total · {counts.pending} pending · avg score {avgScore}
                      </span>
                    </div>
                    {statsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  {statsOpen && (
                    <div className="stats-grid">
                      <div className="stat-panel">
                        <div className="stat-panel__head">
                          <Newspaper size={13} />
                          <span>Status</span>
                          <em className="stat-panel__total">{counts.all}</em>
                        </div>
                        <div className="stat-panel__items">
                          <div className="stat-item" style={{ '--c': '#FFB347' }}>
                            <Clock size={12} />
                            <div className="stat-item__txt">
                              <span className="stat-item__val">{counts.pending}</span>
                              <span className="stat-item__lbl">Pending</span>
                            </div>
                          </div>
                          <div className="stat-item" style={{ '--c': '#00E5A0' }}>
                            <CheckCircle size={12} />
                            <div className="stat-item__txt">
                              <span className="stat-item__val">{counts.approved}</span>
                              <span className="stat-item__lbl">Approved</span>
                            </div>
                          </div>
                          <div className="stat-item" style={{ '--c': '#FF6B6B' }}>
                            <XCircle size={12} />
                            <div className="stat-item__txt">
                              <span className="stat-item__val">{counts.rejected}</span>
                              <span className="stat-item__lbl">Rejected</span>
                            </div>
                          </div>
                          <div className="stat-item" style={{ '--c': '#A78BFA' }}>
                            <TrendingUp size={12} />
                            <div className="stat-item__txt">
                              <span className="stat-item__val">{avgScore}</span>
                              <span className="stat-item__lbl">Avg Score</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="stat-panel">
                        <div className="stat-panel__head">
                          <Activity size={13} />
                          <span>Interactions</span>
                          <em className="stat-panel__total">{(engagementTotals.likes + engagementTotals.views + engagementTotals.shares).toLocaleString()}</em>
                        </div>
                        <div className="stat-panel__items">
                          <div className="stat-item" style={{ '--c': '#FF6B6B' }}>
                            <Heart size={12} />
                            <div className="stat-item__txt">
                              <span className="stat-item__val">{engagementTotals.likes.toLocaleString()}</span>
                              <span className="stat-item__lbl">Likes</span>
                            </div>
                          </div>
                          <div className="stat-item" style={{ '--c': '#0EA5E9' }}>
                            <Share2 size={12} />
                            <div className="stat-item__txt">
                              <span className="stat-item__val">{engagementTotals.shares.toLocaleString()}</span>
                              <span className="stat-item__lbl">Shares</span>
                            </div>
                          </div>
                          <div className="stat-item" style={{ '--c': '#A78BFA' }}>
                            <Eye size={12} />
                            <div className="stat-item__txt">
                              <span className="stat-item__val">{engagementTotals.views.toLocaleString()}</span>
                              <span className="stat-item__lbl">Views</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="adm-filters">
                  {Object.entries(SL).map(([k, v]) => (
                    <button key={k} type="button"
                      className={`adm-filter ${activeFilter === k ? 'adm-filter--active' : ''}`}
                      onClick={() => setActiveFilter(k)}>
                      {v}<span className="adm-filter__count">{counts[k]}</span>
                    </button>
                  ))}
                  <button type="button" className="icon-btn" onClick={loadNews} title="Refresh">
                    <RefreshCw size={14} />
                  </button>
                </div>

                <div className="news-list">
                  {loading && <div className="adm-state"><RefreshCw size={20} className="spin"/><span>Loading…</span></div>}
                  {!loading && fetchError && <div className="adm-state adm-state--err">{fetchError}</div>}
                  {!loading && !fetchError && filteredRows.length === 0 && (
                    <div className="adm-state">
                      <Film size={28} style={{ opacity: 0.3 }}/>
                      <span>No articles yet. Click "Fetch Articles" to run the news agent.</span>
                    </div>
                  )}
                  {!loading && !fetchError && filteredRows.map((row, idx) => {
                    const tags = row.tags ? row.tags.split(',').map(t=>t.trim()).filter(Boolean) : []
                    const [c1, c2] = CAT_COLORS[row.category] || ['#F2665B', '#C94840']
                    const statusColor = STATUS_COLORS[row.status] || '#FFB347'
                    const catLetter = (row.category || 'N')[0].toUpperCase()
                    return (
                      <div key={row.id} className="nc" style={{ '--status-c': statusColor, cursor: 'pointer' }}
                        onClick={() => setViewingItem(row)}>
                        <div className="nc__rank">#{idx+1}</div>
                        {(row.imageUrl && !imgErrors[row.id])
                          ? <img src={row.imageUrl} alt={row.imageAlt||row.title} className="nc__thumb"
                              onError={() => setImgErrors(prev => ({ ...prev, [row.id]: true }))}/>
                          : (
                            <div className="nc__thumb nc__thumb--empty"
                              style={{ background: `linear-gradient(145deg, ${c1}28, ${c2}14)`, borderColor: `${c1}28` }}>
                              <span style={{ fontSize: 28, fontWeight: 900, color: c1, lineHeight: 1, letterSpacing: '-0.04em', opacity: 0.9 }}>{catLetter}</span>
                              <span style={{ fontSize: 9, fontWeight: 800, color: c1, opacity: 0.5, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>{(row.category || 'News').split(' ')[0]}</span>
                            </div>
                          )
                        }
                        <div className="nc__body">
                          <div className="nc__meta">
                            <Chip status={row.status}/>
                            {row.category && (
                              <span className="nc__cat" style={{ color: c1 }}>{row.category}</span>
                            )}
                            {row.source && <span className="nc__src">· {row.source}</span>}
                            {row.publishedDate && <span className="nc__date">{row.publishedDate}</span>}
                          </div>
                          <h3 className="nc__title">{cleanText(row.title) || <span style={{ opacity: 0.35, fontStyle: 'italic' }}>Untitled article</span>}</h3>
                          <p className="nc__excerpt">{cleanText(row.excerpt)}</p>
                          <div className="nc__tags-row">
                            {tags.length > 0 && (
                              <div className="nc__tags">{tags.slice(0,3).map(t=><span key={t} className="nc__tag">{t}</span>)}</div>
                            )}
                            {(row.views > 0 || row.likes > 0 || row.shares > 0) && (
                              <div className="nc__stats">
                                <span className="nc__stat"><Eye size={10}/> {(row.views ?? 0).toLocaleString()}</span>
                                <span className="nc__stat"><Heart size={10}/> {(row.likes ?? 0).toLocaleString()}</span>
                                <span className="nc__stat"><Share2 size={10}/> {(row.shares ?? 0).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="nc__right">
                          <ScoreRing score={row.aiScore||0} size={40}/>
                          <button
                            type="button"
                            className={`nc__kebab ${openMenu === row.id ? 'nc__kebab--active' : ''}`}
                            aria-label="Actions"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (openMenu === row.id) { setOpenMenu(null); setMenuPos(null) }
                              else {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setOpenMenu(row.id)
                                setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
                              }
                            }}
                          >
                            <MoreVertical size={15}/>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CONFIG TAB */}
            {newsTab === 'config' && cfg && catalog && (
              <div className="cfg-body">
                <SourceConfigPanel
                  cfg={cfg} catalog={catalog} tiers={tiers}
                  onCfgChange={onCfgChange}
                  dirty={cfgDirty} onSave={saveConfig} saving={cfgSaving}
                  onRunAgent={openRunPanel} agentRunning={agentRunning}
                />
              </div>
            )}
            {newsTab === 'config' && !cfg && (
              <div className="adm-state"><RefreshCw size={18} className="spin"/><span>Loading config…</span></div>
            )}
          </div>
        )}

        {activeSection === 'users'        && <UserManagement />}
        {activeSection === 'testimonials' && <TestimonialsManagement />}
        {activeSection === 'cornerOffice' && <CornerOfficeManagement />}
        {activeSection === 'keyMoments'   && <KeyMomentsManagement />}
        {activeSection === 'settings'     && <ComingSoon label="Settings" />}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="adm-bottom">
        {NAV_FLAT.filter((n) => !n.children).map(({ id, label, Icon }) => (
          <button key={id} type="button"
            className={`adm-bottom__item ${activeSection === id || CHILD_TO_PARENT.get(activeSection) === id ? 'active' : ''}`}
            onClick={() => setActiveSection(id)}>
            <Icon size={20} strokeWidth={1.8}/>
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className="adm-bottom__item" onClick={() => navigate('/')}>
          <Home size={20} strokeWidth={1.8}/>
          <span>Home</span>
        </button>
      </nav>

      {/* ── Global kebab dropdown (fixed-position, escapes card overflow) ── */}
      {openMenu && menuPos && (() => {
        const menuRow = filteredRows.find(r => r.id === openMenu)
        if (!menuRow) return null
        return (
          <div className="nc__dropdown"
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, left: 'auto' }}
            onClick={(e) => e.stopPropagation()}>
            <button className="nc__menu-item" onClick={() => { setViewingItem(menuRow); setOpenMenu(null); setMenuPos(null) }}><Eye size={13}/> View</button>
            <button className="nc__menu-item" onClick={() => { setEditingItem(menuRow); setOpenMenu(null); setMenuPos(null) }}><Pencil size={13}/> Edit</button>
            {menuRow.status !== 'approved' && (
              <button className="nc__menu-item nc__menu-item--approve" onClick={() => { handleStatusChange(menuRow, 'approved'); setOpenMenu(null); setMenuPos(null) }}><CheckCircle size={13}/> Approve</button>
            )}
            {menuRow.status !== 'rejected' && (
              <button className="nc__menu-item nc__menu-item--reject" onClick={() => { handleStatusChange(menuRow, 'rejected'); setOpenMenu(null); setMenuPos(null) }}><XCircle size={13}/> Reject</button>
            )}
            <div className="nc__menu-divider"/>
            <button className="nc__menu-item nc__menu-item--del" onClick={() => { handleDelete(menuRow); setOpenMenu(null); setMenuPos(null) }}><Trash2 size={13}/> Delete</button>
          </div>
        )
      })()}

      {/* ── Panels & Dialogs ── */}
      {showRunPanel && cfg && (
        <RunAgentPanel
          cfg={cfg} catalog={catalog} tiers={tiers}
          onClose={() => setShowRunPanel(false)}
          onRun={handleRunAgent}
        />
      )}
      {viewingItem && (
        <ViewDialog item={viewingItem} rank={getRank(viewingItem)}
          onClose={() => setViewingItem(null)}
          onEdit={(item) => setEditingItem(item)}
          onStatusChange={handleStatusChange}
        />
      )}
      {editingItem && (
        <EditPanel item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={(updated) => {
            setRows((p) => p.map((r) => r.id === updated.id ? updated : r))
            setEditingItem(null)
            toast.success('Article updated.')
          }}
        />
      )}
    </div>
  )
}
