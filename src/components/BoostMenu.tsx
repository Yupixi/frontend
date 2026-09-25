import { useMutation, useQuery } from '@apollo/client/react'
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
  const pick = (pack: string) => void createBoost({ variables: { input: { listingId, pack } } }).then(() => onDone())

  return (
    <div className={variant === 'dropdown'
      ? 'absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-outline-variant bg-surface-lowest p-1.5 shadow-float'
      : 'rounded-xl border border-outline-variant p-1.5'}>
      {(data?.boostPacks ?? []).map(p => (
        <button key={p.pack} disabled={loading} onClick={() => pick(p.pack)} className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border-none bg-transparent px-2.5 py-2 text-left text-label-md text-on-surface hover:bg-surface-container-low disabled:opacity-60">
          <span className="truncate">{p.label}</span>
          <span className="shrink-0 text-primary"><Price amount={p.price} /></span>
        </button>
      ))}
    </div>
  )
}
