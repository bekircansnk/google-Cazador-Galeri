import { useEffect, useMemo, useRef, useState } from 'react'
import type { DriveFile } from '../api/drive'
import { getDriveFilePreviewUrl } from '../utils/download'

function IconCheck() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 7 10.5 16.5 4 10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 3v10m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v3h16v-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

export default function PhotoCard(props: {
  file: DriveFile
  albumLabel?: string
  selected: boolean
  onToggleSelect: (file: DriveFile) => void
  onQuickDownload?: (file: DriveFile) => void
  onOpen?: () => void
  priority?: boolean
}) {
  const anchorRef = useRef<HTMLAnchorElement | null>(null)
  const divRef = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  // Touch Tracking
  const touchStart = useRef<{ x: number, y: number } | null>(null)
  const isScrolling = useRef(false)

  useEffect(() => {
    // Determine what element to observe inside the effect
    const refToObserve = anchorRef.current || divRef.current
    if (!refToObserve) return

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          obs.disconnect()
        }
      },
      { rootMargin: '240px 0px', threshold: 0.01 },
    )

    obs.observe(refToObserve)
    return () => obs.disconnect()
  }, []) // Empty dependency array as refs are stable

  const href = props.file.webViewLink || getDriveFilePreviewUrl(props.file.id)

  const handleOpen = () => {
    if (props.onOpen) {
      props.onOpen();
    } else {
      window.open(href, '_blank');
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    isScrolling.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.touches[0].clientX - touchStart.current.x
    const dy = e.touches[0].clientY - touchStart.current.y
    // Scroll detection
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      isScrolling.current = true
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isScrolling.current) {
      e.preventDefault()
      handleOpen()
    }
    touchStart.current = null
    isScrolling.current = false
  }

  const thumb = useMemo(() => {
    if (!props.file.thumbnailLink) return null
    return tweakThumb(props.file.thumbnailLink, 560)
  }, [props.file.thumbnailLink])

  return (
    <div
      ref={divRef}
      className="photoCard touch-feedback"
      role="button"
      tabIndex={0}
      aria-label={`${props.file.name} önizleme`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        // Fallback for mouse
        if ((e.nativeEvent as any).pointerType === 'mouse') {
          handleOpen()
        }
      }}
    >
      <div className="photoMedia">
        {thumb && (inView || props.priority) ? (
          <>
            <img
              className={`photoThumb ${imgLoaded ? 'fade-in' : ''}`}
              src={thumb}
              alt={props.file.name}
              loading={props.priority ? 'eager' : 'lazy'}
              fetchPriority={props.priority ? 'high' : 'auto'}
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={() => setImgLoaded(true)}
              style={{ opacity: imgLoaded ? 1 : 0 }}
            />
            {!imgLoaded && <div className="photoPlaceholder skeleton" style={{ position: 'absolute', inset: 0 }} aria-hidden="true" />}
          </>
        ) : (
          <div className="photoPlaceholder" aria-hidden="true" />
        )}

        <div className="photoOverlayRow" aria-hidden="true">
          <button
            type="button"
            className={`iconChip ${props.selected ? 'iconChipSelected' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              e.nativeEvent.stopImmediatePropagation() // Robust fix
              props.onToggleSelect(props.file)
            }}
            onTouchEnd={(e) => e.stopPropagation()} // Stop bubbling to card touch handler
            aria-label={props.selected ? 'Seçimi kaldır' : 'Seç'}
          >
            <IconCheck />
          </button>

          <button
            type="button"
            className="iconChip"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              props.onQuickDownload?.(props.file)
            }}
            onTouchEnd={(e) => e.stopPropagation()}
            aria-label="İndir"
          >
            <IconDownload />
          </button>
        </div>
      </div>

      <div className="photoMetaRow">
        <div className="photoMetaLeft" title={props.albumLabel ?? ''}>
          {props.albumLabel ?? ''}
        </div>
        <div className="photoMetaName" title={props.file.name}>
          {props.file.name}
        </div>
        <div className="photoMetaRight" aria-hidden="true" />
      </div>
    </div>
  )
}
