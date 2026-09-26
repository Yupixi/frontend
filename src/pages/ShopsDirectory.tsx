import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import Select from '../components/Select'
import { CATEGORIES_QUERY } from '../graphql/categories'
import { FOLLOW_SELLER_MUTATION, UNFOLLOW_SELLER_MUTATION } from '../graphql/reviews'
import { SHOPS_QUERY, type Shop } from '../graphql/shops'
import { setAuthReason } from '../lib/authReason'
import { formatNumber } from '../lib/format'
import { ShopCard } from '../components/ShopCard'

type Props = {
  onNavigate: (page: any) => void
  onOpenShop: (slug: string) => void
  isLoggedIn: boolean
}

type Sort = 'POPULAR' | 'TOP_RATED' | 'RECENT'
const SORTS: [Sort, string][] = [['POPULAR', 'Plus suivies'], ['TOP_RATED', 'Mieux notées'], ['RECENT', 'Plus récentes']]
const PAGE_SIZE = 12

// "Annuaire des Boutiques officielles".
export default function ShopsDirectory({ onNavigate, onOpenShop, isLoggedIn }: Props) {
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState<Sort>('POPULAR')
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [term, category, city, sort])

  const { data: cats } = useQuery<{ categories: { id: string, slug: string, name: string }[] }>(CATEGORIES_QUERY)
  const { data, loading, refetch } = useQuery<{ shops: { items: Shop[], total: number } }>(SHOPS_QUERY, {
    variables: { search: term || undefined, categorySlug: category || undefined, city: city || undefined, sort, page, pageSize: PAGE_SIZE },
  })
  const [follow] = useMutation(FOLLOW_SELLER_MUTATION)
  const [unfollow] = useMutation(UNFOLLOW_SELLER_MUTATION)
  const shops = data?.shops.items ?? []
  const total = data?.shops.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const toggleFollow = (s: Shop) => {
    if (!isLoggedIn) { setAuthReason('follow'); onNavigate('auth'); return }
    void (s.isFollowedByMe ? unfollow : follow)({ variables: { sellerId: s.owner.id } }).then(() => refetch())
  }

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-10 pt-4 md:px-8 lg:px-12">
      <nav className="mb-3 hidden items-center gap-1 text-label-md text-on-surface-variant md:flex">
        <button onClick={() => onNavigate('home')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Icon name="home" size={15} /> Accueil</button>
        <Icon name="chevron_right" size={15} className="text-outline-variant" />
        <span className="font-semibold text-on-surface">Boutiques officielles</span>
      </nav>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm uppercase text-tertiary"><Icon name="verified" size={14} fill /> Entreprises vérifiées</span>
          <h1 className="m-0 mt-2 text-headline-lg text-on-surface md:text-display">Boutiques officielles</h1>
          <p className="m-0 mt-1 max-w-2xl text-body-md text-on-surface-variant">Des entreprises et marques dont le registre de commerce (RCCM) ou le compte contribuable (NCC) et l’identité du gérant ont été vérifiés par Dilchap.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-xl bg-surface-lowest px-4 py-3 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Icon name="storefront" size={20} /></span>
          <div><div className="text-headline-sm font-extrabold text-on-surface">{formatNumber(total)}</div><div className="whitespace-nowrap text-body-sm text-on-surface-variant">boutique{total > 1 ? 's' : ''} officielle{total > 1 ? 's' : ''}</div></div>
        </div>
      </header>

      {/* Search & filters */}
      <section className="mt-5 flex flex-col gap-3 rounded-2xl bg-surface-lowest p-3 shadow-sm md:flex-row md:items-center md:p-4">
        <form onSubmit={e => { e.preventDefault(); setTerm(search.trim()) }} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface-container-low px-3">
          <Icon name="search" size={19} className="shrink-0 text-outline" />
          <input value={search} onChange={e => setSearch(e.target.value)} onBlur={() => setTerm(search.trim())} placeholder="Rechercher une boutique par nom…" className="h-11 w-full min-w-0 border-none bg-transparent text-body-md text-on-surface outline-none" />
        </form>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Select value={category} onChange={e => setCategory(e.target.value)} className="h-11 min-w-0 cursor-pointer rounded-xl border-none bg-surface-container-low px-3 text-label-md text-on-surface outline-none md:w-48">
            <option value="">Tous les secteurs</option>
            {(cats?.categories ?? []).map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </Select>
          <Select value={city} onChange={e => setCity(e.target.value)} className="h-11 min-w-0 cursor-pointer rounded-xl border-none bg-surface-container-low px-3 text-label-md text-on-surface outline-none md:w-40">
            <option value="">Toutes les villes</option>
            {['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo'].map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
      </section>
      <div className="relative mt-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pr-8 [scrollbar-width:none] md:pr-0">
          <span className="shrink-0 text-label-sm uppercase text-on-surface-variant">Trier par</span>
          {SORTS.map(([k, label]) => (
            <button key={k} onClick={() => setSort(k)} className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border-none px-3.5 py-1.5 text-label-md ${sort === k ? 'bg-inverse-surface text-white' : 'bg-surface-lowest text-on-surface shadow-sm'}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      <section className="mt-4">
        {loading && !data ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-80 animate-pulse rounded-2xl bg-surface-container-low" />)}
          </div>
        ) : shops.length === 0 ? (
          <EmptyState icon="empty-search" fallback="storefront" tone="neutral" title={term || category || city ? 'Aucune boutique ne correspond' : 'Aucune boutique officielle pour le moment'} text={term || category || city ? 'Essayez un autre nom, secteur ou ville.' : 'Les premières boutiques vérifiées apparaîtront ici.'} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map(s => <ShopCard key={s.id} shop={s} onOpen={() => onOpenShop(s.slug)} onFollow={() => toggleFollow(s)} />)}
          </div>
        )}
        {pages > 1 && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-body-sm text-on-surface-variant">Page {page} sur {pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest shadow-sm disabled:cursor-default disabled:opacity-40" aria-label="Page précédente"><Icon name="chevron_left" size={20} /></button>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest shadow-sm disabled:cursor-default disabled:opacity-40" aria-label="Page suivante"><Icon name="chevron_right" size={20} /></button>
            </div>
          </div>
        )}
      </section>

      {/* Acquisition */}
      <section className="mt-8 flex flex-col gap-4 rounded-2xl bg-surface-container-low p-5 md:flex-row md:items-center md:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Icon name="storefront" size={24} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-headline-sm text-on-surface">Vous êtes une entreprise ou une marque déclarée ?</h2>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">Obtenez le badge Boutique officielle, votre page vitrine avec rayons et articles phares, et votre place dans cet annuaire.</p>
        </div>
        <button onClick={() => onNavigate('seller-shop')} className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-inverse-surface px-5 text-label-lg text-white">
          Ouvrir ma boutique officielle <Icon name="arrow_forward" size={18} />
        </button>
      </section>
    </div>
  )
}
