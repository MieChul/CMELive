import { useEffect, useMemo, useRef, useState } from 'react'
import './CMERadarSection.css'
import { news } from '../services/api'

/* ════════════════════════════════════════════════════════════════════════
   CME Radar — Rotating Slot Carousel
   Shows ONLY approved "Trends" news (feedType=trends, status=approved).
   The layout stays visually fixed (2 Major + 4 Minor slots on desktop) while
   the content rotates through the slots one step at a time, circularly.
   ════════════════════════════════════════════════════════════════════════ */

const ROTATE_INTERVAL = 4500   // ms between rotations
const MAX_ITEMS = 60           // cap working set for very large datasets

/* Slot configuration per breakpoint */
const LAYOUTS = {
  desktop: { major: 2, minor: 4 },
  tablet:  { major: 1, minor: 3 },
  mobile:  { major: 1, minor: 0 }, // single-card carousel
}

/* Stable pastel backgrounds for minor slots (keyed by slot index, not item,
   so colours never flicker as content rotates through the slot). */
const MINOR_COLORS = ['#A9ED9B', '#F4B4C2', '#D3B4F4', '#B4D2F4']

/* Gradient fallback for major cards that have no image, keyed by category. */
const CATEGORY_GRADIENTS = {
  World:      ['#F2665B', '#C94840'],
  Politics:   ['#F59E0B', '#D97706'],
  Business:   ['#0EA5E9', '#0284C7'],
  Technology: ['#7C3AED', '#4F46E5'],
  Science:    ['#8B5CF6', '#6D28D9'],
  Sports:     ['#10B981', '#059669'],
  Health:     ['#EC4899', '#BE185D'],
  Culture:    ['#A78BFA', '#7C3AED'],
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const stripHtml = (s) => (s ? String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '')
const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s || '')
const gradientFor = (cat) => {
  const g = CATEGORY_GRADIENTS[cat] || ['#1E1A22', '#3A3340']
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`
}
const formatDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 20)
  return dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getLayout() {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w <= 600) return 'mobile'
  if (w <= 1024) return 'tablet'
  return 'desktop'
}

/* ─── Hooks ────────────────────────────────────────────────────────────── */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])
  return reduced
}

/* ─── Major (image / high-emphasis) card ───────────────────────────────── */
function MajorCard({ item }) {
  const [imgError, setImgError] = useState(false)
  const showImg = Boolean(item.imageUrl) && !imgError
  const category = item.category || 'Trends'
  const dateLabel = formatDate(item.publishedDate)

  return (
    <article className="radar-card">
      <div className="radar-card-image-wrap">
        <div className="radar-card-image" style={{ background: gradientFor(item.category) }}>
          {showImg ? (
            <img
              src={item.imageUrl}
              alt={item.imageAlt || item.title || category}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="radar-card-image__ph">
              <span>{category}</span>
            </div>
          )}
        </div>
        {item.url && (
          <a
            className="radar-card-btn"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open: ${item.title || 'article'}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>
      <span className="radar-card-category">{category}</span>
      <div className="radar-card-meta">
        {item.source && (
          <span className="meta-item"><span className="meta-dot" />{item.source}</span>
        )}
        {dateLabel && (
          <span className="meta-item"><span className="meta-dot" />{dateLabel}</span>
        )}
      </div>
      <h3 className="radar-card-title">{item.title}</h3>
    </article>
  )
}

/* ─── Minor (text / supporting) card ───────────────────────────────────── */
function MinorCard({ item, color }) {
  const description = truncate(stripHtml(item.excerpt || item.summary), 140)
  return (
    <article className="info-card" style={{ backgroundColor: color }}>
      <div className="info-card-content">
        <h4 className="info-card-title">{item.title}</h4>
        {description && <p className="info-card-description">{description}</p>}
      </div>
      {item.url && (
        <a
          className="info-card-btn"
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open: ${item.title || 'article'}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      )}
    </article>
  )
}

/* ─── Section ──────────────────────────────────────────────────────────── */
const CMERadarSection = () => {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [paused, setPaused] = useState(false)
  const [layout, setLayout] = useState(getLayout)
  const reducedMotion = usePrefersReducedMotion()

  /* Reveal-on-scroll for the title */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.2 },
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  /* Fetch approved Trends news (strictly feedType=trends) */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await news.listPublic('trends')
        const list = Array.isArray(res?.data?.items) ? res.data.items : []
        if (!cancelled) setItems(list.slice(0, MAX_ITEMS))
      } catch (error) {
        if (!cancelled) setItems([])
        console.warn('[CME Radar] Failed to load Trends news:', error?.message || error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  /* Track viewport → layout (drives slot counts) */
  useEffect(() => {
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setLayout(getLayout()))
    }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf) }
  }, [])

  const { major, minor } = LAYOUTS[layout]
  const visibleCount = major + minor
  const canRotate = items.length > visibleCount && !reducedMotion

  /* Reset position when the dataset or layout changes */
  useEffect(() => { setOffset(0) }, [layout, items.length])

  /* Auto-rotate by one slot per cycle, pausing on interaction */
  useEffect(() => {
    if (!canRotate || paused) return undefined
    const id = setInterval(() => {
      setOffset((o) => (o + 1) % items.length)
    }, ROTATE_INTERVAL)
    return () => clearInterval(id)
  }, [canRotate, paused, items.length])

  /* Compute the items currently assigned to each visible slot */
  const visible = useMemo(() => {
    const n = items.length
    if (!n) return []
    const count = Math.min(visibleCount, n)
    return Array.from({ length: count }, (_, i) => items[(offset + i) % n])
  }, [items, offset, visibleCount])

  const majorItems = visible.slice(0, major)
  const minorItems = visible.slice(major, major + minor)

  return (
    <section className="cme-radar-section" ref={sectionRef}>
      <div className="radar-container">
        <h2 className={`radar-title ${isVisible ? 'visible' : ''}`}>CME Radar</h2>

        {loading ? (
          <div className="radar-empty">
            <span className="radar-empty__spinner" aria-hidden="true" />
            <p className="radar-empty__sub">Loading the latest trends…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="radar-empty">
            <p className="radar-empty__title">No trending News yet</p>
            <p className="radar-empty__sub">
              Approved Trends News will appear here as our editors curate the latest world updates. Please check back soon.
            </p>
          </div>
        ) : (
          <div
            className="radar-feed"
            data-layout={layout}
            aria-roledescription="carousel"
            aria-label="CME Radar trending stories"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            <div className="radar-content">
              <div className="radar-cards">
                {majorItems.map((item, i) => (
                  <div className="radar-slot radar-slot--major" key={`major-${i}`}>
                    <MajorCard key={item.id} item={item} />
                  </div>
                ))}
              </div>

              {minorItems.length > 0 && (
                <div className="info-cards">
                  {minorItems.map((item, i) => (
                    <div className="radar-slot radar-slot--minor" key={`minor-${i}`}>
                      <MinorCard key={item.id} item={item} color={MINOR_COLORS[i % MINOR_COLORS.length]} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canRotate && (
              <div className="radar-progress">
                <div className="radar-progress__track">
                  <div
                    key={offset}
                    className="radar-progress__bar"
                    style={{
                      animationDuration: `${ROTATE_INTERVAL}ms`,
                      animationPlayState: paused ? 'paused' : 'running',
                    }}
                  />
                </div>
                <span className="radar-progress__count">
                  {(offset % items.length) + 1} / {items.length}
                  {paused && <span className="radar-progress__paused"> · paused</span>}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default CMERadarSection
