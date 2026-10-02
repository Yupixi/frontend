import EmptyState from '../../components/EmptyState'
import { useMemo, useState } from 'react'
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
import { MY_LISTINGS_QUERY, DELETE_LISTING_MUTATION, BUMP_LISTING_MUTATION, type MyListingRow } from '../../graphql/listings'
import { MY_REPUTATION_QUERY, MY_WALLET_QUERY, type Reputation, type WalletSummary } from '../../graphql/sellerHub'
import type { AuthUser } from '../../graphql/auth'
import Select from '../../components/Select'
import BottomSheet from '../../components/BottomSheet'
import ConfirmSheet from '../../components/ConfirmSheet'
import ListingQrSheet from '../../components/ListingQrSheet'
import { MY_LISTING_QR_CODES_QUERY, type MyListingQr } from '../../graphql/memberQr'
import { useRules } from '../../lib/rules'
import WalletPaySheet from '../../components/WalletPaySheet'
import { BOOST_PACKS_QUERY } from '../../graphql/promotions'
import { creditsLabel } from '../../components/Credits'
import { BADGE_LABEL } from '../../graphql/badges'
import { useNoCommissionClaims } from '../../lib/site'
import { useMemberCountryCode, usePriceVars } from '../../lib/countries'

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
  { key: 'live', label: 'En ligne', match: (l: MyListingRow) => l.status === 'APPROVED' },
  { key: 'nego', label: 'En négociation chat', match: negotiating },
  { key: 'sold', label: 'Vendues', match: (l: MyListingRow) => l.status === 'SOLD' },
  { key: 'review', label: 'En validation', match: (l: MyListingRow) => l.status === 'PENDING_REVIEW' || l.status === 'REJECTED' },
  { key: 'draft', label: 'Brouillons', match: (l: MyListingRow) => l.status === 'DRAFT' },
  { key: 'archived', label: 'Archivées', match: (l: MyListingRow) => l.status === 'EXPIRED' || l.status === 'PAUSED' },
] as const

// `dot`: colour of the status dot on the phone list line.
const STATUS: Record<string, { label: string, cls: string, dot: string }> = {
  APPROVED: { label: 'En ligne', cls: 'bg-tertiary-soft text-tertiary', dot: 'text-tertiary' },
  PENDING_REVIEW: { label: 'En validation', cls: 'bg-amber-100 text-amber-800', dot: 'text-amber-600' },
  REJECTED: { label: 'Refusée', cls: 'bg-primary-fixed text-primary', dot: 'text-primary' },
  DRAFT: { label: 'Brouillon', cls: 'bg-surface-container-high text-on-surface-variant', dot: 'text-outline' },
  SOLD: { label: 'Vendue', cls: 'bg-blue-100 text-blue-800', dot: 'text-blue-700' },
  EXPIRED: { label: 'Archivée', cls: 'bg-surface-container-high text-on-surface-variant', dot: 'text-outline' },
  PAUSED: { label: 'En pause', cls: 'bg-surface-container-high text-on-surface-variant', dot: 'text-outline' },
}

function toCsv(rows: MyListingRow[]) {
  const head = ['Titre', 'Statut', 'Prix', 'Devise', 'Catégorie', 'Ville', 'Vues', 'Favoris', 'Demandes', 'Publiée le']
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.map(l => [l.title, STATUS[l.status]?.label ?? l.status, l.price ?? '', l.currency, l.category?.name, l.city, l.viewsCount, l.favoritesCount, l.contactsCount ?? 0, (l.publishedAt ?? l.createdAt).slice(0, 10)].map(esc).join(';'))
  return '﻿' + [head.map(esc).join(';'), ...lines].join('\n')
}

// "Mes annonces" (Seller Hub) mockup.
export default function MyListings({ onNavigate, onSelectListing, onEditListing, currentUser, onLogout }: Props) {
  const noCommission = useNoCommissionClaims()
  const { data, loading, refetch } = useQuery<{ myListings: { items: MyListingRow[] } }>(MY_LISTINGS_QUERY, { variables: { page: 1, pageSize: 200 } })
  const all = data?.myListings.items ?? []
  const { data: repData } = useQuery<{ myReputation: Reputation }>(MY_REPUTATION_QUERY)
  // Prices from "Tarifs & abonnements" (BO).
  const flashPrice = useQuery<{ boostPacks: { pack: string; price: number }[] }>(BOOST_PACKS_QUERY, { variables: usePriceVars() }).data?.boostPacks.find(p => p.pack === 'BUMP_FLASH')?.price
  const rep = repData?.myReputation
  const { data: walletData, refetch: refetchWallet } = useQuery<{ myWallet: WalletSummary }>(MY_WALLET_QUERY, { variables: usePriceVars() })
  const credits = walletData?.myWallet.credits ?? 0
  const [deleteListing] = useMutation(DELETE_LISTING_MUTATION)
  const [bumpListing, { loading: bumping }] = useMutation(BUMP_LISTING_MUTATION)

  const [tab, setTab] = useState<typeof TABS[number]['key']>('live')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState<'recent' | 'price-desc' | 'price-asc' | 'views'>('recent')
  const [page, setPage] = useState(1)
  const [offersFor, setOffersFor] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [qrFor, setQrFor] = useState<{ id: string; title: string } | null>(null)
  const qrScans = useQuery<{ myListingQrCodes: MyListingQr[] }>(MY_LISTING_QR_CODES_QUERY, { fetchPolicy: 'cache-and-network' }).data?.myListingQrCodes ?? []
  const qrEnabled = useRules(useMemberCountryCode()).QR_LISTING_ENABLED !== 0
  const [flash, setFlash] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{ kind: 'delete' | 'boost' | 'bump', l: MyListingRow } | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Tabs overflow on phones: fade the right edge until scrolled to the end.
  const [tabsAtEnd, setTabsAtEnd] = useState(false)

  const categories = useMemo(() => [...new Map(all.filter(l => l.category).map(l => [l.category!.slug, l.category!.name])).entries()], [all])
  const cities = useMemo(() => [...new Set(all.map(l => l.city).filter(Boolean) as string[])], [all])
  const current = TABS.find(t => t.key === tab)!
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
    const a = document.createElement('a'); a.href = url; a.download = 'mes-annonces-dilchap.csv'; a.click(); URL.revokeObjectURL(url)
  }
  const [deleting, setDeleting] = useState(false)
  const remove = (l: MyListingRow) => {
    setDeleting(true)
    void deleteListing({ variables: { id: l.id } })
      .then(() => refetch())
      .catch((e: Error) => setFlash(e.message))
      .finally(() => { setDeleting(false); setConfirm(null) })
  }
  const activeFilters = (cat ? 1 : 0) + (city ? 1 : 0) + (sort !== 'recent' ? 1 : 0)
  const filterSelects = (cls: string) => (
    <>
      <Select value={cat} onChange={e => { setCat(e.target.value); setPage(1) }} className={cls}>
        <option value="">Toutes catégories</option>
        {categories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
      </Select>
      <Select value={city} onChange={e => { setCity(e.target.value); setPage(1) }} className={cls}>
        <option value="">Toutes communes</option>
        {cities.map(c => <option key={c}>{c}</option>)}
      </Select>
    </>
  )
  const spendCredit = (l: MyListingRow) => void bumpListing({ variables: { id: l.id } })
    .then(() => { setFlash(`« ${l.title} » est remontée en tête (${creditsLabel(flashPrice ?? 0)} utilisés).`); void refetch(); void refetchWallet() })
    .catch((e: Error) => setFlash(e.message))
  const republish = (l: MyListingRow) => void bumpListing({ variables: { id: l.id } }).then(() => { setFlash('Annonce remise en ligne.'); void refetch() })

  return (
    <AccountLayout active="seller-listings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1160px] pb-6">
        {/* Breadcrumb, heading and CSV export are desktop-only: the mobile shell already titles the page. */}
        <div className="mb-1 hidden text-label-sm uppercase text-on-surface-variant lg:block">Dilchap Seller › Vente directe</div>
        <div className="mb-5 hidden flex-wrap items-end justify-between gap-3 lg:flex">
          <div>
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">Mes annonces</h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">Gérez votre catalogue de vente, suivez vos vues et boostez vos pépites auprès des acheteurs.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-container-high px-3 py-2.5 text-label-md text-on-surface hover:bg-surface-container-highest"><Download size={17} /> Exporter (.csv)</button>
            <button onClick={() => onNavigate('seller-post')} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark"><PlusCircle size={18} /> Publier une nouvelle annonce</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative mb-3 lg:mb-4">
          <div onScroll={e => { const t = e.currentTarget; setTabsAtEnd(t.scrollLeft + t.clientWidth >= t.scrollWidth - 4) }} className="flex gap-1 overflow-x-auto rounded-xl bg-surface-container-low p-1 [scrollbar-width:none]">
            {TABS.map(t => {
              const n = all.filter(t.match).length
              if (t.key === 'review' && n === 0) return null
              const active = tab === t.key
              return (
                <button key={t.key} onClick={e => { setTab(t.key); setPage(1); e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest' }) }} className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none px-3 py-2 text-label-md ${active ? 'bg-surface-lowest text-primary shadow-sm' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}>
                  {t.label} <span className={`rounded-full px-1.5 text-label-sm ${active ? 'bg-primary-fixed text-primary' : 'bg-surface-container-high'}`}>{n}</span>
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
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Rechercher par titre, marque…" className="w-full min-w-0 border-none bg-transparent text-body-sm text-on-surface outline-none" />
          </label>
          <button onClick={() => setFiltersOpen(true)} aria-label="Filtrer et trier" className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-container-low text-on-surface lg:hidden">
            <Icon name="tune" size={20} />
            {activeFilters > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{activeFilters}</span>}
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            {filterSelects('cursor-pointer rounded-lg border-none bg-surface-container-low px-3 py-2 text-label-md text-on-surface outline-none')}
            <label className="flex items-center gap-1 text-label-md text-on-surface-variant">
              Trier :
              <Select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="cursor-pointer rounded-lg border-none bg-transparent py-2 text-label-md text-on-surface outline-none">
                <option value="recent">Plus récentes</option>
                <option value="views">Plus vues</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="price-asc">Prix croissant</option>
              </Select>
            </label>
          </div>
        </div>
        <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtrer et trier"
          footer={
            <div className="flex gap-2 border-0 border-t border-solid border-outline-variant px-4 py-3">
              <button onClick={() => { setCat(''); setCity(''); setSort('recent'); setPage(1) }} className="h-12 flex-1 cursor-pointer whitespace-nowrap rounded-xl border-none bg-surface-container-high text-label-lg text-on-surface">Réinitialiser</button>
              <button onClick={() => setFiltersOpen(false)} className="h-12 flex-[1.4] cursor-pointer whitespace-nowrap rounded-xl border-none bg-primary text-label-lg text-white">Voir {rows.length} annonce{rows.length > 1 ? 's' : ''}</button>
            </div>
          }>
          <div className="flex flex-col gap-3">
            <span className="text-label-md text-on-surface">Catégorie et commune</span>
            {filterSelects('w-full cursor-pointer rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3 text-body-md text-on-surface outline-none')}
            <span className="mt-1 text-label-md text-on-surface">Trier par</span>
            <div className="grid grid-cols-2 gap-2">
              {([['recent', 'Plus récentes'], ['views', 'Plus vues'], ['price-desc', 'Prix décroissant'], ['price-asc', 'Prix croissant']] as const).map(([v, label]) => (
                <button key={v} onClick={() => setSort(v)} aria-pressed={sort === v} className={`h-11 cursor-pointer whitespace-nowrap rounded-xl border-[1.5px] border-solid text-label-md ${sort === v ? 'border-on-surface bg-on-surface text-surface-lowest' : 'border-outline-variant bg-surface-lowest text-on-surface'}`}>{label}</button>
              ))}
            </div>
          </div>
        </BottomSheet>

        {/* Boost banner — compact strip on mobile */}
        <section className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-primary-container p-3 text-white lg:mb-5 lg:gap-4 lg:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 lg:h-12 lg:w-12"><Rocket size={22} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-label-lg lg:text-headline-sm"><span className="lg:hidden">Vendez plus vite</span><span className="hidden lg:inline">Besoin de vendre plus vite ?</span> <span className="hidden rounded bg-white/20 px-1.5 text-label-sm lg:inline">Flash 48h</span></div>
            <p className="m-0 text-body-sm text-white/90 lg:hidden">Mise en avant{flashPrice ? ` dès ${creditsLabel(flashPrice)}` : ''}</p>
            <p className="m-0 hidden text-body-sm text-white/90 lg:block">Les annonces boostées passent en tête des résultats et dans les pépites de l'accueil. {flashPrice ? <>Remontées dès <b className="underline">{creditsLabel(flashPrice)}</b>.</> : null}</p>
          </div>
          <button onClick={() => onNavigate('seller-premium')} className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-white px-3 py-2 text-label-md text-primary lg:px-4 lg:py-2.5"><Rocket size={16} /> <span className="lg:hidden">Booster</span><span className="hidden lg:inline">Booster une annonce</span></button>
        </section>

        {/* KPIs (desktop) */}
        <div className="mb-5 hidden grid-cols-4 gap-3 lg:grid">
          {[
            { label: 'Valeur du stock actif', value: <><Price amount={stock} /></>, sub: noCommission ? <span className="flex items-center gap-1 text-tertiary"><CheckCircle2 size={13} /> 0 F de frais cachés</span> : null },
            { label: 'Vues totales', value: views.toLocaleString('fr-FR'), sub: <span className="text-tertiary">+{views24} sur 24h</span> },
            { label: 'Discussions en cours', value: <>{discussions} <span className="text-body-sm font-normal">acheteur{discussions > 1 ? 's' : ''}</span></>, sub: <span className="flex items-center gap-1"><Tag size={13} /> {pendingOffers} offre{pendingOffers > 1 ? 's' : ''} en attente</span> },
            { label: 'Indice de réputation', value: rep?.reviewsCount ? <span className="text-tertiary">{rep.averageRating.toFixed(1)} / 5 <span className="text-body-sm font-normal text-on-surface-variant">({rep.reviewsCount} avis)</span></span> : '—', sub: <span className="flex items-center gap-1"><Star size={13} /> {currentUser?.badge ? BADGE_LABEL[currentUser.badge] : 'Avis des acheteurs'}</span> },
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
        {loading && <p className="text-on-surface-variant">Chargement…</p>}
        {!loading && shown.length === 0 && (
          <EmptyState icon="empty-box" fallback="inventory_2" title="Aucune annonce ici" text="Publiez un article en quelques minutes : photos, prix et lieu de remise." action={{ label: 'Publier une annonce', onClick: () => onNavigate('seller-post') }} />
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
              <button onClick={() => setOffersFor(offersFor === l.id ? null : l.id)} className={`${chip} bg-tertiary text-white`}><MessageSquare size={15} /> Voir l'offre</button>
            ) : boosted ? (
              <button onClick={() => onNavigate('seller-premium')} className={`${chip} bg-primary-fixed text-primary`}><Rocket size={15} /> Prolonger le boost</button>
            ) : (
              // Enough credits: spend them at once; otherwise the pay sheet offers to buy some.
              <button disabled={flashPrice === undefined} onClick={() => setConfirm({ kind: credits >= (flashPrice ?? 0) ? 'bump' : 'boost', l })} className={`${chip} bg-primary text-white disabled:opacity-60`}><Rocket size={15} /> Remonter{flashPrice ? ` · ${creditsLabel(flashPrice)}` : ''}</button>
            )) : l.status === 'EXPIRED' ? (
              <button onClick={() => republish(l)} className={`${chip} bg-primary text-white`}><Archive size={15} /> Remettre en ligne</button>
            ) : l.status === 'DRAFT' ? (
              <button onClick={() => onEditListing(l.id)} className={`${chip} bg-primary text-white`}><Edit3 size={15} /> Compléter</button>
            ) : null
            const item = 'flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md hover:bg-surface-container-low'
            return (
              <article key={l.id} className="min-w-0">
                {/* Photo: 16:9, full width */}
                <button onClick={() => onSelectListing(l.id)} aria-label={`Voir « ${l.title} »`} className="relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-none bg-surface-container-low p-0">
                  {/* Placeholder stays underneath; a missing card thumbnail falls back to the photo, a broken one hides itself. */}
                  <Icon name="image" size={36} className="text-outline" />
                  {l.coverImageUrl && <img src={thumbnailUrl(l.coverImageUrl)} alt="" loading="lazy" decoding="async" onError={e => { const img = e.currentTarget; if (l.coverImageUrl && !img.src.endsWith(l.coverImageUrl)) img.src = l.coverImageUrl; else img.style.display = 'none' }} className="absolute inset-0 h-full w-full object-cover" />}
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-label-sm font-bold text-white"><Price amount={l.price} currency={l.currency} /></span>
                  {photos > 1 && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] text-white"><Icon name="photo_library" size={12} /> {photos}</span>}
                  {boosted && <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white"><Rocket size={12} /> Boost</span>}
                </button>

                {/* Text underneath */}
                <div className="mt-2.5 flex gap-2">
                  <div className="min-w-0 flex-1">
                    <button onClick={() => onSelectListing(l.id)} className="line-clamp-2 cursor-pointer border-none bg-transparent p-0 text-left text-label-lg leading-snug text-on-surface hover:text-primary">{l.title}</button>
                    <p className="m-0 mt-1 truncate text-body-sm text-on-surface-variant">
                      <span className={status?.dot ?? ''}>●</span> {status?.label ?? l.status} · {l.locationLabel ? `${l.locationLabel}, ` : ''}{l.city}
                    </p>
                    <p className="m-0 truncate text-body-sm text-on-surface-variant">
                      {l.viewsCount.toLocaleString('fr-FR')} vue{l.viewsCount > 1 ? 's' : ''} · {l.favoritesCount} favori{l.favoritesCount > 1 ? 's' : ''}{contacts ? ` · ${contacts} demande${contacts > 1 ? 's' : ''}` : ''} · {formatRelativeDate(date).toLowerCase()}
                    </p>
                  </div>
                  <div className="relative shrink-0">
                    <button onClick={() => setMenuFor(menuFor === l.id ? null : l.id)} title="Plus d'actions" aria-label="Plus d'actions" aria-expanded={menuFor === l.id} className="-mr-2 -mt-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface hover:bg-surface-container-high"><Icon name="more_vert" size={20} /></button>
                    {menuFor === l.id && (
                      <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-outline-variant bg-surface-lowest p-1 shadow-float">
                        <button onClick={() => { setMenuFor(null); onSelectListing(l.id) }} className={`${item} text-on-surface`}><Eye size={16} /> Voir l'annonce</button>
                        <button onClick={() => { setMenuFor(null); onEditListing(l.id) }} className={`${item} text-on-surface`}><Edit3 size={16} /> Modifier</button>
                        <button onClick={() => { setMenuFor(null); setOffersFor(l.id) }} className={`${item} text-on-surface`}><Tag size={16} /> Offres reçues</button>
                        {qrEnabled && l.status !== 'DRAFT' && l.status !== 'REJECTED' && (() => {
                          const scans = qrScans.find(q => q.listingId === l.id)?.scanCount
                          return <button onClick={() => { setMenuFor(null); setQrFor({ id: l.id, title: l.title }) }} className={`${item} text-on-surface`}><Icon name="qr_code_2" size={16} /> QR code de l’annonce{scans ? ` · ${scans} scan${scans > 1 ? 's' : ''}` : ''}</button>
                        })()}
                        <button onClick={() => { setMenuFor(null); setConfirm({ kind: 'delete', l }) }} className={`${item} text-primary hover:bg-primary-fixed/40`}><Trash2 size={16} /> Supprimer</button>
                      </div>
                    )}
                  </div>
                </div>
                {(primary || offers > 0) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {primary}
                    {offers > 0 && l.status !== 'APPROVED' && <span className="flex h-9 items-center gap-1 rounded-full bg-tertiary-soft px-3 text-label-md text-tertiary"><Tag size={14} /> {offers} offre{offers > 1 ? 's' : ''}</span>}
                  </div>
                )}
                {offersFor === l.id && <div className="mt-3 rounded-2xl border border-outline-variant"><ListingOffersPanel listingId={l.id} /></div>}
              </article>
            )
          })}
        </div>

        <ListingQrSheet listing={qrFor} onClose={() => setQrFor(null)} />

        <ConfirmSheet
          open={confirm?.kind === 'delete'}
          title="Supprimer l'annonce ?"
          confirmLabel="Supprimer"
          tone="danger"
          loading={deleting}
          onConfirm={() => confirm && remove(confirm.l)}
          onClose={() => setConfirm(null)}
        >
          « {confirm?.l.title} » sera définitivement supprimée. Cette action est irréversible.
        </ConfirmSheet>
        <WalletPaySheet
          open={confirm?.kind === 'boost'}
          title="Remontée flash"
          amount={flashPrice ?? 0}
          request={confirm?.kind === 'boost' ? { kind: 'BOOST_PACK', product: 'BUMP_FLASH', listingId: confirm.l.id } : null}
          onClose={() => setConfirm(null)}
          onPaid={() => { if (confirm) setFlash(`« ${confirm.l.title} » est remontée en tête.`); void refetch() }}
        >
          <b className="block text-label-lg text-on-surface">Remontée en tête</b>
          <span className="line-clamp-1">« {confirm?.l.title} »</span>
        </WalletPaySheet>

        <ConfirmSheet
          open={confirm?.kind === 'bump'}
          title="Remonter l'annonce"
          confirmLabel={`Utiliser ${creditsLabel(flashPrice ?? 0)}`}
          loading={bumping}
          onConfirm={() => { if (confirm) { spendCredit(confirm.l); setConfirm(null) } }}
          onClose={() => setConfirm(null)}
        >
          « {confirm?.l.title} » repasse en tête du catalogue. <b className="text-on-surface">{creditsLabel(flashPrice ?? 0)}</b> {(flashPrice ?? 0) > 1 ? 'seront utilisés' : 'sera utilisé'}.
        </ConfirmSheet>

        {rows.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-body-sm text-on-surface-variant">Affichage de {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, rows.length)} sur {rows.length} annonce{rows.length > 1 ? 's' : ''}</span>
            {pages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} aria-label="Page précédente" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent disabled:opacity-30"><ChevronLeft size={17} /></button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`h-10 min-w-10 cursor-pointer rounded-lg border-none px-2 text-label-md ${p === page ? 'bg-primary text-white' : 'bg-transparent text-on-surface'}`}>{p}</button>
                ))}
                <button disabled={page === pages} onClick={() => setPage(p => p + 1)} aria-label="Page suivante" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent disabled:opacity-30"><ChevronRight size={17} /></button>
              </div>
            )}
          </div>
        )}

        <section className="mt-6 flex flex-col gap-3 rounded-2xl bg-surface-container-low p-5 md:flex-row md:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><ShieldCheck size={22} /></span>
          <div className="flex-1">
            <div className="text-headline-sm text-on-surface">Conseil vente sécurisée</div>
            <p className="m-0 text-body-sm text-on-surface-variant">Privilégiez les remises en main propre dans des lieux publics animés (centres commerciaux, stations-service). Ne remettez jamais l'article avant d'avoir vérifié la réception du paiement.</p>
          </div>
          <button onClick={() => onNavigate('seller-orders')} className="flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary hover:underline">Voir mes commandes <ArrowRight size={15} /></button>
        </section>
      </div>
    </AccountLayout>
  )
}
