import { useEffect, useRef, useState } from 'react'

export function useScrollHeader() {
    const [headerClass, setHeaderClass] = useState('')
    // '' = hidden (default), 'floating-active' = visible
    const [showScrollTop, setShowScrollTop] = useState(false)
    const lastScrollY = useRef(0)

    const ticking = useRef(false)

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY
            const delta = currentScrollY - lastScrollY.current
            const threshold = 80

            // Logic:
            // 1. If at top (< 80), always hidden (hero is visible).
            // 2. If scrolling down (delta > 10), hide it.
            // 3. If scrolling up (delta < -10) AND deep enough (> 80), show it.


            // To avoid flicker, we can use a "sticky" approach.
            // We need to know previous "visible" state.
            // Ideally this logic runs in effects.
            // Simplified:

            if (currentScrollY < threshold) {
                setHeaderClass('')
            } else if (delta > 10) {
                setHeaderClass('')
            } else if (delta < -10) {
                setHeaderClass('floating-active')
            }

            setShowScrollTop(currentScrollY > 600)
            lastScrollY.current = currentScrollY
            ticking.current = false
        }

        const onScroll = () => {
            if (!ticking.current) {
                window.requestAnimationFrame(handleScroll)
                ticking.current = true
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return { headerClass, showScrollTop, scrollToTop }
}
