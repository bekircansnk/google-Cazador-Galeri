import type { DriveFile } from '../api/drive'
import { GOOGLE_API_KEY } from '../config'

export function getDriveFallbackDownloadUrl(fileId: string) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
}

export function getDriveUserContentDownloadUrl(fileId: string) {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download`
}

export function getDriveUserContentViewUrl(fileId: string) {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=view`
}

export function getDriveApiDownloadUrl(fileId: string) {
  return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${GOOGLE_API_KEY}`
}

export function getDownloadUrl(file: DriveFile) {
  return file.webContentLink || getDriveFallbackDownloadUrl(file.id)
}

export function getDriveFilePreviewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`
}

export function getDriveFolderUrl(folderId: string) {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`
}

export function triggerDownload(url: string, filename?: string) {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noreferrer'
  if (filename) a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function downloadMany(
  files: DriveFile[],
  opts?: { delayMs?: number; onProgress?: (done: number, total: number) => void },
) {
  const delayMs = opts?.delayMs ?? 450
  const total = files.length

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const url = getDownloadUrl(file)
    triggerDownload(url, file.name)
    opts?.onProgress?.(i + 1, total)
    if (i < files.length - 1) await new Promise((r) => window.setTimeout(r, delayMs))
  }
}

function sanitizeZipEntryName(name: string) {
  const safe = name
    .replaceAll('\\', '_')
    .replaceAll('/', '_')
    .replaceAll('\u0000', '')
    .trim()
  return safe || 'dosya'
}

function ensureUniqueName(name: string, seen: Map<string, number>) {
  const clean = sanitizeZipEntryName(name)
  const count = seen.get(clean) ?? 0
  if (count === 0) {
    seen.set(clean, 1)
    return clean
  }

  const dot = clean.lastIndexOf('.')
  const hasExt = dot > 0 && dot < clean.length - 1
  const base = hasExt ? clean.slice(0, dot) : clean
  const ext = hasExt ? clean.slice(dot) : ''

  const next = `${base} (${count + 1})${ext}`
  seen.set(clean, count + 1)
  return next
}

export async function downloadZip(
  files: DriveFile[],
  opts?: {
    filename?: string
    signal?: AbortSignal
    onFileProgress?: (done: number, total: number) => void
    onZipProgress?: (percent: number) => void
  },
) {
  const total = files.length
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const seenNames = new Map<string, number>()

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const url = getDriveApiDownloadUrl(file.id)
    const res = await fetch(url, { signal: opts?.signal, referrerPolicy: 'no-referrer' })
    if (!res.ok) throw new Error(`${file.name} indirilemedi (${res.status})`)
    const buf = await res.arrayBuffer()
    zip.file(ensureUniqueName(file.name, seenNames), buf)
    opts?.onFileProgress?.(i + 1, total)
  }

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (meta) => opts?.onZipProgress?.(meta.percent),
  )

  const zipName = opts?.filename || 'cazador-galeri.zip'
  const objectUrl = URL.createObjectURL(blob)
  triggerDownload(objectUrl, zipName)
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
}

export function downloadLinksTxt(files: DriveFile[], filename = 'cazador-download-links.txt') {
  const lines = files.map((f) => `${f.name}\t${getDownloadUrl(f)}`)
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  URL.revokeObjectURL(url)
}
