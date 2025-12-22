import { useEffect, useRef } from 'react'
import type { SortBy, SortDir } from '../state/galleryStore'

interface FilterPopoverProps {
    sortBy: SortBy
    sortDir: SortDir
    onChange: (sortBy: SortBy, sortDir: SortDir) => void
    onClose: () => void
}

export default function FilterPopover({ sortBy, sortDir, onChange, onClose }: FilterPopoverProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickmsg = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('mousedown', handleClickmsg)
        return () => document.removeEventListener('mousedown', handleClickmsg)
    }, [onClose])

    const handleSelect = (s: SortBy, d: SortDir) => {
        onChange(s, d)
        onClose()
    }

    const isSelected = (s: SortBy, d: SortDir) => sortBy === s && sortDir === d

    return (
        <div className="filter-popover" ref={ref}>
            <div className="filter-section-title">İsim</div>
            <div className={`filter-option ${isSelected('name', 'asc') ? 'selected' : ''}`} onClick={() => handleSelect('name', 'asc')}>
                <span>A’dan Z’ye</span>
                {isSelected('name', 'asc') && <span>✓</span>}
            </div>
            <div className={`filter-option ${isSelected('name', 'desc') ? 'selected' : ''}`} onClick={() => handleSelect('name', 'desc')}>
                <span>Z’den A’ya</span>
                {isSelected('name', 'desc') && <span>✓</span>}
            </div>

            <div className="filter-section-title" style={{ marginTop: 4 }}>Tarih</div>
            <div className={`filter-option ${isSelected('date', 'desc') ? 'selected' : ''}`} onClick={() => handleSelect('date', 'desc')}>
                <span>En Yeni</span>
                {isSelected('date', 'desc') && <span>✓</span>}
            </div>
            <div className={`filter-option ${isSelected('date', 'asc') ? 'selected' : ''}`} onClick={() => handleSelect('date', 'asc')}>
                <span>En Eski</span>
                {isSelected('date', 'asc') && <span>✓</span>}
            </div>
        </div>
    )
}
