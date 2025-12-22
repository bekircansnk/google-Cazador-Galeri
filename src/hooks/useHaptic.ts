import { useCallback } from 'react'

export const useHaptic = () => {
    // Vibrate helper
    const vibrate = useCallback((pattern: number | number[]) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(pattern)
        }
    }, [])

    return {
        vibrate,
        // Preset patterns
        triggerClick: () => vibrate(5), // Very light click
        triggerSelection: () => vibrate(10),
        triggerFolderOpen: () => vibrate(15), // Solid thud
        triggerRefresh: () => vibrate(50), // Longer buzz
        triggerScrollTop: () => vibrate(20), // Medium
        triggerSuccess: () => vibrate([10, 30, 10]),
        triggerError: () => vibrate([50, 30, 50])
    }
}
