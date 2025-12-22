import React, { useEffect, useRef, useState } from 'react'

export default function FastScroller() {
    const [active, setActive] = useState(false)
    const [visible, setVisible] = useState(false)
    // Track scroll percentage (0 to 1)
    const [scrollPos, setScrollPos] = useState(0)
    const trackRef = useRef<HTMLDivElement>(null)
    const fadeTimer = useRef<number | null>(null)

    // Fade Logic helper
    const showAndFade = () => {
        setVisible(true)
        if (fadeTimer.current) window.clearTimeout(fadeTimer.current)
        fadeTimer.current = window.setTimeout(() => {
            // Hide if not interacting
            if (!active) setVisible(false)
        }, 1500)
    }

    // Keep visible while dragging
    useEffect(() => {
        if (active) {
            setVisible(true)
            if (fadeTimer.current) window.clearTimeout(fadeTimer.current)
        } else {
            // Resume fade out countdown
            showAndFade()
        }
    }, [active])

    // Track window scroll to update handle position
    useEffect(() => {
        const handleScroll = () => {
            // Show scrollbar on movement
            showAndFade()

            if (active) return // Don't fight with user drag
            const winScroll = document.documentElement.scrollTop || document.body.scrollTop
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
            if (height > 0) {
                setScrollPos(winScroll / height)
            }
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [active])

    // Drag Logic
    const handleDrag = (clientY: number) => {
        const track = trackRef.current
        if (!track) return

        const rect = track.getBoundingClientRect()
        // Calculate percentage within the track height
        // Clamp between 0 and 1
        const p = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))

        setScrollPos(p)
        setActive(true)

        // Scroll the window
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
        window.scrollTo({ top: p * height, behavior: 'auto' }) // auto = instant
    }

    // Mouse Handlers
    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        handleDrag(e.clientY)

        const onMove = (mv: MouseEvent) => handleDrag(mv.clientY)
        const onUp = () => {
            setActive(false)
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    // Touch Handlers
    const onTouchStart = (e: React.TouchEvent) => {
        e.cancelable && e.preventDefault() // Stop browser scroll
        handleDrag(e.touches[0].clientY)
    }
    const onTouchMove = (e: React.TouchEvent) => {
        e.cancelable && e.preventDefault()
        handleDrag(e.touches[0].clientY)
    }
    const onTouchEnd = () => setActive(false)

    return (
        <div
            ref={trackRef}
            className={`fast-scroller-track ${visible || active ? 'visible' : ''}`}
            onMouseDown={(e) => {
                // Allow clicking track to jump
                if (e.target === trackRef.current) handleDrag(e.clientY)
            }}
        >
            <div
                className={`fast-scroller-thumb ${active ? 'active' : ''}`}
                style={{
                    top: `${scrollPos * 100}%`,
                    transform: 'translateY(-50%)' // Center the thumb on the point
                }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="fast-scroller-bubble">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15-4-4h8l-4 4zm4-6H8l4-4 4 4z" />
                    </svg>
                </div>
            </div>
        </div>
    )
}
