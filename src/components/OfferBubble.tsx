import { Check, Tag, X as XIcon } from 'lucide-react'
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

const STATUS_LABEL: Record<RemoteMessageOffer['status'], string> = {
  PENDING: 'En attente de réponse',
  ACCEPTED: 'Offre acceptée',
  REJECTED: 'Offre refusée',
  EXPIRED: 'Offre expirée',
}

const STATUS_COLOR: Record<RemoteMessageOffer['status'], string> = {
  PENDING: 'var(--fg-muted)',
  ACCEPTED: '#10B981',
  REJECTED: 'var(--primary)',
  EXPIRED: 'var(--fg-subtle)',
}

export default function OfferBubble({ offer, currency, isMine, canRespond, responding, onAccept, onReject, listingId }: OfferBubbleProps) {
  const showSuggestion = canRespond && offer.status === 'PENDING'
  return (
    <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 0.9rem', minWidth: 200, background: isMine ? 'var(--bg-card)' : 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, color: 'var(--fg-muted)', marginBottom: 4 }}>
        <Tag size={13} /> Offre
      </div>
      <div style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, fontSize: '1.1rem' }}>
        <Price amount={offer.amount} currency={currency} />
      </div>
      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: STATUS_COLOR[offer.status], marginTop: 4 }}>
        {STATUS_LABEL[offer.status]}
      </div>
      {showSuggestion && (
        <div style={{ marginTop: 6 }}>
          <PriceSuggestionHint listingId={listingId} />
        </div>
      )}
      {canRespond && offer.status === 'PENDING' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button className="btn-primary" disabled={responding} onClick={onAccept} style={{ flex: 1, padding: '0.4rem', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#10B981', borderColor: '#10B981' }}>
            <Check size={13} /> Accepter
          </button>
          <button className="btn-outline" disabled={responding} onClick={onReject} style={{ flex: 1, padding: '0.4rem', fontSize: '0.76rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <XIcon size={13} /> Refuser
          </button>
        </div>
      )}
    </div>
  )
}
