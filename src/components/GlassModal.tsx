import type { ReactNode } from 'react'
import { useEffect } from 'react'

function IconX() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 6 18 18M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function GlassModal(props: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const { onClose, open, title } = props

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label={title} onMouseDown={onClose}>
      <div className="glass modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h2 className="modalTitle">{title}</h2>
          <button type="button" className="iconChip" onClick={onClose} aria-label="Kapat">
            <IconX />
          </button>
        </div>
        <div className="modalBody">{props.children}</div>
      </div>
    </div>
  )
}
