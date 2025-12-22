import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { filesList, listAllFiles, type DriveFile } from '../api/drive'
import { ROOT_FOLDER_ID } from '../config'

export type GlobalIndexItem = DriveFile & {
    albumId: string
    albumName: string
}

export type SortBy = 'name' | 'date'
export type SortDir = 'asc' | 'desc'

interface AlbumEntry {
    status: 'idle' | 'loading' | 'ready' | 'error'
    items: DriveFile[]
    error?: string
}

interface Progress {
    done: number
    total: number
}

interface GalleryState {
    albums: DriveFile[]
    albumsStatus: 'idle' | 'loading' | 'ready' | 'error'
    albumsError?: string

    itemsCache: Record<string, AlbumEntry>

    globalIndex: GlobalIndexItem[]
    globalIndexStatus: 'idle' | 'building' | 'ready' | 'error'
    globalIndexProgress?: Progress
    globalIndexError?: string

    coverCache: Record<string, { url: string; updatedAt: number }>

    // Actions
    loadAlbums: (opts?: { force?: boolean }) => Promise<void>
    loadAlbumItems: (albumId: string, opts?: { force?: boolean }) => Promise<DriveFile[]>
    resolveAlbumCovers: (albumIds: string[]) => Promise<void> // New Action
    buildGlobalIndex: (opts?: { force?: boolean }) => Promise<void>
    getAlbumMeta: (albumId: string) => Promise<DriveFile | null>
}

const COVER_CACHE_TTL = 1000 * 60 * 60 * 24 // 24 Hours

export const useGallery = create<GalleryState>()(
    persist(
        (set, get) => ({
            albums: [],
            albumsStatus: 'idle',
            itemsCache: {},
            globalIndex: [],
            globalIndexStatus: 'idle',
            coverCache: {},

            loadAlbums: async (opts) => {
                const { albums, albumsStatus } = get()
                if (!opts?.force && albumsStatus === 'ready' && albums.length > 0) return

                set({ albumsStatus: 'loading', albumsError: undefined })
                try {
                    const res = await filesList({
                        q: `'${ROOT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
                        orderBy: 'name',
                        fields: 'files(id, name, webViewLink, iconLink)',
                        pageSize: 100,
                    })
                    set({ albums: res.files, albumsStatus: 'ready' })
                } catch (err) {
                    console.error(err)
                    set({
                        albumsStatus: 'error',
                        albumsError: err instanceof Error ? err.message : 'Albümler yüklenemedi',
                    })
                    throw err
                }
            },

            loadAlbumItems: async (albumId, opts) => {
                const { itemsCache } = get()
                const entry = itemsCache[albumId]

                // Return if already ready and not forced
                if (!opts?.force && entry?.status === 'ready') return entry.items

                // Concurrency Guard
                if (!opts?.force && entry?.status === 'loading') return entry.items ?? []

                set((state) => ({
                    itemsCache: {
                        ...state.itemsCache,
                        [albumId]: { status: 'loading', items: entry?.items ?? [] },
                    },
                }))

                try {
                    const files = await listAllFiles({
                        q: `'${albumId}' in parents and trashed = false`,
                        fields: 'files(id,name,mimeType,modifiedTime,size,thumbnailLink,iconLink,webViewLink),nextPageToken',
                        orderBy: 'createdTime desc',
                    })

                    set((state) => ({
                        itemsCache: {
                            ...state.itemsCache,
                            [albumId]: { status: 'ready', items: files },
                        },
                    }))
                    return files
                } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Fotoğraflar yüklenemedi'
                    set((state) => ({
                        itemsCache: {
                            ...state.itemsCache,
                            [albumId]: { status: 'error', items: [], error: msg },
                        },
                    }))
                    throw err
                }
            },

            resolveAlbumCovers: async (albumIds) => {
                const { coverCache } = get()
                const now = Date.now()
                const toFetch: string[] = []

                // 1. Identify what needs fetching
                for (const id of albumIds) {
                    const cached = coverCache[id]
                    if (!cached || (now - cached.updatedAt > COVER_CACHE_TTL)) {
                        toFetch.push(id)
                    }
                }

                if (toFetch.length === 0) return

                // 2. Fetch in chunks (Aggressive Concurrency: 32)
                const CHUNK_SIZE = 32
                console.log(`[Perf] resolveAlbumCovers started for ${toFetch.length} albums`)
                const startTotal = performance.now()

                for (let i = 0; i < toFetch.length; i += CHUNK_SIZE) {
                    const chunk = toFetch.slice(i, i + CHUNK_SIZE)

                    // Execute requests in parallel
                    const results = await Promise.all(chunk.map(async (albumId) => {
                        try {
                            // "En Yeni" fotoğrafı bul: createdTime desc
                            const res = await filesList({
                                q: `'${albumId}' in parents and mimeType contains 'image/' and trashed = false`,
                                orderBy: 'createdTime desc',
                                pageSize: 1,
                                fields: 'files(id, thumbnailLink)'
                            })

                            const file = res.files?.[0]
                            let url = file?.thumbnailLink || ''

                            // Optimization: Resize if possible to save bandwidth but keep quality decent
                            // s480 is a good balance for covers
                            if (url) {
                                if (/=s\d+/.test(url)) url = url.replace(/=s\d+/, '=s480')
                                else url += '=s480'
                            }

                            return { id: albumId, data: { url, updatedAt: Date.now() } }
                        } catch (e) {
                            console.warn(`Failed to resolve cover for ${albumId}`, e)
                            return null
                        }
                    }))

                    // Batch State Update 
                    const newCovers: Record<string, { url: string; updatedAt: number }> = {}
                    let count = 0
                    for (const res of results) {
                        if (res) {
                            newCovers[res.id] = res.data
                            count++
                        }
                    }

                    if (count > 0) {
                        set(state => ({
                            coverCache: {
                                ...state.coverCache,
                                ...newCovers
                            }
                        }))
                    }
                }
                console.log(`[Perf] resolveAlbumCovers total ${(performance.now() - startTotal).toFixed(0)}ms`)
            },

            buildGlobalIndex: async (opts) => {
                const { globalIndexStatus, loadAlbumItems } = get()
                if (!opts?.force && globalIndexStatus === 'ready') return

                // Load albums if not ready
                if (get().albumsStatus !== 'ready') {
                    await get().loadAlbums()
                }

                const currentAlbums = get().albums
                if (!currentAlbums.length) return

                set({ globalIndexStatus: 'building', globalIndexError: undefined })

                const allPhotos: GlobalIndexItem[] = []
                let done = 0

                try {
                    for (const album of currentAlbums) {
                        try {
                            const items = await loadAlbumItems(album.id)
                            items.forEach((item) => {
                                allPhotos.push({
                                    ...item,
                                    albumId: album.id,
                                    albumName: album.name
                                })
                            })
                        } catch (e) {
                            console.warn(`Failed to load items for album ${album.name}`, e)
                        }
                        done++
                        set({ globalIndexProgress: { done, total: currentAlbums.length } })
                    }

                    set({ globalIndex: allPhotos, globalIndexStatus: 'ready', globalIndexProgress: undefined })
                } catch (err) {
                    set({ globalIndexStatus: 'error', globalIndexError: 'Index oluşturulamadı' })
                    throw err
                }
            },

            getAlbumMeta: async (albumId) => {
                const { albums } = get()
                const found = albums.find(a => a.id === albumId)
                if (found) return found
                return null
            }
        }),
        {
            name: 'cazador-gallery-storage',
            partialize: (state) => ({
                // Persist albums and cover cache
                albums: state.albums,
                albumsStatus: state.albumsStatus === 'ready' ? 'ready' : 'idle', // Restore as ready if it was ready
                coverCache: state.coverCache,
            }),
        }
    )
)
