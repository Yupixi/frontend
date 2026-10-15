import BottomSheet from './BottomSheet'
import Icon from './Icon'
import { EXIT_REASONS, type ListingExitReason } from '../graphql/deals'

// Why a listing goes offline (« Mettre en pause », « Supprimer »): one tap.
// « Vendu sur Dilchap » leads to « Vendu à qui ? » instead.
export default function ExitReasonSheet({ open, action, title, busy, error, onPick, onClose }: {
  open: boolean
  action: 'pause' | 'delete'
  title: string
  busy?: boolean
  error?: string | null
  onPick: (reason: ListingExitReason) => void
  onClose: () => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={action === 'pause' ? 'Mettre en pause' : 'Supprimer l’annonce'} maxWidth="480px">
      <div className="flex flex-col gap-3">
        <p className="m-0 text-body-md text-on-surface-variant">
          « <b className="text-on-surface">{title}</b> » {action === 'pause' ? 'sort de la recherche ; vous pourrez la remettre en ligne.' : 'sera supprimée définitivement.'} Pourquoi ?
        </p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Raison">
          {EXIT_REASONS.map(r => (
            <button key={r.key} type="button" disabled={busy} onClick={() => onPick(r.key)}
              className={`flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-none px-2 py-3 text-center text-label-md disabled:opacity-60 ${r.key === 'SOLD_ON_DILCHAP' ? 'bg-primary-fixed/50 text-on-surface hover:bg-primary-fixed' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
              <Icon name={r.icon} size={22} className={r.key === 'SOLD_ON_DILCHAP' ? 'text-primary' : 'text-on-surface-variant'} />
              {r.label}
            </button>
          ))}
        </div>
        {action === 'delete' && <p className="m-0 text-body-sm text-on-surface-variant">Une annonce avec une vente conclue ou un litige ne peut pas être supprimée.</p>}
        {error && <p role="alert" className="m-0 text-body-sm text-primary">{error}</p>}
      </div>
    </BottomSheet>
  )
}
