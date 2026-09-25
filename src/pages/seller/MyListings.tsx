import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  Search, Download, PlusCircle, Rocket, MapPin, CheckCircle2, Edit3, ChevronLeft, ChevronRight, ShieldCheck, ArrowRight,
  MessageSquare, Tag, Trash2, Eye, Archive, Star,
} from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import { ListingOffersPanel } from './SellerPages'
import { MY_LISTINGS_QUERY, DELETE_LISTING_MUTATION, BUMP_LISTING_MUTATION, type MyListingRow } from '../../graphql/listings'
import { CREATE_BOOST_MUTATION } from '../../graphql/promotions'
import { MY_REPUTATION_QUERY, MY_WALLET_QUERY, type Reputation, type WalletSummary } from '../../graphql/sellerHub'
import type { AuthUser } from '../../graphql/auth'

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
  const [bumpListing] = useMutation(BUMP_LISTING_MUTATION)
  const [createBoost, { loading: boosting }] = useMutation(CREATE_BOOST_MUTATION)

  const [tab, setTab] = useState<typeof TABS[number]['key']>('live')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState<'recent' | 'price-desc' | 'price-asc' | 'views'>('recent')
  const [page, setPage] = useState(1)
  const [offersFor, setOffersFor] = useState<string | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

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
  const boostFlash = (l: MyListingRow) => {
    if (!window.confirm(`Remonter « ${l.title} » en tête du catalogue (Remontée flash, 500 F) ?`)) return
    void createBoost({ variables: { input: { listingId: l.id, pack: 'BUMP_FLASH' } } })
      .then(() => { setFlash(`« ${l.title} » est remontée en tête.`); void refetch() })
      .catch((e: Error) => setFlash(e.message))
  }
  const remove = (l: MyListingRow) => {
    setMenuFor(null)
    if (!window.confirm(`Supprimer « ${l.title} » ? Cette action est irréversible.`)) return
    void deleteListing({ variables: { id: l.id } }).then(() => refetch())
  }
  const spendCredit = (l: MyListingRow) => void bumpListing({ variables: { id: l.id } })
    .then(() => { setFlash(`« ${l.title} » est remontée en tête (1 crédit utilisé).`); void refetch(); void refetchWallet() })
    .catch((e: Error) => setFlash(e.message))
  const republish = (l: MyListingRow) => void bumpListing({ variables: { id: l.id } }).then(() => { setFlash('Annonce remise en ligne.'); void refetch() })

  return (
    <AccountLayout active="seller-listings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1160px] pb-6">
        <div className="mb-1 text-label-sm uppercase text-on-surface-variant">Dilchap Seller › Vente directe</div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">Mes annonces</h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">Gérez votre catalogue de vente, suivez vos vues et boostez vos pépites auprès des acheteurs.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-container-high px-3 py-2.5 text-label-md text-on-surface hover:bg-surface-container-highest"><Download size={17} /> Exporter (.csv)</button>
            <button onClick={() => onNavigate('seller-post')} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark"><PlusCircle size={18} /> Publier une nouvelle annonce</button>
          </div>
        </div>

        {/* Boost banner */}
        <section className="mb-5 flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-primary to-primary-container p-5 text-white md:flex-row md:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15"><Rocket size={24} /></span>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-headline-sm">Besoin de vendre plus vite ? <span className="rounded bg-white/20 px-1.5 text-label-sm">Flash 48h</span></div>
            <p className="m-0 text-body-sm text-white/90">Les annonces boostées passent en tête des résultats et dans les pépites de l'accueil. Remontées dès <b className="underline">500 F CFA</b>.</p>
          </div>
          <button onClick={() => onNavigate('seller-premium')} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-white px-4 py-2.5 text-label-md text-primary"><Rocket size={16} /> Booster une annonce</button>
        </section>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-surface-container-low p-1">
          {TABS.map(t => {
            const n = all.filter(t.match).length
            if (t.key === 'review' && n === 0) return null
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => { setTab(t.key); setPage(1) }} className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-none px-3 py-2 text-label-md ${active ? 'bg-surface-lowest text-primary shadow-sm' : 'bg-transparent text-on-surface-variant hover:text-on-surface'}`}>
                {t.label} <span className={`rounded-full px-1.5 text-label-sm ${active ? 'bg-primary-fixed text-primary' : 'bg-surface-container-high'}`}>{n}</span>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-surface-lowest p-2">
          <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2">
            <Search size={17} className="text-outline" />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="Rechercher par titre, marque ou référence…" className="w-full border-none bg-transparent text-body-sm text-on-surface outline-none" />
          </label>
          <select value={cat} onChange={e => { setCat(e.target.value); setPage(1) }} className="cursor-pointer rounded-lg border-none bg-surface-container-low px-3 py-2 text-label-md text-on-surface outline-none">
            <option value="">Toutes catégories</option>
            {categories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
          <select value={city} onChange={e => { setCity(e.target.value); setPage(1) }} className="cursor-pointer rounded-lg border-none bg-surface-container-low px-3 py-2 text-label-md text-on-surface outline-none">
            <option value="">Toutes communes</option>
            {cities.map(c => <option key={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-1 text-label-md text-on-surface-variant">
            Trier :
            <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="cursor-pointer rounded-lg border-none bg-transparent py-2 text-label-md text-on-surface outline-none">
              <option value="recent">Plus récentes</option>
              <option value="views">Plus vues</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="price-asc">Prix croissant</option>
            </select>
          </label>
        </div>

        {/* KPIs */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
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

        {flash && <p className="mb-3 flex items-center gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><CheckCircle2 size={16} /> {flash}</p>}

        {/* Rows */}
        <div className="flex flex-col gap-3">
          {loading && <p className="text-on-surface-variant">Chargement…</p>}
          {!loading && shown.length === 0 && (
            <div className="rounded-2xl bg-surface-container-low p-10 text-center">
              <p className="m-0 text-headline-sm text-on-surface">Aucune annonce ici</p>
              <button onClick={() => onNavigate('seller-post')} className="mt-3 cursor-pointer rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white">Publier une annonce</button>
            </div>
          )}
          {shown.map(l => {
            const boosted = future(l.boostExpiresAt) || future(l.autoBumpUntil) || future(l.urgentUntil)
            const offers = l.pendingOffersCount ?? 0
            const accent = boosted ? 'border-l-primary' : offers ? 'border-l-tertiary' : 'border-l-transparent'
            const photos = l.mediaCount?.length ?? (l.coverImageUrl ? 1 : 0)
            return (
              <div key={l.id} className={`rounded-2xl border border-l-4 border-solid border-outline-variant bg-surface-lowest ${accent}`}>
                <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
                  <button onClick={() => onSelectListing(l.id)} className="relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl border-none bg-surface-container-low p-0">
                    {l.coverImageUrl ? <img src={l.coverImageUrl} alt="" className="h-full w-full object-cover" /> : <Icon name="image" size={30} className="text-outline" />}
                    {photos > 0 && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">{photos} photo{photos > 1 ? 's' : ''}</span>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-label-sm ${STATUS[l.status]?.cls ?? ''}`}>● {STATUS[l.status]?.label ?? l.status}</span>
                      {boosted && <span className="flex items-center gap-1 rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary"><Rocket size={12} /> Boost actif</span>}
                      {offers > 0 && <span className="flex items-center gap-1 rounded-full bg-tertiary px-2 py-0.5 text-label-sm text-white"><Tag size={12} /> {offers} offre{offers > 1 ? 's' : ''} reçue{offers > 1 ? 's' : ''}</span>}
                      <span className="text-label-sm text-on-surface-variant">{[l.category?.name, l.subcategory?.name].filter(Boolean).join(' • ')}</span>
                    </div>
                    <button onClick={() => onSelectListing(l.id)} className="block max-w-full cursor-pointer truncate border-none bg-transparent p-0 text-left text-headline-sm text-on-surface hover:text-primary">{l.title}</button>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-body-sm text-on-surface-variant">
                      <span className="flex items-center gap-1"><MapPin size={13} /> {l.locationLabel ? `${l.locationLabel}, ` : ''}{l.city}</span>
                      <span>Publiée le {new Date(l.publishedAt ?? l.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      {(l.condition && l.condition !== 'N/A') && <span>{l.condition}</span>}
                      {l.size && <span>Taille {l.size}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 lg:w-36 lg:text-right">
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
                  <div className="flex shrink-0 items-center gap-2">
                    {l.status === 'APPROVED' && (offers > 0 ? (
                      <button onClick={() => setOffersFor(offersFor === l.id ? null : l.id)} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-tertiary px-3 py-2 text-label-md text-white"><MessageSquare size={15} /> Voir l'offre</button>
                    ) : boosted ? (
                      <button onClick={() => onNavigate('seller-premium')} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-primary-fixed px-3 py-2 text-label-md text-primary"><Rocket size={15} /> Prolonger le boost</button>
                    ) : credits > 0 ? (
                      <button onClick={() => spendCredit(l)} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white"><Rocket size={15} /> Remonter (1 crédit)</button>
                    ) : (
                      <button disabled={boosting} onClick={() => boostFlash(l)} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white disabled:opacity-60"><Rocket size={15} /> Booster (500 F)</button>
                    ))}
                    {l.status === 'EXPIRED' && <button onClick={() => republish(l)} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white"><Archive size={15} /> Remettre en ligne</button>}
                    {l.status === 'DRAFT' && <button onClick={() => onEditListing(l.id)} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white"><Edit3 size={15} /> Compléter</button>}
                    <button onClick={() => onEditListing(l.id)} title="Modifier" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-container-high text-on-surface"><Edit3 size={16} /></button>
                    <div className="relative">
                      <button onClick={() => setMenuFor(menuFor === l.id ? null : l.id)} title="Plus" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-container-high text-on-surface"><Icon name="more_vert" size={18} /></button>
                      {menuFor === l.id && (
                        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-outline-variant bg-surface-lowest p-1 shadow-float">
                          <button onClick={() => { setMenuFor(null); onSelectListing(l.id) }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2 text-left text-label-md text-on-surface hover:bg-surface-container-low"><Eye size={16} /> Voir l'annonce</button>
                          <button onClick={() => { setMenuFor(null); setOffersFor(l.id) }} className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2 text-left text-label-md text-on-surface hover:bg-surface-container-low"><Tag size={16} /> Offres reçues</button>
                          <button onClick={() => remove(l)} className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-2 text-left text-label-md text-primary hover:bg-primary-fixed/40"><Trash2 size={16} /> Supprimer</button>
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

        {rows.length > 0 && (
          <div className="mt-5 flex items-center justify-between">
            <span className="text-body-sm text-on-surface-variant">Affichage de {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, rows.length)} sur {rows.length} annonce{rows.length > 1 ? 's' : ''}</span>
            {pages > 1 && (
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent disabled:opacity-30"><ChevronLeft size={17} /></button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`h-8 min-w-8 cursor-pointer rounded-lg border-none px-2 text-label-md ${p === page ? 'bg-primary text-white' : 'bg-transparent text-on-surface'}`}>{p}</button>
                ))}
                <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent disabled:opacity-30"><ChevronRight size={17} /></button>
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
