import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import BottomSheet from '../BottomSheet'
import ConfirmSheet from '../ConfirmSheet'
import { creditsLabel } from '../Credits'
import { BOOST_REEL_MUTATION, MY_REELS_QUERY, MY_REEL_STATS_QUERY, OWN_REEL_QUERY, type MyReel } from '../../graphql/reels'
import { WALLET_BALANCE_QUERY, type WalletBalance } from '../../graphql/payments'
import { formatNumber } from '../../lib/format'
import { useReelSettings } from '../../lib/reels'
import { usePriceVars } from '../../lib/countries'
import BuyCreditsSheet from '../BuyCreditsSheet'
import Icon from '../Icon'
import { CreditsF } from '../boost/BoostKit'

// The seller's tools on one of their own Reels, shared by « Mes Reels » and
// the Reels feed / players (their own Reels: Statistiques, Booster).

type Stats = {
  views: number; completes: number; clicks: number; contacts: number; shares: number; completionRate: number
  // Of the views of the days shown: during a « Boost Reel » / thanks to the
  // listing's En vedette / Turbo boost.
  boostedViews: number; listingBoostViews: number
  days: { day: string; views: number; boostedViews: number; listingBoostViews: number }[]
  boosts: { id: string; credits: number; viewsGoal: number; views: number; startsAt: string; expiresAt: string; active: boolean }[]
}

export function ReelStatsSheet({ reelId, onClose }: { reelId: string; onClose: () => void }) {
  const { data } = useQuery<{ myReelStats: Stats }>(MY_REEL_STATS_QUERY, { variables: { id: reelId, days: 30 }, fetchPolicy: 'network-only' })
  const s = data?.myReelStats
  const peak = Math.max(1, ...(s?.days ?? []).map(d => d.views))
  return (
    <BottomSheet open onClose={onClose} title="Statistiques du Reel">
      {!s ? <p className="m-0 text-body-md text-on-surface-variant">Chargement…</p> : (
        <>
          <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
            {[['Vues', s.views], ['Lectures complètes', s.completes], ['Clics vers l’annonce', s.clicks], ['Contacts', s.contacts], ['Partages', s.shares], ['Taux de lecture complète', `${Math.round(s.completionRate * 100)} %`]].map(([label, v]) => (
              <div key={String(label)} className="rounded-xl bg-surface-container-low p-2.5">
                <p className="m-0 text-body-sm leading-tight text-on-surface-variant">{label}</p>
                <p className="m-0 mt-1 text-headline-sm text-on-surface">{typeof v === 'number' ? formatNumber(v) : v}</p>
              </div>
            ))}
          </div>
          <p className="m-0 mt-4 text-label-md text-on-surface">Vues des 30 derniers jours</p>
          {s.days.length ? (
            <div className="mt-2 flex h-24 items-end gap-1" aria-label="Vues par jour">
              {s.days.map(d => (
                <span key={d.day} title={`${new Date(d.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} : ${d.views} vue(s)`} className="flex-1 rounded-t bg-primary/80" style={{ height: `${Math.max(4, (d.views / peak) * 100)}%` }} />
              ))}
            </div>
          ) : <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Pas encore de vue.</p>}
          {(s.boostedViews > 0 || s.listingBoostViews > 0) && (
            <p className="m-0 mt-2 text-body-sm text-on-surface-variant">
              Dont {[s.boostedViews > 0 && <><b className="text-on-surface">{formatNumber(s.boostedViews)}</b> pendant un Boost Reel</>, s.listingBoostViews > 0 && <><b className="text-on-surface">{formatNumber(s.listingBoostViews)}</b> grâce au boost de l’annonce</>].filter(Boolean).map((x, i) => <span key={i}>{i > 0 && ' et '}{x}</span>)}.
            </p>
          )}
          {s.boosts.length > 0 && (
            <>
              <p className="m-0 mt-4 text-label-md text-on-surface">Boosts</p>
              <ul className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0">
                {s.boosts.map(b => (
                  <li key={b.id} className="rounded-xl bg-surface-container-low p-2.5 text-body-sm text-on-surface">
                    {new Date(b.startsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → {new Date(b.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {creditsLabel(b.credits)} · <strong>{formatNumber(b.views)} vues</strong> sur {formatNumber(b.viewsGoal)} visées{b.active ? ' (en cours)' : ''}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="m-0 mt-3 text-body-sm text-on-surface-variant">Une vue compte après quelques secondes de lecture, une fois par personne et par jour ; vos propres lectures ne comptent pas.</p>
        </>
      )}
    </BottomSheet>
  )
}

// « Booster ce Reel »: the same short card as a listing boost — what it
// does in one line, duration, price in credits and F CFA, the balance —
// and the missing credits bought in the same sheet. `reel` may be partial
// (a Reel of the feed): its owner state (boost running, online) is read
// first.
export function ReelBoostSheet({ reelId, countryCode, onClose, onBoosted }: { reelId: string; countryCode?: string | null; onClose: () => void; onBoosted?: () => void }) {
  const settings = useReelSettings(countryCode)
  const { data: own } = useQuery<{ reel: MyReel | null }>(OWN_REEL_QUERY, { variables: { id: reelId }, fetchPolicy: 'network-only' })
  const { data: wallet, refetch: refetchWallet } = useQuery<WalletBalance>(WALLET_BALANCE_QUERY, { variables: usePriceVars(), fetchPolicy: 'cache-and-network' })
  const [boost, { loading }] = useMutation(BOOST_REEL_MUTATION, { refetchQueries: [{ query: MY_REELS_QUERY }] })
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [topUp, setTopUp] = useState(false)
  const credits = wallet?.myWallet.credits ?? 0
  const r = own?.reel
  const running = !!r?.boost?.active
  const blocked = !!r && !r.canBoost
  const enough = credits >= settings.boostPrice
  const missing = Math.max(0, settings.boostPrice - credits)
  const until = r?.boost?.expiresAt ? new Date(r.boost.expiresAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null
  // Already in the reserved places thanks to the listing's En vedette /
  // Turbo boost: said first, so that nobody pays twice for nothing.
  const viaListing = r?.listingBoost?.active ? r.listingBoost : null
  const listingUntil = viaListing ? new Date(viaListing.expiresAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null

  if (topUp) return <BuyCreditsSheet open suggested={missing} onClose={() => { setTopUp(false); void refetchWallet() }} onDone={() => { setTopUp(false); void refetchWallet() }} />

  if (done || running || blocked) {
    return (
      <BottomSheet open onClose={onClose} title={done ? 'Boost activé' : 'Booster ce Reel'}>
        <p className={`m-0 flex items-start gap-2 text-body-md text-on-surface ${done ? 'rounded-2xl bg-tertiary-soft p-4' : ''}`}>
          {done && <Icon name="check_circle" size={22} fill className="shrink-0 text-tertiary" />}
          <span>{done ? `Boost Reel ${settings.boostHours} h lancé. Bilan à la fin, dans Statistiques.`
            : running ? `Déjà boosté${until ? ` jusqu’au ${until}` : ''} : ${formatNumber(r?.boost?.views ?? 0)} / ${formatNumber(r?.boost?.viewsGoal ?? 0)} vues.`
            : 'Seul un Reel en ligne, avec son annonce en ligne, peut être boosté.'}</span>
        </p>
        <button onClick={onClose} className="mt-4 h-12 w-full cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">Fermer</button>
      </BottomSheet>
    )
  }
  return (
    <ConfirmSheet
      open
      title="Booster ce Reel"
      confirmLabel={!r ? 'Un instant…' : enough ? `${viaListing ? 'Booster quand même' : 'Booster'} · ${creditsLabel(settings.boostPrice)}` : 'Acheter des crédits'}
      loading={loading || !r}
      onClose={onClose}
      onConfirm={() => {
        if (!r) return
        if (!enough) { setTopUp(true); return }
        setError(null)
        void boost({ variables: { id: reelId } }).then(() => { setDone(true); void refetchWallet(); onBoosted?.() }).catch((e: Error) => setError(e.message))
      }}
    >
      {viaListing && (
        <p role="status" className="m-0 mb-3 flex items-start gap-2 rounded-2xl bg-tertiary-soft p-3.5 text-body-sm text-on-surface">
          <Icon name="check_circle" size={20} fill className="shrink-0 text-tertiary" />
          <span>
            <b className="block text-label-lg text-tertiary">Déjà mis en avant jusqu’au {listingUntil}</b>
            Grâce au boost « {viaListing.formula} » de l’annonce, sans supplément : {formatNumber(viaListing.views)} / {formatNumber(viaListing.viewsGoal)} vues des Reels de l’annonce. Un Boost Reel n’est utile que pour viser plus de vues.
          </span>
        </p>
      )}
      <div className="rounded-2xl border border-solid border-outline-variant p-3.5">
        <p className="m-0 text-label-lg text-on-surface">Boost Reel <span className="font-normal text-on-surface-variant">· {settings.boostHours} h</span></p>
        <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Places réservées dans le fil Reels et sur l’accueil.</p>
        <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Objectif : {formatNumber(settings.boostViewsGoal)} vues · bilan à la fin.</p>
        <p className="m-0 mt-2 text-label-lg"><CreditsF n={settings.boostPrice} /></p>
      </div>
      <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Solde : <b className="text-on-surface">{creditsLabel(credits)}</b>{!enough && r ? <> · il vous manque <b className="text-on-surface">{creditsLabel(missing)}</b></> : null}</p>
      {error && <p className="m-0 mt-2 text-body-sm text-primary">{error}</p>}
    </ConfirmSheet>
  )
}
