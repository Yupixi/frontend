import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import PromoPill from '../../components/PromoPill'
import BottomSheet from '../../components/BottomSheet'
import ConfirmSheet from '../../components/ConfirmSheet'
import WalletPaySheet from '../../components/WalletPaySheet'
import BuyCreditsSheet from '../../components/BuyCreditsSheet'
import EmptyState from '../../components/EmptyState'
import { creditsLabel } from '../../components/Credits'
import { AccountLayout } from '../account/AccountLayout'
import { MY_LISTINGS_QUERY, BUMP_LISTING_MUTATION, type MyListingRow } from '../../graphql/listings'
import { BOOST_PACKS_QUERY, MY_BOOSTS_QUERY, type BoostPackInfo, type RemoteBoost } from '../../graphql/promotions'
import type { AuthUser } from '../../graphql/auth'
import { WALLET_BALANCE_QUERY, type WalletBalance } from '../../graphql/payments'
import { MY_REELS_QUERY, REEL_STATUS_LABEL, type MyReel } from '../../graphql/reels'
import { MY_LISTING_BUMPS_QUERY, type BumpEntry, type BumpStatus } from '../../graphql/bumps'
import type { VisibilityReport } from '../../graphql/visibility'
import { usePriceVars } from '../../lib/countries'
import { useBumpCost } from '../../lib/useBumpCost'
import { formatNumber } from '../../lib/format'
import { thumbnailUrl } from '../../lib/media'
import { reelThumb, useReelSettings } from '../../lib/reels'
import { BumpHistory, BumpStatusPanel, useBumpProof } from '../../components/BumpProof'
import { ReportCard, ReportLine } from '../../components/VisibilityReport'
import { BoostCompare, BoostSteps, CreditsF, HowItWorks } from '../../components/boost/BoostKit'
import BoostPicker from '../../components/boost/BoostPicker'
import { ReelBoostSheet, ReelStatsSheet } from '../../components/reels/ReelOwnerSheets'

const ReelComposer = lazy(() => import('../../components/reels/ReelComposer'))

type Props = { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void, initialListingId?: string | null }

const isFuture = (iso?: string | null) => !!iso && new Date(iso) > new Date()
const isActive = (b: RemoteBoost) => !b.upcoming && isFuture(b.expiresAt) && new Date(b.expiresAt).getTime() > new Date(b.startsAt).getTime()

// « encore 2 j », « encore 5 h ».
function left(iso: string) {
  const h = Math.max(1, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000))
  return h >= 48 ? `encore ${Math.round(h / 24)} j` : `encore ${h} h`
}
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

// The bilan in one figure: « +320 % » of displays, else the displays.
function bilanFigure(r: VisibilityReport) {
  if (r.ongoing && r.impressions === 0) return 'en cours'
  if (r.liftPercent != null) return `${r.liftPercent >= 0 ? '+' : '−'}${formatNumber(Math.abs(r.liftPercent), 0)} % d’affichages`
  return `${formatNumber(r.impressions, 0)} affichage${r.impressions > 1 ? 's' : ''}`
}

// « Booster & Visibilité »: the seller's listings (and Reels) as a grid,
// each card with its visibility now (pill, time left, last bilan in one
// figure) and the actions it allows; the formulas side by side below; the
// detail behind « Comment ça marche ? ». Prices from the API (BO › Tarifs),
// paid in credits — missing credits are bought without leaving the page.
export default function Booster({ onNavigate, currentUser, onLogout, initialListingId }: Props) {
  const vars = usePriceVars()
  const { data: listingsData, refetch: refetchListings } = useQuery<{ myListings: { items: MyListingRow[] } }>(MY_LISTINGS_QUERY, { variables: { page: 1, pageSize: 100 } })
  const all = listingsData?.myListings.items ?? []
  const live = all.filter(l => l.status === 'APPROVED' || l.status === 'PENDING_REVIEW')
  const packs = useQuery<{ boostPacks: BoostPackInfo[] }>(BOOST_PACKS_QUERY, { variables: vars }).data?.boostPacks ?? []
  const { data: boostsData, refetch: refetchBoosts } = useQuery<{ myBoosts: RemoteBoost[] }>(MY_BOOSTS_QUERY, { fetchPolicy: 'cache-and-network' })
  const history = boostsData?.myBoosts ?? []
  const { data: wallet, refetch: refetchWallet } = useQuery<WalletBalance>(WALLET_BALANCE_QUERY, { variables: vars, fetchPolicy: 'cache-and-network' })
  const credits = wallet?.myWallet.credits ?? 0
  const creditValue = wallet?.walletSettings.creditValue ?? 0
  const { data: bumpsData } = useQuery<{ myListingBumps: BumpEntry[] }>(MY_LISTING_BUMPS_QUERY, { variables: { take: 30 }, fetchPolicy: 'cache-and-network' })
  const reelSettings = useReelSettings(currentUser?.countryCode)
  const { data: reelsData, refetch: refetchReels } = useQuery<{ myReels: MyReel[] }>(MY_REELS_QUERY, { fetchPolicy: 'cache-and-network', skip: !reelSettings.enabled })
  const reels = (reelsData?.myReels ?? []).filter(r => r.status !== 'ARCHIVED')

  const [tab, setTab] = useState<'listings' | 'reels'>('listings')
  const [buying, setBuying] = useState(false)
  const [boostFor, setBoostFor] = useState<MyListingRow | null>(null)
  const [statsFor, setStatsFor] = useState<MyListingRow | null>(null)
  const [reelFor, setReelFor] = useState<MyListingRow | null>(null)
  const [reelBoost, setReelBoost] = useState<MyReel | null>(null)
  const [reelStats, setReelStats] = useState<MyReel | null>(null)
  const [bumpFor, setBumpFor] = useState<MyListingRow | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const historyRef = useRef<HTMLDetailsElement>(null)

  // « Prolonger » from the end-of-boost notification: that listing first.
  const [focus, setFocus] = useState(initialListingId ?? null)
  useEffect(() => {
    if (!focus || !live.length) return
    const el = document.getElementById(`boost-${focus}`)
    el?.scrollIntoView({ block: 'center' })
    const t = window.setTimeout(() => setFocus(null), 2500)
    return () => window.clearTimeout(t)
  }, [focus, live.length])

  const bumpCost = useBumpCost(false, bumpFor?.id)
  const flashPrice = packs.find(p => p.pack === 'BUMP_FLASH')?.price
  const [bumpListing, { loading: bumping }] = useMutation<{ bumpListing: BumpStatus }>(BUMP_LISTING_MUTATION)
  const proof = useBumpProof()
  const refresh = () => { void refetchListings(); void refetchBoosts(); void refetchWallet() }
  const bump = async (l: MyListingRow) => {
    setBumpFor(null); setError(null)
    try {
      const r = await bumpListing({ variables: { id: l.id } })
      if (r.data) proof.show(r.data.bumpListing)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de remonter l’annonce.')
    }
  }
  const seeHistory = () => { if (historyRef.current) { historyRef.current.open = true; historyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }) } }
  const latest = (id: string) => history.find(b => b.listing?.id === id && !!b.report)
  const running = (id: string) => history.find(b => b.listing?.id === id && (isActive(b) || b.upcoming))
  const showReels = reelSettings.enabled
  const tool = 'flex h-11 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-none bg-surface-container-high px-0.5 text-[10px] font-semibold leading-3 text-on-surface sm:text-label-sm'

  return (
    <AccountLayout active="seller-premium" title="Booster & Visibilité" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 pb-8">
        {/* Balance + the principle, once. */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="m-0 hidden text-headline-md text-on-surface lg:block">Booster &amp; Visibilité</h1>
            <div data-tour="boost-credits" className="flex w-full items-center justify-between gap-3 rounded-2xl bg-primary-fixed/50 px-3.5 py-2.5 lg:w-auto">
              <span className="min-w-0">
                <span className="block text-label-sm text-on-surface-variant">Vos crédits</span>
                <span className="block text-label-lg text-on-surface">{wallet ? <CreditsF n={credits} value={creditValue} /> : '…'}</span>
              </span>
              <button type="button" onClick={() => setBuying(true)} className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-3.5 text-label-md text-white">
                <Icon name="add_card" size={17} /> Acheter
              </button>
            </div>
          </div>
          <BoostSteps />
        </section>

        {(flash || error) && (
          <p role="status" className={`m-0 flex items-center gap-2 rounded-xl p-3 text-body-sm ${flash ? 'bg-tertiary-soft text-tertiary' : 'bg-primary-fixed text-primary'}`}>
            <Icon name={flash ? 'check_circle' : 'error'} size={18} className="shrink-0" /> {flash ?? error}
          </p>
        )}

        {/* The seller's listings / Reels, with what each can do now. */}
        <section data-tour="boost-listing" aria-labelledby="boost-mine">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="boost-mine" className="m-0 text-headline-sm text-on-surface">Mes annonces</h2>
            {showReels && (
              <div role="tablist" aria-label="Afficher" className="flex gap-1 rounded-full bg-surface-container-low p-1">
                {([['listings', `Annonces (${live.length})`], ['reels', `Reels (${reels.length})`]] as const).map(([k, label]) => (
                  <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={`h-9 cursor-pointer rounded-full border-none px-3.5 text-label-md ${tab === k ? 'bg-surface-lowest text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>{label}</button>
                ))}
              </div>
            )}
          </div>

          {tab === 'listings' && (live.length === 0 ? (
            <EmptyState icon="empty-box" fallback="inventory_2" title="Aucune annonce à booster" text="Publiez une annonce pour la mettre en avant." action={{ label: 'Déposer une annonce', onClick: () => onNavigate('seller-post') }} />
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[360px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {live.map(l => {
                const run = running(l.id)
                const last = latest(l.id)
                const pending = l.status === 'PENDING_REVIEW'
                const cover = l.coverImageUrl ? thumbnailUrl(l.coverImageUrl) : null
                const state = run ? (run.upcoming ? `${packs.find(p => p.pack === run.pack)?.label ?? 'Boost'} · à venir` : `${packs.find(p => p.pack === run.pack)?.label ?? 'Boost'} · ${left(run.expiresAt)}`)
                  : isFuture(l.autoBumpUntil) ? `Remontée chaque jour · ${left(l.autoBumpUntil!)}`
                    : pending ? 'En validation' : 'Visibilité standard'
                return (
                  <li key={l.id} id={`boost-${l.id}`} className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-solid bg-surface-lowest ${focus === l.id ? 'border-primary ring-2 ring-primary' : 'border-outline-variant'}`}>
                    <div className="relative aspect-[4/3] bg-surface-container-low">
                      {cover ? <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-outline"><Icon name="sell" size={28} /></span>}
                      {l.promoBadge && <span className="absolute left-2 right-2 top-2 flex"><PromoPill badge={l.promoBadge} /></span>}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col p-2.5">
                      <span className="truncate text-label-md text-on-surface">{l.title}</span>
                      <span className="text-label-md font-bold text-primary"><Price amount={l.price} currency={l.currency} /></span>
                      <span className={`mt-1 flex items-center gap-1 text-label-sm ${run || isFuture(l.autoBumpUntil) ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${run || isFuture(l.autoBumpUntil) ? 'bg-tertiary' : 'bg-outline'}`} /> <span className="truncate">{state}</span>
                      </span>
                      {last?.report && (
                        <button type="button" onClick={() => setStatsFor(l)} className="mt-0.5 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left text-label-sm text-on-surface hover:underline">
                          <Icon name="trending_up" size={14} className="shrink-0 text-tertiary" /> <span className="truncate">Bilan : {bilanFigure(last.report)}</span>
                        </button>
                      )}
                      <div className="mt-auto flex flex-col gap-1.5 pt-2.5">
                        <button type="button" onClick={() => setBoostFor(l)} className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary text-label-md text-white">
                          <Icon name="rocket_launch" size={17} /> {run ? 'Prolonger' : 'Booster'}
                        </button>
                        <div className={`grid gap-1.5 ${pending ? 'grid-cols-1' : showReels ? 'grid-cols-[1.4fr_1fr_1fr]' : 'grid-cols-2'}`}>
                          {!pending && <button type="button" onClick={() => setBumpFor(l)} title={flashPrice ? `Remonter · ${creditsLabel(flashPrice)}` : 'Remonter'} className={tool}><Icon name="arrow_upward" size={17} /><span className="max-w-full truncate">Remonter</span></button>}
                          {showReels && !pending && <button type="button" onClick={() => setReelFor(l)} title="Ajouter un Reel" className={tool}><Icon name="smart_display" size={17} /><span>Reel</span></button>}
                          <button type="button" onClick={() => setStatsFor(l)} title="Statistiques et remontées" className={tool}><Icon name="bar_chart" size={17} /><span>Stats</span></button>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ))}

          {tab === 'reels' && (reels.length === 0 ? (
            <EmptyState icon="empty-box" fallback="smart_display" title="Aucun Reel" text="Ajoutez une courte vidéo à une annonce (bouton Reel sur sa carte)." />
          ) : (
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4 xl:grid-cols-5">
              {reels.map(r => (
                <li key={r.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-solid border-outline-variant bg-surface-lowest">
                  <div className="relative aspect-[4/5] bg-neutral-900">
                    {r.posterUrl ? <img src={reelThumb(r.posterUrl) ?? undefined} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-white/60"><Icon name="smart_display" size={26} /></span>}
                    {r.boost?.active ? <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white"><Icon name="rocket_launch" size={12} /> Boosté</span>
                      : r.listingBoost?.active && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-tertiary px-1.5 py-0.5 text-[11px] font-bold text-white" title={`Grâce au boost « ${r.listingBoost.formula} » de l’annonce`}><Icon name="star" size={12} fill /> Mis en avant</span>}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col p-2.5">
                    <span className="truncate text-label-md text-on-surface">{r.listing?.title ?? 'Annonce supprimée'}</span>
                    <span className="text-label-sm text-on-surface-variant">{r.status === 'APPROVED' ? `${formatNumber(r.viewsCount)} vue${r.viewsCount > 1 ? 's' : ''}` : REEL_STATUS_LABEL[r.status]}</span>
                    {r.boost?.active && <span className="text-label-sm text-tertiary">{formatNumber(r.boost.views)} / {formatNumber(r.boost.viewsGoal)} vues · {left(r.boost.expiresAt)}</span>}
                    {!r.boost?.active && r.listingBoost?.active && <span className="text-label-sm text-tertiary">Boost de l’annonce · {formatNumber(r.listingBoost.views)} / {formatNumber(r.listingBoost.viewsGoal)} vues · {left(r.listingBoost.expiresAt)}</span>}
                    <div className="mt-auto flex gap-1.5 pt-2.5">
                      {r.canBoost && reelSettings.boostEnabled && <button type="button" onClick={() => setReelBoost(r)} className="flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl border-none bg-primary text-label-md text-white"><Icon name="rocket_launch" size={16} /> Booster</button>}
                      {r.status === 'APPROVED' && <button type="button" onClick={() => setReelStats(r)} aria-label="Statistiques du Reel" title="Statistiques" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-surface-container-high text-on-surface"><Icon name="bar_chart" size={17} /></button>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ))}
        </section>

        {/* The formulas side by side. */}
        <section data-tour="boost-packs" aria-labelledby="boost-packs-title">
          <h2 id="boost-packs-title" className="m-0 mb-1 text-headline-sm text-on-surface">Les formules</h2>
          <p className="m-0 mb-3 text-body-sm text-on-surface-variant">Touchez « Booster » sur une annonce pour en choisir une.</p>
          <BoostCompare packs={packs} />
        </section>

        <HowItWorks packs={packs} />

        {/* History, folded: every boost with its bilan, every bump. */}
        <details ref={historyRef} className="group rounded-2xl border border-solid border-outline-variant bg-surface-lowest">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-label-lg text-on-surface [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2"><Icon name="history" size={20} className="text-primary" /> Mes boosts et leurs bilans ({history.length})</span>
            <Icon name="expand_more" size={22} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-2 px-4 pb-4">
            {history.length === 0 && <p className="m-0 text-body-sm text-on-surface-variant">Aucun boost pour le moment.</p>}
            {history.map(b => (
              <div key={b.id} className="rounded-xl bg-surface-container-low p-3">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <span className="min-w-0 truncate text-label-md text-on-surface">{packs.find(p => p.pack === b.pack)?.label ?? b.pack} · {b.listing?.title ?? '—'}</span>
                  <span className="shrink-0 text-label-sm text-on-surface-variant">{shortDate(b.createdAt)} · {b.upcoming ? 'À venir' : isActive(b) ? 'En cours' : 'Terminé'} · {creditsLabel(b.price)}</span>
                </div>
                <ReportLine report={b.report} className="mt-1" />
              </div>
            ))}
            <h3 className="m-0 mt-3 text-label-lg text-on-surface">Remontées</h3>
            <BumpHistory entries={bumpsData?.myListingBumps ?? []} showListing />
          </div>
        </details>
      </div>

      {/* Sheets. */}
      {proof.sheet}
      {buying && <BuyCreditsSheet open onClose={() => setBuying(false)} onDone={(i) => { setBuying(false); setFlash(i.credits ? `${i.credits} crédits ajoutés.` : 'Crédits ajoutés.'); void refetchWallet() }} />}
      {boostFor && <BoostPicker open listing={boostFor} onClose={() => setBoostFor(null)} onDone={refresh} onSeeBilan={seeHistory} />}
      {bumpFor && (flashPrice !== undefined && credits >= flashPrice ? (
        <ConfirmSheet open title="Remonter l’annonce" confirmLabel={`Remonter · ${creditsLabel(bumpCost ?? flashPrice)}`} loading={bumping} onClose={() => setBumpFor(null)} onConfirm={() => void bump(bumpFor)}>
          <p className="m-0">« {bumpFor.title} » revient en tête des annonces récentes.</p>
          <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Solde après : {creditsLabel(credits - (bumpCost ?? flashPrice))}</p>
        </ConfirmSheet>
      ) : (
        <WalletPaySheet open title="Remontée" amount={flashPrice ?? 0} request={{ kind: 'BOOST_PACK', product: 'BUMP_FLASH', listingId: bumpFor.id }} onClose={() => setBumpFor(null)} onPaid={() => { proof.showFor(bumpFor.id); refresh() }}>
          <b className="block text-label-lg text-on-surface">Remontée</b>
          <span className="line-clamp-1">« {bumpFor.title} »</span>
        </WalletPaySheet>
      ))}
      {statsFor && (
        <BottomSheet open onClose={() => setStatsFor(null)} title="Visibilité de l’annonce" maxHeight="90vh" maxWidth="640px">
          <p className="m-0 truncate text-label-lg text-on-surface">{statsFor.title}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[['Vues', statsFor.viewsCount], ['Favoris', statsFor.favoritesCount], ['Contacts', statsFor.contactsCount ?? 0]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface-container-low p-2"><div className="text-label-sm text-on-surface-variant">{k}</div><div className="text-headline-sm text-on-surface">{formatNumber(Number(v))}</div></div>
            ))}
          </div>
          {latest(statsFor.id)?.report && <div className="mt-3"><p className="m-0 mb-2 text-label-md text-on-surface">Dernier bilan · {packs.find(p => p.pack === latest(statsFor.id)!.pack)?.label}</p><ReportCard report={latest(statsFor.id)!.report!} /></div>}
          <BumpStatusPanel listingId={statsFor.id} take={5} className="mt-3" />
        </BottomSheet>
      )}
      {reelFor && <Suspense fallback={null}><ReelComposer listing={{ id: reelFor.id, title: reelFor.title, coverImageUrl: reelFor.coverImageUrl }} open onClose={() => setReelFor(null)} onOpenReels={() => { setReelFor(null); onNavigate('seller-reels') }} /></Suspense>}
      {reelBoost && <ReelBoostSheet reelId={reelBoost.id} countryCode={currentUser?.countryCode} onClose={() => { setReelBoost(null); void refetchReels(); void refetchWallet() }} />}
      {reelStats && <ReelStatsSheet reelId={reelStats.id} onClose={() => setReelStats(null)} />}
    </AccountLayout>
  )
}
