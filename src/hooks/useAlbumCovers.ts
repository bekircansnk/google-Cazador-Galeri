import { useState, useEffect, useRef } from 'react'
import { getAlbumCoverPhoto } from '../api/drive'

const CACHE_KEY = 'cazador_album_covers'
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 Hours

type CoverCache = Record<string, { url: string; timestamp: number }>

export function useAlbumCovers(albumIds: string[]) {
    const [covers, setCovers] = useState<Record<string, string>>({})
    const queueRef = useRef<string[]>([])
    const processingRef = useRef(false)

    // Load from local storage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(CACHE_KEY)
            if (raw) {
                const parsed: CoverCache = JSON.parse(raw)
                const now = Date.now()
                const valid: Record<string, string> = {}

                // Filter expired
                let hasExpired = false
                Object.entries(parsed).forEach(([id, entry]) => {
                    if (now - entry.timestamp < CACHE_TTL) {
                        valid[id] = entry.url
                    } else {
                        hasExpired = true
                    }
                })

                setCovers(valid)

                if (hasExpired) {
                    // Clean up storage
                    localStorage.setItem(CACHE_KEY, JSON.stringify(
                        Object.fromEntries(Object.entries(parsed).filter(([_, e]) => now - e.timestamp < CACHE_TTL))
                    ))
                }
            }
        } catch (e) {
            console.error('Cache load error', e)
        }
    }, [])

    // Process Queue
    const processQueue = async () => {
        if (processingRef.current || queueRef.current.length === 0) return
        processingRef.current = true

        // Take up to 6 items (Concurrency Limit)
        const batch = queueRef.current.splice(0, 6)

        try {
            await Promise.all(batch.map(async (albumId) => {
                // Double check cache in state (might have updated)
                if (covers[albumId]) return

                try {
                    const file = await getAlbumCoverPhoto(albumId)
                    if (file && file.thumbnailLink) {
                        const url = file.thumbnailLink

                        // Update State
                        setCovers(prev => {
                            const next = { ...prev, [albumId]: url }
                            // Persist to Storage
                            // Note: We read-modify-write here. For strict safety we'd use a better pattern but this is fine for UI cache.
                            const cacheEntry = { url, timestamp: Date.now() }
                            const currentStored = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
                            localStorage.setItem(CACHE_KEY, JSON.stringify({ ...currentStored, [albumId]: cacheEntry }))

                            return next
                        })
                    }
                } catch (e) {
                    console.warn(`Failed to fetch cover for ${albumId}`, e)
                }
            }))
        } finally {
            processingRef.current = false
            if (queueRef.current.length > 0) {
                // Schedule next batch
                setTimeout(processQueue, 100)
            }
        }
    }

    // Effect to add missing IDs to queue
    useEffect(() => {
        let hashChanged = false
        albumIds.forEach(id => {
            if (!covers[id] && !queueRef.current.includes(id)) {
                queueRef.current.push(id)
                hashChanged = true
            }
        })

        if (hashChanged) {
            processQueue()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [albumIds, covers]) // Re-run when albumIds change or covers update (to stop re-fetching)

    return covers
}
