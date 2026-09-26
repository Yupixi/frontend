import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import BottomSheet from './BottomSheet'
import Icon from './Icon'
import { BUMP_LISTING_MUTATION } from '../graphql/listings'
import { MY_WALLET_QUERY } from '../graphql/sellerHub'
import { requestNavigate } from '../lib/navigation'

type Props = {
  open: boolean
  onClose: () => void
  listing: { id: string; title: string }
  onBumped?: () => void
}

// "Booster cette annonce": spends 1 wallet credit to put the listing back at
// the top of the catalogue, or sends the seller to the wallet to top up.
export default function BoostSheet({ open, onClose, listing, onBumped }: Props) {
  const { data, loading } = useQuery<{ myWallet: { credits: number } }>(MY_WALLET_QUERY, { skip: !open, fetchPolicy: 'cache-and-network' })
  const [bump, { loading: bumping }] = useMutation(BUMP_LISTING_MUTATION, { refetchQueries: [MY_WALLET_QUERY] })
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (!open) { setDone(false); setError(null) } }, [open])

  const credits = data?.myWallet.credits
  const hasCredit = (credits ?? 0) > 0

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
          <Icon name="rocket_launch" size={18} /> {bumping ? 'Un instant…' : 'Utiliser 1 crédit'}
        </button>
      ) : (
        <button onClick={topUp} className={`${btn} flex flex-[1.6] items-center justify-center gap-2 bg-primary text-white`}>
          <Icon name="account_balance_wallet" size={18} /> Recharger
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
          <p className="m-0 max-w-xs text-body-sm text-on-surface-variant">« {listing.title} » apparaît de nouveau parmi les premières annonces.{credits !== undefined && ` Solde : ${credits} crédit${credits > 1 ? 's' : ''}.`}</p>
        </div>
      ) : credits === undefined ? (
        <div className="flex justify-center py-8">{loading && <Icon name="progress_activity" size={32} className="animate-spin text-primary" />}</div>
      ) : (
        <>
          <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${hasCredit ? 'bg-primary-fixed text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}><Icon name="account_balance_wallet" size={22} /></span>
            <div className="min-w-0">
              <div className="text-label-sm uppercase text-on-surface-variant">Porte-monnaie</div>
              <div className="text-headline-sm text-on-surface">{credits} crédit{credits > 1 ? 's' : ''}</div>
            </div>
          </div>
          <p className="m-0 mt-4 text-body-md text-on-surface-variant">
            {hasCredit
              ? <>« {listing.title} » repasse en tête du catalogue. <b className="text-on-surface">1 crédit</b> sera utilisé.</>
              : <>Votre porte-monnaie est vide. Rechargez des crédits (dès 1 000 F les 2 remontées) pour booster vos annonces en un clic.</>}
          </p>
          {error && <p className="m-0 mt-3 rounded-lg bg-primary-fixed px-3 py-2 text-body-sm text-primary">{error}</p>}
        </>
      )}
    </BottomSheet>,
    document.body,
  )
}
