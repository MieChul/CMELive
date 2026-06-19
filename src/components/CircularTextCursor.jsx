import { useEffect, useState, useRef } from 'react'
import './CircularTextCursor.css'

const CircularTextCursor = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 })
  const [isVisible, setIsVisible] = useState(false)
  const [rotation, setRotation] = useState(0)
  const rafRef = useRef(null)
  const rotationRef = useRef(0)

  const text = "+IT'S TIME TO OUTCREATE+BUSINESS CREATIVITY"
  const characters = text.split('')

  useEffect(() => {
    document.body.classList.add('circular-cursor-active')

    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY })
      if (!isVisible) setIsVisible(true)
    }

    const handleMouseEnter = () => setIsVisible(true)
    const handleMouseLeave = () => setIsVisible(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseleave', handleMouseLeave)

    const animateRotation = () => {
      rotationRef.current += 0.9
      setRotation(rotationRef.current)
      rafRef.current = requestAnimationFrame(animateRotation)
    }
    rafRef.current = requestAnimationFrame(animateRotation)

    return () => {
      document.body.classList.remove('circular-cursor-active')
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseleave', handleMouseLeave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isVisible])

  if (!isVisible) return null

  const radius = 62
  const angleStep = 360 / characters.length

  return (
    <div
      className="circular-text-cursor"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <div
        className="circular-text-container"
        style={{
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {characters.map((char, index) => {
          const angle = index * angleStep
          const isAsterisk = char === '+'
          return (
            <span
              key={index}
              className={`circular-char ${isAsterisk ? 'asterisk' : ''}`}
              style={{
                transform: `rotate(${angle}deg) translateY(-${radius}px)`,
              }}
            >
              {char}
            </span>
          )
        })}
      </div>
      <div className="cursor-center-dot" />
    </div>
  )
}

export default CircularTextCursor
