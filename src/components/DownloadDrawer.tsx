import type { DriveFile } from '../api/drive'
import { useDrawer } from '../state/drawerStore'

export default function DownloadDrawer(props: {
  open: boolean
  selected: DriveFile[]
  onDownload: () => void
  onClear: () => void
  busy?: boolean
  progressLabel?: string
  onSelectAll?: () => void
  onCancelDownload?: () => void
  totalCount?: number
  onShare?: () => void
}) {
  const { addToQueue, setIsOpen } = useDrawer()

  const handleAddToFile = () => {
    addToQueue(props.selected)
    setIsOpen(true)
  }

  // Even if not open, we might want to show this bar if items are selected. 
  // But the parent controls 'open' based on selection length > 0.
  if (!props.open) return null

  const isAllSelected = props.totalCount ? props.selected.length === props.totalCount : false

  return (
    <div className="drawer" role="region" aria-label="İndirme ve Dosya İşlemleri" style={{ height: 'auto', minHeight: '80px', padding: '10px 0' }}>
      <div className="glass drawerInner" style={{ flexDirection: 'column', gap: '10px', alignItems: 'stretch' }}>

        {/* Top Row: Selected Names List */}
        <div className="selected-names-bar" style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '8px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '5px'
        }}>
          {props.selected.map(file => (
            <div key={file.id} className="name-chip" style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '13px',
              whiteSpace: 'nowrap'
            }}>
              {file.name}
            </div>
          ))}
        </div>

        {/* Bottom Row: Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          <div className="drawerText">
            {props.selected.length} fotoğraf seçildi.
            {props.busy && <div className="drawerSubtext" style={{ color: '#fbbf24' }}>{props.progressLabel || 'İşlem yapılıyor...'}</div>}
          </div>

          <div className="drawerActions" style={{ gap: '12px' }}>
            <button
              type="button"
              className="glassButton"
              onClick={isAllSelected ? props.onClear : props.onSelectAll}
              disabled={props.busy}
              style={{ minWidth: '100px' }}
            >
              {isAllSelected ? 'Seçimi Kaldır' : 'Tümünü Seç'}
            </button>

            {props.busy ? (
              <button type="button" className="glassButton" onClick={props.onCancelDownload} style={{ background: 'rgba(239, 68, 68, 0.5)', borderColor: '#ef4444' }}>
                İptal Et
              </button>
            ) : (
              <>
                {/* Share Selection */}
                <button
                  type="button"
                  className="glassButton"
                  onClick={() => {
                    // We need a prop to handle share busy state OR handle it internally? 
                    // Simpler: pass a callback that handles it in parent? 
                    // Or just fire and forget here if we don't want global busy state?
                    // User asked for "Resim Yükleniyor" feedback.
                    // Ideally parent handles this. But for speed, let's call a prop.
                    props.onShare?.()
                  }}
                >
                  Paylaş
                </button>
                <button type="button" className="glassButton primary" onClick={props.onDownload}>
                  {isAllSelected ? 'Tümünü İndir (ZIP)' : 'İndir (ZIP)'}
                </button>
              </>
            )}
            <button
              type="button"
              className="glassButton primary"
              onClick={handleAddToFile}
              disabled={props.busy}
            >
              AI Gönder
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
