import { useEffect, useRef, useState, useCallback } from 'react'
import SiteHeader from '../components/SiteHeader'
import Footer from '../components/Footer'
import { keyMoments as keyMomentsApi } from '../services/api'
import imageVideoCover from '../assets/MissionPage/VideoCover.png'
import playerIcon from '../assets/Icons/player.svg'

// Game images
import imgDuckHunter from '../assets/MissionPage/duck_hunter.jpg'
import imgSpaceShooter from '../assets/MissionPage/spaceshooter.jpg'
import imgWhack from '../assets/MissionPage/whack.png'
import imgBlinkkz from '../assets/MissionPage/blinkkz.jpg'

// Premio Stories images
import imgTab from '../assets/MissionPage/tab.png'
import imgGroup from '../assets/MissionPage/group.jpg'
import imgParty from '../assets/MissionPage/party.jpg'
import imgThink from '../assets/MissionPage/think.jpg'

// Success Stories images
import imgScaling from '../assets/MissionPage/scaling.jpg'
import imgMaking from '../assets/MissionPage/making.jpg'
import imgAiNative from '../assets/MissionPage/ai_native.jpg'

// Coming Soon images
import imgCreative from '../assets/MissionPage/creative.jpg'
import imgArtwork from '../assets/MissionPage/artwork.jpg'
import imgLive from '../assets/MissionPage/live.jpg'
import imgConversational from '../assets/MissionPage/conversational.jpg'

// Mission AI Possible images
import imgPoly from '../assets/MissionPage/poly.jpg'
import imgReels from '../assets/MissionPage/reels.jpg'
import imgHighlights from '../assets/MissionPage/highlights.jpg'
import imgSkip from '../assets/MissionPage/skip.jpg'
import imgRecorder from '../assets/MissionPage/recorder.jpg'

// Mission AI Possible number icons
import icon1 from '../assets/Icons/1.svg'
import icon2 from '../assets/Icons/2.svg'
import icon3 from '../assets/Icons/3.svg'
import icon4 from '../assets/Icons/4.svg'
import icon5 from '../assets/Icons/5.svg'

// Media X+ images
import imgAiContent from '../assets/MissionPage/aicontent.jpg'
import imgClosed from '../assets/MissionPage/closed.jpg'
import imgInteractive from '../assets/MissionPage/interactive.png'

// LTM MediaCube assets
import imgMediacube from '../assets/MissionPage/mediacube.png'
import imgLtmMedia from '../assets/MissionPage/LtmMedia.png'
import imgAward from '../assets/MissionPage/award.svg'
import iconStar from '../assets/Icons/Star.svg'


import './AIPossible.css'

// ─── Liked-state localStorage helpers ────────────────────────────────────────
// Stores a Set of liked moment IDs in localStorage as a browser-local fallback
// so the heart stays red after a page refresh even if the server call is slow.
const KM_LIKED_KEY = 'km_liked_ids'

function readLocalLikedIds() {
  try {
    const raw = localStorage.getItem(KM_LIKED_KEY)
    return new Set(JSON.parse(raw || '[]').map(Number))
  } catch {
    return new Set()
  }
}

function writeLocalLikedIds(ids) {
  try {
    localStorage.setItem(KM_LIKED_KEY, JSON.stringify([...ids]))
  } catch { /* quota exceeded — ignore */ }
}

const AIPossible = () => {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="loader-container">
        <div className="loader">
          <span className="loader-text">AI</span>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-possible-page dot-pattern">
      <SiteHeader />
      <main>
        <HeroVideoSection />
        <BuiltToOutcreateSection />
        <GamesShowcaseSection />
        <ProjectCardsSection title="Premio Stories" />
        <SuccessStoriesSection />
        <ComingSoonSection />
        <MissionAIPossibleSection />
        <MediaXPlusSection />
        <LTMMediaCubeSection />
        <LetsWorkTogetherSection />
      </main>
      <Footer />
    </div>
  )
}

// ─── Video carousel data ───────────────────────────────────────────────────────

const videoCards = [
  { title: 'Prompt to Premiere', episode: 'S01 · E01', tag: 'MISSION AI:POSSIBLE', url: '#', cover: imageVideoCover },
  { title: 'AI Creative Studio',  episode: 'S01 · E02', tag: 'MISSION AI:POSSIBLE', url: '#', cover: imageVideoCover },
  { title: 'From Concept to Screen', episode: 'S01 · E03', tag: 'MISSION AI:POSSIBLE', url: '#', cover: imageVideoCover },
]

// ─── Hero video section (unchanged) ───────────────────────────────────────────

const HeroVideoSection = () => {
  const [isVisible, setIsVisible]   = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [autoPlay, setAutoPlay]     = useState(true)
  const autoRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  const goTo = (index) => {
    if (isAnimating || index === activeIndex) return
    clearTimeout(animRef.current)
    setIsAnimating(true)
    setActiveIndex(index)
    animRef.current = setTimeout(() => setIsAnimating(false), 650)
  }

  const goNext = useRef(null)
  goNext.current = () => goTo((activeIndex + 1) % videoCards.length)
  const goPrev = () => goTo((activeIndex - 1 + videoCards.length) % videoCards.length)

  useEffect(() => {
    if (!autoPlay) return
    autoRef.current = setInterval(() => goNext.current(), 4000)
    return () => clearInterval(autoRef.current)
  }, [autoPlay, activeIndex])

  const handlePlayClick = () => {
    setAutoPlay(false)
    clearInterval(autoRef.current)
  }

  const getOffset = (index) => (index - activeIndex + videoCards.length) % videoCards.length

  return (
    <section className="hero-video-section">
      <div className={`hero-video-container ${isVisible ? 'visible' : ''}`}>
        <div className="video-stack-carousel">
          {videoCards.map((card, index) => {
            const offset = getOffset(index)
            const hidden = offset >= 3
            return (
              <div
                key={index}
                role={offset !== 0 ? 'button' : undefined}
                tabIndex={offset !== 0 ? 0 : undefined}
                className={`video-stack-card stack-pos-${Math.min(offset, 3)} ${hidden ? 'stack-hidden' : ''} ${isAnimating ? 'animating' : ''}`}
                onClick={() => { if (offset !== 0) goTo(index) }}
                onKeyDown={(e) => { if (e.key === 'Enter' && offset !== 0) goTo(index) }}
                aria-hidden={hidden}
              >
                <img src={card.cover} alt={card.title} className="video-card-bg" />
                <div className="video-card-overlay" />
                {offset === 0 && (
                  <div className="video-card-content">
                    <div className="video-card-meta">
                      <span className="video-card-tag">{card.tag}</span>
                      <span className="video-card-episode">{card.episode}</span>
                    </div>
                    <h1 className="hero-video-title">
                      <span className="title-prompt">Prompt</span>
                      <span className="title-to">to</span>
                      <span className="title-premiere">Premiere</span>
                    </h1>
                    <div className="video-play-area">
                      <a
                        className={`play-btn ${!autoPlay ? 'play-btn--active' : ''}`}
                        href={card.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Play video"
                        onClick={(e) => { e.stopPropagation(); handlePlayClick() }}
                      >
                        <svg className="play-circle" width="84" height="84" viewBox="0 0 84 84" fill="none">
                          <circle cx="42" cy="42" r="40" stroke="white" strokeWidth="1.5" strokeOpacity="0.55"/>
                          {autoPlay && (
                            <circle cx="42" cy="42" r="40" stroke="white" strokeWidth="1.5" strokeOpacity="0.12" className="play-ring-pulse"/>
                          )}
                          <path d="M35 26L60 42L35 58V26Z" fill="white"/>
                        </svg>
                      </a>
                    </div>
                    <div className="video-player-brand">
                      <img src={playerIcon} alt="LVM" className="player-brand-logo" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="carousel-controls">
          <button className="carousel-arrow prev" onClick={goPrev} aria-label="Previous">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="carousel-dots">
            {videoCards.map((_, i) => (
              <button
                key={i}
                className={`carousel-dot ${i === activeIndex ? 'active' : ''}`}
                onClick={() => { goTo(i); setAutoPlay(false) }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button className="carousel-arrow next" onClick={goNext.current} aria-label="Next">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {!autoPlay && (
          <div className="carousel-resume">
            <button className="resume-btn" onClick={() => setAutoPlay(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 3l14 9-14 9V3z" fill="currentColor"/>
              </svg>
              Resume
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Built to Outcreate (unchanged) ───────────────────────────────────────────

const BuiltToOutcreateSection = () => {
  const sectionRef = useRef(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.classList.add('is-visible')
        else el.classList.remove('is-visible')
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="built-to-outcreate-section" ref={sectionRef}>
      <div className="outcreate-container">
        <h2 className="outcreate-title">Built to Outcreate</h2>
        <p className="outcreate-subtitle">
          We fuse AI, imagination, and execution as CME client's Business Creativity Partner
        </p>
      </div>
    </section>
  )
}

// ─── Shared: Card Popup Modal ──────────────────────────────────────────────────

const CardModal = ({ card, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="cmodal-overlay" onClick={onClose}>
      <div className="cmodal" onClick={(e) => e.stopPropagation()}>
        <button className="cmodal-close" onClick={onClose} aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="cmodal-img">
          <img src={card.image} alt={card.title} />
        </div>
        <div className="cmodal-body">
          <h3 className="cmodal-title">{card.title}</h3>
          {card.description && <p className="cmodal-desc">{card.description}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Shared: Horizontal Carousel ──────────────────────────────────────────────

const HorizontalCarousel = ({ items, renderCard, autoInterval = 4000 }) => {
  const trackRef = useRef(null)
  const timerRef = useRef(null)
  const [isInView, setIsInView] = useState(false)

  const getStep = useCallback(() => {
    const track = trackRef.current
    if (!track) return 444
    const first = track.firstElementChild
    if (!first) return 444
    const style = getComputedStyle(track)
    const gap = parseFloat(style.columnGap || style.gap) || 24
    return first.offsetWidth + gap
  }, [])

  const scrollStep = useCallback((dir) => {
    const track = trackRef.current
    if (!track) return
    const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2
    const atStart = track.scrollLeft <= 1
    if (dir > 0 && atEnd) {
      track.scrollTo({ left: 0, behavior: 'smooth' })
    } else if (dir < 0 && atStart) {
      track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' })
    } else {
      track.scrollBy({ left: dir * getStep(), behavior: 'smooth' })
    }
  }, [getStep])

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current)
    if (!isInView) return
    timerRef.current = setInterval(() => scrollStep(1), autoInterval)
  }, [autoInterval, scrollStep, isInView])

  // Observe the track so auto-scroll only runs when the carousel is on screen.
  useEffect(() => {
    const el = trackRef.current
    if (!el) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.25 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    resetTimer()
    return () => clearInterval(timerRef.current)
  }, [resetTimer])

  const go = (dir) => { scrollStep(dir); resetTimer() }

  return (
    <div className="hcarousel">
      <div className="hcarousel-track" ref={trackRef}>
        {items.map((item, i) => renderCard(item, i))}
      </div>
      <div className="hcarousel-controls">
        <button className="hcarousel-btn" onClick={() => go(-1)} aria-label="Previous">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="hcarousel-btn" onClick={() => go(1)} aria-label="Next">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Shared image card renderer helpers ───────────────────────────────────────

const renderImgCard = (item, i, onSelect, showDesc = true) => (
  <div key={i} className="img-card" onClick={() => onSelect(item)}>
    <div className="img-card-visual">
      <img src={item.image} alt={item.title} />
      <div className="img-card-gradient" />
      <h4 className="img-card-title">{item.title}</h4>
    </div>
    {showDesc && item.description && (
      <p className="img-card-desc">{item.description}</p>
    )}
  </div>
)

const splitTags = (tags) => String(tags || '')
  .split(',')
  .map((tag) => tag.trim())
  .filter(Boolean)

const matchesSearchTerm = (item, query) => {
  if (!query) return true
  const haystack = [item.title, item.description, item.domain, item.tags, item.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

const KeyMomentCard = ({ item, index, onSelect }) => {
  const tags = splitTags(item.tags).slice(0, 4)
  const [videoErr, setVideoErr] = useState(false)
  const meta = item.metadata || {}
  const topic = String(meta.topic || '').trim()
  const subtopics = Array.isArray(meta.subtopics)
    ? meta.subtopics.filter(Boolean).slice(0, 2)
    : String(meta.subtopics || '').split(',').map((v) => v.trim()).filter(Boolean).slice(0, 2)
  const sentiment = String(meta.sentiment || '').toLowerCase()
  const startSec = Number(meta.startTime)
  const endSec = Number(meta.endTime)
  const durationLabel = (() => {
    if (Number.isFinite(startSec) && Number.isFinite(endSec) && endSec > startSec) {
      const diff = Math.max(1, Math.round(endSec - startSec))
      const m = Math.floor(diff / 60)
      const s = diff % 60
      return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`
    }
    return null
  })()
  const sentimentTone = sentiment.includes('pos')
    ? 'positive'
    : sentiment.includes('neg')
      ? 'negative'
      : sentiment
        ? 'neutral'
        : null

  return (
    <div key={index} className="img-card key-moment-card km-card-futuristic" onClick={() => onSelect(item)}>
      <div className="km-card-glow" aria-hidden="true" />
      <div className="km-card-corner km-card-corner--tl" aria-hidden="true" />
      <div className="km-card-corner km-card-corner--tr" aria-hidden="true" />
      <div className="km-card-corner km-card-corner--bl" aria-hidden="true" />
      <div className="km-card-corner km-card-corner--br" aria-hidden="true" />
      <div className="img-card-visual">
        {item.playbackUrl && !videoErr ? (
          <video
            src={item.playbackUrl}
            muted
            playsInline
            preload="metadata"
            onError={() => setVideoErr(true)}
            className="img-card-video"
          />
        ) : (
          <div className="img-card-video-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
              <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="rgba(255,255,255,0.4)"/>
            </svg>
          </div>
        )}
        <div className="km-card-scanline" aria-hidden="true" />
        <div className="img-card-gradient" />
        <div className="km-card-top-row">
          <span className="km-card-ai-badge">
            <span className="km-card-ai-pulse" />
            <span className="km-card-ai-text">AI MOMENT</span>
          </span>
          {durationLabel && (
            <span className="km-card-duration">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {durationLabel}
            </span>
          )}
        </div>
        <button type="button" className="km-card-play" tabIndex={-1} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
        </button>
        <h4 className="img-card-title km-card-title">{item.title}</h4>
        {topic && (
          <div className="km-card-topic-strip">
            <span className="km-card-topic-dot" />
            <span className="km-card-topic-text">{topic}</span>
          </div>
        )}
      </div>
      <div className="km-card-body">
        <div className="img-card-meta-row km-card-meta-row">
          {item.domain && (
            <span className="key-moment-chip key-moment-chip--domain">
              <span className="km-chip-glyph" />
              {item.domain}
            </span>
          )}
          {subtopics.map((sub) => (
            <span key={`sub-${sub}`} className="key-moment-chip key-moment-chip--subtopic">{sub}</span>
          ))}
          {tags.map((tag) => (
            <span key={tag} className="key-moment-chip key-moment-chip--tag">{tag}</span>
          ))}
          {sentimentTone && (
            <span className={`key-moment-chip key-moment-chip--sentiment km-sentiment--${sentimentTone}`}>
              <span className="km-sentiment-dot" />
              {sentimentTone}
            </span>
          )}
        </div>
        {item.description && <p className="img-card-desc img-card-desc--clamp">{item.description}</p>}
      </div>
    </div>
  )
}

const renderKeyMomentCard = (item, i, onSelect) => (
  <KeyMomentCard key={item.id ?? i} item={item} index={i} onSelect={onSelect} />
)

// ─── Structured metadata display ─────────────────────────────────────────────

const formatSeconds = (value) => {
  if (!Number.isFinite(value) || value < 0) return null
  const mins = Math.floor(value / 60)
  const secs = Math.floor(value % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

const toList = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean)
  return []
}

const KeyMomentMetadata = ({ metadata, fallbackDescription }) => {
  const text = String(metadata?.transcript || metadata?.text || '').trim()
  const summary = String(metadata?.summary || fallbackDescription || '').trim()
  const topic = String(metadata?.topic || '').trim()
  const subtopics = toList(metadata?.subtopics)
  const entities = toList(metadata?.entities)
  const hashtags = toList(metadata?.hashtags)
  const sentiment = String(metadata?.sentiment || '').toLowerCase()
  const decisionSource = String(metadata?.decisionSource || '').trim()
  const clipNumber = metadata?.clipNumber
  const startLabel = formatSeconds(Number(metadata?.startTime))
  const endLabel = formatSeconds(Number(metadata?.endTime))
  const hasAnyMetadata = Boolean(
    text || summary || topic || subtopics.length || entities.length || hashtags.length || sentiment || decisionSource || startLabel || endLabel,
  )

  if (!hasAnyMetadata) return null

  const sentimentStyles = {
    positive: { color: '#49f2a5', borderColor: 'rgba(73, 242, 165, 0.4)', background: 'rgba(20, 98, 66, 0.36)' },
    negative: { color: '#ff8f87', borderColor: 'rgba(255, 143, 135, 0.45)', background: 'rgba(115, 37, 31, 0.34)' },
    neutral: { color: '#9fc7ff', borderColor: 'rgba(159, 199, 255, 0.42)', background: 'rgba(40, 63, 96, 0.32)' },
  }
  const sentimentStyle = sentimentStyles[sentiment] || { color: '#cbd4e6', borderColor: 'rgba(203, 212, 230, 0.36)', background: 'rgba(53, 57, 68, 0.4)' }

  return (
    <div className="km-metadata-block">
      <div className="km-meta-row">
        {Number.isFinite(Number(clipNumber)) && <span className="km-time-badge">Clip #{clipNumber}</span>}
        {startLabel && endLabel && <span className="km-time-badge">{startLabel} - {endLabel}</span>}
        {decisionSource && <span className="km-time-badge km-source-badge">Source: {decisionSource}</span>}
        {sentiment && (
          <span className="km-sentiment-badge" style={sentimentStyle}>
            Sentiment: {sentiment}
          </span>
        )}
      </div>

      {summary && (
        <div className="km-section">
          <h5 className="km-section-title">Summary</h5>
          <p className="km-summary-text">{summary}</p>
        </div>
      )}

      {/* Topic & Subtopics */}
      {(topic || subtopics.length > 0) && (
        <div className="km-section">
          <h5 className="km-section-title">Topics</h5>
          <div className="km-chips-row">
            {topic && <span className="km-chip km-chip--topic">{topic}</span>}
            {subtopics.map((s) => (
              <span key={s} className="km-chip km-chip--subtopic">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Transcript */}
      {text && (
        <div className="km-section">
          <h5 className="km-section-title">Transcript</h5>
          <div className="km-transcript">{text}</div>
        </div>
      )}

      {/* Entities */}
      {entities.length > 0 && (
        <div className="km-section">
          <h5 className="km-section-title">Entities</h5>
          <div className="km-chips-row">
            {entities.map((e) => (
              <span key={e} className="km-chip km-chip--entity">{e}</span>
            ))}
          </div>
        </div>
      )}

      {hashtags.length > 0 && (
        <div className="km-section">
          <h5 className="km-section-title">Hashtags</h5>
          <div className="km-chips-row">
            {hashtags.map((h) => (
              <span key={h} className="km-chip km-chip--hashtag">{h}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Key Moments modal ────────────────────────────────────────────────────────

const KeyMomentVideoModal = ({ moment, onClose, onUpdate }) => {
  const videoRef = useRef(null)
  const [videoError, setVideoError] = useState(false)
  const [likes, setLikes] = useState(moment.likes ?? 0)
  const [views, setViews] = useState(moment.views ?? 0)
  const [shares, setShares] = useState(moment.shares ?? 0)
  const [liked, setLiked] = useState(moment.userLiked ?? false)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Record view on open — deduplicated per session so reopening the same video
  // doesn't keep inflating the counter.
  useEffect(() => {
    const sessionKey = `km_viewed_${moment.id}`
    if (sessionStorage.getItem(sessionKey)) return // already counted this session

    keyMomentsApi.recordView(moment.id).then((res) => {
      if (res?.data?.ok && res.data.views != null) {
        sessionStorage.setItem(sessionKey, '1')
        setViews(res.data.views)
        onUpdate?.({ id: moment.id, views: res.data.views })
      }
    }).catch(() => {})
  }, [moment.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const videoSrc = moment.playbackUrl || ''
  const tags = splitTags(moment.tags)

  useEffect(() => {
    setVideoError(false)
    const video = videoRef.current
    if (!video || !videoSrc) return

    const startPlayback = async () => {
      try {
        video.muted = false
        await video.play()
      } catch {
        try {
          video.muted = true
          await video.play()
        } catch {
          // Leave controls available when autoplay is blocked.
        }
      }
    }

    startPlayback()
  }, [videoSrc])

  const handleLike = async () => {
    const action = liked ? 'unlike' : 'like'
    setLiked(!liked)
    setLikes((l) => liked ? Math.max(0, l - 1) : l + 1)
    try {
      const res = await keyMomentsApi.like(moment.id, action)
      if (res?.data?.ok) {
        const newLikes = res.data.likes
        const newLiked = res.data.userLiked ?? !liked
        setLikes(newLikes)
        setLiked(newLiked)
        onUpdate?.({ id: moment.id, likes: newLikes, userLiked: newLiked })
      }
    } catch {
      // revert optimistic update
      setLiked(liked)
      setLikes((l) => liked ? l + 1 : Math.max(0, l - 1))
    }
  }

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href
      if (navigator.share) {
        await navigator.share({ title: moment.title, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }
      const res = await keyMomentsApi.recordShare(moment.id)
      if (res?.data?.ok) {
        setShares(res.data.shares)
        onUpdate?.({ id: moment.id, shares: res.data.shares })
      }
    } catch {
      // share cancelled or failed — no feedback needed
    }
  }

  const showVideoUnavailable = !videoSrc || videoError

  return (
    <div className="cmodal-overlay" onClick={onClose}>
      <div className="cmodal cmodal--km" onClick={(e) => e.stopPropagation()}>
        <button className="cmodal-close" onClick={onClose} aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Video / unavailable placeholder */}
        <div className="cmodal-img">
          {!showVideoUnavailable ? (
            <video
              ref={videoRef}
              key={videoSrc}
              src={videoSrc}
              poster={moment.thumbnailUrl || undefined}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onError={() => setVideoError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          ) : (
            <div className="km-video-unavailable">
              {moment.thumbnailUrl ? (
                <img src={moment.thumbnailUrl} alt="" className="km-video-unavailable__thumb" />
              ) : null}
              <div className="km-video-unavailable__overlay">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
                  <path d="M10 9l5 3-5 3V9z" fill="rgba(255,255,255,0.5)"/>
                </svg>
                <span className="km-video-unavailable__label">Video preview unavailable</span>
              </div>
            </div>
          )}
        </div>

        {/* Content body */}
        <div className="cmodal-body cmodal-body--scrollable">
          <div className="km-premium-topline">
            <span className="km-premium-dot" />
            <span className="km-premium-label">Key Moment Spotlight</span>
          </div>
          <h3 className="cmodal-title">{moment.title}</h3>

          {(moment.domain || tags.length > 0) && (
            <div className="cmodal-meta cmodal-meta--premium">
              {moment.domain && <span className="key-moment-chip key-moment-chip--domain">{moment.domain}</span>}
              {tags.map((tag) => (
                <span key={tag} className="key-moment-chip">{tag}</span>
              ))}
            </div>
          )}

          {moment.description && <p className="cmodal-desc">{moment.description}</p>}

          <KeyMomentMetadata metadata={moment.metadata} fallbackDescription={moment.description} />

          {/* Engagement bar */}
          <div className="km-engagement-bar">
            <button className={`km-eng-btn${liked ? ' km-eng-btn--active' : ''}`} onClick={handleLike} aria-label="Like">
              <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span>{likes.toLocaleString()}</span>
            </button>
            <div className="km-eng-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              <span>{views.toLocaleString()}</span>
            </div>
            <button className={`km-eng-btn${shareCopied ? ' km-eng-btn--copied' : ''}`} onClick={handleShare} aria-label="Share">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span>{shareCopied ? 'Copied!' : shares.toLocaleString()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Games showcase ───────────────────────────────────────────────────────────

const GamesShowcaseSection = () => {
  const [selectedGame, setSelectedGame] = useState(null)
  const [selectedKeyMoment, setSelectedKeyMoment] = useState(null)
  const [query, setQuery] = useState('')
  const [keyMoments, setKeyMoments] = useState([])
  const [isLoadingKeyMoments, setIsLoadingKeyMoments] = useState(true)

  const games = [
    { title: 'Duck Hunter',  image: imgDuckHunter },
    { title: 'Space Shooter', image: imgSpaceShooter },
    { title: 'Whack-A-Mole', image: imgWhack },
    { title: 'Blink',        image: imgBlinkkz },
  ]

  useEffect(() => {
    let cancelled = false

    keyMomentsApi.publicList()
      .then((res) => {
        if (cancelled) return
        const localLiked = readLocalLikedIds()
        const items = (res?.data?.keyMoments || []).map((moment) => {
          // Server is authoritative; localStorage fills the gap when server can't identify user
          const serverLiked = moment.userLiked === true
          const localIsLiked = localLiked.has(Number(moment.id))
          return { ...moment, userLiked: serverLiked || localIsLiked }
        })
        setKeyMoments(items)
        // Keep localStorage in sync with server truth
        const serverLikedIds = new Set(items.filter((m) => m.userLiked).map((m) => Number(m.id)))
        writeLocalLikedIds(serverLikedIds)
      })
      .catch(() => {
        if (!cancelled) setKeyMoments([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingKeyMoments(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Sync engagement counts back to the list so re-opening a card shows up-to-date numbers
  const handleMomentUpdate = useCallback(({ id, views, likes, shares, userLiked }) => {
    // Keep localStorage in sync whenever liked state changes
    if (userLiked != null) {
      const likedIds = readLocalLikedIds()
      if (userLiked) likedIds.add(Number(id))
      else likedIds.delete(Number(id))
      writeLocalLikedIds(likedIds)
    }
    setKeyMoments((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              ...(views != null && { views }),
              ...(likes != null && { likes }),
              ...(shares != null && { shares }),
              ...(userLiked != null && { userLiked }),
            }
          : m,
      ),
    )
    setSelectedKeyMoment((prev) =>
      prev?.id === id
        ? {
            ...prev,
            ...(views != null && { views }),
            ...(likes != null && { likes }),
            ...(shares != null && { shares }),
            ...(userLiked != null && { userLiked }),
          }
        : prev,
    )
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredKeyMoments = keyMoments.filter((moment) => matchesSearchTerm(moment, normalizedQuery))

  return (
    <section className="games-showcase-section">
      <div className="section-inner">
        <div className="key-moments-block">
          <div className="key-moments-header">
            <h3 className="section-label">Key Moments</h3>
            <div className="search-bar search-bar--inline">
              <button className="search-btn" aria-label="Search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16 16L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <input
                type="text"
                placeholder="Search key moments"
                className="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          {isLoadingKeyMoments ? (
            <div className="key-moments-skeleton-row">
              {[0, 1, 2].map((i) => <div key={i} className="key-moments-skeleton-card" />)}
            </div>
          ) : filteredKeyMoments.length > 0 ? (
            <HorizontalCarousel
              items={filteredKeyMoments}
              renderCard={(item, i) => renderKeyMomentCard(item, i, setSelectedKeyMoment)}
            />
          ) : (
            <p className="key-moments-empty">
              {query ? 'No key moments match your search.' : 'No key moments available yet.'}
            </p>
          )}
        </div>

        <h3 className="section-label">Games</h3>
        <HorizontalCarousel
          items={games}
          renderCard={(item, i) => renderImgCard(item, i, setSelectedGame, false)}
        />
      </div>
      {selectedGame && <CardModal card={selectedGame} onClose={() => setSelectedGame(null)} />}
      {selectedKeyMoment && (
        <KeyMomentVideoModal
          moment={selectedKeyMoment}
          onClose={() => setSelectedKeyMoment(null)}
          onUpdate={handleMomentUpdate}
        />
      )}
    </section>
  )
}

// ─── Premio Stories ───────────────────────────────────────────────────────────

const ProjectCardsSection = ({ title }) => {
  const [selected, setSelected] = useState(null)

  const projects = [
    {
      title: 'Demand Generation',
      image: imgTab,
      description: 'AI-native CarPlay application with sales copilot to provide opportunity scoring with insights and next best action for AdSales representatives.',
    },
    {
      title: 'Fast-track MSC',
      image: imgGroup,
      description: "Built on LTM's Blueverse, this is an agentic distribution workflow that eliminates manual effort by orchestrating end‑to‑end.",
    },
    {
      title: 'Artwork Analysis',
      image: imgParty,
      description: 'AI‑powered, multimodal forecasting intelligence platform that extracts, standardizes, and scores weather predictions from both digital APIs and live TV broadcasts.',
    },
    {
      title: 'AI Creative Studio',
      image: imgThink,
      description: 'AI Creative Studio lets customers generate images, compelling copy, and video ads, accelerating campaigns with brand-safe, data-driven creativity at-scale.',
    },
  ]

  return (
    <section className="project-cards-section">
      <div className="section-inner">
        <h3 className="section-label">{title}</h3>
        <HorizontalCarousel
          items={projects}
          renderCard={(item, i) => renderImgCard(item, i, setSelected)}
        />
      </div>
      {selected && <CardModal card={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}

// ─── Success Stories ──────────────────────────────────────────────────────────

const SuccessStoriesSection = () => {
  const [selected, setSelected] = useState(null)

  const items = [
    {
      title: 'Scaling Video Intelligence Globally',
      image: imgScaling,
      description: 'A first-of-its-kind GenAI initiative delivering end-to-end analysis across 45,000+ hours of diverse video content—powering intelligent segmentation, robust content safety classification, and monetization readiness.',
    },
    {
      title: 'Making News Smarter & Accessible',
      image: imgMaking,
      description: "Enabled AI-ready, enterprise-scale content delivery by unifying client's platforms, strengthening data quality, operational resilience, and monetization readiness.",
    },
    {
      title: 'AI-native SMB AdSales Solution',
      image: imgAiNative,
      description: 'Delivered an AI-native AdSales workflow that sharpened sales targeting, accelerated decision-making, and improved reporting efficiency by 30%, directly translating to revenue growth.',
    },
  ]

  return (
    <section className="success-stories-section">
      <div className="section-inner">
        <h3 className="section-label">Success Stories</h3>
        <HorizontalCarousel
          items={items}
          renderCard={(item, i) => renderImgCard(item, i, setSelected)}
        />
      </div>
      {selected && <CardModal card={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}

// ─── Coming Soon ──────────────────────────────────────────────────────────────

const ComingSoonSection = () => {
  const [selected, setSelected] = useState(null)

  const items = [
    {
      title: 'AI Creative Studio',
      image: imgCreative,
      description: 'AI-led creative automation embedded in leveraging Google Vertex AI to generate brand safe, platform compliant video ads at scale.',
    },
    {
      title: 'Artwork Meta Tagging',
      image: imgArtwork,
      description: 'AI–powered media tagging solution that automatically generates taxonomy-aligned metadata for artwork and seamlessly feeds approved tags back into BigQuery.',
    },
    {
      title: 'Live Brand Detection',
      image: imgLive,
      description: 'AI-driven brand exposure intelligence solution that automatically detects, tracks, and quantifies sponsor logo visibility in 4K live sports broadcasts—giving broadcasters and sponsors precise, real-time ROI measurement at scale.',
    },
    {
      title: 'Conversational AI',
      image: imgConversational,
      description: 'AI-powered, next-generation customer engagement platform that leverages WhatsApp to deliver personalized, AI-driven customer interactions.',
    },
  ]

  return (
    <section className="coming-soon-section">
      <div className="section-inner">
        <h3 className="section-label">Coming Soon</h3>
        <HorizontalCarousel
          items={items}
          renderCard={(item, i) => renderImgCard(item, i, setSelected)}
        />
      </div>
      {selected && <CardModal card={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}

// ─── Mission AI Possible ──────────────────────────────────────────────────────

const MissionAIPossibleSection = () => {
  const [selected, setSelected] = useState(null)

  const items = [
    { icon: icon1, image: imgPoly,       title: 'POLY AI' },
    { icon: icon2, image: imgReels,      title: 'SMART REELS' },
    { icon: icon3, image: imgHighlights, title: 'SMART HIGHLIGHTS' },
    { icon: icon4, image: imgSkip,       title: 'SKIPFLIX' },
    { icon: icon5, image: imgRecorder,   title: 'SMARTRECAP' },
  ]

  const renderPair = (item, i) => (
    <div key={i} className="mission-pair" onClick={() => setSelected(item)}>
      <div className="mission-icon-photo">
        <img src={item.icon} alt="" className="mission-num-icon" aria-hidden="true" />
        <img src={item.image} alt={item.title} className="mission-photo" />
      </div>
      <span className="mission-item-label">{item.title}</span>
    </div>
  )

  return (
    <section className="mission-ai-section">
      <div className="section-inner">
        <h2 className="mission-title">Mission:AI Possible</h2>
        <HorizontalCarousel items={items} renderCard={renderPair} autoInterval={5000} />
      </div>
      {selected && <CardModal card={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}

// ─── Media X+ ─────────────────────────────────────────────────────────────────

const MediaXPlusSection = () => {
  const [selected, setSelected] = useState(null)

  const items = [
    {
      title: 'AI Content Pipeline',
      image: imgAiContent,
      description: "Built on LTM's Blueverse, this is an agentic distribution workflow that eliminates manual effort by orchestrating end‑to‑end.",
    },
    {
      title: 'Closed Captioning',
      image: imgClosed,
      description: 'AI-native CarPlay application with sales copilot to provide opportunity scoring with insights and next best action for AdSales representatives.',
    },
    {
      title: 'Interactive Comics',
      image: imgInteractive,
      description: 'AI‑powered, multimodal forecasting intelligence platform that extracts, standardizes, and scores weather predictions from both digital APIs and live TV broadcasts.',
    },
  ]

  return (
    <section className="media-xplus-section">
      <div className="section-inner">
        <h3 className="section-label">Media X+</h3>
        <HorizontalCarousel
          items={items}
          renderCard={(item, i) => renderImgCard(item, i, setSelected)}
        />
      </div>
      {selected && <CardModal card={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}

// ─── LTM MediaCube ────────────────────────────────────────────────────────────

const LTMMediaCubeSection = () => {
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const videoRef = useRef(null)

  const getVideoUrl = useCallback(async () => {
    const mod = await import('../assets/MissionPage/MediaCube.mp4?url')
    return mod.default
  }, [])

  const exitFullscreenIfAny = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) return document.exitFullscreen()
    if (document.webkitFullscreenElement && document.webkitExitFullscreen) return document.webkitExitFullscreen()
  }, [])

  const resetToPoster = useCallback(() => {
    const v = videoRef.current
    if (!v) return

    exitFullscreenIfAny()

    v.pause()
    v.currentTime = 0

    v.removeAttribute('src')
    v.load()

    setPlaying(false)
    setDuration(0)
  }, [exitFullscreenIfAny])

  const handlePlayClick = useCallback(async () => {
    const v = videoRef.current
    if (!v) return

    if (!v.getAttribute('src')) {
      const url = await getVideoUrl()
      v.src = url
      v.load()
    }

    try {
      await v.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }, [getVideoUrl])

  // ✅ simple function (no memo needed)
  const formatTime = (time) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <section className="ltm-mediacube-section">
      <div className="mediacube-inner">
        <div className="mediacube-video-wrap">
          <video
            ref={videoRef}
            className="mediacube-video"
            poster={imgMediacube}
            preload="none"
            playsInline
            controls={playing}
            onLoadedMetadata={(e) => setDuration(e.target.duration)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={resetToPoster}
            onClick={() => {
              const v = videoRef.current
              if (!v) return

              if (v.paused && v.getAttribute('src')) {
                v.play()
                setPlaying(true)
              } else {
                v.pause()
                setPlaying(false)
              }
            }}
          />

          {!playing && (
            <div className="video-play-area">
              <button
                className={`play-btn ${playing ? 'play-btn--active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handlePlayClick()
                }}
                aria-label="Play video"
              >
                <svg className="play-circle" width="84" height="84" viewBox="0 0 84 84" fill="none">
                  <circle cx="42" cy="42" r="40" stroke="white" strokeWidth="1.5" strokeOpacity="0.55" />
                  {!playing && (
                    <circle
                      cx="42"
                      cy="42"
                      r="40"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeOpacity="0.12"
                      className="play-ring-pulse"
                    />
                  )}
                  <path d="M35 26L60 42L35 58V26Z" fill="white" />
                </svg>
              </button>
            </div>
          )}

          {playing && duration > 0 && (
            <div className="video-duration">
              {formatTime(duration)}
            </div>
          )}

          <div className="mediacube-video-label">
            <span>MediaCube</span>
          </div>
        </div>

        <div className="mediacube-info">
          <div className="mediacube-logo-row">
            <img src={imgLtmMedia} alt="LTM MediaCube" className="mediacube-logo-img" />
            <img src={imgAward} alt="Best in Innovation 2025" className="mediacube-award-img" />
          </div>

          <p className="mediacube-description">
            MediaCube is LTM's AI-powered, cloud-agnostic media platform that streamlines content supply chains by
            automating ingestion, metadata, compliance, distribution, and monetization, enabling scalable, efficient
            operations for media enterprises globally, securely, intelligently
          </p>

          <div className="mediacube-features">
            {['Decloner.AI', 'SubtitleDrift.AI', 'Predictive.AI'].map((name) => (
              <span key={name} className="mediacube-feature-item">
                <img src={iconStar} alt="★" className="mediacube-star" />
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}


// ─── Let's Work Together ──────────────────────────────────────────────────────

const LetsWorkTogetherSection = () => (
  <section className="lets-work-section">
    <div className="work-container">
      <h2 className="work-title">
        <span className="work-title-light">LET'S WORK</span>
        <span className="work-title-bold">TOGETHER</span>
      </h2>
    </div>
  </section>
)

export default AIPossible
