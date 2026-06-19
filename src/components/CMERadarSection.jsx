import { useEffect, useRef, useState } from 'react'
import './CMERadarSection.css'
import subscriptionImg from '../assets/HomePage/Subscription war is over. What next for Media firms.png'
import monetizingImg from '../assets/HomePage/Monetizing the Fan Ecosystem.png'
import { ai } from '../services/api'

const defaultInfoCards = [
  {
    title: 'AI Moves from Pilots to Proof',
    description: 'AI adoption in media is shifting from experimentation to enterprise-wide deployment with measurable ROI.',
    link: null,
  },
  {
    title: 'Advertising Becomes Conversational...',
    description: 'Media advertising is rapidly moving into AI-driven, interactive and personalised conversational formats.',
    link: null,
  },
  {
    title: 'Streaming Focuses on Profitability...',
    description: 'The streaming industry has entered a "scale-or-exit" phase, with AI driving cost efficiency and churn reduction.',
    link: null,
  },
  {
    title: 'Creator Economy Demands Platform...',
    description: 'Creators are pushing platforms to deliver AI-powered tools, fair monetisation, and transparent data practices.',
    link: null,
  },
]

const CMERadarSection = () => {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [infoCards, setInfoCards] = useState(defaultInfoCards)

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

    async function loadLatestNews() {
      try {
        const response = await ai.latestNews()
        const items = Array.isArray(response?.data?.items) ? response.data.items : []
        if (!cancelled && items.length) {
          setInfoCards(items.slice(0, 4))
        }
      } catch (error) {
        console.warn('[CME Radar] Using fallback info cards:', error?.message || error)
      }
    }

    loadLatestNews()

    return () => {
      cancelled = true
    }
  }, [])

  const radarCards = [
    {
      image: subscriptionImg,
      category: 'UI/ UX Design',
      author: 'Arjun J.',
      date: '14 Apr, 2026',
      title: 'Subscription war is over. What next for Media firms?'
    },
    {
      image: monetizingImg,
      category: 'UI/ UX Design',
      author: 'Arjun J.',
      date: '14 Apr, 2026',
      title: 'Monetizing the Fan Ecosystem: Sense...'
    }
  ]

  const infoCardColors = ['#A9ED9B', '#F4B4C2', '#D3B4F4', '#B4D2F4']

  return (
    <section className="cme-radar-section" ref={sectionRef}>
      <div className="radar-container">
        <h2 className={`radar-title ${isVisible ? 'visible' : ''}`}>CME Radar</h2>
        
        <div className="radar-content">
          <div className="radar-cards">
            {radarCards.map((card, index) => (
              <div 
                key={index}
                className={`radar-card ${isVisible ? 'visible' : ''}`}
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="radar-card-image-wrap">
                  <div className="radar-card-image">
                    <img src={card.image} alt={card.title} />
                  </div>
                </div>
                <span className="radar-card-category">{card.category}</span>
                <div className="radar-card-meta">
                  <span className="meta-item">
                    <span className="meta-dot"></span>
                    {card.author}
                  </span>
                  <span className="meta-item">
                    <span className="meta-dot"></span>
                    {card.date}
                  </span>
                </div>
                <h3 className="radar-card-title">{card.title}</h3>
              </div>
            ))}
          </div>
          
          <div className="info-cards">
            {infoCards.map((card, index) => (
              <div
                key={card.link || `${card.title}-${index}`}
                className={`info-card ${isVisible ? 'visible' : ''}`}
                style={{
                  animationDelay: `${(index + 2) * 0.1}s`,
                  backgroundColor: infoCardColors[index % infoCardColors.length],
                }}
              >
                <div className="info-card-content">
                  <h4 className="info-card-title">{card.title}</h4>
                  <p className="info-card-description">{card.description}</p>
                </div>
                <button
                  className="info-card-btn"
                  type="button"
                  aria-label="Open news article"
                  onClick={() => {
                    if (card.link) {
                      window.open(card.link, '_blank', 'noopener,noreferrer')
                    }
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default CMERadarSection
