import { useMutation, useQuery } from '@apollo/client/react'
import Icon from './Icon'
import Price from './Price'
import { formatRelativeDate } from '../lib/format'
import { LISTING_OFFERS_QUERY, RESPOND_TO_OFFER_MUTATION, type RemoteOffer } from '../graphql/offers'

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-surface-container-high text-on-surface' },
  ACCEPTED: { label: 'Acceptée', cls: 'bg-tertiary-soft text-tertiary' },
  REJECTED: { label: 'Refusée', cls: 'bg-primary-fixed text-primary' },
  EXPIRED: { label: 'Expirée', cls: 'bg-surface-container text-on-surface-variant' },
}

// Offers received on one listing ("Mes annonces" → Offres), loaded only
// when the seller opens the panel — avoids an N+1 burst on the list.
export default function ListingOffersPanel({ listingId }: { listingId: string }) {
  const { data, loading, refetch } = useQuery<{ listingOffers: RemoteOffer[] }>(LISTING_OFFERS_QUERY, { variables: { listingId } })
  const [respondToOffer, { loading: responding }] = useMutation(RESPOND_TO_OFFER_MUTATION)
  const offers = data?.listingOffers ?? []
  const respond = (offerId: string, accept: boolean) => void respondToOffer({ variables: { offerId, accept } }).then(() => refetch())

  if (loading) return <p className="m-0 px-4 py-3 text-body-sm text-on-surface-variant">Chargement…</p>
  if (offers.length === 0) return <p className="m-0 flex items-center gap-2 px-4 py-3 text-body-sm text-on-surface-variant"><Icon name="sell" size={17} /> Aucune offre pour l'instant.</p>

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {offers.map(o => (
        <div key={o.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-label-md text-primary">
            {o.buyer.avatarUrl ? <img src={o.buyer.avatarUrl} alt="" className="h-full w-full object-cover" /> : o.buyer.fullName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-[120px] flex-1">
            <div className="text-label-md text-on-surface">{o.buyer.fullName}</div>
            <div className="flex items-center gap-2"><span className="text-label-lg font-extrabold text-primary"><Price amount={o.amount} /></span>{o.createdAt && <span className="text-label-sm text-on-surface-variant">{formatRelativeDate(o.createdAt)}</span>}</div>
          </div>
          {o.status === 'PENDING' ? (
            <div className="flex gap-2">
              <button disabled={responding} onClick={() => respond(o.id, true)} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-tertiary px-3 py-1.5 text-label-md text-white disabled:opacity-60"><Icon name="check" size={16} /> Accepter</button>
              <button disabled={responding} onClick={() => respond(o.id, false)} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-surface-container-high px-3 py-1.5 text-label-md text-on-surface disabled:opacity-60"><Icon name="close" size={16} /> Refuser</button>
            </div>
          ) : (
            <span className={`rounded-full px-2.5 py-1 text-label-sm ${STATUS[o.status]?.cls ?? ''}`}>{STATUS[o.status]?.label ?? o.status}</span>
          )}
        </div>
      ))}
    </div>
  )
}
