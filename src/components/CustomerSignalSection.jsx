import { useEffect, useRef, useState } from 'react'
import './CustomerSignalSection.css'
import doubleQuote from '../assets/Icons/double_quote.svg'
import philWiserImg from '../assets/HomePage/Bg.png'
import { testimonials as testimonialsApi } from '../services/api'

/* Fallback shown only if the API is unreachable or no active testimonials exist.
   Mirrors the original hardcoded content so the section never appears empty. */
const FALLBACK_TESTIMONIALS = [
  {
    id: 'fallback-0',
    message:
      "Enterprise Transformation in the Age of AI\nAn article to follow on this, but the main concept is creating an Enterprise World Model that encodes Enterprise Physics. This enables the implementation of a robust Digital Twin that can run simulations for major corporate transformations.",
    name: 'Phil Wiser',
    role: 'CTO Paramount',
    imageUrl: philWiserImg,
    linkedinUrl: '',
  },
]

const CustomerSignalSection = () => {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [items, setItems] = useState(FALLBACK_TESTIMONIALS)

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
        if (list.length > 0) {
          setItems(list)
          setCurrentSlide(0)
        }
      })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
  }, [])

  // Auto-rotate carousel every 7s when there is more than one testimonial.
  useEffect(() => {
    if (items.length <= 1) return undefined
    const id = setInterval(() => {
      setCurrentSlide((i) => (i + 1) % items.length)
    }, 7000)
    return () => clearInterval(id)
  }, [items.length])

  const safeIndex = Math.min(currentSlide, items.length - 1)
  const active = items[safeIndex] || FALLBACK_TESTIMONIALS[0]
  const imageSrc = active.imageUrl || philWiserImg
  const cardStyle = { '--testimonial-bg': `url(${imageSrc})` }

  return (
    <section className="customer-signal-section" ref={sectionRef}>
      <div className="signal-container">
        <h2 className={`signal-title ${isVisible ? 'visible' : ''}`}>Customer Signal</h2>

        <div className={`testimonial-card ${isVisible ? 'visible' : ''}`} style={cardStyle}>
          <div className="testimonial-image">
            <img src={imageSrc} alt={active.name} />
          </div>
          <div className="testimonial-content">
            <div className="quote-wrapper">
              <img src={doubleQuote} alt="" className="quote-icon" aria-hidden="true" />
              <p className="testimonial-quote">{active.message}</p>
            </div>
            <div className="testimonial-author">
              <span className="author-name">{active.name}</span>
              {active.role && <span className="author-role">{active.role}</span>}
            </div>
            <a
              href={active.linkedinUrl || '#'}
              className="linkedin-link"
              aria-label="LinkedIn profile"
              target={active.linkedinUrl ? '_blank' : undefined}
              rel={active.linkedinUrl ? 'noopener noreferrer' : undefined}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
                <rect width="48" height="48" rx="8" fill="#0A66C2"/>
                <path d="M14 19h4.5v15H14V19zm2.25-6.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM21 19h4.3v2.1h.06C26.1 19.9 27.8 19 29.9 19c4.6 0 5.1 3 5.1 6.9V34H30.5v-7.2c0-1.7 0-3.9-2.4-3.9s-2.7 1.9-2.7 3.8V34H21V19z" fill="white"/>
              </svg>
            </a>
          </div>
        </div>

        {items.length > 1 && (
          <div className="signal-dots">
            {items.map((t, index) => (
              <button
                key={t.id ?? index}
                className={`signal-dot ${index === safeIndex ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
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
