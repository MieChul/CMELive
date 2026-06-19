import { useEffect, useRef, useState } from 'react'
import './HeroSection.css'

import cameraIcon  from '../assets/Icons/Layer_1.svg'
import vinylIcon   from '../assets/Icons/Layer_1-1.svg'
import clapIcon    from '../assets/Icons/Layer_1-2.svg'
import cineIcon    from '../assets/Icons/Layer_1-3.svg'
import vcamIcon    from '../assets/Icons/Layer_1-4.svg'
import headIcon    from '../assets/Icons/Layer_1-5.svg'
import ticketIcon  from '../assets/Icons/Layer_1-6.svg'
import projIcon    from '../assets/Icons/Layer_1-7.svg'
import starIcon    from '../assets/Icons/Layer_1-8.svg'
import chairIcon   from '../assets/Icons/Layer_1-9.svg'
import sipperIcon  from '../assets/Icons/Sipper.svg'

const floatingImages = [
  { src: sipperIcon,  alt: 'Sipper',         cls: 'f-sipper', w: 53,  parallax: 18 },
  { src: cameraIcon,  alt: 'Camera',          cls: 'f-camera', w: 87,  parallax: 22 },
  { src: vinylIcon,   alt: 'Vinyl',           cls: 'f-vinyl',  w: 92,  parallax: 20 },
  { src: clapIcon,    alt: 'Clapboard',       cls: 'f-clap',   w: 101, parallax: 28 },
  { src: cineIcon,    alt: 'Cinema',          cls: 'f-cine',   w: 193, parallax: 15 },
  { src: vcamIcon,    alt: 'Video Camera',    cls: 'f-vcam',   w: 170, parallax: 18 },
  { src: headIcon,    alt: 'Headphones',      cls: 'f-head',   w: 110, parallax: 22 },
  { src: ticketIcon,  alt: 'Ticket',          cls: 'f-ticket', w: 110, parallax: 25 },
  { src: projIcon,    alt: 'Projector',       cls: 'f-proj',   w: 114, parallax: 15 },
  { src: starIcon,    alt: 'Star',            cls: 'f-star',   w: 51,  parallax: 30 },
  { src: chairIcon,   alt: 'Director Chair',  cls: 'f-chair',  w: 110, parallax: 20 },
]

export default function HeroSection() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 })

  // Replay animation every time section enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(false)
          // tiny delay so CSS transition resets before re-adding class
          requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)))
        } else {
          setIsVisible(false)
        }
      },
      { threshold: 0.25 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      setMouse({
        x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
        y: Math.max(0, Math.min(1, (e.clientY - r.top)  / r.height)),
      })
    }
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])

  const parallaxStyle = (p) => ({
    transform: `translate(${(mouse.x - 0.5) * p}px, ${(mouse.y - 0.5) * p}px)`,
  })

  return (
    <section className="hero-section" ref={sectionRef}>

      {/* Icons — z-index 3, some overlap text */}
      <div className="floating-elements" aria-hidden="true">
        {floatingImages.map((img, i) => (
          <img
            key={i}
            src={img.src}
            alt=""
            className={`float-img ${img.cls} ${isVisible ? 'visible' : ''}`}
            width={img.w}
            style={parallaxStyle(img.parallax)}
          />
        ))}
      </div>

      {/* Text — z-index 10 */}
      <div className={`hero-text-container ${isVisible ? 'visible' : ''}`}>
        <h1 className="hero-title">
          <span className="hero-word rewriting">Rewriting</span>
          <span className="hero-word stories">Stories</span>
          {/* CME sits absolutely between Rewriting and Stories */}
          <span className="hero-word cme">CME</span>
        </h1>
      </div>
    </section>
  )
}
