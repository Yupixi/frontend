import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import BottomSheet from './BottomSheet'
import Icon from './Icon'
import { BUMP_LISTING_MUTATION } from '../graphql/listings'
import { MY_WALLET_QUERY } from '../graphql/sellerHub'
import { useBumpCost } from '../lib/useBumpCost'
import { creditsLabel } from './Credits'
import { requestNavigate } from '../lib/navigation'

type Props = {
  open: boolean
  onClose: () => void
  listing: { id: string; title: string }
  onBumped?: () => void
}

// "Booster cette annonce": spends the bump price in credits to put the
// listing back at the top of the catalogue, or sends the seller to buy
// credits.
export default function BoostSheet({ open, onClose, listing, onBumped }: Props) {
  const { data, loading } = useQuery<{ myWallet: { credits: number } }>(MY_WALLET_QUERY, { skip: !open, fetchPolicy: 'cache-and-network' })
  // A bump costs the "Remontée instantanée" price, in credits (BO).
  const cost = useBumpCost(!open)
  const [bump, { loading: bumping }] = useMutation(BUMP_LISTING_MUTATION, { refetchQueries: [MY_WALLET_QUERY] })
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (!open) { setDone(false); setError(null) } }, [open])

  const credits = cost === undefined ? undefined : data?.myWallet.credits
  const hasCredit = (credits ?? 0) >= (cost ?? 1)

  const spend = () => {
    setError(null)
    bump({ variables: { id: listing.id } })
      .then(() => { setDone(true); onBumped?.() })
      .catch((e: Error) => setError(e.message))
  }
  const topUp = () => { onClose(); requestNavigate('seller-wallet') }

  const btn = 'h-12 cursor-pointer rounded-xl border-none text-label-lg'
  const footer = done ? (
    <div className="border-0 border-t border-solid border-outline-variant px-4 py-3">
      <button onClick={onClose} className={`${btn} w-full bg-surface-container-high text-on-surface`}>Terminer</button>
    </div>
  ) : credits === undefined ? null : (
    <div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
      <button onClick={onClose} className={`${btn} flex-1 bg-surface-container-high text-on-surface`}>Annuler</button>
      {hasCredit ? (
        <button onClick={spend} disabled={bumping} className={`${btn} flex flex-[1.6] items-center justify-center gap-2 bg-primary text-white disabled:opacity-60`}>
          <Icon name="rocket_launch" size={18} /> {bumping ? 'Un instant…' : `Utiliser ${creditsLabel(cost ?? 0)}`}
        </button>
      ) : (
        <button onClick={topUp} className={`${btn} flex flex-[1.6] items-center justify-center gap-2 bg-primary text-white`}>
          <Icon name="add_card" size={18} /> Acheter des crédits
        </button>
      )}
    </div>
  )

  // Portalled: listing cards clip their content (overflow: hidden).
  return createPortal(
    <BottomSheet open={open} onClose={onClose} title="Booster l’annonce" footer={footer}>
      {done ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="check_circle" size={40} fill /></span>
          <p className="m-0 text-headline-sm text-on-surface">Annonce remontée en tête</p>
          <p className="m-0 max-w-xs text-body-sm text-on-surface-variant">« {listing.title} » apparaît de nouveau parmi les premières annonces.{credits !== undefined && ` Il vous reste ${creditsLabel(Math.max(0, credits - (cost ?? 0)))}.`}</p>
        </div>
      ) : credits === undefined ? (
        <div className="flex justify-center py-8">{loading && <Icon name="progress_activity" size={32} className="animate-spin text-primary" />}</div>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${hasCredit ? 'bg-primary-fixed text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}><Icon name="account_balance_wallet" size={22} /></span>
            <div className="min-w-0">
              <div className="text-label-sm uppercase text-on-surface-variant">Vos crédits</div>
              <div className="text-headline-sm text-on-surface">{creditsLabel(credits)}</div>
            </div>
          </div>
          <p className="m-0 mt-4 text-body-md text-on-surface-variant">
            {hasCredit
              ? <>« {listing.title} » repasse en tête du catalogue. <b className="text-on-surface">{creditsLabel(cost ?? 0)}</b> {(cost ?? 0) > 1 ? 'seront utilisés' : 'sera utilisé'}.</>
              : <>Une remontée coûte <b className="text-on-surface">{creditsLabel(cost ?? 0)}</b>. Achetez des crédits par Mobile Money pour booster vos annonces en un clic.</>}
          </p>
          {error && <p className="m-0 mt-3 rounded-lg bg-primary-fixed px-3 py-2 text-body-sm text-primary">{error}</p>}
        </>
      )}
    </BottomSheet>,
    document.body,
  )
}
