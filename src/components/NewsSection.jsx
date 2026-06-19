import { useEffect, useRef, useState } from 'react'
import './NewsSection.css'

const NewsSection = () => {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const pillars = [
    'Infectious Curiosity',
    'Shared Purpose',
    'Being Bold',
    'AI-Technology'
  ]

  return (
    <section className="news-section" ref={sectionRef}>
      <div className="news-container">
        <p className={`news-subtitle ${isVisible ? 'animate-fadeInUp' : 'opacity-0'}`}>
          The Foundations of Our Disruptive Thinking and Business Creativity
        </p>
        
        <div className={`pillars-container ${isVisible ? 'visible' : ''}`}>
          {pillars.map((pillar, index) => (
            <button
              key={index}
              className="pillar-btn"
            >
              {pillar}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export default NewsSection
