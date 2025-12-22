import { GOOGLE_API_KEY } from '../config'

export type DriveFile = {
  id: string
  name: string
  mimeType?: string
  thumbnailLink?: string
  iconLink?: string
  webViewLink?: string
  webContentLink?: string
  modifiedTime?: string
  createdTime?: string
  size?: string
  imageMediaMetadata?: {
    width?: number
    height?: number
  }
}

type DriveFilesListResponse = {
  files: DriveFile[]
  nextPageToken?: string
}

type DriveErrorPayload = {
  error?: {
    code?: number
    message?: string
    errors?: Array<{
      domain?: string
      reason?: string
      message?: string
    }>
  }
}

export class DriveApiError extends Error {
  status?: number
  reason?: string

  constructor(message: string, opts?: { status?: number; reason?: string }) {
    super(message)
    this.name = 'DriveApiError'
    this.status = opts?.status
    this.reason = opts?.reason
  }
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'

const DEFAULT_FILE_FIELDS =
  'files(id,name,mimeType,thumbnailLink,iconLink,webViewLink,webContentLink,modifiedTime,createdTime,size,imageMediaMetadata),nextPageToken'

function buildUrl(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${DRIVE_API_BASE}${path}`)
  url.searchParams.set('key', GOOGLE_API_KEY)
  url.searchParams.set('supportsAllDrives', 'true')
  url.searchParams.set('includeItemsFromAllDrives', 'true')
  url.searchParams.set('spaces', 'drive')

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

async function parseJsonSafely(res: Response) {
  try {
    return (await res.json()) as unknown
  } catch {
    return undefined
  }
}

export function getFriendlyDriveError(err: unknown) {
  if (err instanceof DriveApiError) {
    const status = err.status
    const reason = err.reason

    if (status === 403) {
      if (
        reason === 'dailyLimitExceeded' ||
        reason === 'userRateLimitExceeded' ||
        reason === 'rateLimitExceeded'
      ) {
        return {
          title: 'API kotası doldu',
          message:
            'Google Drive API kotası aşıldı (403). Biraz sonra tekrar deneyin veya daha sonra yeniden yükleyin.',
        }
      }

      return {
        title: 'Erişim reddedildi',
        message:
          'Google Drive API erişimi reddedildi (403). Klasör/link “Herkes görüntüleyebilir” mi, API Key referrer restriction doğru mu?',
      }
    }

    if (status === 404) {
      return {
        title: 'Bulunamadı',
        message:
          'Drive klasörü/öğe bulunamadı (404). Folder ID doğru mu ve paylaşım ayarları açık mı?',
      }
    }

    if (status === 400) {
      return {
        title: 'Geçersiz istek',
        message:
          'Drive API isteği hatalı görünüyor (400). Folder ID ve istek parametrelerini kontrol edin.',
      }
    }

    return {
      title: 'Drive API hatası',
      message: err.message,
    }
  }

  if (err instanceof Error) {
    return { title: 'Hata', message: err.message }
  }

  return { title: 'Hata', message: 'Beklenmeyen bir hata oluştu.' }
}

async function fetchWithRetry(url: string, opts?: { signal?: AbortSignal }, retries = 3, delay = 1000): Promise<Response> {
  try {
    const res = await fetch(url, { signal: opts?.signal })
    if (res.ok) return res

    // 429 = Too Many Requests, 5xx = Server Error
    if (retries > 0 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, delay))
      return fetchWithRetry(url, opts, retries - 1, delay * 2)
    }

    return res
  } catch (err) {
    if (retries > 0 && err instanceof TypeError && err.message === 'Failed to fetch') {
      // Network error, maybe transient
      await new Promise((r) => setTimeout(r, delay))
      return fetchWithRetry(url, opts, retries - 1, delay * 2)
    }
    throw err
  }
}

async function driveGetJson<T>(url: string, opts?: { signal?: AbortSignal }) {
  const res = await fetchWithRetry(url, { signal: opts?.signal })

  if (res.ok) {
    return (await res.json()) as T
  }

  const payload = (await parseJsonSafely(res)) as DriveErrorPayload | undefined
  const reason = payload?.error?.errors?.[0]?.reason
  const message = payload?.error?.message || `Drive API hatası (${res.status})`

  throw new DriveApiError(message, { status: res.status, reason })
}

export async function filesList(params: {
  q: string
  fields?: string
  orderBy?: string
  pageSize?: number
  pageToken?: string
  signal?: AbortSignal
}): Promise<DriveFilesListResponse> {
  const url = buildUrl('/files', {
    q: params.q,
    fields: params.fields ?? DEFAULT_FILE_FIELDS,
    orderBy: params.orderBy,
    pageSize: params.pageSize ?? 200,
    pageToken: params.pageToken,
  })

  return await driveGetJson<DriveFilesListResponse>(url, { signal: params.signal })
}

export async function listAllFiles(params: {
  q: string
  fields?: string
  orderBy?: string
  pageSize?: number
  signal?: AbortSignal
}): Promise<DriveFile[]> {
  const all: DriveFile[] = []
  let pageToken: string | undefined = undefined
  let pageCount = 0

  // Maximize page size for efficiency (Drive API generic max is usually 1000)
  const pageSize = params.pageSize ?? 1000

  // console.debug(`[Drive] listAllFiles starting. q=${params.q}, pageSize=${pageSize}`)

  while (true) {
    pageCount++
    if (params.signal?.aborted) {
      console.debug('[Drive] aborted')
      throw new DOMException('Aborted', 'AbortError')
    }

    // console.debug(`[Drive] Fetching page ${pageCount}, token: ${pageToken ? 'yes' : 'no'}...`)

    const res = await filesList({
      ...params,
      pageSize,
      pageToken
    })

    const files = res.files ?? []
    all.push(...files)

    // console.debug(`[Drive] Page ${pageCount} done. Got ${files.length} items. NextToken: ${!!res.nextPageToken}`)

    if (!res.nextPageToken) break
    pageToken = res.nextPageToken
  }

  console.debug(`[Drive] listAllFiles finished. Total: ${all.length} items from ${pageCount} pages.`)
  return all
}

export async function getFile(params: {
  fileId: string
  fields: string
  signal?: AbortSignal
}): Promise<DriveFile> {
  const url = buildUrl(`/files/${params.fileId}`, { fields: params.fields })
  return await driveGetJson<DriveFile>(url, { signal: params.signal })
}

export async function listAlbums(rootFolderId: string, opts?: { signal?: AbortSignal }) {
  const q = `'${rootFolderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`
  return await listAllFiles({
    q,
    orderBy: 'name',
    fields: 'files(id,name,mimeType,webViewLink,modifiedTime,createdTime),nextPageToken',
    pageSize: 200,
    signal: opts?.signal,
  })
}

export async function listAlbumImages(albumId: string, opts?: { signal?: AbortSignal }) {
  const q = `'${albumId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder')`
  return await listAllFiles({
    q,
    orderBy: 'name',
    fields: DEFAULT_FILE_FIELDS,
    pageSize: 1000,
    signal: opts?.signal,
  })
}

export async function getLatestModifiedTimeInFolder(folderId: string, opts?: { signal?: AbortSignal }) {
  const q = `'${folderId}' in parents and trashed=false`
  const res = await filesList({
    q,
    orderBy: 'modifiedTime desc',
    pageSize: 1,
    fields: 'files(modifiedTime),nextPageToken',
    signal: opts?.signal,
  })

  return res.files?.[0]?.modifiedTime ?? null
}

export async function getAlbumCoverPhoto(folderId: string, opts?: { signal?: AbortSignal }) {
  // Query: Inside folder, is image, not trashed
  const q = `'${folderId}' in parents and (mimeType contains 'image/') and trashed=false`

  // Sort by createdTime desc (Newest first)
  // Fetch only 1 item
  // Fields: Just enough for thumbnail
  const res = await filesList({
    q,
    orderBy: 'createdTime desc',
    pageSize: 1,
    fields: 'files(id, thumbnailLink, webViewLink),nextPageToken',
    signal: opts?.signal
  })

  // Return the first file or null
  return res.files?.[0] ?? null
}
