import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import PaymentSheet from './PaymentSheet'
import Price from './Price'
import { BOOST_PACKS_QUERY, type BoostPackInfo } from '../graphql/promotions'

type BoostMenuProps = {
  listingId: string
  onDone: () => void
  // 'dropdown' floats under a trigger button; 'inline' sits in the flow.
  variant?: 'dropdown' | 'inline'
}

// Quick picker over the backend's boost packs; the chosen pack is paid by
// Mobile Money (PaymentSheet) and activated once the payment is confirmed.
export default function BoostMenu({ listingId, onDone, variant = 'dropdown' }: BoostMenuProps) {
  const { data } = useQuery<{ boostPacks: BoostPackInfo[] }>(BOOST_PACKS_QUERY)
  const [picked, setPicked] = useState<BoostPackInfo | null>(null)

  return (
    <div className={variant === 'dropdown'
      ? 'absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-outline-variant bg-surface-lowest p-1.5 shadow-float'
      : 'rounded-xl border border-outline-variant p-1.5'}>
      {(data?.boostPacks ?? []).map(p => (
        <button key={p.pack} onClick={() => setPicked(p)} className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-label-md text-on-surface hover:bg-surface-container-low disabled:opacity-60">
          <span className="truncate">{p.label}</span>
          <span className="shrink-0 text-primary"><Price amount={p.price} /></span>
        </button>
      ))}
      <PaymentSheet
        open={!!picked}
        title="Payer le boost"
        amount={picked?.price ?? 0}
        request={picked ? { kind: 'BOOST_PACK', product: picked.pack, listingId } : null}
        onClose={() => setPicked(null)}
        onPaid={onDone}
      >
        {picked && <p className="m-0 rounded-xl bg-surface-container-low p-4 text-body-md text-on-surface-variant"><b className="text-on-surface">{picked.label}</b> pour <b className="text-primary"><Price amount={picked.price} /></b>. La mise en avant démarre dès la confirmation du paiement.</p>}
      </PaymentSheet>
    </div>
  )
}
