import { useEffect, useRef, useState } from 'react'
import './CustomerSignalSection.css'
import doubleQuote from '../assets/Icons/double_quote.svg'
import { testimonials as testimonialsApi } from '../services/api'

const CustomerSignalSection = () => {
  const sectionRef = useRef(null)
  const trackRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [items, setItems] = useState([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.2 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    testimonialsApi.publicList()
      .then(({ data }) => {
        if (cancelled) return
        const list = Array.isArray(data?.testimonials) ? data.testimonials : []
        setItems(list)
        setCurrentSlide(0)
      })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [])

  const scrollToIndex = (index) => {
    const track = trackRef.current
    if (!track) return
    const card = track.children[index]
    if (!card) return
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' })
  }

  // Auto-rotate carousel only once the section has entered the viewport.
  useEffect(() => {
    if (!isVisible) return undefined
    if (items.length <= 1) return undefined
    const id = setInterval(() => {
      setCurrentSlide((i) => {
        const next = (i + 1) % items.length
        scrollToIndex(next)
        return next
      })
    }, 7000)
    return () => clearInterval(id)
  }, [isVisible, items.length])

  // Track manual scroll position and update active dot.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    const onScroll = () => {
      const width = track.clientWidth
      if (!width) return
      const idx = Math.round(track.scrollLeft / width)
      setCurrentSlide((cur) => (cur === idx ? cur : idx))
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [items.length])

  if (items.length === 0) {
    return (
      <section className="customer-signal-section" ref={sectionRef}>
        <div className="signal-container">
          <h2 className={`signal-title ${isVisible ? 'visible' : ''}`}>Customer Signal</h2>
        </div>
      </section>
    )
  }

  const safeIndex = Math.min(currentSlide, items.length - 1)

  return (
    <section className="customer-signal-section" ref={sectionRef}>
      <div className="signal-container">
        <h2 className={`signal-title ${isVisible ? 'visible' : ''}`}>Customer Signal</h2>

        <div className="testimonials-track" ref={trackRef}>
          {items.map((t) => {
            const hasImage = Boolean(t.imageUrl)
            const cardStyle = hasImage ? { '--testimonial-bg': `url(${t.imageUrl})` } : undefined
            return (
              <div
                key={t.id}
                className={`testimonial-card ${isVisible ? 'visible' : ''} ${hasImage ? '' : 'testimonial-card--no-image'}`}
                style={cardStyle}
              >
                {hasImage && (
                  <div className="testimonial-image">
                    <img src={t.imageUrl} alt={t.name} />
                  </div>
                )}
                <div className="testimonial-content">
                  <div className="testimonial-content-scroll">
                    <div className="quote-wrapper">
                      <img src={doubleQuote} alt="" className="quote-icon" aria-hidden="true" />
                      <p className="testimonial-quote">{t.message}</p>
                    </div>
                    <div className="testimonial-author">
                      <span className="author-name">{t.name}</span>
                      {t.role && <span className="author-role">{t.role}</span>}
                    </div>
                  </div>
                  <a
                    href={t.linkedinUrl || '#'}
                    className="linkedin-link"
                    aria-label="LinkedIn profile"
                    target={t.linkedinUrl ? '_blank' : undefined}
                    rel={t.linkedinUrl ? 'noopener noreferrer' : undefined}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
                      <rect width="48" height="48" rx="8" fill="#0A66C2"/>
                      <path d="M14 19h4.5v15H14V19zm2.25-6.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM21 19h4.3v2.1h.06C26.1 19.9 27.8 19 29.9 19c4.6 0 5.1 3 5.1 6.9V34H30.5v-7.2c0-1.7 0-3.9-2.4-3.9s-2.7 1.9-2.7 3.8V34H21V19z" fill="white"/>
                    </svg>
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        {items.length > 1 && (
          <div className="signal-dots">
            {items.map((t, index) => (
              <button
                key={t.id ?? index}
                className={`signal-dot ${index === safeIndex ? 'active' : ''}`}
                onClick={() => { setCurrentSlide(index); scrollToIndex(index) }}
                aria-label={`Show testimonial ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default CustomerSignalSection
