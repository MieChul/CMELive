import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './CornerOfficeSection.css'
import VideoModal from './VideoModal'
import { cornerOffice as cornerOfficeApi } from '../services/api'

const pad2 = (n) => String(n).padStart(2, '0')

// Default visual palette cycled by card index (since admin no longer edits colors).
const NUMBER_PALETTE = ['#c27aff', '#00d3f3', '#fb64b6', '#F2665B', '#FFB347', '#00E5A0']
const BORDER_PALETTE = [
  'rgba(89, 22, 139, 0.3)',
  'rgba(16, 78, 100, 0.3)',
  'rgba(134, 16, 67, 0.3)',
  'rgba(242, 102, 91, 0.3)',
  'rgba(255, 179, 71, 0.3)',
  'rgba(0, 229, 160, 0.3)',
]

const VISIBLE = 3

const CornerOfficeSection = () => {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeVideo, setActiveVideo] = useState(null)
  const [carouselIdx, setCarouselIdx] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    cornerOfficeApi.publicList()
      .then(({ data }) => {
        if (cancelled) return
        const list = (data?.conversations || []).map((c, i) => ({
          id: c.id,
          number: pad2(i + 1),
          numberColor: NUMBER_PALETTE[i % NUMBER_PALETTE.length],
          borderColor: BORDER_PALETTE[i % BORDER_PALETTE.length],
          title: c.title || '',
          subtitle: c.subtitle || '',
          image: c.imageUrl || '',
          video: c.videoUrl || '',
        }))
        setConversations(list)
      })
      .catch(() => { if (!cancelled) setConversations([]) })
    return () => { cancelled = true }
  }, [])

  if (conversations.length === 0) {
    return (
      <section className="corner-office-section" ref={sectionRef}>
        <div className="corner-container">
          <div className={`corner-title-container ${isVisible ? 'visible' : ''}`}>
            <span className="corner-subtitle">Corner Office</span>
            <h2 className="corner-title">Conversations</h2>
          </div>
        </div>
      </section>
    )
  }

  const total = conversations.length
  const isCarousel = total > VISIBLE
  const visibleCards = isCarousel
    ? Array.from({ length: VISIBLE }, (_, k) => conversations[(carouselIdx + k) % total])
    : conversations

  const step = (delta) => {
    setCarouselIdx((i) => ((i + delta) % total + total) % total)
  }

  return (
    <section className="corner-office-section" ref={sectionRef}>
      <div className="corner-container">
        <div className={`corner-title-container ${isVisible ? 'visible' : ''}`}>
          <span className="corner-subtitle">Corner Office</span>
          <h2 className="corner-title">Conversations</h2>
        </div>

        <div className={`conversations-wrap ${isCarousel ? 'conversations-wrap--carousel' : ''}`}>
          {isCarousel && (
            <button
              type="button"
              className="carousel-arrow carousel-arrow--prev"
              onClick={() => step(-1)}
              aria-label="Previous conversations"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <div className="conversations-grid">
            {visibleCards.map((conv, index) => {
              const titleWords = conv.title.split(' ').filter(Boolean)
              const playable = Boolean(conv.video)
              return (
                <div
                  key={`${conv.id}-${carouselIdx}-${index}`}
                  className={`conversation-card ${isVisible ? 'visible' : ''}`}
                  style={{
                    borderColor: conv.borderColor,
                    animationDelay: `${index * 0.15}s`,
                  }}
                >
                  {conv.image && (
                    <img src={conv.image} alt={conv.title} className="conversation-image" />
                  )}
                  <div className="conversation-overlay"></div>

                  <button
                    className="play-button"
                    type="button"
                    onClick={() => playable && setActiveVideo(conv)}
                    disabled={!playable}
                    aria-label={playable ? `Play ${conv.title}` : `${conv.title} (no video)`}
                    style={!playable ? { cursor: 'not-allowed', opacity: 0.45 } : undefined}
                  >
                    <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
                      <circle cx="25" cy="25" r="24" stroke="white" strokeWidth="2"/>
                      <path d="M20 15L35 25L20 35V15Z" fill="white"/>
                    </svg>
                  </button>

                  <div className="conversation-content">
                    <span className="conversation-number" style={{ color: conv.numberColor }}>
                      {conv.number}
                    </span>
                    <h3 className="conversation-title">
                      {titleWords.map((word, i) => (
                        <span key={i}>{word}</span>
                      ))}
                    </h3>
                    {conv.subtitle && (
                      <p className="conversation-subtitle">{conv.subtitle}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {isCarousel && (
            <button
              type="button"
              className="carousel-arrow carousel-arrow--next"
              onClick={() => step(1)}
              aria-label="Next conversations"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {isCarousel && (
          <div className="carousel-dots" role="tablist" aria-label="Carousel pagination">
            {conversations.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`carousel-dot ${i === carouselIdx ? 'carousel-dot--active' : ''}`}
                onClick={() => setCarouselIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-selected={i === carouselIdx}
                role="tab"
              />
            ))}
          </div>
        )}
      </div>

      {activeVideo && (
        <VideoModal
          videoUrl={activeVideo.video}
          posterUrl={activeVideo.image}
          title={activeVideo.title}
          subtitle={activeVideo.subtitle}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </section>
  )
}

export default CornerOfficeSection
