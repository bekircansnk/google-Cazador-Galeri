
import type { DriveFile } from '../api/drive'
import type { GlobalIndexItem } from '../state/galleryStore'
import { formatBytes, formatDate } from '../utils/format'

interface PhotoListProps {
    items: (DriveFile | GlobalIndexItem)[]
    selectedById: Record<string, any>
    onToggleSelect: (file: any) => void
    onQuickDownload: (file: any) => void
    onOpen: (index: number) => void
}

function tweakThumb(url: string, size: number) {
    const sSize = String(size)
    if (/=s\d+/.test(url)) return url.replace(/=s\d+/, `=s${sSize}`)
    if (/=w\d+-h\d+/.test(url)) return url.replace(/=w\d+-h\d+/, `=w${sSize}-h${sSize}`)
    if (url.includes('?')) return `${url}&sz=w${sSize}`
    return `${url}?sz=w${sSize}`
}

export default function PhotoList({
    items,
    selectedById,
    onToggleSelect,
    onQuickDownload,
    onOpen,
}: PhotoListProps) {
    return (
        <div className="glass table-container" style={{ width: '100%', overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px', color: 'rgba(255,255,255,0.9)' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                        <th style={{ padding: '16px', width: '80px' }}></th>
                        <th style={{ padding: '16px' }}>Dosya Adı</th>
                        <th style={{ padding: '16px' }}>Tarih</th>
                        <th style={{ padding: '16px' }}>Boyut</th>
                        <th style={{ padding: '16px', textAlign: 'right' }}>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((file, index) => {
                        const isSelected = Boolean(selectedById[file.id])
                        const dateStr = formatDate(file.createdTime || file.modifiedTime)
                        const sizeStr = formatBytes(file.size)

                        // Optimize thumbnail
                        const thumbUrl = file.thumbnailLink ? tweakThumb(file.thumbnailLink, 120) : null

                        return (
                            <tr
                                key={file.id}
                                className={`table-row ${isSelected ? 'selected' : ''}`}
                                onClick={() => onToggleSelect(file)}
                                style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    background: isSelected ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
                                    transition: 'background 0.15s'
                                }}
                            >
                                <td style={{ padding: '12px 16px' }}>
                                    <div
                                        style={{ width: 56, height: 48, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', cursor: 'zoom-in', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onOpen(index)
                                        }}
                                    >
                                        {thumbUrl ? (
                                            <img
                                                src={thumbUrl}
                                                alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                    e.currentTarget.parentElement?.classList.add('fallback-icon')
                                                }}
                                            />
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '16px', fontWeight: 500, maxWidth: '300px' }}>
                                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.name}>
                                        {file.name}
                                    </div>
                                </td>
                                <td style={{ padding: '16px', opacity: 0.7 }}>{dateStr}</td>
                                <td style={{ padding: '16px', opacity: 0.7 }}>{sizeStr}</td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                                        <button
                                            className="glassButton icon-only"
                                            style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onQuickDownload(file)
                                            }}
                                            title="İndir"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                        </button>
                                        <div
                                            style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                border: `2px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.3)'}`,
                                                background: isSelected ? '#6366f1' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {isSelected && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
