import { useState, useMemo, useRef, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DriveFile } from '../api/drive'
import { useHaptic } from '../hooks/useHaptic'

function IconFolder() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2h16Z" />
    </svg>
  )
}

function tweakThumb(url: string, size: number) {
  const sSize = String(size)
  if (/=s\d+/.test(url)) return url.replace(/=s\d+/, `=s${sSize}`)
  if (/=w\d+-h\d+/.test(url)) return url.replace(/=w\d+-h\d+/, `=w${sSize}-h${sSize}`)
  if (url.includes('?')) return `${url}&sz=w${sSize}`
  return `${url}?sz=w${sSize}`
}

const AlbumCard = memo(function AlbumCard(props: {
  album: DriveFile
  coverUrl?: string | null
  // count?: number // DEPRECATED implicitly
  priority?: boolean // For loading="eager"
  onClick?: () => void
}) {
  const navigate = useNavigate()

  // Touch Logic (Simple Click vs Scroll)
  const touchStart = useRef<{ x: number, y: number } | null>(null)
  const isScrolling = useRef(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    isScrolling.current = false
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.touches[0].clientX - touchStart.current.x
    const dy = e.touches[0].clientY - touchStart.current.y
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) isScrolling.current = true
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isScrolling.current) {
      if (e.cancelable) e.preventDefault()
      triggerAction()
    }
    touchStart.current = null
    isScrolling.current = false
  }

  const triggerAction = () => {
    triggerFolderOpen()
    if (props.onClick) props.onClick()
    else navigate(`/album/${props.album.id}`)
  }

  const { triggerFolderOpen } = useHaptic()

  // Thumb Logic
  const displayThumb = useMemo(() => {
    if (!props.coverUrl) return null
    // Request ~500px for card quality
    return tweakThumb(props.coverUrl, 500)
  }, [props.coverUrl])

  // Mouse Handler
  const handleMouseClick = () => {
    // Ignore if triggered by touch
    triggerAction()
  }

  return (
    <div
      className="albumCard touch-feedback"
      role="button"
      tabIndex={0}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleMouseClick}
      style={{ position: 'relative' }}
    >
      {/* 1. Image Layer */}
      {displayThumb ? (
        <>
          <img
            className={`albumCardThumb ${imgLoaded ? 'fade-in' : ''}`}
            src={displayThumb}
            alt=""
            loading={props.priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
          {!imgLoaded && <div className="skeleton" style={{ position: 'absolute', inset: 0 }} />}
        </>
      ) : (
        <div className="albumCardFallback">
          <IconFolder />
        </div>
      )}

      {/* 2. Scrim Layer */}
      <div className="albumCardOverlay" />

      {/* 3. Title Layer (Centered Pill) */}
      <div className="albumCardTitlePill">
        {props.album.name}
      </div>
    </div>
  )
})

export default AlbumCard
