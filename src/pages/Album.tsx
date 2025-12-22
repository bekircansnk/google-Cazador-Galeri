import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { getFriendlyDriveError } from '../api/drive'
import DownloadDrawer from '../components/DownloadDrawer'
import GlassModal from '../components/GlassModal'
import AlbumCard from '../components/AlbumCard'
import PhotoLightbox from '../components/PhotoLightbox'
import PhotoCard from '../components/PhotoCard'
import SearchBar from '../components/SearchBar'
import FloatingHeader from '../components/FloatingHeader'
import FilterPopover from '../components/FilterPopover'
import PageHero from '../components/PageHero'
import PhotoList from '../components/PhotoList'
import FastScroller from '../components/FastScroller'
import { GOOGLE_API_KEY, ROOT_FOLDER_ID } from '../config'
import useDebouncedValue from '../hooks/useDebouncedValue'
import { useScrollHeader } from '../hooks/useScrollHeader'
import { useGallery } from '../state/galleryStore'
import { useAlbumCovers } from '../hooks/useAlbumCovers' // NEW IMPORT
import type { DriveFile } from '../api/drive'
import type { SortBy, SortDir } from '../state/galleryStore'
import { downloadZip, getDownloadUrl, getDriveFolderUrl, triggerDownload } from '../utils/download'
import { matchesQuery, normalizeForSearch } from '../utils/search'
import { shareMultipleFiles } from '../utils/share'

const EMPTY_FILES: DriveFile[] = []

export default function Album() {
  const { id } = useParams<{ id: string }>()
  const missingEnv = !GOOGLE_API_KEY || !ROOT_FOLDER_ID
  const albumId = id ?? ''

  // Navigation State
  const [subfolderPath, setSubfolderPath] = useState<{ id: string; name: string }[]>([])
  const activeFolderId = subfolderPath.length > 0 ? subfolderPath[subfolderPath.length - 1].id : albumId

  useEffect(() => {
    setSubfolderPath([])
  }, [albumId])

  const { showToast } = useToast()
  const { showScrollTop, scrollToTop } = useScrollHeader()

  const gallery = useGallery()
  const [albumMeta, setAlbumMeta] = useState<DriveFile | null>(null)
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null)

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 220)
  const q = useMemo(() => normalizeForSearch(debouncedQuery), [debouncedQuery])

  // Sorting State
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showFilter, setShowFilter] = useState(false)

  // View Mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('cazador-viewMode') as 'grid' | 'list') || 'grid'
  })
  const [showViewMenu, setShowViewMenu] = useState(false)
  const handleViewChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    localStorage.setItem('cazador-viewMode', mode)
    setShowViewMenu(false)
  }

  const albumEntry = gallery.itemsCache[activeFolderId]
  const allItems = albumEntry?.items ?? EMPTY_FILES
  const itemsStatus = albumEntry?.status ?? 'idle'

  const { folders, photos } = useMemo(() => {
    const f: DriveFile[] = []
    const p: DriveFile[] = []
    for (const item of allItems) {
      if (item.mimeType === 'application/vnd.google-apps.folder') f.push(item)
      else p.push(item)
    }
    return { folders: f, photos: p }
  }, [allItems])

  // --- NEW: Album Covers Logic ---
  const folderIds = useMemo(() => folders.map(f => f.id), [folders])
  const covers = useAlbumCovers(folderIds)

  const [selectedById, setSelectedById] = useState<Record<string, DriveFile>>({})
  const selectedItems = useMemo(() => Object.values(selectedById), [selectedById])

  const [downloadBusy, setDownloadBusy] = useState(false)
  const [downloadProgressLabel, setDownloadProgressLabel] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!albumId) return
    if (missingEnv) return

    if (!albumMeta) {
      void gallery.getAlbumMeta(albumId).then(setAlbumMeta).catch(console.error)
    }

    void gallery.loadAlbumItems(activeFolderId).catch(() => showToast('Hata', 'error'))
  }, [albumId, activeFolderId, missingEnv])

  // ... (Filtering/Sorting same as before) ...

  const filtered = useMemo(() => {
    let result = photos

    // 1. Search Filter
    if (q) {
      result = result.filter((f) => matchesQuery(f.name, q))
    }

    // 2. Sort
    result = [...result].sort((a, b) => {
      let comparison = 0

      if (sortBy === 'name') {
        const nameA = a.name.toLowerCase()
        const nameB = b.name.toLowerCase()
        comparison = nameA.localeCompare(nameB)
      } else {
        // Date sort: Use createdTime, fallback to modifiedTime, fallback to 0
        const dateA = new Date(a.createdTime || a.modifiedTime || 0).getTime()
        const dateB = new Date(b.createdTime || b.modifiedTime || 0).getTime()
        comparison = dateA - dateB
      }

      // Reverse if Descending
      if (sortDir === 'desc') {
        comparison = -comparison
      }

      // 3. Tie-breaker by ID (stable sort)
      if (comparison === 0) {
        return a.id.localeCompare(b.id)
      }

      return comparison
    })

    return result
  }, [photos, q, sortBy, sortDir])

  useEffect(() => {
    if (lightboxIndex === null) return
    if (!filtered.length) return setLightboxIndex(null)
    if (lightboxIndex >= filtered.length) setLightboxIndex(filtered.length - 1)
  }, [filtered.length, lightboxIndex])

  const toggleSelect = (file: DriveFile) => {
    setSelectedById((prev) => {
      const next = { ...prev }
      if (next[file.id]) {
        delete next[file.id]
        return next
      }
      next[file.id] = file
      return next
    })
  }

  const isAllSelected = filtered.length > 0 && filtered.every((f) => selectedById[f.id])

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      const newSelection = { ...selectedById }
      filtered.forEach((f) => delete newSelection[f.id])
      setSelectedById(newSelection)
    } else {
      selectAll()
    }
  }

  const selectAll = () => {
    const newSelection: Record<string, DriveFile> = { ...selectedById }
    filtered.forEach(file => {
      newSelection[file.id] = file
    })
    setSelectedById(newSelection)
  }

  const onQuickDownload = (file: DriveFile) => {
    triggerDownload(getDownloadUrl(file), file.name)
  }

  const onDownloadSelected = async () => {
    if (!selectedItems.length || downloadBusy) return
    setDownloadBusy(true)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      setDownloadProgressLabel(`ZIP hazırlanıyor… 0/${selectedItems.length}`)
      await downloadZip(selectedItems, {
        filename: `${albumMeta?.name ?? 'album'}.zip`,
        signal: controller.signal,
        onFileProgress: (done, total) => setDownloadProgressLabel(`ZIP hazırlanıyor… ${done}/${total}`),
        onZipProgress: (percent) => setDownloadProgressLabel(`ZIP paketleniyor… %${Math.round(percent)}`),
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Cancelled
      } else {
        const message = err instanceof Error ? err.message : 'İndirme sırasında beklenmeyen bir hata oluştu.'
        setErrorModal({ title: 'İndirme hatası', message })
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      setDownloadBusy(false)
      setDownloadProgressLabel(null)
    }
  }

  const cancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }


  // Restore variables needed for Hero
  const itemStats = itemsStatus === 'loading'
    ? 'Yükleniyor…'
    : `${folders.length > 0 ? `${folders.length} klasör • ` : ''}${filtered.length} foto${q ? ' (filtreli)' : ''}`

  // Navigation Handlers


  const handleBreadcrumbClick = (index: number) => {
    // If index is -1, it means Root
    if (index === -1) {
      setSubfolderPath([])
    } else {
      // Go to that level (slice up to index+1)
      setSubfolderPath((prev) => prev.slice(0, index + 1))
    }
  }

  const handleUp = () => {
    if (subfolderPath.length > 0) {
      setSubfolderPath((prev) => prev.slice(0, prev.length - 1))
    } else {
      // Go back to Home? No, let Link handle it.
    }
  }

  const currentTitle = subfolderPath.length > 0
    ? subfolderPath[subfolderPath.length - 1].name
    : (albumMeta?.name ?? 'Yükleniyor…')

  const coverUrl = filtered[0]?.thumbnailLink?.replace('=s220', '=s1920') || null

  return (
    <main className="container">
      {/* Floating Header */}
      <FloatingHeader
        title={currentTitle}
        subtitle={itemStats}
        refreshAction={() => {
          if (!activeFolderId) return
          void gallery.loadAlbumItems(activeFolderId, { force: true }).catch((err) =>
            setErrorModal(getFriendlyDriveError(err)),
          )
        }}
        showRefresh={!missingEnv && !!activeFolderId}
        driveLink={albumMeta?.webViewLink || getDriveFolderUrl(activeFolderId)}
      />

      {/* Custom Breadcrumb above Hero? Or inside Hero? */}
      {/* Let's inject Breadcrumb logic into Hero actions or above title */}

      <PageHero
        title={currentTitle}
        subtitle={itemStats}
        backgroundUrl={coverUrl}
        actions={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>

            {/* Breadcrumbs */}
            {(subfolderPath.length > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => handleBreadcrumbClick(-1)}
                  className="glass-ghost-btn"
                  style={{ border: 'none', background: 'transparent', padding: '0 4px', fontSize: 'inherit', color: 'rgba(255,255,255,0.7)' }}
                >
                  {albumMeta?.name ?? 'Kök'}
                </button>
                {subfolderPath.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ opacity: 0.4, margin: '0 4px' }}>/</span>
                    <button
                      onClick={() => handleBreadcrumbClick(i)}
                      className="glass-ghost-btn"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: '0 4px',
                        fontSize: 'inherit',
                        color: i === subfolderPath.length - 1 ? 'white' : 'rgba(255,255,255,0.7)',
                        fontWeight: i === subfolderPath.length - 1 ? 600 : 400
                      }}
                      disabled={i === subfolderPath.length - 1}
                    >
                      {item.name}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              {/* Back Button logic: If deep, Go Up. If root, Go Home. */}
              {subfolderPath.length > 0 ? (
                <button onClick={handleUp} className="glassButton">
                  <svg style={{ marginRight: 6 }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                  Geri
                </button>
              ) : (
                <Link to="/" className="glassButton">
                  <svg style={{ marginRight: 6 }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  Anasayfa
                </Link>
              )}

              {albumEntry?.items?.[0]?.webViewLink && (
                <a className="glassButton" href={getDriveFolderUrl(activeFolderId)} target="_blank" rel="noreferrer">
                  <svg style={{ marginRight: 6 }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                  Drive'da Aç
                </a>
              )}

              <button
                type="button"
                className="glassButton icon-only"
                title="Yenile"
                onClick={() => {
                  void gallery.loadAlbumItems(activeFolderId, { force: true }).catch(err => setErrorModal(getFriendlyDriveError(err)))
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
              </button>
            </div>
          </div>
        }
      />

      {/* Search Bar & Filter Row */}

      {/* Search Bar & Filter Row */}
      <div className="search-row" style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <SearchBar value={query} onChange={setQuery} placeholder="Bu albümde ara…" />
        </div>

        {/* Actions Group */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Select All Button */}
          {photos.length > 0 && (
            <button
              className="glassButton"
              onClick={handleSelectAllToggle}
              style={{
                height: 44,
                padding: '0 16px',
                fontSize: 14,
                whiteSpace: 'nowrap',
                minWidth: 'auto',
              }}
            >
              {isAllSelected ? 'Seçimi Kaldır' : 'Tümünü Seç'}
            </button>
          )}

          {/* Download All Button - Visible only when all visible items are selected */}
          {isAllSelected && (
            <button
              className="glassButton primary"
              onClick={onDownloadSelected}
              disabled={downloadBusy}
              style={{
                height: 44,
                padding: '0 16px',
                fontSize: 14,
                whiteSpace: 'nowrap',
                minWidth: 'auto',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginRight: 6 }}
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {downloadBusy ? 'Hazırlanıyor…' : 'Tümünü İndir (ZIP)'}
            </button>
          )}

          {/* Existing Filter Button Container */}
          <div style={{ position: 'relative' }}>
            <button
              className={`filter-btn ${showFilter ? 'active' : ''}`}
              onClick={() => setShowFilter(!showFilter)}
              title="Sıralama ve Filtre"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
            </button>

            {showFilter && (
              <FilterPopover
                sortBy={sortBy}
                sortDir={sortDir}
                onChange={(s, d) => {
                  setSortBy(s)
                  setSortDir(d)
                }}
                onClose={() => setShowFilter(false)}
              />
            )}
          </div>

          {/* View Mode Button */}
          <div style={{ position: 'relative' }}>
            <button
              className={`filter-btn ${showViewMenu ? 'active' : ''}`}
              onClick={() => setShowViewMenu(!showViewMenu)}
              title="Görünüm"
            >
              {viewMode === 'grid' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              )}
            </button>

            {showViewMenu && (
              <div
                className="filter-popover"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  width: '50px',
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  zIndex: 100
                }}
              >
                <button
                  onClick={() => handleViewChange('grid')}
                  className={`filter-option ${viewMode === 'grid' ? 'selected' : ''}`}
                  style={{ justifyContent: 'center', padding: '8px' }}
                  title="Grid Görünümü"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                </button>
                <button
                  onClick={() => handleViewChange('list')}
                  className={`filter-option ${viewMode === 'list' ? 'selected' : ''}`}
                  style={{ justifyContent: 'center', padding: '8px' }}
                  title="Liste Görünümü"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                </button>
              </div>
            )}
            {/* Backdrop to close menu */}
            {showViewMenu && (
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                onClick={() => setShowViewMenu(false)}
              />
            )}
          </div>
        </div>
      </div>

      {itemsStatus === 'error' ? (
        <div className="glass glassCard" style={{ marginBottom: 12 }}>
          <h2 className="sectionTitle">Hata</h2>
          <div className="muted">{albumEntry?.error}</div>
        </div>
      ) : null}

      {/* Photo Grid or List */}
      {/* Photo Grid or List & Empty State Logic */}
      {(itemsStatus === 'loading' || itemsStatus === 'idle') && allItems.length === 0 ? (
        <div className="photo-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="photoCard skeleton" style={{ borderRadius: 12, aspectRatio: '3/4', minHeight: 200 }} />
          ))}
        </div>
      ) : (
        <>
          {/* USER_MANDATORY: Render Folders First */}
          {folders.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div className="album-grid">
                {folders.map((folder, index) => (
                  <AlbumCard
                    key={folder.id}
                    album={folder}
                    coverUrl={covers[folder.id]}
                    priority={index < 6}
                    onClick={() => {
                      // Navigate down
                      setSubfolderPath(prev => [...prev, { id: folder.id, name: folder.name }])
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Render Items */}
          {viewMode === 'grid' ? (
            <div className="photo-grid">
              {filtered.map((file, index) => (
                <PhotoCard
                  key={file.id}
                  file={file}
                  selected={!!selectedById[file.id]}
                  onToggleSelect={() => toggleSelect(file)}
                  onOpen={() => setLightboxIndex(index)}
                  onQuickDownload={() => onQuickDownload(file)}
                  priority={index < 10}
                />
              ))}
            </div>
          ) : (
            <PhotoList
              items={filtered}
              selectedById={selectedById}
              onToggleSelect={toggleSelect}
              onQuickDownload={onQuickDownload}
              onOpen={setLightboxIndex}
            />
          )}

          {/* USER_MANDATORY: Empty State strictly when not loading and really empty */}
          {itemsStatus !== 'loading' && itemsStatus !== 'idle' && folders.length === 0 && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 20px', opacity: 0.6 }}>
              {q ? 'Arama kriterlerine uygun sonuç bulunamadı.' : 'Bu klasör boş.'}
            </div>
          )}
        </>
      )}

      <PhotoLightbox
        open={lightboxIndex !== null}
        items={filtered}
        index={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={(next) => setLightboxIndex(next)}
        onDownload={onQuickDownload}
        isSelected={(f) => Boolean(selectedById[f.id])}
        onToggleSelect={toggleSelect}
      />

      <DownloadDrawer
        open={selectedItems.length > 0}
        selected={selectedItems}
        onDownload={onDownloadSelected}
        onClear={() => setSelectedById({})}
        busy={downloadBusy}
        progressLabel={downloadProgressLabel ?? undefined}
        onSelectAll={selectAll}
        totalCount={filtered.length}
        onCancelDownload={cancelDownload}
        onShare={async () => {
          // Basic implementation of batch share
          try {
            setDownloadProgressLabel('Paylaşım dosyaları hazırlanıyor...')
            setDownloadBusy(true)
            const result = await shareMultipleFiles(selectedItems)
            if (result === 'clipboard') {
              showToast('Linkler kopyalandı', 'success')
            }
          } catch (e) {
            showToast('Paylaşım hatası', 'error')
          } finally {
            setDownloadBusy(false)
            setDownloadProgressLabel(null)
          }
        }}
      />

      <GlassModal
        open={Boolean(errorModal)}
        title={errorModal?.title ?? 'Hata'}
        onClose={() => setErrorModal(null)}
      >
        {errorModal?.message}
      </GlassModal>

      <footer style={{ padding: '40px 0', textAlign: 'center', opacity: 0.8, marginTop: 'auto' }}>
        <img src="/logo-new.png" alt="Cazador" width="150" />
      </footer>

      <div className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`} onClick={scrollToTop}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </div>

      <FastScroller />
    </main>
  )
}
