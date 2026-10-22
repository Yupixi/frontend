import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import BottomSheet from '../BottomSheet'
import ConfirmSheet from '../ConfirmSheet'
import { creditsLabel } from '../Credits'
import { BOOST_REEL_MUTATION, MY_REELS_QUERY, MY_REEL_STATS_QUERY, OWN_REEL_QUERY, type MyReel } from '../../graphql/reels'
import { WALLET_BALANCE_QUERY, type WalletBalance } from '../../graphql/payments'
import { formatNumber } from '../../lib/format'
import { useReelSettings } from '../../lib/reels'
import { requestNavigate } from '../../lib/navigation'

// The seller's tools on one of their own Reels, shared by « Mes Reels » and
// the Reels feed / players (their own Reels: Statistiques, Booster).

type Stats = {
  views: number; completes: number; clicks: number; contacts: number; shares: number; completionRate: number
  days: { day: string; views: number; boostedViews: number }[]
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

// « Booster ce Reel »: price, balance, confirmation (or « Acheter des
// crédits » when the balance is short). `reel` may be partial (a Reel of
// the feed): its owner state (boost running, online) is read first.
export function ReelBoostSheet({ reelId, countryCode, onClose, onBoosted }: { reelId: string; countryCode?: string | null; onClose: () => void; onBoosted?: () => void }) {
  const settings = useReelSettings(countryCode)
  const { data: own } = useQuery<{ reel: MyReel | null }>(OWN_REEL_QUERY, { variables: { id: reelId }, fetchPolicy: 'network-only' })
  const { data: wallet } = useQuery<WalletBalance>(WALLET_BALANCE_QUERY, { fetchPolicy: 'cache-and-network' })
  const [boost, { loading }] = useMutation(BOOST_REEL_MUTATION, { refetchQueries: [{ query: MY_REELS_QUERY }] })
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const credits = wallet?.myWallet.credits ?? 0
  const r = own?.reel
  const running = !!r?.boost?.active
  const blocked = !!r && !r.canBoost
  const enough = credits >= settings.boostPrice
  const until = r?.boost?.expiresAt ? new Date(r.boost.expiresAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null

  if (done || running || blocked) {
    return (
      <BottomSheet open onClose={onClose} title="Booster ce Reel">
        <p className="m-0 text-body-md text-on-surface">
          {done ? `Boost lancé : votre Reel passe dans les places réservées pendant ${settings.boostHours} h. Vous recevrez le bilan à la fin.`
            : running ? `Ce Reel est déjà boosté${until ? ` jusqu’au ${until}` : ''} : ${formatNumber(r?.boost?.views ?? 0)} / ${formatNumber(r?.boost?.viewsGoal ?? 0)} vues.`
            : 'Seul un Reel en ligne, dont l’annonce est en ligne, peut être boosté.'}
        </p>
        <button onClick={onClose} className="mt-4 h-12 w-full cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">Fermer</button>
      </BottomSheet>
    )
  }
  return (
    <ConfirmSheet
      open
      title="Booster ce Reel"
      confirmLabel={!r ? 'Un instant…' : enough ? `Booster · ${creditsLabel(settings.boostPrice)}` : 'Acheter des crédits'}
      loading={loading || !r}
      onClose={onClose}
      onConfirm={() => {
        if (!r) return
        if (!enough) { onClose(); requestNavigate('seller-wallet'); return }
        setError(null)
        void boost({ variables: { id: reelId } }).then(() => { setDone(true); onBoosted?.() }).catch((e: Error) => setError(e.message))
      }}
    >
      <p className="m-0 text-body-md text-on-surface">Pendant {settings.boostHours} h, votre Reel passe dans les places réservées du fil Reels et de l’accueil, avec un objectif de {formatNumber(settings.boostViewsGoal)} vues. Vous recevez le bilan à la fin.</p>
      <p className="m-0 mt-2 text-body-sm text-on-surface-variant">Prix : {creditsLabel(settings.boostPrice)} · votre solde : {creditsLabel(credits)}</p>
      {error && <p className="m-0 mt-2 text-body-sm text-primary">{error}</p>}
    </ConfirmSheet>
  )
}
