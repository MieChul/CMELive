import { useEffect, useMemo, useRef, useState } from 'react'
import './CardGridSection.css'
import { uniqueBusinessStories as ubsApi } from '../services/api'

// Rotating slot carousel config — layout stays fixed at 2 major + 3 minor slots
const ROTATE_INTERVAL = 5000
const MAJOR_SLOTS = 2
const VISIBLE = 5 // 2 major + 3 minor

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

// Visual palette cycled for admin-managed stories so they match the static look.
const CATEGORY_COLORS = ['#00D3F3', '#FB64B6', '#C27AFF', '#00D3F3', '#FB64B6']
const CARD_CLASSES = ['card-media-tech', 'card-ai-roi', 'card-new-media', 'card-streaming', 'card-streaming']

const storyToCard = (story, index) => ({
  id: story.id,
  category: story.domain || 'CME',
  categoryColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  title: story.heading || '',
  description: story.subheading || '',
  image: story.imageUrl || '',
  cardClass: CARD_CLASSES[index % CARD_CLASSES.length],
})

const FeatureCard = ({ card, sizeClass, slideFrom, delay, visible }) => (
  <div
    className={`feature-card ${card.cardClass} ${sizeClass} ${visible ? 'visible' : ''}`}
    style={{ transitionDelay: delay, '--slide-from': slideFrom }}
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
)

const CardGridSection = () => {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [stories, setStories] = useState(null)
  const [offset, setOffset] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    ubsApi.publicList()
      .then(({ data }) => { if (!cancelled) setStories(data?.stories || []) })
      .catch(() => { if (!cancelled) setStories([]) })
    return () => { cancelled = true }
  }, [])

  const hasStories = Array.isArray(stories) && stories.length > 0
  const cards = useMemo(
    () => (hasStories ? stories.map((s, i) => storyToCard(s, i)) : null),
    [hasStories, stories],
  )

  // Rotating slot carousel: applies when admin stories drive the two-column
  // layout (3+ stories). The layout stays fixed at 2 major + 3 minor slots
  // while the content rotates one step per cycle, circularly. Rotation only
  // begins once the section is scrolled into view, so a refresh always starts
  // from the original order and replays the entrance animation.
  const isMultiRotating = hasStories && cards.length >= 3
  const canRotate = isMultiRotating && cards.length > VISIBLE && !reducedMotion && isVisible

  // Reset to the original order whenever the dataset changes or the section
  // leaves the viewport, so the next reveal restarts from the first slot.
  useEffect(() => { setOffset(0) }, [stories, isVisible])

  // Auto-rotate by one slot per cycle, pausing on interaction.
  useEffect(() => {
    if (!canRotate || paused) return undefined
    const id = setInterval(() => setOffset((o) => (o + 1) % cards.length), ROTATE_INTERVAL)
    return () => clearInterval(id)
  }, [canRotate, paused, cards])

  // Items currently assigned to the 5 visible slots (2 major + 3 minor).
  const windowCards = useMemo(() => {
    if (!isMultiRotating) return []
    const count = Math.min(VISIBLE, cards.length)
    return Array.from({ length: count }, (_, i) => cards[(offset + i) % cards.length])
  }, [isMultiRotating, cards, offset])

  let gridInner

  if (hasStories && cards.length === 1) {
    // Single story → one full-width hero card covering the section.
    gridInner = (
      <div className="card-grid card-grid--single">
        <FeatureCard card={cards[0]} sizeClass="card-hero" slideFrom="0px" delay="0s" visible={isVisible} />
      </div>
    )
  } else if (hasStories && cards.length === 2) {
    // Two stories → balanced side-by-side cards.
    gridInner = (
      <div className="card-grid card-grid--double">
        {cards.map((card, i) => (
          <FeatureCard
            key={card.id ?? i}
            card={card}
            sizeClass="card-half"
            slideFrom={i === 0 ? '-90px' : '90px'}
            delay={`${i * 0.2}s`}
            visible={isVisible}
          />
        ))}
      </div>
    )
  } else if (isMultiRotating) {
    // Three or more stories → rotating slot carousel (2 major + 3 minor).
    const majorItems = windowCards.slice(0, MAJOR_SLOTS)
    const minorItems = windowCards.slice(MAJOR_SLOTS, VISIBLE)
    gridInner = (
      <div
        className={`card-grid${canRotate ? ' card-grid--rotating' : ''}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {/* Left column — major slots */}
        <div className="grid-col-left">
          {majorItems.map((card, i) => (
            <FeatureCard
              key={card.id ?? `major-${i}`}
              card={card}
              sizeClass={i === 0 ? 'card-large' : 'card-wide'}
              slideFrom="-90px"
              delay={`${i * 0.25}s`}
              visible={isVisible}
            />
          ))}
        </div>

        {/* Right column — minor slots */}
        <div className="grid-col-right">
          {minorItems.map((card, i) => (
            <FeatureCard
              key={card.id ?? `minor-${i}`}
              card={card}
              sizeClass="card-small"
              slideFrom="90px"
              delay={`${0.15 + i * 0.25}s`}
              visible={isVisible}
            />
          ))}
        </div>
      </div>
    )
  } else if (stories === null) {
    // Still loading → render nothing to avoid flashing the empty state.
    gridInner = null
  } else {
    // No admin-managed stories yet → friendly empty state.
    gridInner = (
      <div className="card-grid card-grid--empty">
        <div className={`ubs-empty ${isVisible ? 'visible' : ''}`}>
          <h3 className="ubs-empty__title">No stories yet</h3>
          <p className="ubs-empty__text">
            Unique business stories will appear here once they’re added.
          </p>
        </div>
      </div>
    )
  }

  return (
    <section className="card-grid-section" ref={sectionRef}>
      <div className="card-grid-container">
        {gridInner}
      </div>
    </section>
  )
}

export default CardGridSection
