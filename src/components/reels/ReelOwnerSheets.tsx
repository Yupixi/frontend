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
import { fmtDate, useT } from '../../i18n'
import reels from '../../i18n/ns/reels'

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
  const t = useT(reels)
  const { data } = useQuery<{ myReelStats: Stats }>(MY_REEL_STATS_QUERY, { variables: { id: reelId, days: 30 }, fetchPolicy: 'network-only' })
  const s = data?.myReelStats
  const peak = Math.max(1, ...(s?.days ?? []).map(d => d.views))
  return (
    <BottomSheet open onClose={onClose} title={t('stats.title')}>
      {!s ? <p className="m-0 text-body-md text-on-surface-variant">{t('stats.loading')}</p> : (
        <>
          <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
            {[[t('stats.views'), s.views], [t('stats.completes'), s.completes], [t('stats.clicks'), s.clicks], [t('stats.contacts'), s.contacts], [t('stats.shares'), s.shares], [t('stats.completionRate'), t('stats.percent', { n: Math.round(s.completionRate * 100) })]].map(([label, v]) => (
              <div key={String(label)} className="rounded-xl bg-surface-container-low p-2.5">
                <p className="m-0 text-body-sm leading-tight text-on-surface-variant">{label}</p>
                <p className="m-0 mt-1 text-headline-sm text-on-surface">{typeof v === 'number' ? formatNumber(v) : v}</p>
              </div>
            ))}
          </div>
          <p className="m-0 mt-4 text-label-md text-on-surface">{t('stats.last30')}</p>
          {s.days.length ? (
            <div className="mt-2 flex h-24 items-end gap-1" aria-label={t('stats.perDayAria')}>
              {s.days.map(d => (
                <span key={d.day} title={t('stats.dayTitle', { date: fmtDate(d.day, { day: 'numeric', month: 'short' }), n: String(d.views) })} className="flex-1 rounded-t bg-primary/80" style={{ height: `${Math.max(4, (d.views / peak) * 100)}%` }} />
              ))}
            </div>
          ) : <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('stats.noViews')}</p>}
          {(s.boostedViews > 0 || s.listingBoostViews > 0) && (
            <p className="m-0 mt-2 text-body-sm text-on-surface-variant">
              {t.rich(s.boostedViews > 0 && s.listingBoostViews > 0 ? 'stats.ofWhichBoth' : s.boostedViews > 0 ? 'stats.ofWhichBoost' : 'stats.ofWhichListing', { boosted: formatNumber(s.boostedViews), listing: formatNumber(s.listingBoostViews), b: c => <b className="text-on-surface">{c}</b> })}
            </p>
          )}
          {s.boosts.length > 0 && (
            <>
              <p className="m-0 mt-4 text-label-md text-on-surface">{t('stats.boosts')}</p>
              <ul className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0">
                {s.boosts.map(b => (
                  <li key={b.id} className="rounded-xl bg-surface-container-low p-2.5 text-body-sm text-on-surface">
                    {t.rich(b.active ? 'stats.boostLineActive' : 'stats.boostLine', { from: fmtDate(b.startsAt, { day: 'numeric', month: 'short' }), to: fmtDate(b.expiresAt, { day: 'numeric', month: 'short' }), credits: creditsLabel(b.credits), views: formatNumber(b.views), goal: formatNumber(b.viewsGoal), b: c => <strong>{c}</strong> })}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="m-0 mt-3 text-body-sm text-on-surface-variant">{t('stats.viewRule')}</p>
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
  const t = useT(reels)
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
  const until = r?.boost?.expiresAt ? fmtDate(r.boost.expiresAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null
  // Already in the reserved places thanks to the listing's En vedette /
  // Turbo boost: said first, so that nobody pays twice for nothing.
  const viaListing = r?.listingBoost?.active ? r.listingBoost : null
  const listingUntil = viaListing ? fmtDate(viaListing.expiresAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null

  if (topUp) return <BuyCreditsSheet open suggested={missing} onClose={() => { setTopUp(false); void refetchWallet() }} onDone={() => { setTopUp(false); void refetchWallet() }} />

  if (done || running || blocked) {
    return (
      <BottomSheet open onClose={onClose} title={done ? t('boost.activated') : t('boost.title')}>
        <p className={`m-0 flex items-start gap-2 text-body-md text-on-surface ${done ? 'rounded-2xl bg-tertiary-soft p-4' : ''}`}>
          {done && <Icon name="check_circle" size={22} fill className="shrink-0 text-tertiary" />}
          <span>{done ? t('boost.launched', { h: String(settings.boostHours) })
            : running ? t(until ? 'boost.runningUntil' : 'boost.running', { until, views: formatNumber(r?.boost?.views ?? 0), goal: formatNumber(r?.boost?.viewsGoal ?? 0) })
            : t('boost.blocked')}</span>
        </p>
        <button onClick={onClose} className="mt-4 h-12 w-full cursor-pointer rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">{t('boost.close')}</button>
      </BottomSheet>
    )
  }
  return (
    <ConfirmSheet
      open
      title={t('boost.title')}
      confirmLabel={!r ? t('boost.wait') : enough ? t(viaListing ? 'boost.confirmAnyway' : 'boost.confirm', { credits: creditsLabel(settings.boostPrice) }) : t('boost.buyCredits')}
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
            <b className="block text-label-lg text-tertiary">{t('boost.viaListingTitle', { until: listingUntil })}</b>
            {t('boost.viaListingText', { formula: viaListing.formula, views: formatNumber(viaListing.views), goal: formatNumber(viaListing.viewsGoal) })}
          </span>
        </p>
      )}
      <div className="rounded-2xl border border-solid border-outline-variant p-3.5">
        <p className="m-0 text-label-lg text-on-surface">Boost Reel {/* i18n-ignore */}<span className="font-normal text-on-surface-variant">{t('boost.hours', { h: String(settings.boostHours) })}</span></p>
        <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('boost.reserved')}</p>
        <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('boost.goal', { views: formatNumber(settings.boostViewsGoal) })}</p>
        <p className="m-0 mt-2 text-label-lg"><CreditsF n={settings.boostPrice} /></p>
      </div>
      <p className="m-0 mt-2 text-body-sm text-on-surface-variant">{t.rich(!enough && r ? 'boost.balanceMissing' : 'boost.balance', { credits: creditsLabel(credits), missing: creditsLabel(missing), b: c => <b className="text-on-surface">{c}</b> })}</p>
      {error && <p className="m-0 mt-2 text-body-sm text-primary">{error}</p>}
    </ConfirmSheet>
  )
}
