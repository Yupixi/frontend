import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { ChevronRight, ChevronLeft, ChevronUp, ChevronDown, SlidersHorizontal, X, BadgeCheck, Search as SearchIcon, MapPin, BellRing, Check, LayoutGrid, List, Handshake } from 'lucide-react'
import BottomSheet from '../components/BottomSheet'
import { ListingCard, ListingListCard } from '../components/ListingCard'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'
import {
  LISTINGS_QUERY, LISTING_FACETS_QUERY, CREATE_SAVED_SEARCH_MUTATION,
  type RemoteListing, type ListingSort, type ListingFacets, type ListingFilterInput, type FacetCount,
} from '../graphql/listings'
import { getStoredViewMode, setStoredViewMode } from '../lib/viewMode'

const PAGE_SIZE = 18

const SORTS: { value: ListingSort, label: string }[] = [
  { value: 'RECENT', label: 'Plus récents' },
  { value: 'PRICE_ASC', label: 'Prix croissant' },
  { value: 'PRICE_DESC', label: 'Prix décroissant' },
  { value: 'POPULAR', label: 'Plus populaires' },
]

const BUDGETS: { label: string, min?: number, max?: number }[] = [
  { label: '< 10 000 F', max: 10_000 },
  { label: '10k – 50k F', min: 10_000, max: 50_000 },
  { label: '50k – 100k F', min: 50_000, max: 100_000 },
  { label: '+ 100 000 F', min: 100_000 },
]

type SearchProps = {
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  categoryFilter?: string
  onClearCategoryFilter?: () => void
  onCategorySelect?: (slug: string) => void
  searchTerm?: string
  onSearchTermChange?: (term: string) => void
  selectedCity?: string
  onCityChange?: (city: string) => void
  currentUserId?: string | null
  isLoggedIn?: boolean
  onContactSeller?: (sellerId: string, listingId?: string) => void
}

const toggle = (list: string[], value: string) => list.includes(value) ? list.filter(v => v !== value) : [...list, value]

function FilterBlock({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl bg-surface-lowest p-4">
      <button onClick={() => setOpen(o => !o)} className="flex w-full cursor-pointer items-center justify-between border-none bg-transparent p-0 text-label-lg text-on-surface">
        {title}
        {open ? <ChevronUp size={17} className="text-on-surface-variant" /> : <ChevronDown size={17} className="text-on-surface-variant" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

function CheckRow({ checked, label, count, onChange, highlight }: { checked: boolean, label: string, count?: number, onChange: () => void, highlight?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1 text-body-sm text-on-surface-variant hover:text-on-surface">
      <span className="flex min-w-0 items-center gap-2">
        <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 accent-[var(--primary)]" />
        <span className={`truncate ${checked ? 'font-bold text-on-surface' : 'text-on-surface'}`}>{label}</span>
      </span>
      {count != null && (
        <span className={`shrink-0 rounded-full px-2 text-label-sm ${checked && highlight ? 'bg-tertiary-soft text-tertiary' : 'text-outline'}`}>{count.toLocaleString('fr-FR')}</span>
      )}
    </label>
  )
}

function SearchableFacet({ facets, selected, onToggle, placeholder, icon }: {
  facets: FacetCount[], selected: string[], onToggle: (v: string) => void, placeholder: string, icon?: React.ReactNode
}) {
  const [q, setQ] = useState('')
  const shown = facets.filter(f => f.label.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <div className="relative mb-2">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline">{icon ?? <SearchIcon size={15} />}</span>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border-none bg-surface-container-low py-2 pl-8 pr-2 text-body-sm text-on-surface outline-none placeholder:text-outline" />
      </div>
      <div className="flex max-h-40 flex-col overflow-y-auto">
        {shown.map(f => <CheckRow key={f.value} checked={selected.includes(f.value)} label={f.label} count={f.count} onChange={() => onToggle(f.value)} />)}
        {shown.length === 0 && <span className="py-1 text-body-sm text-outline">Aucun résultat</span>}
      </div>
    </>
  )
}

export default function SearchPage({
  onNavigate, onSelectListing, favorites, onToggleFavorite, categoryFilter, onClearCategoryFilter, onCategorySelect,
  searchTerm, onSearchTermChange, selectedCity, currentUserId, isLoggedIn, onContactSeller,
}: SearchProps) {
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>(() => getStoredViewMode() ?? 'grid')
  const setViewMode = (mode: 'grid' | 'list') => { setViewModeState(mode); setStoredViewMode(mode) }
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [sort, setSort] = useState<ListingSort>('RECENT')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [conditions, setConditions] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [sizes, setSizes] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>(selectedCity ? [selectedCity] : [])
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(searchTerm || '')
  const [alertState, setAlertState] = useState<'idle' | 'done' | 'error'>('idle')

  useEffect(() => { const t = setTimeout(() => setSearch(searchTerm || ''), 300); return () => clearTimeout(t) }, [searchTerm])
  useEffect(() => { setSubcategories([]) }, [categoryFilter])

  const filter: ListingFilterInput = useMemo(() => ({
    ...(search ? { search } : {}),
    ...(categoryFilter ? { categorySlug: categoryFilter } : {}),
    ...(subcategories.length ? { subcategorySlugs: subcategories } : {}),
    ...(conditions.length ? { conditions } : {}),
    ...(brands.length ? { brands } : {}),
    ...(sizes.length ? { sizes } : {}),
    ...(cities.length ? { cities } : {}),
    ...(verifiedOnly ? { verifiedSellersOnly: true } : {}),
    ...(minPrice ? { minPrice: Number(minPrice) } : {}),
    ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
  }), [search, categoryFilter, subcategories, conditions, brands, sizes, cities, verifiedOnly, minPrice, maxPrice])

  useEffect(() => { setPage(1); setAlertState('idle') }, [filter, sort])

  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const categories = categoriesData?.categories ?? []
  const category = categories.find(c => c.slug === categoryFilter)

  const { data, previousData, loading } = useQuery<{ listings: { items: RemoteListing[]; totalCount: number; totalPages: number } }>(LISTINGS_QUERY, {
    variables: { filter, sort, page, pageSize: PAGE_SIZE },
  })
  const result = (data ?? previousData)?.listings
  const items = result?.items ?? []
  const total = result?.totalCount ?? 0
  const totalPages = result?.totalPages ?? 1

  const { data: facetsData } = useQuery<{ listingFacets: ListingFacets }>(LISTING_FACETS_QUERY, { variables: { filter } })
  const facets = facetsData?.listingFacets

  const [createSavedSearch, { loading: savingAlert }] = useMutation(CREATE_SAVED_SEARCH_MUTATION)
  const createAlert = async () => {
    if (!isLoggedIn) { onNavigate('auth'); return }
    const label = search || category?.name || 'Ma recherche'
    try {
      await createSavedSearch({ variables: { label, filter } })
      setAlertState('done')
    } catch {
      setAlertState('error')
    }
  }

  const resetAll = () => {
    setVerifiedOnly(false); setSubcategories([]); setConditions([]); setBrands([]); setSizes([]); setCities([])
    setMinPrice(''); setMaxPrice('')
    onClearCategoryFilter?.()
    onSearchTermChange?.('')
  }

  const chips: { key: string, label: string, clear: () => void }[] = [
    ...(search ? [{ key: 'q', label: `« ${search} »`, clear: () => onSearchTermChange?.('') }] : []),
    ...(category ? [{ key: 'cat', label: category.name, clear: () => onClearCategoryFilter?.() }] : []),
    ...subcategories.map(v => ({ key: `sub-${v}`, label: facets?.subcategories.find(f => f.value === v)?.label ?? v, clear: () => setSubcategories(s => s.filter(x => x !== v)) })),
    ...cities.map(v => ({ key: `city-${v}`, label: v, clear: () => setCities(s => s.filter(x => x !== v)) })),
    ...conditions.map(v => ({ key: `cond-${v}`, label: v, clear: () => setConditions(s => s.filter(x => x !== v)) })),
    ...brands.map(v => ({ key: `brand-${v}`, label: v, clear: () => setBrands(s => s.filter(x => x !== v)) })),
    ...sizes.map(v => ({ key: `size-${v}`, label: `Taille : ${v}`, clear: () => setSizes(s => s.filter(x => x !== v)) })),
    ...(minPrice || maxPrice ? [{ key: 'price', label: `${minPrice || 0} – ${maxPrice || '∞'} F`, clear: () => { setMinPrice(''); setMaxPrice('') } }] : []),
    ...(verifiedOnly ? [{ key: 'verified', label: 'Vendeurs certifiés', clear: () => setVerifiedOnly(false) }] : []),
  ]

  const contact = (l: RemoteListing) => () =>
    isLoggedIn && onContactSeller ? onContactSeller(l.seller.id, l.id) : onSelectListing(l.id)

  const filtersPanel = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-headline-sm text-on-surface"><SlidersHorizontal size={19} className="text-primary" /> Filtres</span>
        <button onClick={resetAll} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-primary hover:underline">Réinitialiser</button>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-tertiary-soft p-3">
        <span className="flex items-center gap-2">
          <BadgeCheck size={19} className="text-tertiary" />
          <span className="flex flex-col">
            <span className="text-label-md text-on-surface">Vendeurs certifiés</span>
            <span className="text-label-sm text-tertiary">Identité vérifiée par Dilchap</span>
          </span>
        </span>
        <input type="checkbox" className="peer sr-only" checked={verifiedOnly} onChange={() => setVerifiedOnly(v => !v)} />
        <span className="relative h-5 w-9 shrink-0 rounded-full bg-surface-container-highest transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-tertiary peer-checked:after:translate-x-4" />
      </label>

      <FilterBlock title="Catégorie">
        {category ? (
          <>
            <button onClick={() => onClearCategoryFilter?.()} className="mb-2 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-primary">
              <ChevronLeft size={14} /> Toutes les catégories
            </button>
            <div className="mb-1 text-label-md text-on-surface">{category.icon} {category.name}</div>
            {(facets?.subcategories ?? []).map(f => (
              <CheckRow key={f.value} checked={subcategories.includes(f.value)} label={f.label} count={f.count} onChange={() => setSubcategories(s => toggle(s, f.value))} />
            ))}
          </>
        ) : (
          <div className="flex flex-col">
            {categories.map(c => (
              <button key={c.id} onClick={() => onCategorySelect?.(c.slug)} className="flex cursor-pointer items-center justify-between border-none bg-transparent px-0 py-1 text-left text-body-sm text-on-surface hover:text-primary">
                <span>{c.icon} {c.name}</span>
                <ChevronRight size={14} className="text-outline" />
              </button>
            ))}
          </div>
        )}
      </FilterBlock>

      {!!facets?.conditions.length && (
        <FilterBlock title="État de l'objet">
          {facets.conditions.map(f => (
            <CheckRow key={f.value} checked={conditions.includes(f.value)} label={f.label} count={f.count} highlight onChange={() => setConditions(s => toggle(s, f.value))} />
          ))}
        </FilterBlock>
      )}

      <FilterBlock title="Budget (F)">
        <div className="mb-3 grid grid-cols-2 gap-2">
          {[{ label: 'Min', value: minPrice, set: setMinPrice }, { label: 'Max', value: maxPrice, set: setMaxPrice }].map(f => (
            <label key={f.label} className="flex items-center gap-1 rounded-lg bg-surface-container-low px-2 py-1.5">
              <span className="text-label-sm text-outline">{f.label}</span>
              <input type="number" min={0} value={f.value} onChange={e => f.set(e.target.value)} className="w-full min-w-0 border-none bg-transparent text-right text-label-lg text-on-surface outline-none" />
              <span className="text-label-sm text-on-surface">F</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BUDGETS.map(b => {
            const active = minPrice === String(b.min ?? '') && maxPrice === String(b.max ?? '')
            return (
              <button
                key={b.label}
                onClick={() => { setMinPrice(active ? '' : String(b.min ?? '')); setMaxPrice(active ? '' : String(b.max ?? '')) }}
                className={`cursor-pointer rounded-lg border-none px-2.5 py-1 text-body-sm ${active ? 'bg-inverse-surface font-semibold text-white' : 'bg-surface-container text-on-surface hover:bg-surface-container-highest'}`}
              >
                {b.label}
              </button>
            )
          })}
        </div>
      </FilterBlock>

      {!!facets?.brands.length && (
        <FilterBlock title="Marque">
          <SearchableFacet facets={facets.brands} selected={brands} onToggle={v => setBrands(s => toggle(s, v))} placeholder="Rechercher une marque…" />
        </FilterBlock>
      )}

      {!!facets?.sizes.length && (
        <FilterBlock title="Taille">
          <div className="grid grid-cols-4 gap-1.5">
            {facets.sizes.map(f => (
              <button
                key={f.value}
                onClick={() => setSizes(s => toggle(s, f.value))}
                className={`cursor-pointer rounded-lg border-none py-1.5 text-label-md ${sizes.includes(f.value) ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </FilterBlock>
      )}

      {!!facets?.cities.length && (
        <FilterBlock title="Villes & Quartiers">
          <SearchableFacet facets={facets.cities} selected={cities} onToggle={v => setCities(s => toggle(s, v))} placeholder="Rechercher une ville…" icon={<MapPin size={15} />} />
          <div className="mt-2 flex items-center gap-1 text-label-sm text-tertiary"><Handshake size={13} /> Remise en main propre privilégiée</div>
        </FilterBlock>
      )}

      <button onClick={resetAll} className="cursor-pointer rounded-xl border-none bg-surface-container-high py-2.5 text-label-md text-on-surface hover:bg-surface-container-highest">
        Réinitialiser tous les filtres
      </button>
    </div>
  )

  const title = search ? `Résultats pour « ${search} »` : category ? category.name : 'Toutes les annonces'
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-5 md:px-8 lg:px-12">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'ariane" className="mb-2 flex flex-wrap items-center gap-1 text-label-md text-on-surface-variant">
        <button onClick={() => onNavigate('home')} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary">Accueil</button>
        <ChevronRight size={14} className="text-outline-variant" />
        {category ? (
          <>
            <button onClick={() => onClearCategoryFilter?.()} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary">Catalogue</button>
            <ChevronRight size={14} className="text-outline-variant" />
            <span className="font-semibold text-on-surface">{category.name}</span>
          </>
        ) : <span className="font-semibold text-on-surface">Catalogue</span>}
      </nav>

      {/* Heading + sort + view */}
      <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          {verifiedOnly && (
            <span className="mb-1 inline-block rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm uppercase text-primary">Sélection vérifiée</span>
          )}
          <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">{title}</h1>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">
            <span className="font-bold text-on-surface">{total.toLocaleString('fr-FR')} article{total > 1 ? 's' : ''}</span> disponible{total > 1 ? 's' : ''} auprès de notre communauté.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFiltersOpen(true)} className="flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-surface-container-low px-3 py-2 text-label-md text-on-surface lg:hidden">
            <SlidersHorizontal size={16} /> Filtres{chips.length > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] text-white">{chips.length}</span>}
          </button>
          <label className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-1.5">
            <span className="hidden text-label-sm uppercase text-on-surface-variant sm:inline">Trier :</span>
            <select value={sort} onChange={e => setSort(e.target.value as ListingSort)} className="cursor-pointer border-none bg-transparent py-1 text-label-md font-bold text-on-surface outline-none">
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <div className="flex items-center rounded-xl bg-surface-container-low p-1">
            {([['grid', LayoutGrid, 'Vue grille'], ['list', List, 'Vue liste']] as const).map(([mode, Icon, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)} title={label} className={`flex cursor-pointer rounded-lg border-none p-1.5 ${viewMode === mode ? 'bg-surface-lowest text-primary shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>
                <Icon size={19} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <aside className="hidden rounded-2xl bg-surface-container-low p-4 lg:col-span-3 lg:block">{filtersPanel}</aside>

        <section className="min-w-0 lg:col-span-9">
          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low p-2.5">
              <span className="pl-1 text-label-sm uppercase text-on-surface-variant">Actifs :</span>
              {chips.map(c => (
                <span key={c.key} className="flex items-center gap-1 rounded-lg bg-surface-lowest px-2 py-1 text-label-md text-on-surface">
                  {c.label}
                  <button onClick={c.clear} className="flex cursor-pointer border-none bg-transparent p-0 text-on-surface-variant hover:text-primary" aria-label={`Retirer ${c.label}`}><X size={13} /></button>
                </span>
              ))}
              <button onClick={resetAll} className="cursor-pointer border-none bg-transparent px-1 text-label-sm text-primary hover:underline">Tout effacer</button>
            </div>
          )}

          <div className={loading && !data ? 'opacity-60' : ''}>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 md:gap-4">
                {items.map(l => (
                  <ListingCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUserId} onContact={contact(l)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {items.map(l => (
                  <ListingListCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUserId} />
                ))}
              </div>
            )}
            {!loading && items.length === 0 && (
              <div className="rounded-2xl bg-surface-container-low p-10 text-center">
                <p className="m-0 text-headline-sm text-on-surface">Aucune annonce ne correspond</p>
                <p className="m-0 mt-1 text-body-md text-on-surface-variant">Élargissez vos filtres ou créez une alerte ci-dessous.</p>
              </div>
            )}
          </div>

          {/* Saved-search alert */}
          <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-surface-container-low p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><BellRing size={22} /></span>
              <div>
                <div className="text-headline-sm text-on-surface">Vous ne trouvez pas la perle rare ?</div>
                <p className="m-0 text-body-sm text-on-surface-variant">Enregistrez cette recherche avec vos filtres pour être alerté des nouvelles annonces.</p>
              </div>
            </div>
            <button
              onClick={createAlert}
              disabled={savingAlert || alertState === 'done'}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-[1.5px] border-solid border-on-surface bg-surface-lowest px-4 py-2.5 text-label-md text-on-surface hover:bg-surface-container disabled:cursor-default disabled:opacity-80"
            >
              {alertState === 'done' ? <><Check size={16} className="text-tertiary" /> Alerte créée</> : <><BellRing size={16} className="text-primary" /> Créer une alerte</>}
            </button>
          </div>
          {alertState === 'error' && <p className="mt-2 text-body-sm text-primary">Impossible de créer l'alerte pour le moment.</p>}

          {/* Pagination */}
          {total > 0 && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <span className="text-body-sm text-on-surface-variant">Affichage de {from} – {to} sur {total.toLocaleString('fr-FR')} articles</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-on-surface-variant disabled:opacity-30"><ChevronLeft size={18} /></button>
                  {pages.map((p, i) => (
                    <span key={p} className="flex items-center">
                      {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-outline">…</span>}
                      <button onClick={() => setPage(p)} className={`h-9 min-w-9 cursor-pointer rounded-lg border-none px-2 text-label-md ${p === page ? 'bg-primary text-white' : 'bg-transparent text-on-surface hover:bg-surface-container'}`}>{p}</button>
                    </span>
                  ))}
                  <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-transparent px-2 py-2 text-label-md text-on-surface disabled:opacity-30">Suivant <ChevronRight size={16} /></button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtres">
        <div className="pb-4">{filtersPanel}</div>
        <button onClick={() => setFiltersOpen(false)} className="sticky bottom-0 w-full cursor-pointer rounded-lg border-none bg-primary py-3 text-label-lg text-white">
          Voir {total.toLocaleString('fr-FR')} article{total > 1 ? 's' : ''}
        </button>
      </BottomSheet>
    </div>
  )
}
