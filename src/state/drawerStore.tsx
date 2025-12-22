import { createContext, useContext, useState, useMemo, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { DriveFile } from '../api/drive'

interface DrawerState {
    isOpen: boolean
    fileQueue: DriveFile[]
}

interface DrawerContextType extends DrawerState {
    setIsOpen: (open: boolean) => void
    addToQueue: (items: DriveFile[]) => void
    removeFromQueue: (fileId: string) => void
    clearQueue: () => void
}

const DrawerContext = createContext<DrawerContextType | null>(null)

export function DrawerProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [fileQueue, setFileQueue] = useState<DriveFile[]>([])

    const addToQueue = useCallback((items: DriveFile[]) => {
        setFileQueue(prev => {
            const next = [...prev]
            items.forEach(item => {
                if (!next.find(x => x.id === item.id)) {
                    next.push(item)
                }
            })
            return next
        })
    }, [])

    const removeFromQueue = useCallback((fileId: string) => {
        setFileQueue(prev => prev.filter(x => x.id !== fileId))
    }, [])

    const clearQueue = useCallback(() => {
        setFileQueue([])
    }, [])

    const value = useMemo(() => ({
        isOpen,
        fileQueue,
        setIsOpen,
        addToQueue,
        removeFromQueue,
        clearQueue
    }), [isOpen, fileQueue, addToQueue, removeFromQueue, clearQueue])

    return (
        <DrawerContext.Provider value={value}>
            {children}
        </DrawerContext.Provider>
    )
}

export function useDrawer() {
    const context = useContext(DrawerContext)
    if (!context) {
        throw new Error('useDrawer must be used within a DrawerProvider')
    }
    return context
}
