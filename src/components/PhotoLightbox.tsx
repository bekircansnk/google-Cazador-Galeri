import React, { useEffect, useRef, useState } from 'react'
import { shareFile } from '../utils/share'

// --- ICONS (Optimized & Standardized) ---
const ICON_SIZE = 24
const STROKE_WIDTH = 2 // slightly bolder

function IconX() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
function IconShare() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
function IconDownload() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
function IconExternal() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}
function IconChevronLeft() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
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

export default function PhotoLightbox(props: {
  open: boolean
  items: any[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
  getMeta?: (item: any) => React.ReactNode
  onDownload?: (item: any) => void
  isSelected?: (item: any) => boolean
  onToggleSelect?: (item: any) => void
}) {
  const { open, items, index, onClose, onIndexChange } = props
  const total = items.length

  const currentItem = items[index]
  const prevItem = index > 0 ? items[index - 1] : null
  const nextItem = index < total - 1 ? items[index + 1] : null

  // --- RESPONSIVE LOGIC ---
  // Rule: Mobile <= 768px.
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768)

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // --- VISIBILITY STATE ---
  const [controlsVisible, setControlsVisible] = useState(true)

  useEffect(() => {
    if (isDesktop) {
      setControlsVisible(true)
    }
  }, [isDesktop])

  // --- SLIDER LOGIC ---
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isVerticalDrag, setIsVerticalDrag] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)

  // Transition State: -1 (prev), 0 (current), 1 (next)
  const [slidingTo, setSlidingTo] = useState<0 | -1 | 1>(0)

  // FIX: Ref to prevent transition glitch on index reset
  const skipNextTransition = useRef(false)

  const touchStart = useRef<{ x: number, y: number } | null>(null)

  // Reset Logic on Index Change
  useEffect(() => {
    skipNextTransition.current = true
    setDragOffset({ x: 0, y: 0 })
    setIsDragging(false)
    setIsVerticalDrag(false)
    setSlidingTo(0)
    // Clear flag in next frame
    requestAnimationFrame(() => {
      skipNextTransition.current = false
    })
  }, [index])

  const getUrl = (item: any) => {
    if (!item) return ''
    return item.thumbnailLink ? tweakThumb(item.thumbnailLink, 1600) : item.webViewLink || ''
  }

  // --- EVENTS ---
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (shareBusy) return
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    touchStart.current = { x: clientX, y: clientY }
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || !touchStart.current) return

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

    const dx = clientX - touchStart.current.x
    const dy = clientY - touchStart.current.y

    if (!isVerticalDrag && Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dy) > 10) {
      setIsVerticalDrag(true)
    }

    if (isVerticalDrag) {
      setDragOffset({ x: 0, y: dy })
      if (e.cancelable && e.type === 'touchmove') e.preventDefault()
    } else {
      setDragOffset({ x: dx, y: 0 })
      if (e.cancelable && e.type === 'touchmove') e.preventDefault()
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging || !touchStart.current) return

    // Check if it was a TAP (very small movement)
    const dx = dragOffset.x
    const dy = dragOffset.y
    const wasTap = Math.abs(dx) < 5 && Math.abs(dy) < 5

    setIsDragging(false)
    touchStart.current = null

    if (wasTap) {
      // TAP MANTIGI
      if (!isDesktop) {
        // Mobile: Toggle Controls
        setControlsVisible(v => !v)
      }
      setDragOffset({ x: 0, y: 0 })
      return
    }

    // Vertical Dismiss
    if (isVerticalDrag) {
      if (dy > 100) onClose()
      else setDragOffset({ x: 0, y: 0 }) // bounce back
      setIsVerticalDrag(false)
      return
    }

    // Horizontal Swipe
    const threshold = window.innerWidth * 0.20 // 20% swipe enough
    if (dx < -threshold && nextItem) {
      // Next
      setSlidingTo(1)
      setTimeout(() => onIndexChange(index + 1), 300)
    } else if (dx > threshold && prevItem) {
      // Prev
      setSlidingTo(-1)
      setTimeout(() => onIndexChange(index - 1), 300)
    } else {
      // Bounce
      setDragOffset({ x: 0, y: 0 })
    }
  }

  // --- RENDER VARS ---
  let translateX = 0
  if (slidingTo === 1) translateX = -window.innerWidth
  else if (slidingTo === -1) translateX = window.innerWidth
  else translateX = dragOffset.x

  // FIX: Glitch prevention logic
  const effectiveTransition = (isDragging || skipNextTransition.current)
    ? 'none'
    : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s'

  const handleShareClick = async () => {
    if (shareBusy) return
    setShareBusy(true)
    try {
      const result = await shareFile(currentItem)
      if (result === 'clipboard') {
        alert('Link kopyalandı!')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setShareBusy(false)
    }
  }

  if (!open || !currentItem) return null

  // Background Opacity
  const bgOpacity = isVerticalDrag ? Math.max(0, 1 - Math.abs(dragOffset.y) / 500) : 0.95

  return (
    <div
      className="lightbox-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: `rgba(0,0,0,${bgOpacity})`,
        transition: isDragging ? 'none' : 'background-color 0.3s',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* SLIDER AREA */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none'
        }}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            transform: `translate3d(${translateX}px, ${dragOffset.y}px, 0)`,
            transition: effectiveTransition,
            willChange: 'transform'
          }}
        >
          {/* PREVIOUS */}
          <div style={{ position: 'absolute', left: '-100%', top: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {prevItem && <img src={getUrl(prevItem)} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} draggable={false} />}
          </div>

          {/* CURRENT */}
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img
              src={getUrl(currentItem)}
              alt=""
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                boxShadow: isVerticalDrag ? '0 8px 32px rgba(0,0,0,0.5)' : 'none'
              }}
              draggable={false}
            />
          </div>

          {/* NEXT */}
          <div style={{ position: 'absolute', left: '100%', top: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {nextItem && <img src={getUrl(nextItem)} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} draggable={false} />}
          </div>
        </div>
      </div>

      {/* --- CONTROLS OVERLAY (FIXED INSET) --- */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          pointerEvents: 'none',
          opacity: controlsVisible ? 1 : 0,
          transition: 'opacity 0.2s ease-out'
        }}
      >
        {/* TOOLBAR (TOP) */}
        <div
          className="lightbox-toolbar"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            background: isDesktop
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
            pointerEvents: 'none'
          }}
        >
          {/* Action Group */}
          <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto' }}>
            {props.onDownload && (
              <button
                onClick={() => props.onDownload?.(currentItem)}
                className="glassButton"
                title="İndir"
              >
                <IconDownload />
                <span className="hidden sm:inline" style={{ fontSize: 14, fontWeight: 500 }}>İndir</span>
              </button>
            )}

            <button
              onClick={handleShareClick}
              className="glassButton"
              title="Paylaş"
            >
              {shareBusy ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <IconShare />}
            </button>

            <a
              href={currentItem.webViewLink}
              target="_blank"
              rel="noreferrer"
              className="glassButton"
              title="Orijinali Gör"
            >
              <IconExternal />
            </a>

            <button
              onClick={onClose}
              className="glassButton"
              style={{ marginLeft: 8, padding: '10px' }}
              title="Kapat"
            >
              <IconX />
            </button>
          </div>
        </div>

        {/* NAVIGATION ARROWS (DESKTOP ONLY) */}
        {isDesktop && (
          <>
            {prevItem && (
              <button
                onClick={(e) => { e.stopPropagation(); setSlidingTo(-1); setTimeout(() => onIndexChange(index - 1), 300); }}
                className="liquid-close-btn"
                style={{
                  position: 'absolute',
                  left: '24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 56,
                  height: 56,
                  pointerEvents: 'auto',
                  zIndex: 10002
                }}
              >
                <IconChevronLeft />
              </button>
            )}
            {nextItem && (
              <button
                onClick={(e) => { e.stopPropagation(); setSlidingTo(1); setTimeout(() => onIndexChange(index + 1), 300); }}
                className="liquid-close-btn"
                style={{
                  position: 'absolute',
                  right: '24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 56,
                  height: 56,
                  pointerEvents: 'auto',
                  zIndex: 10002
                }}
              >
                <IconChevronRight />
              </button>
            )}

            {/* CLICK ZONES: Invisible areas to navigate easily */}
            <div
              style={{ position: 'absolute', top: 80, bottom: 80, left: 0, width: '20%', cursor: 'w-resize', zIndex: 10001, pointerEvents: 'auto' }}
              onClick={(e) => { e.stopPropagation(); if (prevItem) { setSlidingTo(-1); setTimeout(() => onIndexChange(index - 1), 300); } }}
              title="Önceki"
            />
            <div
              style={{ position: 'absolute', top: 80, bottom: 80, right: 0, width: '20%', cursor: 'e-resize', zIndex: 10001, pointerEvents: 'auto' }}
              onClick={(e) => { e.stopPropagation(); if (nextItem) { setSlidingTo(1); setTimeout(() => onIndexChange(index + 1), 300); } }}
              title="Sonraki"
            />
          </>
        )}

        {/* FOOTER (BOTTOM) */}
        <div
          className="lightbox-footer"
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            padding: '20px 24px',
            background: isDesktop
              ? 'rgba(0,0,0,0.8)'
              : 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          {/* Filename & Counter */}
          <div className="flex items-center justify-between text-white">
            <div className="font-medium text-sm truncate pr-4" style={{ maxWidth: '70%' }}>
              {currentItem.name.replace(/\.[^/.]+$/, "")}
            </div>
            <div className="text-xs opacity-70">
              {index + 1} / {total}
            </div>
          </div>

          {/* Selection Button */}
          {props.isSelected && (
            <div className="flex justify-end mt-2">
              <button
                onClick={(e) => { e.stopPropagation(); props.onToggleSelect?.(currentItem); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${props.isSelected(currentItem)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
              >
                <IconCheck />
                {props.isSelected(currentItem) ? 'Seçildi' : 'Seç'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
