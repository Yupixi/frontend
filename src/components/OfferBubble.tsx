import Icon from './Icon'
import Price from './Price'
import PriceSuggestionHint from './PriceSuggestionHint'
import type { RemoteMessageOffer } from '../graphql/messaging'

type OfferBubbleProps = {
  offer: RemoteMessageOffer
  currency: string
  isMine: boolean
  canRespond: boolean
  responding: boolean
  onAccept: () => void
  onReject: () => void
  listingId?: string | null
}

const STATUS: Record<RemoteMessageOffer['status'], { label: string; cls: string; icon: string }> = {
  PENDING: { label: 'En attente de réponse', cls: 'text-on-surface-variant', icon: 'hourglass_top' },
  ACCEPTED: { label: 'Offre acceptée', cls: 'text-tertiary', icon: 'check_circle' },
  REJECTED: { label: 'Offre refusée', cls: 'text-primary', icon: 'cancel' },
  EXPIRED: { label: 'Offre expirée', cls: 'text-on-surface-variant', icon: 'schedule' },
}

// Price offer card inside a chat thread.
export default function OfferBubble({ offer, currency, isMine, canRespond, responding, onAccept, onReject, listingId }: OfferBubbleProps) {
  const status = STATUS[offer.status]
  const pending = offer.status === 'PENDING'
  return (
    <div className={`min-w-[210px] rounded-2xl border border-outline-variant p-3 ${isMine ? 'bg-surface-lowest' : 'bg-surface-container-low'}`}>
      <div className="flex items-center gap-1.5 text-label-sm uppercase text-on-surface-variant"><Icon name="sell" size={15} className="text-primary" /> Offre de prix</div>
      <div className="mt-1 text-headline-sm font-extrabold text-on-surface"><Price amount={offer.amount} currency={currency} /></div>
      <div className={`mt-1 flex items-center gap-1 text-label-sm ${status.cls}`}><Icon name={status.icon} size={14} /> {status.label}</div>
      {canRespond && pending && (
        <>
          <div className="mt-2"><PriceSuggestionHint listingId={listingId} /></div>
          <div className="flex gap-2">
            <button disabled={responding} onClick={onAccept} className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border-none bg-tertiary py-2 text-label-md text-white disabled:opacity-60"><Icon name="check" size={16} /> Accepter</button>
            <button disabled={responding} onClick={onReject} className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border-none bg-surface-container-high py-2 text-label-md text-on-surface disabled:opacity-60"><Icon name="close" size={16} /> Refuser</button>
          </div>
        </>
      )}
    </div>
  )
}
