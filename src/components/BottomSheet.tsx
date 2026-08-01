import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxHeight?: string
}

export default function BottomSheet({ open, onClose, title, children, maxHeight = '85vh' }: BottomSheetProps) {
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', animation: 'fadeIn 0.2s ease-out' }} onClick={() => onCloseRef.current()} />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 640,
        maxHeight,
        background: 'var(--bg)',
        borderRadius: '20px 20px 0 0',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ padding: '10px 0 2px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border)' }} />
        </div>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px' }}>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: 0, fontSize: '1.05rem' }}>{title}</h3>
            <button
              onClick={() => onCloseRef.current()}
              aria-label="Fermer"
              style={{ background: 'var(--border-subtle)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--fg-muted)' }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div style={{ overflowY: 'auto', padding: '4px 16px 20px', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
