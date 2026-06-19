import { useEffect, useRef, useState } from 'react'
import './MediaEntertainment.css'

const MediaEntertainment = () => {
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

  return (
    <section className="media-entertainment-section" ref={sectionRef}>
      <div className="media-container">
        <div className={`media-title-container ${isVisible ? 'visible' : ''}`}>
          <span className="media-brewing">What's Brewing in</span>
          <h2 className="media-title">
            <span className="title-gray">Media &</span>
            <span className="title-gray">Entertainment</span>
          </h2>
        </div>
      </div>
    </section>
  )
}

export default MediaEntertainment
