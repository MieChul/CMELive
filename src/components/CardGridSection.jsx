import { useEffect, useRef, useState } from 'react'
import './CardGridSection.css'

import imgMediaWorkspace  from '../assets/HomePage/Image (Media workspace).jpg'
import imgXRHeadset       from '../assets/HomePage/Image (XR headset).jpg'
import imgAITechnology    from '../assets/HomePage/Image (AI technology).jpg'
import imgLongTermMemory  from '../assets/HomePage/Image (Long-term memory).png'

// Left column — slide in from left
const leftCards = [
  {
    category: 'Domain-Tech Convergence',
    categoryColor: '#00D3F3',
    title: 'Media-Tech Matters',
    description: 'Ethics, transparency, and trust powering sustainable media innovation at scale.',
    image: imgLongTermMemory,
    cardClass: 'card-media-tech',
  },
  {
    category: 'CME',
    categoryColor: '#FB64B6',
    title: 'AI ROI in Media & Entertainment',
    description: 'Linking AI spend to audience growth, efficiency, and media revenues',
    image: imgXRHeadset,
    cardClass: 'card-ai-roi',
    badge: 'XR',
  },
]

// Right column — slide in from right
const rightCards = [
  {
    category: 'CME',
    categoryColor: '#C27AFF',
    title: 'New Media Economy',
    description: 'How ad operations monetize attention across platforms reshaping media economy',
    image: imgMediaWorkspace,
    cardClass: 'card-new-media',
  },
  {
    category: 'Streaming',
    categoryColor: '#C27AFF',
    title: 'Elevated Streaming Experience',
    description: "How LTM's state of the art device labs enable media quality at scale",
    image: imgAITechnology,
    cardClass: 'card-streaming',
  },
  {
    category: 'Streaming',
    categoryColor: '#C27AFF',
    title: 'Global Stories, Local Reach',
    description: 'AI enables local stories reach global audiences with cultural nuance',
    image: imgAITechnology,
    cardClass: 'card-streaming',
  },
]

const CardGridSection = () => {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="card-grid-section" ref={sectionRef}>
      <div className="card-grid-container">
        <div className="card-grid">

          {/* Left column — animate from left */}
          <div className="grid-col-left">
            {leftCards.map((card, i) => (
              <div
                key={i}
                className={`feature-card ${card.cardClass} ${i === 0 ? 'card-large' : 'card-wide'} ${isVisible ? 'visible' : ''}`}
                style={{ transitionDelay: `${i * 0.25}s`, '--slide-from': '-90px' }}
              >
                <img src={card.image} alt={card.title} className="card-bg-image" />
                <div className="card-overlay" />
                <div className="card-content">
                  <span className="card-category" style={{ color: card.categoryColor }}>{card.category}</span>
                  <h3 className="card-title">{card.title}</h3>
                  <p className="card-description">{card.description}</p>
                </div>
                {card.badge && <span className="card-badge">{card.badge}</span>}
              </div>
            ))}
          </div>

          {/* Right column — animate from right */}
          <div className="grid-col-right">
            {rightCards.map((card, i) => (
              <div
                key={i}
                className={`feature-card ${card.cardClass} card-small ${isVisible ? 'visible' : ''}`}
                style={{ transitionDelay: `${0.15 + i * 0.25}s`, '--slide-from': '90px' }}
              >
                <img src={card.image} alt={card.title} className="card-bg-image" />
                <div className="card-overlay" />
                <div className="card-content">
                  <span className="card-category" style={{ color: card.categoryColor }}>{card.category}</span>
                  <h3 className="card-title">{card.title}</h3>
                  <p className="card-description">{card.description}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}

export default CardGridSection
