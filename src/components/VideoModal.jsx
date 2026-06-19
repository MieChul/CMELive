import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import './VideoModal.css'

export default function VideoModal({ videoUrl, posterUrl, title, subtitle, onClose }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  // Try to autoplay (muted fallback if browser blocks unmuted autoplay).
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const p = v.play()
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        v.muted = true
        v.play().catch(() => {})
      })
    }
  }, [videoUrl])

  if (!videoUrl) return null

  return (
    <div className="vm-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title || 'Video'}>
      <div className="vm" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="vm__close" onClick={onClose} aria-label="Close video">
          <X size={20} />
        </button>
        <div className="vm__player">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl || undefined}
            controls
            playsInline
            preload="metadata"
            className="vm__video"
          />
        </div>
        {(title || subtitle) && (
          <div className="vm__caption">
            {title && <h3 className="vm__title">{title}</h3>}
            {subtitle && <p className="vm__sub">{subtitle}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
