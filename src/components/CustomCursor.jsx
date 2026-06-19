import { useEffect, useState, useRef } from 'react'
import './CustomCursor.css'

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 })
  const [trailPosition, setTrailPosition] = useState({ x: -100, y: -100 })
  const [isHovering, setIsHovering] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isClicking, setIsClicking] = useState(false)
  const rafRef = useRef(null)
  const targetRef = useRef({ x: -100, y: -100 })

  useEffect(() => {
    document.body.classList.add('custom-cursor-active')

    const handleMouseMove = (e) => {
      targetRef.current = { x: e.clientX, y: e.clientY }
      setPosition({ x: e.clientX, y: e.clientY })
      if (!isVisible) setIsVisible(true)
    }

    const handleMouseDown = () => setIsClicking(true)
    const handleMouseUp = () => setIsClicking(false)
    const handleMouseEnter = () => setIsVisible(true)
    const handleMouseLeave = () => setIsVisible(false)

    const addHoverListeners = () => {
      const hoverElements = document.querySelectorAll('a, button, .hover-target, input, textarea, [role="button"]')
      hoverElements.forEach((el) => {
        el.addEventListener('mouseenter', () => setIsHovering(true))
        el.addEventListener('mouseleave', () => setIsHovering(false))
      })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseenter', handleMouseEnter)
    document.addEventListener('mouseleave', handleMouseLeave)

    addHoverListeners()

    const observer = new MutationObserver(addHoverListeners)
    observer.observe(document.body, { childList: true, subtree: true })

    const animateTrail = () => {
      setTrailPosition(prev => ({
        x: prev.x + (targetRef.current.x - prev.x) * 0.15,
        y: prev.y + (targetRef.current.y - prev.y) * 0.15
      }))
      rafRef.current = requestAnimationFrame(animateTrail)
    }
    rafRef.current = requestAnimationFrame(animateTrail)

    return () => {
      document.body.classList.remove('custom-cursor-active')
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseenter', handleMouseEnter)
      document.removeEventListener('mouseleave', handleMouseLeave)
      observer.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <>
      <div
        className={`cursor-outer ${isHovering ? 'hovering' : ''} ${isClicking ? 'clicking' : ''}`}
        style={{
          transform: `translate(${trailPosition.x - 20}px, ${trailPosition.y - 20}px)`,
        }}
      />
      <div
        className={`cursor-inner ${isHovering ? 'hovering' : ''} ${isClicking ? 'clicking' : ''}`}
        style={{
          transform: `translate(${position.x - 4}px, ${position.y - 4}px)`,
        }}
      />
    </>
  )
}

export default CustomCursor
