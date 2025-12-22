import type { DriveFile } from '../api/drive'

/**
 * Modern Share Logic:
 * 1. Checks if navigator.share and file sharing is supported.
 * 2. Fetches the image as a blob.
 * 3. Shares via navigator.share.
 * 4. Fallback: Copies link to clipboard.
 */

// Helper to deduce mime type from name if needed, though usually blob has it
function getMimeType(name: string) {
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
    if (ext === 'png') return 'image/png'
    if (ext === 'webp') return 'image/webp'
    return 'image/jpeg' // default
}

export async function shareFile(file: DriveFile | { name: string, webViewLink: string, thumbnailLink?: string }) {
    // Check if we can share files
    if (navigator.canShare && navigator.canShare({ files: [new File([], 't.png')] })) {
        // Attempt to fetch blob
        try {
            // Use a proxy or hope for CORS? 
            // Drive images might have CORS issues if fetched directly from client without proxy.
            // BUT, user's request explicitly asks for "Fetch image -> Blob".
            // We'll try fetching the high-res thumbnail or download URL.
            // Usually thumbnailLink (sized) is more reliable for CORS than webViewLink.

            const fetchUrl = (file as any).thumbnailLink
                ? (file as any).thumbnailLink.replace(/=s\d+/, '=s1600') // High res
                : file.webViewLink

            // If it's a Drive 'view' link, it might be HTML. We need direct image.
            // If we have an API key, we should use the API download link ideally?
            // Only if we have the file token. 
            // Let's assume standard fetch works or fallback.

            if (fetchUrl) {
                const resp = await fetch(fetchUrl)
                const blob = await resp.blob()
                const mime = getMimeType(file.name)
                const fileObj = new File([blob], file.name, { type: mime })

                if (navigator.canShare({ files: [fileObj] })) {
                    await navigator.share({
                        files: [fileObj],
                        title: file.name,
                        text: 'Bu fotoğrafı seninle paylaşıyorum.'
                    })
                    return true // specific success
                }
            }
        } catch (e) {
            console.warn("File sharing failed, falling back to link", e)
        }
    }

    // Fallback
    const fallbackUrl = file.webViewLink || ''
    if (navigator.share && fallbackUrl) {
        await navigator.share({
            title: file.name,
            url: fallbackUrl
        })
    } else if (fallbackUrl) {
        await navigator.clipboard.writeText(fallbackUrl)
        return 'clipboard'
    }
}

export async function shareMultipleFiles(files: DriveFile[]) {
    // Collect Blobs
    const fileObjs: File[] = []

    for (const f of files) {
        try {
            const fetchUrl = f.thumbnailLink
                ? f.thumbnailLink.replace(/=s\d+/, '=s1600')
                : f.webViewLink

            if (fetchUrl) {
                const resp = await fetch(fetchUrl)
                const blob = await resp.blob()
                const mime = getMimeType(f.name)
                fileObjs.push(new File([blob], f.name, { type: mime }))
            }
        } catch (e) {
            console.warn("Failed to fetch one selection", e)
        }
    }

    if (fileObjs.length > 0 && navigator.canShare && navigator.canShare({ files: fileObjs })) {
        await navigator.share({
            files: fileObjs,
            title: `${fileObjs.length} Fotoğraf`,
            text: 'Cazador Galeri\'den fotoğraflar'
        })
    } else {
        // Fallback: Copy all links
        const links = files.map(f => f.webViewLink).join('\n')
        await navigator.clipboard.writeText(links)
        return 'clipboard'
    }
}
