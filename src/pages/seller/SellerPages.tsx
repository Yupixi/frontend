import { useMutation, useQuery } from '@apollo/client/react'
import {
  X,
  Check,
} from '../../components/icons'
import Price from '../../components/Price'
import { LISTING_OFFERS_QUERY, RESPOND_TO_OFFER_MUTATION, type RemoteOffer } from '../../graphql/offers'

// ─── POST LISTING ────────────────────────────────────────────────────────────
export { default as PostListing } from './PostListing'


// front — avoids an N+1 burst of queries when the list first renders.
export function ListingOffersPanel({ listingId }: { listingId: string }) {
  const { data, loading, refetch } = useQuery<{ listingOffers: RemoteOffer[] }>(LISTING_OFFERS_QUERY, {
    variables: { listingId },
  })
  const [respondToOffer, { loading: responding }] = useMutation(RESPOND_TO_OFFER_MUTATION)
  const offers = data?.listingOffers ?? []

  const respond = (offerId: string, accept: boolean) =>
    void respondToOffer({ variables: { offerId, accept } }).then(() => refetch())

  if (loading) return <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Chargement...</div>
  if (offers.length === 0) return <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Aucune offre pour l'instant.</div>

  const statusLabel: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'En attente', color: 'var(--fg-muted)' },
    ACCEPTED: { label: 'Acceptée', color: '#10B981' },
    REJECTED: { label: 'Refusée', color: '#EF4444' },
    EXPIRED: { label: 'Expirée', color: 'var(--fg-subtle)' },
  }

  return (
    <div style={{ padding: '0.5rem 1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {offers.map(o => (
        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.75rem', background: 'var(--border-subtle)', borderRadius: 8, flexWrap: 'wrap' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', fontWeight: 800, color: 'var(--fg-muted)' }}>
            {o.buyer.avatarUrl ? <img src={o.buyer.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : o.buyer.fullName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{o.buyer.fullName}</div>
            <div className="price-tag" style={{ fontSize: '0.85rem' }}><Price amount={o.amount} /></div>
          </div>
          {o.status === 'PENDING' ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={responding} onClick={() => respond(o.id, true)} style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                <Check size={13} /> Accepter
              </button>
              <button disabled={responding} onClick={() => respond(o.id, false)} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                <X size={13} /> Refuser
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: statusLabel[o.status]?.color }}>{statusLabel[o.status]?.label}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export { default as SellerListings } from './MyListings'


export { default as SellerPremium } from './Booster'
