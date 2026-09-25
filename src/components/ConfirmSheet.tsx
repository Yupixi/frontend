import BottomSheet from './BottomSheet'

type ConfirmSheetProps = {
  open: boolean
  title: string
  children: React.ReactNode
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  loading?: boolean
  // Destructive actions (delete) get the neutral/danger styling.
  tone?: 'primary' | 'danger'
}

// Confirmation step for actions that spend money or can't be undone —
// replaces one-tap activation and the browser's native confirm() dialog.
export default function ConfirmSheet({ open, title, children, confirmLabel, onConfirm, onClose, loading, tone = 'primary' }: ConfirmSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
          <button onClick={onClose} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">Annuler</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`h-12 flex-[1.4] cursor-pointer rounded-xl border-none text-label-lg text-white disabled:opacity-60 ${tone === 'danger' ? 'bg-on-surface' : 'bg-primary'}`}
          >
            {loading ? 'Un instant…' : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-body-md text-on-surface-variant">{children}</div>
    </BottomSheet>
  )
}
