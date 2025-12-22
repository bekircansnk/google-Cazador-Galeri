
import React, { createContext, useContext, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface Toast {
    id: string
    message: string
    type: 'info' | 'success' | 'error'
    duration?: number
}

interface ToastContextValue {
    showToast: (msg: string, type?: 'info' | 'success' | 'error', duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used within ToastProvider')
    return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9)
        setToasts((prev) => [...prev, { id, message, type, duration }])

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id)
            }, duration)
        }
    }, [removeToast])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {createPortal(
                <div className="toast-container" style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    zIndex: 9999,
                    pointerEvents: 'none'
                }}>
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`toast toast-${toast.type}`}
                            style={{
                                background: 'rgba(255, 255, 255, 0.85)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                padding: '12px 20px',
                                borderRadius: 16,
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                                color: '#333',
                                fontSize: 14,
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                pointerEvents: 'auto',
                                animation: 'slideIn 0.3s ease-out'
                            }}
                        >
                            {toast.type === 'error' && <span style={{ color: '#ef4444' }}>⚠️</span>}
                            {toast.type === 'success' && <span style={{ color: '#10b981' }}>✓</span>}
                            {toast.message}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}
