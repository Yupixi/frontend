import { useEffect, useRef } from 'react'
import Icon from './Icon'

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxHeight?: string
  // Desktop width of the sheet (full width on phones).
  maxWidth?: string
  // Pinned under the scrolling content (e.g. "Afficher les N annonces").
  footer?: React.ReactNode
}

export default function BottomSheet({ open, onClose, title, children, maxHeight = '85vh', maxWidth = '640px', footer }: BottomSheetProps) {
  const closedByBackRef = useRef(false)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    closedByBackRef.current = false

    // Push a history marker so the system/browser back button closes the sheet first
    window.history.pushState({ __yupixiSheetMarker: true }, '')
    window.dispatchEvent(new CustomEvent('yupixi:sheet-open'))

    const onPop = () => {
      closedByBackRef.current = true
      onCloseRef.current()
    }
    window.addEventListener('popstate', onPop)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      window.dispatchEvent(new CustomEvent('yupixi:sheet-close'))
      // Closed via X/backdrop/Escape → remove the history marker so back stays clean
      if (!closedByBackRef.current) {
        const st = window.history.state
        if (st && st.__yupixiSheetMarker) {
          window.history.back()
        }
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9990] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/45 animate-[fadeIn_0.2s_ease-out]" onClick={() => onCloseRef.current()} />
      <div
        className="relative flex w-full flex-col rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom)] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]"
        style={{ maxHeight, maxWidth }}
      >
        <div className="flex justify-center pb-0.5 pt-2.5"><span className="h-1 w-10 rounded-full bg-outline-variant" /></div>
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 pt-2.5">
            <h3 className="m-0 text-headline-sm text-on-surface">{title}</h3>
            <button onClick={() => onCloseRef.current()} aria-label="Fermer" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container-high text-on-surface-variant">
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-1">{children}</div>
        {footer}
      </div>
    </div>
  )
}
