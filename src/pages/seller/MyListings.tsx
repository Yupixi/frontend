import EmptyState from '../../components/EmptyState'
import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  Search, Download, PlusCircle, Rocket, MapPin, CheckCircle2, Edit3, ChevronLeft, ChevronRight, ShieldCheck, ArrowRight,
  MessageSquare, Tag, Trash2, Eye, Archive, Star,
} from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import ListingOffersPanel from '../../components/ListingOffersPanel'
import { MY_LISTINGS_QUERY, DELETE_LISTING_MUTATION, BUMP_LISTING_MUTATION, type MyListingRow } from '../../graphql/listings'
import { MY_REPUTATION_QUERY, MY_WALLET_QUERY, type Reputation, type WalletSummary } from '../../graphql/sellerHub'
import type { AuthUser } from '../../graphql/auth'
import Select from '../../components/Select'
import BottomSheet from '../../components/BottomSheet'
import ConfirmSheet from '../../components/ConfirmSheet'
import PaymentSheet from '../../components/PaymentSheet'

type Props = {
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
  onEditListing: (id: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

const PAGE = 5
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

const STATUS: Record<string, { label: string, cls: string }> = {
  APPROVED: { label: 'Actif & en ligne', cls: 'bg-tertiary-soft text-tertiary' },
  PENDING_REVIEW: { label: 'En validation', cls: 'bg-amber-100 text-amber-800' },
  REJECTED: { label: 'Refusée', cls: 'bg-primary-fixed text-primary' },
  DRAFT: { label: 'Brouillon', cls: 'bg-surface-container-high text-on-surface-variant' },
  SOLD: { label: 'Vendue', cls: 'bg-blue-100 text-blue-800' },
  EXPIRED: { label: 'Archivée', cls: 'bg-surface-container-high text-on-surface-variant' },
  PAUSED: { label: 'En pause', cls: 'bg-surface-container-high text-on-surface-variant' },
}

function toCsv(rows: MyListingRow[]) {
  const head = ['Titre', 'Statut', 'Prix', 'Devise', 'Catégorie', 'Ville', 'Vues', 'Favoris', 'Demandes', 'Publiée le']
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows.map(l => [l.title, STATUS[l.status]?.label ?? l.status, l.price ?? '', l.currency, l.category?.name, l.city, l.viewsCount, l.favoritesCount, l.contactsCount ?? 0, (l.publishedAt ?? l.createdAt).slice(0, 10)].map(esc).join(';'))
  return '﻿' + [head.map(esc).join(';'), ...lines].join('\n')
}

// "Mes annonces" (Seller Hub) mockup.
export default function MyListings({ onNavigate, onSelectListing, onEditListing, currentUser, onLogout }: Props) {
  const { data, loading, refetch } = useQuery<{ myListings: { items: MyListingRow[] } }>(MY_LISTINGS_QUERY, { variables: { page: 1, pageSize: 200 } })
  const all = data?.myListings.items ?? []
  const { data: repData } = useQuery<{ myReputation: Reputation }>(MY_REPUTATION_QUERY)
  const rep = repData?.myReputation
  const { data: walletData, refetch: refetchWallet } = useQuery<{ myWallet: WalletSummary }>(MY_WALLET_QUERY)
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
    .then(() => { setFlash(`« ${l.title} » est remontée en tête (1 crédit utilisé).`); void refetch(); void refetchWallet() })
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
            <p className="m-0 text-body-sm text-white/90 lg:hidden">Mise en avant dès 500 F</p>
            <p className="m-0 hidden text-body-sm text-white/90 lg:block">Les annonces boostées passent en tête des résultats et dans les pépites de l'accueil. Remontées dès <b className="underline">500 F CFA</b>.</p>
          </div>
          <button onClick={() => onNavigate('seller-premium')} className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-white px-3 py-2 text-label-md text-primary lg:px-4 lg:py-2.5"><Rocket size={16} /> <span className="lg:hidden">Booster</span><span className="hidden lg:inline">Booster une annonce</span></button>
        </section>

        {/* KPIs (desktop) */}
        <div className="mb-5 hidden grid-cols-4 gap-3 lg:grid">
          {[
            { label: 'Valeur du stock actif', value: <><Price amount={stock} /></>, sub: <span className="flex items-center gap-1 text-tertiary"><CheckCircle2 size={13} /> 0 F de frais cachés</span> },
            { label: 'Vues totales', value: views.toLocaleString('fr-FR'), sub: <span className="text-tertiary">+{views24} sur 24h</span> },
            { label: 'Discussions en cours', value: <>{discussions} <span className="text-body-sm font-normal">acheteur{discussions > 1 ? 's' : ''}</span></>, sub: <span className="flex items-center gap-1"><Tag size={13} /> {pendingOffers} offre{pendingOffers > 1 ? 's' : ''} en attente</span> },
            { label: 'Indice de réputation', value: rep?.reviewsCount ? <span className="text-tertiary">{rep.averageRating.toFixed(1)} / 5 <span className="text-body-sm font-normal text-on-surface-variant">({rep.reviewsCount} avis)</span></span> : '—', sub: <span className="flex items-center gap-1"><Star size={13} /> {rep?.isVerified ? 'Vendeur certifié' : 'Avis des acheteurs'}</span> },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-outline-variant bg-surface-lowest p-3">
              <div className="text-label-sm uppercase text-on-surface-variant">{k.label}</div>
              <div className="mt-1 text-headline-sm font-extrabold text-on-surface">{k.value}</div>
              <div className="text-body-sm text-on-surface-variant">{k.sub}</div>
            </div>
          ))}
        </div>

        {flash && <p className="mb-3 flex items-center gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><CheckCircle2 size={16} className="shrink-0" /> {flash}</p>}

        {/* Rows */}
        <div className="flex flex-col gap-3">
          {loading && <p className="text-on-surface-variant">Chargement…</p>}
          {!loading && shown.length === 0 && (
            <EmptyState icon="empty-box" fallback="inventory_2" title="Aucune annonce ici" text="Publiez un article en quelques minutes : photos, prix et lieu de remise." action={{ label: 'Publier une annonce', onClick: () => onNavigate('seller-post') }} />
          )}
          {shown.map(l => {
            const boosted = future(l.boostExpiresAt) || future(l.autoBumpUntil) || future(l.urgentUntil)
            const offers = l.pendingOffersCount ?? 0
            const accent = boosted ? 'border-l-primary' : offers ? 'border-l-tertiary' : 'border-l-transparent'
            const photos = l.mediaCount?.length ?? (l.coverImageUrl ? 1 : 0)
            const mainBtn = 'flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-none px-3 text-label-md max-lg:flex-1 lg:h-9'
            return (
              <div key={l.id} className={`rounded-2xl border border-l-4 border-solid border-outline-variant bg-surface-lowest ${accent}`}>
                <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:gap-4 lg:p-4">
                  <div className="flex min-w-0 flex-1 gap-3 lg:items-center lg:gap-4">
                    <button onClick={() => onSelectListing(l.id)} aria-label={`Voir « ${l.title} »`} className="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-none bg-surface-container-low p-0">
                      {/* Placeholder stays underneath; a broken cover image hides itself. */}
                      <Icon name="image" size={30} className="text-outline" />
                      {l.coverImageUrl && <img src={l.coverImageUrl} alt="" onError={e => { e.currentTarget.style.display = 'none' }} className="absolute inset-0 h-full w-full object-cover" />}
                      {photos > 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">{photos} photo{photos > 1 ? 's' : ''}</span>}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-label-sm ${STATUS[l.status]?.cls ?? ''}`}>● {STATUS[l.status]?.label ?? l.status}</span>
                        {boosted && <span className="flex items-center gap-1 rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary"><Rocket size={12} /> Boost actif</span>}
                        {offers > 0 && <span className="flex items-center gap-1 rounded-full bg-tertiary px-2 py-0.5 text-label-sm text-white"><Tag size={12} /> {offers} offre{offers > 1 ? 's' : ''}<span className="max-lg:hidden"> reçue{offers > 1 ? 's' : ''}</span></span>}
                        <span className="hidden text-label-sm text-on-surface-variant lg:inline">{[l.category?.name, l.subcategory?.name].filter(Boolean).join(' • ')}</span>
                      </div>
                      <button onClick={() => onSelectListing(l.id)} className="block max-w-full cursor-pointer truncate border-none bg-transparent p-0 text-left text-label-lg text-on-surface hover:text-primary lg:text-headline-sm">{l.title}</button>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-body-sm text-on-surface-variant">
                        <span className="flex min-w-0 items-center gap-1"><MapPin size={13} className="shrink-0" /> <span className="truncate">{l.locationLabel ? `${l.locationLabel}, ` : ''}{l.city}</span></span>
                        <span className="hidden lg:inline">Publiée le {new Date(l.publishedAt ?? l.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        {(l.condition && l.condition !== 'N/A') && <span className="hidden lg:inline">{l.condition}</span>}
                        {l.size && <span className="hidden lg:inline">Taille {l.size}</span>}
                      </div>
                      <div className="mt-1 text-headline-sm font-extrabold text-on-surface lg:hidden"><Price amount={l.price} currency={l.currency} /></div>
                    </div>
                  </div>
                  <div className="hidden shrink-0 lg:block lg:w-36 lg:text-right">
                    <div className="text-headline-sm font-extrabold text-on-surface"><Price amount={l.price} currency={l.currency} /></div>
                    <div className="flex items-center gap-1 text-[11px] text-tertiary lg:justify-end"><CheckCircle2 size={12} /> 0 F commission pour vous</div>
                  </div>
                  <div className="grid shrink-0 grid-cols-4 gap-1 rounded-xl bg-surface-container-low p-2 text-center lg:w-64">
                    {[
                      { v: l.viewsCount, label: 'Vues' },
                      { v: `+${l.views24h ?? 0}`, label: '24h', cls: 'text-tertiary' },
                      { v: l.contactsCount ?? 0, label: 'Demandes', cls: 'text-primary' },
                      { v: l.favoritesCount, label: 'Favoris' },
                    ].map(s => <div key={s.label}><div className={`text-label-lg ${s.cls ?? 'text-on-surface'}`}>{s.v}</div><div className="text-[10px] text-on-surface-variant">{s.label}</div></div>)}
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-2">
                    {l.status === 'APPROVED' && (offers > 0 ? (
                      <button onClick={() => setOffersFor(offersFor === l.id ? null : l.id)} className={`${mainBtn} bg-tertiary text-white`}><MessageSquare size={16} /> Voir l'offre (Chat)</button>
                    ) : boosted ? (
                      <button onClick={() => onNavigate('seller-premium')} className={`${mainBtn} bg-primary text-white lg:bg-primary-fixed lg:text-primary`}><Rocket size={16} /> Prolonger le boost</button>
                    ) : credits > 0 ? (
                      <button onClick={() => setConfirm({ kind: 'bump', l })} className={`${mainBtn} bg-primary text-white`}><Rocket size={16} /> Remonter (1 crédit)</button>
                    ) : (
                      <button onClick={() => setConfirm({ kind: 'boost', l })} className={`${mainBtn} bg-primary text-white disabled:opacity-60`}><Rocket size={16} /> Booster (500 F)</button>
                    ))}
                    {l.status === 'EXPIRED' && <button onClick={() => republish(l)} className={`${mainBtn} bg-primary text-white`}><Archive size={16} /> Remettre en ligne</button>}
                    {l.status === 'DRAFT' && <button onClick={() => onEditListing(l.id)} className={`${mainBtn} bg-primary text-white`}><Edit3 size={16} /> Compléter</button>}
                    <button onClick={() => onEditListing(l.id)} title="Modifier" aria-label="Modifier" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-container-high text-on-surface lg:h-9 lg:w-9"><Edit3 size={17} /></button>
                    <div className="relative">
                      <button onClick={() => setMenuFor(menuFor === l.id ? null : l.id)} title="Plus" aria-label="Plus d'actions" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-container-high text-on-surface lg:h-9 lg:w-9"><Icon name="more_vert" size={18} /></button>
                      {menuFor === l.id && (
                        <div className="absolute bottom-full right-0 z-20 mb-1 w-48 rounded-xl border border-outline-variant bg-surface-lowest p-1 shadow-float lg:bottom-auto lg:top-full lg:mb-0 lg:mt-1">
                          <button onClick={() => { setMenuFor(null); onSelectListing(l.id) }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md text-on-surface hover:bg-surface-container-low"><Eye size={16} /> Voir l'annonce</button>
                          <button onClick={() => { setMenuFor(null); setOffersFor(l.id) }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md text-on-surface hover:bg-surface-container-low"><Tag size={16} /> Offres reçues</button>
                          <button onClick={() => { setMenuFor(null); setConfirm({ kind: 'delete', l }) }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md text-primary hover:bg-primary-fixed/40"><Trash2 size={16} /> Supprimer</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {offersFor === l.id && <div className="border-0 border-t border-solid border-outline-variant"><ListingOffersPanel listingId={l.id} /></div>}
              </div>
            )
          })}
        </div>

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
        <PaymentSheet
          open={confirm?.kind === 'boost'}
          title="Remontée flash"
          amount={500}
          request={confirm?.kind === 'boost' ? { kind: 'BOOST_PACK', product: 'BUMP_FLASH', listingId: confirm.l.id } : null}
          onClose={() => setConfirm(null)}
          onPaid={() => { if (confirm) setFlash(`« ${confirm.l.title} » est remontée en tête.`); void refetch() }}
        >
          <p className="m-0 rounded-xl bg-surface-container-low p-4 text-body-md text-on-surface-variant">« {confirm?.l.title} » repasse en tête du catalogue pour <b className="text-on-surface">500 F</b>.</p>
        </PaymentSheet>

        <ConfirmSheet
          open={confirm?.kind === 'bump'}
          title="Remonter l'annonce"
          confirmLabel="Utiliser 1 crédit"
          loading={bumping}
          onConfirm={() => { if (confirm) { spendCredit(confirm.l); setConfirm(null) } }}
          onClose={() => setConfirm(null)}
        >
          « {confirm?.l.title} » repasse en tête du catalogue. <b className="text-on-surface">1 crédit</b> sera utilisé.
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
