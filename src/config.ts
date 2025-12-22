export const APP_NAME = 'KATALOG'

export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY ?? ''
export const ROOT_FOLDER_ID = import.meta.env.VITE_ROOT_FOLDER_ID ?? ''

if (!GOOGLE_API_KEY) {
    console.error("❌ Google Drive API Key ENV'den okunamadı (VITE_GOOGLE_API_KEY)")
}

export const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL ?? ''
