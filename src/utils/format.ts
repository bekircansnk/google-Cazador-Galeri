export function formatBytes(bytes: number | string | undefined, decimals = 1): string {
    if (!bytes) return ''
    const b = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
    if (isNaN(b) || b === 0) return '0 B'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

    const i = Math.floor(Math.log(b) / Math.log(k))

    return `${parseFloat((b / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function formatDate(isoString?: string): string {
    if (!isoString) return ''
    try {
        const date = new Date(isoString)
        return new Intl.DateTimeFormat('tr-TR', {
            day: 'numeric',
            month: 'short',
            // year: 'numeric' // User said "19 Kas" or "19.11.2025". Let's try 19 Kas first as it matches "short".
        }).format(date)
    } catch (e) {
        return ''
    }
}
