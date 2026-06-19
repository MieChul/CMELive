import { useEffect, useRef, useState, useCallback } from 'react'
import './ArticlesSection.css'
import { news as newsApi } from '../services/api'

import imgAIReality   from '../assets/HomePage/AI Reality Check Moment.png'
import imgStartup     from '../assets/HomePage/Startup Signals, Sector Barometers.png'
import imgReBundling  from '../assets/HomePage/Medias-Great-ReBundling-Era.png'
import imgGaming      from '../assets/HomePage/Gaming Enters Convergence Era.png'
import imgCreators    from '../assets/HomePage/Creators Push Back on Consolidation.png'
import imgAIRewrites  from '../assets/HomePage/AI Rewrites Filmmaking Workflow.png'

// ─── Static fallback articles ─────────────────────────────────────────────────
const STATIC_LEFT = [
  { id: null, title: 'AI Reality Check Moment', description: 'OpenAI winding down Sora and its Disney partnership signals a shift from hype to hard economics—revealing that scaling generative video responsibly, commercially, and creatively is proving far tougher than early enthusiasm suggested.', image: imgAIReality, link: '#', likes: 0, views: 0, shares: 0 },
  { id: null, title: "Media's Great Re-Bundling Era", description: "As 2026 unfolds, media power shifts toward scale-driven mergers, AI-led partnerships, and capital alliances—signaling survival isn't about content volume alone, but ecosystem control and strategic collaboration.", image: imgReBundling, link: '#', likes: 0, views: 0, shares: 0 },
  { id: null, title: 'Startup Signals, Sector Barometers', description: "Failory's Media &amp; Entertainment startup landscape reveals where innovation is fragmenting—spotlighting emerging bets, frequent failures, and repeat patterns that indicate which creator, content, and platform models are scaling—or quietly breaking.", image: imgStartup, link: '#', likes: 0, views: 0, shares: 0 },
]
const STATIC_RIGHT = [
  { id: null, title: 'Gaming Enters Convergence Era', description: "BCG signals gaming's next growth wave will come from convergence—AI-led creation, cloud-driven distribution, and creator economies—shifting power from hardware and hit titles toward ecosystems, engagement, and continuous innovation.", image: imgGaming, link: '#', likes: 0, views: 0, shares: 0 },
  { id: null, title: 'Creators Push Back on Consolidation', description: 'Over 1,000 Hollywood creators publicly oppose the Paramount–Warner Bros. deal, warning that media consolidation threatens competition, jobs, and creative diversity—turning M&amp;A from a financial play into an industry-wide cultural battleground.', image: imgCreators, link: '#', likes: 0, views: 0, shares: 0 },
  { id: null, title: 'AI Rewrites Filmmaking Workflow', description: "Netflix's acquisition of Ben Affleck-backed AI patents isn't about generating movies, but mastering continuity, editing, and craft—using AI as an invisible co-pilot to boost efficiency without replacing creators.", image: imgAIRewrites, link: '#', likes: 0, views: 0, shares: 0 },
]

const BASE_LIKES_STORAGE_KEY = 'cmelive_liked_news'
const AUTOPLAY_MS = 4000

// ─── Identify current logged-in user (email/userId) for per-user likes ─────────

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

function getAuthTokenCandidate() {
  const keys = ['token', 'accessToken', 'access_token', 'idToken', 'id_token', 'authToken', 'jwt']
  for (const k of keys) {
    const v1 = localStorage.getItem(k)
    if (v1 && String(v1).trim()) return String(v1)
    const v2 = sessionStorage.getItem(k)
    if (v2 && String(v2).trim()) return String(v2)
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      const v = k ? localStorage.getItem(k) : null
      if (v && v.split('.').length >= 3) return v
    }
  } catch {}
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      const v = k ? sessionStorage.getItem(k) : null
      if (v && v.split('.').length >= 3) return v
    }
  } catch {}
  return null
}

function getOrCreateGuestId(marker) {
  const MARK_KEY = 'cmelive_guest_marker'
  const ID_KEY   = 'cmelive_guest_id'
  try {
    const prevMarker = sessionStorage.getItem(MARK_KEY) || ''
    let id = sessionStorage.getItem(ID_KEY)
    if (!id || prevMarker !== marker) {
      id = (crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)) + Date.now()
      sessionStorage.setItem(ID_KEY, id)
      sessionStorage.setItem(MARK_KEY, marker)
    }
    return id
  } catch {
    return 'guest'
  }
}

function getCurrentUserKey() {
  try {
    const direct =
      localStorage.getItem('userEmail') ||
      localStorage.getItem('email') ||
      localStorage.getItem('username')
    if (direct && String(direct).trim()) return String(direct).trim().toLowerCase()

    const userRaw =
      localStorage.getItem('user') ||
      localStorage.getItem('authUser') ||
      localStorage.getItem('profile')
    if (userRaw) {
      const u = JSON.parse(userRaw)
      const email = u?.email || u?.user?.email || u?.profile?.email
      const id    = u?.id || u?.userId || u?.user?.id
      if (email && String(email).trim()) return String(email).trim().toLowerCase()
      if (id && String(id).trim()) return String(id).trim()
    }

    const token = getAuthTokenCandidate()
    const payload = token ? decodeJwtPayload(token) : null
    const fromJwt =
      payload?.email ||
      payload?.preferred_username ||
      payload?.upn ||
      payload?.unique_name ||
      payload?.sub
    if (fromJwt && String(fromJwt).trim()) return String(fromJwt).trim().toLowerCase()

    const marker = token ? String(token).slice(0, 24) : 'noauth'
    return `guest:${getOrCreateGuestId(marker)}`
  } catch {}
  return 'guest'
}

function getLikesStorageKey() {
  return `${BASE_LIKES_STORAGE_KEY}:${getCurrentUserKey()}`
}

function getLikedSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) }
  catch { return new Set() }
}
function saveLikedSet(set, key) {
  try { localStorage.setItem(key, JSON.stringify([...set])) } catch {}
}

// ─── Map API item to card shape ───────────────────────────────────────────────
function mapApiItem(item) {
  return {
    id:               item.id,
    title:            item.title,
    description:      item.excerpt,
    summary:          item.summary || '',
    domainImperative: item.domainImperative || '',
    aiTechImperative: item.aiTechImperative || '',
    image:            item.imageUrl || null,
    link:             item.url || '#',
    source:           item.source || '',
    publishedDate:    item.publishedDate || '',
    tags:             item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    likes:            item.likes ?? 0,
    views:            item.views ?? 0,
    shares:           item.shares ?? 0,
    userLiked:        item.userLiked ?? false,
  }
}

// ─── News Detail Modal ────────────────────────────────────────────────────────
function NewsModal({ article, onClose, onLike, isLiked, likesCount, onShare }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="news-modal-overlay" onClick={onClose}>
      <div className="news-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="news-modal__close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {article.image && (
          <div className="news-modal__img-wrap">
            <img src={article.image} alt={article.title} className="news-modal__img" />
            <div className="news-modal__img-fade" />
          </div>
        )}

        <div className="news-modal__body">
          <div className="news-modal__meta">
            {article.source && <span className="news-modal__source">{article.source}</span>}
            {article.publishedDate && <span className="news-modal__date">{article.publishedDate}</span>}
          </div>

          <h2 className="news-modal__title">{article.title}</h2>
          <p className="news-modal__excerpt">{article.description}</p>

          {article.summary && (
            <p className="news-modal__summary">{article.summary}</p>
          )}

          <div className="news-modal__imperatives">
            <div className="nm-imp nm-imp--domain">
              <div className="nm-imp__header">
                <span className="nm-imp__icon">🏢</span>
                <span className="nm-imp__label">Domain Imperative</span>
                <span className="nm-imp__badge">For Executives</span>
              </div>
              <p className="nm-imp__text">{article.domainImperative || 'No business or strategic implications identified in this article for media & entertainment executives.'}</p>
            </div>
            <div className="nm-imp nm-imp--tech">
              <div className="nm-imp__header">
                <span className="nm-imp__icon">⚡</span>
                <span className="nm-imp__label">AI Tech Imperative</span>
                <span className="nm-imp__badge">For Engineers</span>
              </div>
              <p className="nm-imp__text">{article.aiTechImperative || 'No technical insights identified in this article for AI practitioners or engineers.'}</p>
            </div>
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="news-modal__tags">
              {article.tags.map((t) => <span key={t} className="news-modal__tag">{t}</span>)}
            </div>
          )}

          <div className="news-modal__actions">
            <div className="news-modal__engagement">
              <button
                type="button"
                className={`nm-engage-btn nm-engage-btn--like${isLiked ? ' liked' : ''}${article.id == null ? ' disabled' : ''}`}
                onClick={onLike}
                disabled={article.id == null}
                aria-label={isLiked ? 'Unlike' : 'Like'}
              >
                <svg viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{likesCount}</span>
              </button>

              <button
                type="button"
                className="nm-engage-btn nm-engage-btn--share"
                onClick={onShare}
                aria-label="Share"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>Share</span>
              </button>
            </div>

            {article.link && article.link !== '#' && (
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="nm-source-link"
              >
                Read full article
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ArticleCarousel ──────────────────────────────────────────────────────────
function ArticleCarousel({ articles, imageLeft, visible, onLikeToggle, likedIds, onShareArticle }) {
  const [current,  setCurrent]  = useState(0)
  const [isFading, setIsFading] = useState(false)
  const [localLikes, setLocalLikes] = useState(() => articles.map(a => a.likes))
  const [likeStates, setLikeStates] = useState(() => articles.map(a => a.userLiked ?? false))
  const [modalOpen, setModalOpen] = useState(false)
  const timerRef = useRef(null)

  // Sync localLikes and likeStates when articles change (e.g. after API load)
  useEffect(() => {
    setLocalLikes(articles.map(a => a.likes))
    setLikeStates(articles.map(a => a.userLiked ?? false))
    setCurrent(0)
  }, [articles])

  const goTo = useCallback((index) => {
    if (isFading || index === current) return
    clearInterval(timerRef.current)
    setIsFading(true)
    setTimeout(() => {
      setCurrent(index)
      setIsFading(false)
    }, 380)
  }, [isFading, current])

  const next = useCallback(() => goTo((current + 1) % articles.length), [current, articles.length, goTo])

  useEffect(() => {
    if (modalOpen) return
    timerRef.current = setInterval(next, AUTOPLAY_MS)
    return () => clearInterval(timerRef.current)
  }, [next, modalOpen])

  const article   = articles[current]
  const isLiked   = likeStates[current] ?? false
  const cardClass = ['article-card', imageLeft ? 'image-left' : 'image-right', visible ? 'card-visible' : '', isFading ? 'is-fading' : ''].filter(Boolean).join(' ')

  async function handleLike() {
    if (article.id == null) return
    const newLiked = !isLiked
    const delta    = newLiked ? 1 : -1
    setLocalLikes(prev => prev.map((v, i) => i === current ? Math.max(0, v + delta) : v))
    setLikeStates(prev => prev.map((v, i) => i === current ? newLiked : v))
    try {
      const updatedLikes = await onLikeToggle(article.id, newLiked)
      if (typeof updatedLikes === 'number') {
        setLocalLikes(prev => prev.map((v, i) => i === current ? updatedLikes : v))
      }
    } catch {
      setLocalLikes(prev => prev.map((v, i) => i === current ? Math.max(0, v - delta) : v))
      setLikeStates(prev => prev.map((v, i) => i === current ? !newLiked : v))
    }
  }

  function handleLearnMore() {
    if (article.id != null) {
      newsApi.recordView(article.id).catch(() => {})
    }
    setModalOpen(true)
  }

  async function handleShare() {
    await onShareArticle(article)
  }

  const ImagePanel = () => (
    <div className="article-image-container">
      {article.image
        ? <img src={article.image} alt={article.title} className="article-image" />
        : <div className="article-image-placeholder" />
      }
    </div>
  )

  return (
    <>
      <div className={cardClass}>
        {imageLeft && <ImagePanel />}

        <div className="article-content">
          <h3 className="article-title">{article.title}</h3>
          <p  className="article-description">{article.description}</p>

          <div className="article-actions">
            <button
              type="button"
              className="article-btn"
              onClick={handleLearnMore}
            >
              Learn More
            </button>

            <div className="article-engagement">
              <button
                className={`engagement-btn like-btn${isLiked ? ' liked' : ''}${article.id == null ? ' disabled' : ''}`}
                onClick={handleLike}
                aria-label={isLiked ? 'Unlike' : 'Like'}
                disabled={article.id == null}
              >
                <svg viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{localLikes[current]}</span>
              </button>

              <button
                className="engagement-btn share-btn"
                onClick={handleShare}
                aria-label="Share"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>Share</span>
              </button>
            </div>
          </div>

          <div className="articles-dots">
            {articles.map((_, i) => (
              <button
                key={i}
                className={`dot ${i === current ? 'active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {!imageLeft && <ImagePanel />}
      </div>

      {modalOpen && (
        <NewsModal
          article={article}
          onClose={() => setModalOpen(false)}
          onLike={handleLike}
          isLiked={isLiked}
          likesCount={localLikes[current]}
          onShare={handleShare}
        />
      )}
    </>
  )
}

// ─── ArticlesSection ──────────────────────────────────────────────────────────
const ArticlesSection = () => {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [leftArticles,  setLeftArticles]  = useState(STATIC_LEFT)
  const [rightArticles, setRightArticles] = useState(STATIC_RIGHT)

  const [likesKey, setLikesKey] = useState(() => getLikesStorageKey())
  const [likedIds, setLikedIds] = useState(() => getLikedSet(getLikesStorageKey()))

  const loadArticles = useCallback(() => {
    newsApi.listPublic()
      .then(res => {
        const items = res.data?.items ?? []
        if (items.length === 0) return
        const mapped = items.map(mapApiItem)
        const mid    = Math.ceil(mapped.length / 2)
        setLeftArticles(mapped.slice(0, mid))
        setRightArticles(mapped.slice(mid).length > 0 ? mapped.slice(mid) : mapped.slice(0, mid))
      })
      .catch(() => {})
  }, [])

  useEffect(() => { loadArticles() }, [loadArticles])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const refresh = () => {
      const k = getLikesStorageKey()
      if (k !== likesKey) {
        setLikesKey(k)
        setLikedIds(getLikedSet(k))
        loadArticles()
      }
    }
    refresh()
    const id = setInterval(refresh, 700)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [likesKey, loadArticles])

  const handleLikeToggle = useCallback(async (id, liked) => {
    const idStr = String(id)
    const k = getLikesStorageKey()
    const p = newsApi.like(id, liked ? 'like' : 'unlike')
      .then(res => res.data?.likes)
      .catch(() => undefined)
    setLikedIds(prev => {
      const next = new Set(prev)
      liked ? next.add(idStr) : next.delete(idStr)
      saveLikedSet(next, k)
      return next
    })
    return await p
  }, [])

  const handleShare = useCallback(async (article) => {
    const url  = article.link && article.link !== '#' ? article.link : window.location.href
    const data = { title: article.title, text: article.description, url }
    if (navigator.share) {
      try { await navigator.share(data) } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url)
        alert('Link copied to clipboard!')
      } catch {
        alert(`Share this link: ${url}`)
      }
    }
    if (article.id != null) {
      newsApi.recordShare(article.id).catch(() => {})
    }
  }, [])

  return (
    <section className="articles-section" ref={sectionRef}>
      <div className="articles-container">
        <ArticleCarousel articles={leftArticles}  imageLeft={false} visible={isVisible} onLikeToggle={handleLikeToggle} likedIds={likedIds} onShareArticle={handleShare} />
        <ArticleCarousel articles={rightArticles} imageLeft={true}  visible={isVisible} onLikeToggle={handleLikeToggle} likedIds={likedIds} onShareArticle={handleShare} />
      </div>
    </section>
  )
}

export default ArticlesSection
