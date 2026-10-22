import { useEffect, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import BottomSheet from '../BottomSheet'
import Icon from '../Icon'
import WalletPaySheet from '../WalletPaySheet'
import { useBumpProof } from '../BumpProof'
import { BoostCard, CreditsF, pillFor, useBadgeSettings } from './BoostKit'
import { BOOST_PACKS_QUERY, type BoostPackInfo } from '../../graphql/promotions'
import { WALLET_BALANCE_QUERY, type WalletBalance } from '../../graphql/payments'
import { usePriceVars } from '../../lib/countries'
import { requestOpenHelp, requestOpenLink } from '../../lib/navigation'
import { thumbnailUrl } from '../../lib/media'

export type PickerListing = { id: string; title: string; coverImageUrl?: string | null; status?: string }

// « Booster cette annonce »: one short card per formula (what it does, its
// pill, its price in credits and F CFA), then the payment in credits
// (WalletPaySheet buys the missing credits without leaving), then a short
// confirmation saying where the bilan shows. A bump ends on the bump proof
// instead (when, where, what it cost).
export default function BoostPicker({ open, onClose, listing, onDone, onSeeBilan }: {
  open: boolean
  onClose: () => void
  listing: PickerListing
  onDone?: (p: BoostPackInfo) => void
  // « Voir le bilan »: the Booster page itself scrolls; elsewhere it opens it.
  onSeeBilan?: () => void
}) {
  const vars = usePriceVars()
  const packs = useQuery<{ boostPacks: BoostPackInfo[] }>(BOOST_PACKS_QUERY, { variables: vars, skip: !open }).data?.boostPacks ?? []
  const wallet = useQuery<WalletBalance>(WALLET_BALANCE_QUERY, { variables: vars, skip: !open, fetchPolicy: 'cache-and-network' }).data
  const badges = useBadgeSettings()
  const [picked, setPicked] = useState<BoostPackInfo | null>(null)
  const [done, setDone] = useState<BoostPackInfo | null>(null)
  const proof = useBumpProof(onClose)
  useEffect(() => { if (!open) { setPicked(null); setDone(null) } }, [open])
  const cover = listing.coverImageUrl ? thumbnailUrl(listing.coverImageUrl) : null
  const card = { id: listing.id, coverImageUrl: cover }

  if (open && picked) return (
    <WalletPaySheet
      open
      title="Payer en crédits"
      amount={picked.price}
      request={{ kind: 'BOOST_PACK', product: picked.pack, listingId: listing.id }}
      onClose={() => setPicked(null)}
      onPaid={() => {
        setDone(picked)
        onDone?.(picked)
        if (picked.family === 'BUMP') proof.showFor(listing.id)
      }}
    >
      <b className="block text-label-lg text-on-surface">{picked.label}</b>
      <span className="line-clamp-1">« {listing.title} »</span>
    </WalletPaySheet>
  )

  // Bumped at once: the proof sheet says when, where and what it cost.
  if (open && done?.family === 'BUMP' && proof.visible) return proof.sheet

  if (open && done) return (
    <BottomSheet open onClose={onClose} title="Boost activé" maxWidth="480px"
      footer={<div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
        <button type="button" onClick={onClose} className="h-12 flex-1 cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">Terminer</button>
        <button type="button" onClick={() => { onClose(); if (onSeeBilan) onSeeBilan(); else requestOpenLink(`/?shortcut=seller-premium&boost=${listing.id}`) }} className="h-12 flex-[1.4] cursor-pointer rounded-xl border-none bg-primary text-label-lg text-white">Voir le bilan</button>
      </div>}>
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-tertiary-soft p-4 text-tertiary">
        <Icon name="check_circle" size={24} fill className="shrink-0" />
        <div className="min-w-0 text-body-md text-on-surface">
          <b className="block text-label-lg text-tertiary">{done.label}</b>
          <span className="line-clamp-2">« {listing.title} »</span>
          <span className="mt-1 block text-body-sm text-on-surface-variant">{listing.status === 'PENDING_REVIEW' ? 'Démarre à la mise en ligne de l’annonce.' : 'C’est parti, dès maintenant.'} Bilan dans Booster &amp; Visibilité.</span>
        </div>
      </div>
    </BottomSheet>
  )

  return (
    <BottomSheet open={open} onClose={onClose} title="Booster l’annonce" maxHeight="92vh" maxWidth="560px">
      <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-2.5">
        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">{cover && <img src={cover} alt="" className="h-full w-full object-cover" />}</span>
        <span className="min-w-0 flex-1 truncate text-label-md text-on-surface">{listing.title}</span>
        <span className="shrink-0 text-right">
          <span className="block text-label-sm text-on-surface-variant">Solde</span>
          {wallet ? <CreditsF n={wallet.myWallet.credits} value={wallet.walletSettings.creditValue} className="block text-label-md text-on-surface" /> : <span className="text-label-md">…</span>}
        </span>
      </div>
      {!packs.length ? (
        <div className="flex justify-center py-8"><Icon name="progress_activity" size={30} className="animate-spin text-primary" /></div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {packs.map(p => <BoostCard key={p.pack} info={p} pill={pillFor(p, badges)} listing={card} onPick={() => setPicked(p)} />)}
        </div>
      )}
      <button type="button" onClick={() => { onClose(); requestOpenHelp('booster-une-annonce') }} className="mt-3 flex h-10 cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-label-md text-primary">
        <Icon name="help" size={17} /> Comment ça marche ?
      </button>
    </BottomSheet>
  )
}
