import { useEffect, useMemo, useRef, useState } from 'react'

import PageHero from '../components/PageHero'
import GlassModal from '../components/GlassModal'
import DownloadDrawer from '../components/DownloadDrawer'
import AlbumCard from '../components/AlbumCard'
import PhotoLightbox from '../components/PhotoLightbox'
import PhotoCard from '../components/PhotoCard'
import SearchBar from '../components/SearchBar'
import FloatingHeader from '../components/FloatingHeader'
import FilterPopover from '../components/FilterPopover'
import useDebouncedValue from '../hooks/useDebouncedValue'
import { useScrollHeader } from '../hooks/useScrollHeader'
import { useGallery } from '../state/galleryStore'
import type { GlobalIndexItem, SortBy, SortDir } from '../state/galleryStore'
import { useAlbumCovers } from '../hooks/useAlbumCovers'
import { downloadZip, getDownloadUrl, getDriveFolderUrl, triggerDownload } from '../utils/download'
import { matchesQuery, normalizeForSearch } from '../utils/search'
import { APP_NAME, GOOGLE_API_KEY, ROOT_FOLDER_ID } from '../config'
import { getFriendlyDriveError } from '../api/drive'

export default function Home() {
  const missingEnv = !GOOGLE_API_KEY || !ROOT_FOLDER_ID
  const gallery = useGallery()
  const { showScrollTop, scrollToTop } = useScrollHeader()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 220)
  const q = useMemo(() => normalizeForSearch(debouncedQuery), [debouncedQuery])

  // Sort State
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showFilter, setShowFilter] = useState(false)

  const [setupDismissed, setSetupDismissed] = useState(false)
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null)

  const [selectedById, setSelectedById] = useState<Record<string, GlobalIndexItem>>({})
  const selectedItems = useMemo(() => Object.values(selectedById), [selectedById])

  const [downloadBusy, setDownloadBusy] = useState(false)
  const [downloadProgressLabel, setDownloadProgressLabel] = useState<string | null>(null)

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (missingEnv) return

    const init = async () => {
      // 1. Load Albums
      await gallery.loadAlbums()

      // 2. Resolve Covers (Parallel, High Priority)
      const albums = useGallery.getState().albums
      if (albums.length > 0) {
        // Non-blocking trigger
        void gallery.resolveAlbumCovers(albums.map(a => a.id))
      }

      // 3. Build Index (Background, Low Priority)
      // We delay this slightly to let covers start fetching
      setTimeout(() => {
        void gallery.buildGlobalIndex().catch(console.warn)
      }, 1000)
    }

    void init().catch(e => setErrorModal(getFriendlyDriveError(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingEnv])

  useEffect(() => {
    if (!q) setLightboxIndex(null)
  }, [q])

  // Filter & Sort Albums
  const filteredAlbums = useMemo(() => {
    if (!gallery.albums) return []
    let result = gallery.albums

    // 1. Filter
    if (q) {
      result = result.filter(a => matchesQuery(a.name, q))
    }

    // 2. Sort
    result = [...result].sort((a, b) => {
      let comparison = 0
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else {
        // Date
        const dateA = new Date(a.createdTime || a.modifiedTime || 0).getTime()
        const dateB = new Date(b.createdTime || b.modifiedTime || 0).getTime()
        comparison = dateA - dateB
      }

      if (sortDir === 'desc') comparison = -comparison
      return comparison
    })

    return result
  }, [gallery.albums, q, sortBy, sortDir])

  // --- NEW: Album Covers Logic ---
  const albumIds = useMemo(() => filteredAlbums.map(a => a.id), [filteredAlbums])
  const covers = useAlbumCovers(albumIds)

  const results = useMemo(() => {
    if (!q) return []

    const max = 240
    const out: GlobalIndexItem[] = []

    for (const item of gallery.globalIndex) {
      if (matchesQuery(item.name, q) || matchesQuery(item.albumName, q)) {
        out.push(item)
        if (out.length >= max) break
      }
    }

    return out
  }, [gallery.globalIndex, q])

  useEffect(() => {
    if (lightboxIndex === null) return
    if (!results.length) return setLightboxIndex(null)
    if (lightboxIndex >= results.length) setLightboxIndex(results.length - 1)
  }, [lightboxIndex, results.length])

  const toggleSelect = (file: GlobalIndexItem) => {
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

  const selectAll = () => {
    // Select all currently visible results
    const newSelection: Record<string, GlobalIndexItem> = { ...selectedById }
    results.forEach(file => {
      newSelection[file.id] = file
    })
    setSelectedById(newSelection)
  }

  const onQuickDownload = (file: GlobalIndexItem) => {
    triggerDownload(getDownloadUrl(file), file.name)
  }

  const onDownloadSelected = async () => {
    if (!selectedItems.length || downloadBusy) return
    setDownloadBusy(true)

    // Create new AbortController
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      setDownloadProgressLabel(`ZIP hazırlanıyor… 0 / ${selectedItems.length} `)
      await downloadZip(selectedItems, {
        filename: 'cazador-galeri-secili.zip',
        signal: controller.signal,
        onFileProgress: (done, total) => setDownloadProgressLabel(`ZIP hazırlanıyor… ${done}/${total}`),
        onZipProgress: (percent) => setDownloadProgressLabel(`ZIP paketleniyor… %${Math.round(percent)}`),
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Cancelled smoothly
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

  return (
    <main className="container">
      {/* Floating Header (Appears on scroll) */}
      <FloatingHeader
        refreshAction={() => {
          void gallery.loadAlbums({ force: true }).catch((err) => setErrorModal(getFriendlyDriveError(err)))
          // Re-fetch covers as well
          const ids = gallery.albums.map(a => a.id)
          void gallery.resolveAlbumCovers(ids)
          void gallery.buildGlobalIndex({ force: true }).catch((err) => setErrorModal(getFriendlyDriveError(err)))
        }}
        showRefresh={!missingEnv}
      />

      {/* Unified Page Hero */}
      <PageHero
        title={APP_NAME}
        actions={
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a
              href={getDriveFolderUrl(ROOT_FOLDER_ID)}
              target="_blank"
              rel="noreferrer"
              className="glassButton"
            >
              <svg style={{ marginRight: 6 }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
              Drive'da Aç
            </a>
            <button
              type="button"
              className="glassButton"
              onClick={() => {
                void gallery.loadAlbums({ force: true }).catch((err) => setErrorModal(getFriendlyDriveError(err)))
                void gallery.buildGlobalIndex({ force: true }).catch((err) => setErrorModal(getFriendlyDriveError(err)))
                const ids = gallery.albums.map(a => a.id)
                void gallery.resolveAlbumCovers(ids)
              }}
              disabled={missingEnv}
            >
              <svg style={{ marginRight: 6 }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
              Yenile
            </button>
          </div>
        }
      />

      {/* Search Bar & Filter Row (Row 2) */}
      <div className="search-row">
        <div className="search-input-wrapper">
          <SearchBar value={query} onChange={setQuery} placeholder="Tüm albümlerde ara…" />
        </div>

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
      </div>

      {gallery.albumsStatus === 'error' ? (
        <div className="glass glassCard" style={{ marginBottom: 12 }}>
          <h2 className="sectionTitle">Hata</h2>
          <div className="muted">{gallery.albumsError}</div>
        </div>
      ) : null}

      {q ? (
        <section>
          <div className="glass glassCard" style={{ marginBottom: 12 }}>
            <h2 className="sectionTitle">Sonuçlar</h2>
            <div className="muted" style={{ fontSize: 12 }}>
              {gallery.globalIndexStatus === 'building' && gallery.globalIndexProgress
                ? `Index hazırlanıyor: ${gallery.globalIndexProgress.done}/${gallery.globalIndexProgress.total}`
                : gallery.globalIndexStatus === 'error'
                  ? gallery.globalIndexError
                  : `${results.length} sonuç (ilk 240)`}
            </div>
          </div>

          <div className="grid photosGrid">
            {results.map((file, index) => (
              <PhotoCard
                key={file.id}
                file={file}
                albumLabel={file.albumName}
                selected={Boolean(selectedById[file.id])}
                onToggleSelect={(f) => toggleSelect(f as GlobalIndexItem)}
                onQuickDownload={(f) => onQuickDownload(f as GlobalIndexItem)}
                onOpen={() => setLightboxIndex(index)}
                priority={index < 10}
              />
            ))}
          </div>
        </section>
      ) : (
        <section>
          <div className="glass glassCard" style={{ marginBottom: 12 }}>
            <h2 className="sectionTitle">Albümler</h2>
            <div className="muted" style={{ fontSize: 12 }}>
              {gallery.albumsStatus === 'loading'
                ? 'Yükleniyor…'
                : gallery.albumsStatus === 'ready'
                  ? `${gallery.albums.length} albüm`
                  : missingEnv
                    ? 'Kurulum gerekli'
                    : ''}
            </div>
          </div>

          {gallery.albumsStatus === 'ready' ? (
            <div className="album-grid">
              {filteredAlbums.map((album, index) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  coverUrl={covers[album.id]}
                  priority={index < 8}
                />
              ))}
            </div>
          ) : null}
        </section>
      )}

      <PhotoLightbox
        open={lightboxIndex !== null}
        items={results}
        index={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={(next) => setLightboxIndex(next)}
        getMeta={(it) => it.albumName}
        onDownload={onQuickDownload}
        isSelected={(it) => Boolean(selectedById[it.id])}
        onToggleSelect={toggleSelect}
      />

      <DownloadDrawer
        open={selectedItems.length > 0}
        selected={selectedItems}
        onDownload={onDownloadSelected}
        onClear={() => setSelectedById({})}
        busy={downloadBusy}
        progressLabel={downloadProgressLabel ?? undefined}
        onSelectAll={q ? selectAll : undefined}
        totalCount={results.length}
        onCancelDownload={cancelDownload}
      />

      <GlassModal open={missingEnv && !setupDismissed} title="Kurulum gerekli" onClose={() => setSetupDismissed(true)}>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <code>VITE_GOOGLE_API_KEY</code> ve <code>VITE_ROOT_FOLDER_ID</code> tanımlayın.
          </div>
          <div>
            Detaylar için <code>README.md</code>.
          </div>
        </div>
      </GlassModal>

      <GlassModal
        open={Boolean(errorModal)}
        title={errorModal?.title ?? 'Hata'}
        onClose={() => setErrorModal(null)}
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <div>{errorModal?.message}</div>
          <div>
            <span className="muted">Not:</span> Drive API Key frontend’te olduğu için referrer restriction şart.
          </div>
        </div>
      </GlassModal>

      <footer style={{ padding: '40px 0', textAlign: 'center', opacity: 0.8, marginTop: 'auto' }}>
        <img src="/logo-new.png" alt="Cazador" width="150" />
      </footer>

      <div className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`} onClick={scrollToTop}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </div>
    </main>
  )
}
