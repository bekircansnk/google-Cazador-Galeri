import { useDrawer } from '../state/drawerStore'
import N8nFormPanel from './N8nFormPanel'

export default function RightActionDrawer() {
    const { isOpen, setIsOpen, fileQueue, removeFromQueue, clearQueue } = useDrawer()

    return (
        <div
            className={`right-drawer-wrapper liquid-drawer ${isOpen ? 'is-open' : ''}`}
            style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '360px', /* Slightly wider for better form */
                zIndex: 200,
                transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
        >
            <div className="liquid-drawer-header">
                <h2 className="liquid-drawer-title">Dosya Listesi</h2>
                <button
                    onClick={() => setIsOpen(false)}
                    className="liquid-close-btn"
                    title="Kapat"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div className="liquid-drawer-content">

                {/* File Queue Section */}
                <div className="file-queue-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                            Seçilenler ({fileQueue.length})
                        </span>
                        {fileQueue.length > 0 && (
                            <button
                                onClick={clearQueue}
                                className="glass-ghost-btn"
                            >
                                Listeyi Temizle
                            </button>
                        )}
                    </div>

                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                        {fileQueue.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                                Liste boş
                            </div>
                        ) : (
                            fileQueue.map(file => (
                                <div key={file.id} className="liquid-list-item">
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '20ch' }}>
                                        {file.name}
                                    </span>
                                    <button
                                        onClick={() => removeFromQueue(file.id)}
                                        className="liquid-remove-btn"
                                        title="Kaldır"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <hr className="liquid-divider" />

                {/* N8n Form */}
                <N8nFormPanel />

            </div>
        </div>
    )
}
