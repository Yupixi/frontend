import EmptyState from '../../components/EmptyState'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  Search, Download, PlusCircle, Rocket, CheckCircle2, Edit3, ChevronLeft, ChevronRight, ShieldCheck, ArrowRight,
  MessageSquare, Tag, Trash2, Eye, Archive, Star,
} from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { formatRelativeDate } from '../../lib/format'
import { thumbnailUrl } from '../../lib/media'
import { AccountLayout } from '../account/AccountLayout'
import ListingOffersPanel from '../../components/ListingOffersPanel'
import { MY_LISTINGS_QUERY, BUMP_LISTING_MUTATION, type MyListingRow } from '../../graphql/listings'
import PromoPill from '../../components/PromoPill'
import { DELETE_LISTING_WITH_REASON_MUTATION, PAUSE_LISTING_MUTATION, RESUME_LISTING_MUTATION, type ListingExitReason } from '../../graphql/deals'
import MarkSoldSheet from '../../components/MarkSoldSheet'
import ExitReasonSheet from '../../components/ExitReasonSheet'
import { MY_REPUTATION_QUERY, MY_WALLET_QUERY, type Reputation, type WalletSummary } from '../../graphql/sellerHub'
import type { AuthUser } from '../../graphql/auth'
import Select from '../../components/Select'
import BottomSheet from '../../components/BottomSheet'
import ConfirmSheet from '../../components/ConfirmSheet'
import ListingQrSheet from '../../components/ListingQrSheet'
import { MY_LISTING_QR_CODES_QUERY, type MyListingQr } from '../../graphql/memberQr'
import { useRules } from '../../lib/rules'
import WalletPaySheet from '../../components/WalletPaySheet'
import { BOOST_PACKS_QUERY, MY_BOOSTS_QUERY, type RemoteBoost } from '../../graphql/promotions'
import { ReportLine } from '../../components/VisibilityReport'
import { creditsLabel } from '../../components/Credits'
import { BADGE_LABEL } from '../../graphql/badges'
import { useReelSettings } from '../../lib/reels'

const ReelComposer = lazy(() => import('../../components/reels/ReelComposer'))
import { useNoCommissionClaims } from '../../lib/site'
import { useMemberCountryCode, usePriceVars } from '../../lib/countries'
import { BumpLine, useBumpProof } from '../../components/BumpProof'
import type { BumpStatus } from '../../graphql/bumps'
import { requestOpenLink } from '../../lib/navigation'
import { useCreditValue } from '../../lib/creditValue'
import BoostPicker from '../../components/boost/BoostPicker'
import { fmtCfa, fmtDate, fmtNumber, useT } from '../../i18n'
import myListings from '../../i18n/ns/myListings'

type Props = {
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
  onEditListing: (id: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

const PAGE = 12
const future = (iso?: string | null) => !!iso && new Date(iso) > new Date()
const negotiating = (l: MyListingRow) => l.status === 'APPROVED' && ((l.activeConversationsCount ?? 0) > 0 || (l.pendingOffersCount ?? 0) > 0)

const TABS = [
  { key: 'live', match: (l: MyListingRow) => l.status === 'APPROVED' },
  { key: 'nego', match: negotiating },
  { key: 'sold', match: (l: MyListingRow) => l.status === 'SOLD' },
  { key: 'review', match: (l: MyListingRow) => l.status === 'PENDING_REVIEW' || l.status === 'REJECTED' },
  { key: 'draft', match: (l: MyListingRow) => l.status === 'DRAFT' },
  { key: 'archived', match: (l: MyListingRow) => l.status === 'EXPIRED' || l.status === 'PAUSED' },
] as const

// `dot`: colour of the status dot on the phone list line.
const STATUS: Record<string, { cls: string, dot: string }> = {
  APPROVED: { cls: 'bg-tertiary-soft text-tertiary', dot: 'text-tertiary' },
  PENDING_REVIEW: { cls: 'bg-amber-100 text-amber-800', dot: 'text-amber-600' },
  REJECTED: { cls: 'bg-primary-fixed text-primary', dot: 'text-primary' },
  DRAFT: { cls: 'bg-surface-container-high text-on-surface-variant', dot: 'text-outline' },
  SOLD: { cls: 'bg-blue-100 text-blue-800', dot: 'text-blue-700' },
  EXPIRED: { cls: 'bg-surface-container-high text-on-surface-variant', dot: 'text-outline' },
  PAUSED: { cls: 'bg-surface-container-high text-on-surface-variant', dot: 'text-outline' },
}
// The status in words (current language); an unknown one as the server says it.
const statusLabel = (s: string) => (STATUS[s] ? (myListings.t as (k: string) => string)(`status.${s}`) : s)

function toCsv(rows: MyListingRow[]) {
  const t = myListings.t
  const head = [t('csv.title'), t('csv.status'), t('csv.price'), t('csv.currency'), t('csv.category'), t('csv.city'), t('csv.views'), t('csv.favourites'), t('csv.requests'), t('csv.published')]
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.map(l => [l.title, statusLabel(l.status), l.price ?? '', l.currency, l.category?.name, l.city, l.viewsCount, l.favoritesCount, l.contactsCount ?? 0, (l.publishedAt ?? l.createdAt).slice(0, 10)].map(esc).join(';'))
  return '﻿' + [head.map(esc).join(';'), ...lines].join('\n')
}

// "Mes annonces" (Seller Hub) mockup.
export default function MyListings({ onNavigate, onSelectListing, onEditListing, currentUser, onLogout }: Props) {
  const t = useT(myListings)
  const noCommission = useNoCommissionClaims()
  const { data, loading, refetch } = useQuery<{ myListings: { items: MyListingRow[] } }>(MY_LISTINGS_QUERY, { variables: { page: 1, pageSize: 200 } })
  const all = data?.myListings.items ?? []
  const { data: repData } = useQuery<{ myReputation: Reputation }>(MY_REPUTATION_QUERY)
  // Prices from "Tarifs & abonnements" (BO).
  const flashPack = useQuery<{ boostPacks: { pack: string; price: number; description: string }[] }>(BOOST_PACKS_QUERY, { variables: usePriceVars() }).data?.boostPacks.find(p => p.pack === 'BUMP_FLASH')
  const flashPrice = flashPack?.price
  // The bilan of each listing's latest boost (running or last ended).
  const { data: boostsData } = useQuery<{ myBoosts: RemoteBoost[] }>(MY_BOOSTS_QUERY, { fetchPolicy: 'cache-and-network' })
  const lastBoost = new Map<string, RemoteBoost>()
  for (const b of boostsData?.myBoosts ?? []) if (b.listing && b.report && !lastBoost.has(b.listing.id)) lastBoost.set(b.listing.id, b)
  const rep = repData?.myReputation
  const { data: walletData, refetch: refetchWallet } = useQuery<{ myWallet: WalletSummary }>(MY_WALLET_QUERY, { variables: usePriceVars() })
  const credits = walletData?.myWallet.credits ?? 0
  const creditValue = useCreditValue()
  const [boostFor, setBoostFor] = useState<MyListingRow | null>(null)
  const [deleteListing] = useMutation(DELETE_LISTING_WITH_REASON_MUTATION)
  const [pauseListing] = useMutation(PAUSE_LISTING_MUTATION)
  const [resumeListing] = useMutation(RESUME_LISTING_MUTATION)
  // « Mettre en pause » / « Supprimer » (reason asked), « Marquer comme vendu ».
  const [exitFor, setExitFor] = useState<{ action: 'pause' | 'delete'; l: MyListingRow } | null>(null)
  const [exitError, setExitError] = useState<string | null>(null)
  const [soldFor, setSoldFor] = useState<MyListingRow | null>(null)
  const [bumpListing, { loading: bumping }] = useMutation<{ bumpListing: BumpStatus }>(BUMP_LISTING_MUTATION)
  // « Annonce remontée en tête de … à 14 h 32 », credits, place, next auto.
  const proof = useBumpProof()

  const [tab, setTab] = useState<typeof TABS[number]['key']>('live')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState<'recent' | 'price-desc' | 'price-asc' | 'views'>('recent')
  const [page, setPage] = useState(1)
  const [offersFor, setOffersFor] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [qrFor, setQrFor] = useState<{ id: string; title: string } | null>(null)
  // « Ajouter un Reel » to a listing online.
  const [reelFor, setReelFor] = useState<MyListingRow | null>(null)
  const reelsOn = useReelSettings(useMemberCountryCode()).enabled
  const qrScans = useQuery<{ myListingQrCodes: MyListingQr[] }>(MY_LISTING_QR_CODES_QUERY, { fetchPolicy: 'cache-and-network' }).data?.myListingQrCodes ?? []
  const qrEnabled = useRules(useMemberCountryCode()).QR_LISTING_ENABLED !== 0
  const [flash, setFlash] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'boost' | 'bump', l: MyListingRow } | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Tabs overflow on phones: fade the right edge until scrolled to the end.
  const [tabsAtEnd, setTabsAtEnd] = useState(false)

  const categories = useMemo(() => [...new Map(all.filter(l => l.category).map(l => [l.category!.slug, l.category!.name])).entries()], [all])
  const cities = useMemo(() => [...new Set(all.map(l => l.city).filter(Boolean) as string[])], [all])
  const current = TABS.find(tb => tb.key === tab)!
  const rows = all
    .filter(current.match)
    .filter(l => !q || `${l.title} ${l.brand ?? ''}`.toLowerCase().includes(q.toLowerCase()))
    .filter(l => !cat || l.category?.slug === cat)
    .filter(l => !city || l.city === city)
    .sort((a, b) => sort === 'price-desc' ? (b.price ?? 0) - (a.price ?? 0)
      : sort === 'price-asc' ? (a.price ?? 0) - (b.price ?? 0)
        : sort === 'views' ? b.viewsCount - a.viewsCount
          : new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime())
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const shown = rows.slice((page - 1) * PAGE, page * PAGE)

  const live = all.filter(l => l.status === 'APPROVED')
  const stock = live.reduce((n, l) => n + (l.price ?? 0), 0)
  const views = all.reduce((n, l) => n + l.viewsCount, 0)
  const views24 = all.reduce((n, l) => n + (l.views24h ?? 0), 0)
  const discussions = all.reduce((n, l) => n + (l.activeConversationsCount ?? 0), 0)
  const pendingOffers = all.reduce((n, l) => n + (l.pendingOffersCount ?? 0), 0)

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = t('csv.fileName'); a.click(); URL.revokeObjectURL(url)
  }
  const [exiting, setExiting] = useState(false)
  // The reason picked: « Vendu sur Dilchap » asks « Vendu à qui ? » instead.
  const exit = (reason: ListingExitReason) => {
    if (!exitFor) return
    const { action, l } = exitFor
    if (reason === 'SOLD_ON_DILCHAP') { setExitFor(null); setSoldFor(l); return }
    setExiting(true)
    setExitError(null)
    const run = action === 'delete'
      ? deleteListing({ variables: { id: l.id, reason } })
      : pauseListing({ variables: { id: l.id, reason } })
    void run
      .then(() => { setExitFor(null); setFlash(action === 'delete' ? t('flash.deleted', { title: l.title }) : t('flash.paused', { title: l.title })); return refetch() })
      .catch((e: Error) => setExitError(e.message))
      .finally(() => setExiting(false))
  }
  const resume = (l: MyListingRow) => {
    void resumeListing({ variables: { id: l.id } })
      .then(() => { setFlash(t('flash.resumed', { title: l.title })); return refetch() })
      .catch((e: Error) => setFlash(e.message))
  }
  const activeFilters = (cat ? 1 : 0) + (city ? 1 : 0) + (sort !== 'recent' ? 1 : 0)
  const filterSelects = (cls: string) => (
    <>
      <Select value={cat} onChange={e => { setCat(e.target.value); setPage(1) }} className={cls}>
        <option value="">{t('filters.allCategories')}</option>
        {categories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
      </Select>
      <Select value={city} onChange={e => { setCity(e.target.value); setPage(1) }} className={cls}>
        <option value="">{t('filters.allAreas')}</option>
        {cities.map(c => <option key={c}>{c}</option>)}
      </Select>
    </>
  )
  const spendCredit = (l: MyListingRow) => void bumpListing({ variables: { id: l.id } })
    .then(r => { setFlash(null); if (r.data) proof.show(r.data.bumpListing); void refetch(); void refetchWallet() })
    .catch((e: Error) => setFlash(e.message))
  const republish = (l: MyListingRow) => void bumpListing({ variables: { id: l.id } }).then(() => { setFlash(t('flash.republished')); void refetch() })

  return (
    <AccountLayout active="seller-listings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1160px] pb-6">
        {/* Breadcrumb, heading and CSV export are desktop-only: the mobile shell already titles the page. */}
        <div className="mb-1 hidden text-label-sm uppercase text-on-surface-variant lg:block">{t('breadcrumb')}</div>
        <div className="mb-5 hidden flex-wrap items-end justify-between gap-3 lg:flex">
          <div>
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">{t('title')}</h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('intro')}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-container-high px-3 py-2.5 text-label-md text-on-surface hover:bg-surface-container-highest"><Download size={17} /> {t('export')}</button>
            <button onClick={() => onNavigate('seller-post')} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark"><PlusCircle size={18} /> {t('postNew')}</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative mb-3 lg:mb-4">
          <div onScroll={e => { const el = e.currentTarget; setTabsAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) }} className="flex gap-1 overflow-x-auto rounded-xl bg-surface-container-low p-1 [scrollbar-width:none]">
            {TABS.map(tb => {
              const n = all.filter(tb.match).length
              if (tb.key === 'review' && n === 0) return null
              const active = tab === tb.key
              return (
                <button key={tb.key} onClick={e => { setTab(tb.key); setPage(1); e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest' }) }} className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none px-3 py-2 text-label-md ${active ? 'bg-surface-lowest text-primary shadow-sm' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}>
                  {t(`tabs.${tb.key}` as const)} <span className={`rounded-full px-1.5 text-label-sm ${active ? 'bg-primary-fixed text-primary' : 'bg-surface-container-high'}`}>{n}</span>
                </button>
              )
            })}
          </div>
          {!tabsAtEnd && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-xl bg-gradient-to-l from-surface-container-low to-transparent lg:hidden" />}
        </div>

        {/* Filters: search + sheet on mobile, inline selects on desktop */}
        <div className="mb-3 flex items-center gap-2 rounded-xl lg:mb-4 lg:flex-wrap lg:bg-surface-lowest lg:p-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2.5 lg:min-w-[200px] lg:py-2">
            <Search size={17} className="shrink-0 text-outline" />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('searchPlaceholder')} className="w-full min-w-0 border-none bg-transparent text-body-sm text-on-surface outline-none" />
          </label>
          <button onClick={() => setFiltersOpen(true)} aria-label={t('filterSort')} className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-container-low text-on-surface lg:hidden">
            <Icon name="tune" size={20} />
            {activeFilters > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{activeFilters}</span>}
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            {filterSelects('cursor-pointer rounded-lg border-none bg-surface-container-low px-3 py-2 text-label-md text-on-surface outline-none')}
            <label className="flex items-center gap-1 text-label-md text-on-surface-variant">
              {t('sortLabel')}
              <Select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="cursor-pointer rounded-lg border-none bg-transparent py-2 text-label-md text-on-surface outline-none">
                <option value="recent">{t('sort.recent')}</option>
                <option value="views">{t('sort.views')}</option>
                <option value="price-desc">{t('sort.priceDesc')}</option>
                <option value="price-asc">{t('sort.priceAsc')}</option>
              </Select>
            </label>
          </div>
        </div>
        <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t('filterSort')}
          footer={
            <div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
              <button onClick={() => { setCat(''); setCity(''); setSort('recent'); setPage(1) }} className="h-12 flex-1 cursor-pointer whitespace-nowrap rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">{t('reset')}</button>
              <button onClick={() => setFiltersOpen(false)} className="h-12 flex-[1.4] cursor-pointer whitespace-nowrap rounded-xl border-none bg-primary text-label-lg text-white">{t('seeResults', { count: rows.length, n: String(rows.length) })}</button>
            </div>
          }>
          <div className="flex flex-col gap-3">
            <span className="text-label-md text-on-surface">{t('catArea')}</span>
            {filterSelects('w-full cursor-pointer rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3 text-body-md text-on-surface outline-none')}
            <span className="mt-1 text-label-md text-on-surface">{t('sortBy')}</span>
            <div className="grid grid-cols-2 gap-2">
              {([['recent', t('sort.recent')], ['views', t('sort.views')], ['price-desc', t('sort.priceDesc')], ['price-asc', t('sort.priceAsc')]] as const).map(([v, label]) => (
                <button key={v} onClick={() => setSort(v)} aria-pressed={sort === v} className={`h-11 cursor-pointer whitespace-nowrap rounded-xl border-[1.5px] border-solid text-label-md ${sort === v ? 'border-on-surface bg-on-surface text-surface-lowest' : 'border-outline-variant bg-surface-lowest text-on-surface'}`}>{label}</button>
              ))}
            </div>
          </div>
        </BottomSheet>

        {/* Boost banner — compact strip on mobile */}
        <section className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-primary-container p-3 text-white lg:mb-5 lg:gap-4 lg:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 lg:h-12 lg:w-12"><Rocket size={22} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-label-lg lg:text-headline-sm">{t('visibility.title')}</div>
            <p className="m-0 text-body-sm text-white/90">{flashPrice ? t.rich(creditValue > 0 ? 'visibility.formulasFromValue' : 'visibility.formulasFrom', { credits: creditsLabel(flashPrice), price: <Price amount={flashPrice * creditValue} /> }) : t('visibility.formulas')}</p>
          </div>
          <button onClick={() => onNavigate('seller-premium')} className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-white px-3 py-2 text-label-md text-primary lg:px-4 lg:py-2.5"><Rocket size={16} /> <span className="lg:hidden">{t('visibility.boost')}</span><span className="hidden lg:inline">{t('visibility.boostListing')}</span></button>
        </section>

        {/* KPIs (desktop) */}
        <div className="mb-5 hidden grid-cols-4 gap-3 lg:grid">
          {[
            { label: t('kpi.stock'), value: <><Price amount={stock} /></>, sub: noCommission ? <span className="flex items-center gap-1 text-tertiary"><CheckCircle2 size={13} /> {t('kpi.noHiddenFees', { amount: fmtCfa(0) })}</span> : null },
            { label: t('kpi.views'), value: fmtNumber(views), sub: <span className="text-tertiary">{t('kpi.views24', { n: String(views24) })}</span> },
            { label: t('kpi.discussions'), value: <>{t.rich('kpi.buyers', { count: discussions, n: String(discussions), small: c => <span className="text-body-sm font-normal">{c}</span> })}</>, sub: <span className="flex items-center gap-1"><Tag size={13} /> {t('kpi.pendingOffers', { count: pendingOffers, n: String(pendingOffers) })}</span> },
            { label: t('kpi.reputation'), value: rep?.reviewsCount ? <span className="text-tertiary">{t.rich('kpi.rating', { avg: rep.averageRating.toFixed(1), n: String(rep.reviewsCount), small: c => <span className="text-body-sm font-normal text-on-surface-variant">{c}</span> })}</span> : '—', sub: <span className="flex items-center gap-1"><Star size={13} /> {currentUser?.badge ? BADGE_LABEL[currentUser.badge] : t('kpi.buyerReviews')}</span> },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-outline-variant bg-surface-lowest p-3">
              <div className="text-label-sm uppercase text-on-surface-variant">{k.label}</div>
              <div className="mt-1 text-headline-sm font-extrabold text-on-surface">{k.value}</div>
              <div className="text-body-sm text-on-surface-variant">{k.sub}</div>
            </div>
          ))}
        </div>

        {flash && <p className="mb-3 flex items-center gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><CheckCircle2 size={16} className="shrink-0" /> {flash}</p>}

        {/* Cards — laid out like YouTube's video feed: the 16:9 photo on
            top (price where a video's duration sits), the text underneath:
            two-line title with the ⋮ menu beside it, a status · place line,
            a stats line, then the one action that matters now. */}
        {loading && <p className="text-on-surface-variant">{t('loading')}</p>}
        {!loading && shown.length === 0 && (
          <EmptyState icon="empty-box" fallback="inventory_2" title={t('empty.title')} text={t('empty.text')} action={{ label: t('empty.action'), onClick: () => onNavigate('seller-post') }} />
        )}
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map(l => {
            const boosted = future(l.boostExpiresAt) || future(l.autoBumpUntil) || future(l.urgentUntil)
            const offers = l.pendingOffersCount ?? 0
            const photos = l.mediaCount?.length ?? (l.coverImageUrl ? 1 : 0)
            const status = STATUS[l.status]
            const date = l.publishedAt ?? l.createdAt
            const contacts = l.contactsCount ?? 0
            const chip = 'flex h-9 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-none px-4 text-label-md'
            // The one action that matters for this listing now; the rest is in ⋮.
            const primary = l.status === 'APPROVED' ? (offers > 0 ? (
              <button onClick={() => setOffersFor(offersFor === l.id ? null : l.id)} className={`${chip} bg-tertiary text-white`}><MessageSquare size={15} /> {t('card.seeOffer')}</button>
            ) : boosted ? (
              <button onClick={() => setBoostFor(l)} className={`${chip} bg-primary-fixed text-primary`}><Rocket size={15} /> {t('card.extendBoost')}</button>
            ) : (
              // Enough credits: spend them at once; otherwise the pay sheet offers to buy some.
              <button disabled={flashPrice === undefined} onClick={() => setConfirm({ kind: credits >= (flashPrice ?? 0) ? 'bump' : 'boost', l })} className={`${chip} bg-primary text-white disabled:opacity-60`}><Rocket size={15} /> {flashPrice ? t('card.bumpPrice', { credits: creditsLabel(flashPrice) }) : t('card.bump')}</button>
            )) : l.status === 'EXPIRED' ? (
              <button onClick={() => republish(l)} className={`${chip} bg-primary text-white`}><Archive size={15} /> {t('card.republish')}</button>
            ) : l.status === 'DRAFT' ? (
              <button onClick={() => onEditListing(l.id)} className={`${chip} bg-primary text-white`}><Edit3 size={15} /> {t('card.complete')}</button>
            ) : null
            const item = 'flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md hover:bg-surface-container-low'
            return (
              <article key={l.id} className="min-w-0">
                {/* Photo: 16:9, full width */}
                <button onClick={() => onSelectListing(l.id)} aria-label={t('card.seeAria', { title: l.title })} className="relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-none bg-surface-container-low p-0">
                  {/* Placeholder stays underneath; a missing card thumbnail falls back to the photo, a broken one hides itself. */}
                  <Icon name="image" size={36} className="text-outline" />
                  {l.coverImageUrl && <img src={thumbnailUrl(l.coverImageUrl)} alt="" loading="lazy" decoding="async" onError={e => { const img = e.currentTarget; if (l.coverImageUrl && !img.src.endsWith(l.coverImageUrl)) img.src = l.coverImageUrl; else img.style.display = 'none' }} className="absolute inset-0 h-full w-full object-cover" />}
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-label-sm font-bold text-white"><Price amount={l.price} currency={l.currency} /></span>
                  {photos > 1 && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] text-white"><Icon name="photo_library" size={12} /> {photos}</span>}
                  {/* The buyers' pill (En vedette, Turbo, Urgent, Remontée… in the BO's words); « Boost » until the API has one. */}
                  {l.promoBadge ? <PromoPill badge={l.promoBadge} className="absolute right-2 top-2" />
                    : boosted && <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white"><Rocket size={12} /> Boost</span> /* i18n-ignore: same word in English */}
                </button>

                {/* Text underneath */}
                <div className="mt-2.5 flex gap-2">
                  <div className="min-w-0 flex-1">
                    <button onClick={() => onSelectListing(l.id)} className="line-clamp-2 cursor-pointer border-none bg-transparent p-0 text-left text-label-lg leading-snug text-on-surface hover:text-primary">{l.title}</button>
                    <p className="m-0 mt-1 truncate text-body-sm text-on-surface-variant">
                      <span className={status?.dot ?? ''}>●</span> {statusLabel(l.status)} · {l.locationLabel ? `${l.locationLabel}, ` : ''}{l.city}
                    </p>
                    <p className="m-0 truncate text-body-sm text-on-surface-variant">
                      {t('card.views', { count: l.viewsCount, n: fmtNumber(l.viewsCount) })} · {t('card.favourites', { count: l.favoritesCount, n: String(l.favoritesCount) })}{contacts ? ` · ${t('card.requests', { count: contacts, n: String(contacts) })}` : ''} · {formatRelativeDate(date).toLowerCase()}
                    </p>
                    {l.status === 'APPROVED' && <BumpLine s={l} />}
                    {lastBoost.get(l.id) && <ReportLine report={lastBoost.get(l.id)!.report} className="mt-0.5" />}
                    {l.staffEditedAt && <p className="m-0 truncate text-body-sm text-on-surface-variant" title={t('card.staffEditedTitle')}>{t('card.staffEdited', { date: fmtDate(l.staffEditedAt, { day: 'numeric', month: 'long', year: 'numeric' }) })}</p>}
                  </div>
                  <div className="relative shrink-0">
                    <button onClick={() => setMenuFor(menuFor === l.id ? null : l.id)} title={t('card.moreActions')} aria-label={t('card.moreActions')} aria-expanded={menuFor === l.id} className="-mr-2 -mt-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface hover:bg-surface-container-high"><Icon name="more_vert" size={20} /></button>
                    {menuFor === l.id && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-outline-variant bg-surface-lowest p-1 shadow-float">
                        <button onClick={() => { setMenuFor(null); onSelectListing(l.id) }} className={`${item} text-on-surface`}><Eye size={16} /> {t('menu.see')}</button>
                        <button onClick={() => { setMenuFor(null); onEditListing(l.id) }} className={`${item} text-on-surface`}><Edit3 size={16} /> {t('menu.edit')}</button>
                        <button onClick={() => { setMenuFor(null); setOffersFor(l.id) }} className={`${item} text-on-surface`}><Tag size={16} /> {t('menu.offers')}</button>
                        {l.status === 'APPROVED' && <button onClick={() => { setMenuFor(null); requestOpenLink(`/?shortcut=seller-premium&boost=${l.id}`) }} className={`${item} text-on-surface`}><Icon name="history" size={16} /> {t('menu.bumps')}</button>}
                        {qrEnabled && l.status !== 'DRAFT' && l.status !== 'REJECTED' && (() => {
                          const scans = qrScans.find(q => q.listingId === l.id)?.scanCount
                          return <button onClick={() => { setMenuFor(null); setQrFor({ id: l.id, title: l.title }) }} className={`${item} text-on-surface`}><Icon name="qr_code_2" size={16} /> {scans ? t('menu.qrScans', { count: scans, n: String(scans) }) : t('menu.qr')}</button>
                        })()}
                        {reelsOn && (l.status === 'APPROVED' || l.status === 'PENDING_REVIEW') && <button onClick={() => { setMenuFor(null); setReelFor(l) }} className={`${item} text-on-surface`}><Icon name="video_call" size={16} /> {t('menu.addReel')}</button>}
                        {['APPROVED', 'PAUSED', 'EXPIRED'].includes(l.status) && <button onClick={() => { setMenuFor(null); setSoldFor(l) }} className={`${item} text-on-surface`}><Icon name="handshake" size={16} /> {t('menu.markSold')}</button>}
                        {l.status === 'APPROVED' && <button onClick={() => { setMenuFor(null); setExitError(null); setExitFor({ action: 'pause', l }) }} className={`${item} text-on-surface`}><Icon name="pause" size={16} /> {t('menu.pause')}</button>}
                        {l.status === 'PAUSED' && <button onClick={() => { setMenuFor(null); resume(l) }} className={`${item} text-on-surface`}><Icon name="play_arrow" size={16} /> {t('menu.resume')}</button>}
                        <button onClick={() => { setMenuFor(null); setExitError(null); setExitFor({ action: 'delete', l }) }} className={`${item} text-primary hover:bg-primary-fixed/40`}><Trash2 size={16} /> {t('menu.delete')}</button>
                      </div>
                    )}
                  </div>
                </div>
                {(primary || offers > 0) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {primary}
                    {offers > 0 && l.status !== 'APPROVED' && <span className="flex h-9 items-center gap-1 rounded-full bg-tertiary-soft px-3 text-label-md text-tertiary"><Tag size={14} /> {t('offers', { count: offers, n: String(offers) })}</span>}
                  </div>
                )}
                {offersFor === l.id && <div className="mt-3 rounded-2xl border border-outline-variant"><ListingOffersPanel listingId={l.id} /></div>}
              </article>
            )
          })}
        </div>

        <ListingQrSheet listing={qrFor} onClose={() => setQrFor(null)} />
        {reelFor && <Suspense fallback={null}><ReelComposer listing={{ id: reelFor.id, title: reelFor.title, coverImageUrl: reelFor.coverImageUrl }} open onClose={() => setReelFor(null)} onOpenReels={() => { setReelFor(null); onNavigate('seller-reels') }} /></Suspense>}
        {proof.sheet}

        <ExitReasonSheet
          open={!!exitFor}
          action={exitFor?.action ?? 'pause'}
          title={exitFor?.l.title ?? ''}
          busy={exiting}
          error={exitError}
          onPick={exit}
          onClose={() => setExitFor(null)}
        />
        <MarkSoldSheet
          open={!!soldFor}
          listingId={soldFor?.id ?? null}
          onClose={() => setSoldFor(null)}
          onDone={status => { setFlash(status === 'SOLD' ? t('flash.soldMarked', { title: soldFor?.title ?? '' }) : t('flash.saleRecorded')); setSoldFor(null); void refetch() }}
        />
        <WalletPaySheet
          open={confirm?.kind === 'boost'}
          title={t('bump.title')}
          amount={flashPrice ?? 0}
          request={confirm?.kind === 'boost' ? { kind: 'BOOST_PACK', product: 'BUMP_FLASH', listingId: confirm.l.id } : null}
          onClose={() => setConfirm(null)}
          onPaid={() => { if (confirm) proof.showFor(confirm.l.id); void refetch(); void refetchWallet() }}
        >
          <b className="block text-label-lg text-on-surface">{t('bump.title')}</b>
          <span className="line-clamp-1">{t('quoted', { title: confirm?.l.title })}</span>
        </WalletPaySheet>

        {boostFor && <BoostPicker open listing={boostFor} onClose={() => setBoostFor(null)} onDone={() => { void refetch(); void refetchWallet() }} />}
        <ConfirmSheet
          open={confirm?.kind === 'bump'}
          title={t('bump.confirmTitle')}
          confirmLabel={t('bump.use', { credits: creditsLabel(flashPrice ?? 0) })}
          loading={bumping}
          onConfirm={() => { if (confirm) { spendCredit(confirm.l); setConfirm(null) } }}
          onClose={() => setConfirm(null)}
        >
          {t.rich(creditValue > 0 && flashPrice ? 'bump.textValue' : 'bump.text', { title: confirm?.l.title, credits: creditsLabel(flashPrice ?? 0), price: <Price amount={(flashPrice ?? 0) * creditValue} />, b: c => <b className="text-on-surface">{c}</b> })}
        </ConfirmSheet>

        {rows.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-body-sm text-on-surface-variant">{t('pagination.showing', { count: rows.length, from: String((page - 1) * PAGE + 1), to: String(Math.min(page * PAGE, rows.length)), n: String(rows.length) })}</span>
            {pages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} aria-label={t('pagination.prev')} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent disabled:opacity-30"><ChevronLeft size={17} /></button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`h-10 min-w-10 cursor-pointer rounded-lg border-none px-2 text-label-md ${p === page ? 'bg-primary text-white' : 'bg-transparent text-on-surface'}`}>{p}</button>
                ))}
                <button disabled={page === pages} onClick={() => setPage(p => p + 1)} aria-label={t('pagination.next')} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent disabled:opacity-30"><ChevronRight size={17} /></button>
              </div>
            )}
          </div>
        )}

        <section className="mt-6 flex flex-col gap-3 rounded-2xl bg-surface-container-low p-5 md:flex-row md:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><ShieldCheck size={22} /></span>
          <div className="flex-1">
            <div className="text-headline-sm text-on-surface">{t('safety.title')}</div>
            <p className="m-0 text-body-sm text-on-surface-variant">{t('safety.text')}</p>
          </div>
          <button onClick={() => onNavigate('seller-orders')} className="flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary hover:underline">{t('safety.seeSales')} <ArrowRight size={15} /></button>
        </section>
      </div>
    </AccountLayout>
  )
}
