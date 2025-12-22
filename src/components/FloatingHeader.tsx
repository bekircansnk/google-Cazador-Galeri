import { Link } from 'react-router-dom'
import { useScrollHeader } from '../hooks/useScrollHeader'

interface FloatingHeaderProps {
    title?: string
    subtitle?: React.ReactNode
    showRefresh?: boolean
    refreshAction?: () => void
    driveLink?: string
}

export default function FloatingHeader({
    title,
    subtitle,
    showRefresh = true,
    refreshAction,
    driveLink,
}: FloatingHeaderProps) {
    const { headerClass } = useScrollHeader()
    const isActive = headerClass === 'floating-active'

    // Wait, my hook logic was: <= threshold ? 'visible' (but this means static is visible).
    // I need to know if I should show the FLOATING header.
    // The User requirement: "Hero header" (static) at top. "Floating bar" on scroll.
    // So:
    // if scrollY <= threshold: Hero Visible, Floating Hidden.
    // if scrollY > threshold: Hero Hidden (scrolled away), Floating Visible.

    // I need to update useScrollHeader to return a boolean `showFloating`.
    // Currently it returns `headerClass` which toggles 'visible'/'hidden' for the *single* header concept.
    // I will refactor the hook in next step. For now, I'll assume a prop `visible` will be passed or hook updated.

    // Let's implement the component structure first.

    return (
        <div className={`floating-header ${isActive ? 'active' : ''}`}>
            {/* Mobile Header Layout: Compact */}

            {/* Left: Title (Desktop) or Menu/Back (Mobile - if needed) */}
            <div className="fh-left">
                <span className="fh-title">{title}</span>
                {subtitle && <span className="fh-subtitle">{subtitle}</span>}
            </div>

            {/* Center: Brand */}
            <div className="fh-center">
                <img src="/logo-new.png" alt="Cazador" className="h-[24px] object-contain opacity-90" />
            </div>

            {/* Right: Actions */}
            <div className="fh-right">
                <Link className="glassButton icon-only !border-0 bg-transparent hover:bg-white/10" to="/" style={{ width: 44, height: 44, padding: 0, display: 'grid', placeItems: 'center' }} title="Anasayfa">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </Link>

                {driveLink && (
                    <a className="glassButton icon-only !border-0 bg-transparent hover:bg-white/10" href={driveLink} target="_blank" rel="noreferrer" style={{ width: 44, height: 44, padding: 0, display: 'grid', placeItems: 'center' }} title="Drive'da Aç">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                    </a>
                )}

                {showRefresh && (
                    <button
                        type="button"
                        className="glassButton icon-only"
                        style={{ width: 36, height: 36, padding: 0, display: 'grid', placeItems: 'center' }}
                        title="Yenile"
                        onClick={refreshAction}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
                    </button>
                )}
            </div>
        </div>
    )
}
