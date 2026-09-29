import Credits from './Credits'
import { offerLabel, useOfferPrice, type OfferOperation } from '../lib/priceOffers'

// A price in credits with the member's live offer applied: the usual price
// struck through, the offer price, and « Offert » / « −30 % ».
export default function OfferCredits({ op, n, categoryId, listingId, unit = true, tag = true }: {
  op: OfferOperation
  n: number | null | undefined
  categoryId?: string | null
  listingId?: string | null
  unit?: boolean
  // Show the « Offert » / « −30 % » pill.
  tag?: boolean
}) {
  const q = useOfferPrice(op, n, categoryId, listingId)
  if (!q || !q.percent) return <Credits n={n} unit={unit} />
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <s className="font-normal opacity-60"><Credits n={q.base} unit={false} /></s>
      {q.price === 0 ? <span>Gratuit</span> : <Credits n={q.price} unit={unit} />}
      {tag && <span className="whitespace-nowrap rounded-full bg-tertiary-soft px-1.5 text-label-sm font-semibold text-tertiary">{offerLabel(q.percent)}</span>}
    </span>
  )
}
