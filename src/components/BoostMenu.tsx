import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import ConfirmSheet from './ConfirmSheet'
import Price from './Price'
import { BOOST_PACKS_QUERY, CREATE_BOOST_MUTATION, type BoostPackInfo } from '../graphql/promotions'

type BoostMenuProps = {
  listingId: string
  onDone: () => void
  // 'dropdown' floats under a trigger button; 'inline' sits in the flow.
  variant?: 'dropdown' | 'inline'
}

// Quick picker over the backend's boost packs. No payment step yet (Mobile
// Money deferred) — choosing a pack activates it immediately.
export default function BoostMenu({ listingId, onDone, variant = 'dropdown' }: BoostMenuProps) {
  const { data } = useQuery<{ boostPacks: BoostPackInfo[] }>(BOOST_PACKS_QUERY)
  const [createBoost, { loading }] = useMutation(CREATE_BOOST_MUTATION)
  const [picked, setPicked] = useState<BoostPackInfo | null>(null)
  // Confirm before spending — picking a pack used to activate it on the spot.
  const confirm = () => picked && void createBoost({ variables: { input: { listingId, pack: picked.pack } } }).then(() => { setPicked(null); onDone() })

  return (
    <div className={variant === 'dropdown'
      ? 'absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-outline-variant bg-surface-lowest p-1.5 shadow-float'
      : 'rounded-xl border border-outline-variant p-1.5'}>
      {(data?.boostPacks ?? []).map(p => (
        <button key={p.pack} disabled={loading} onClick={() => setPicked(p)} className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-label-md text-on-surface hover:bg-surface-container-low disabled:opacity-60">
          <span className="truncate">{p.label}</span>
          <span className="shrink-0 text-primary"><Price amount={p.price} /></span>
        </button>
      ))}
      <ConfirmSheet
        open={!!picked}
        title="Confirmer le boost"
        confirmLabel={`Activer · ${(picked?.price ?? 0).toLocaleString('fr-FR')} F`}
        loading={loading}
        onClose={() => setPicked(null)}
        onConfirm={confirm}
      >
        {picked && <p className="m-0"><b className="text-on-surface">{picked.label}</b> pour <b className="text-primary"><Price amount={picked.price} /></b>. La mise en avant démarre dès la confirmation.</p>}
      </ConfirmSheet>
    </div>
  )
}
