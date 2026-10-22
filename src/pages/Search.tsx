import { interestCategories, noteInterest } from '../lib/interests'
import { rotationSeed } from '../lib/rotationSeed'
import EmptyState from '../components/EmptyState'
import { useState, useEffect, useMemo, useRef } from 'react'
import Icon, { CategoryIcon } from '../components/Icon'
import { useMutation, useQuery } from '@apollo/client/react'
import { ChevronRight, ChevronLeft, ChevronUp, ChevronDown, SlidersHorizontal, X, BadgeCheck, Search as SearchIcon, MapPin, BellRing, Check, LayoutGrid, List, Handshake } from '../components/icons'
import FilterSheet from '../components/FilterSheet'
import { ListingCard, ListingListCard } from '../components/ListingCard'
import { CATEGORIES_QUERY, CATEGORY_LANDING_QUERY, type CategoryLanding, type RemoteCategory } from '../graphql/categories'
import {
  LISTINGS_QUERY, LISTING_FACETS_QUERY, CREATE_SAVED_SEARCH_MUTATION,
  type RemoteListing, type ListingSort, type ListingFacets, type ListingFilterInput, type FacetCount, type SearchCorrection, type PromotedPlace,
} from '../graphql/listings'
import { ImpressionScope } from '../lib/impressions'
import HelpLink from '../components/HelpLink'
import { getStoredViewMode, setStoredViewMode } from '../lib/viewMode'
import Select from '../components/Select'
import { setAuthReason } from '../lib/authReason'
import { PaymentLogos, useMobileMethods } from '../components/PaymentLogo'
import { useCountries, useMarketCode, useMarketVars } from '../lib/countries'
import { useNoCommissionClaims, usePageTitle, useSite } from '../lib/site'
import { slugify } from '../lib/routes'
import { richHtml } from '../lib/richText'
import CategoryLandingExtras from '../components/CategoryLandingExtras'
import { track } from '../lib/analytics'
import { GridSkeleton } from '../components/Skeleton'
import InfiniteLoader from '../components/InfiniteLoader'
import { useLoadMore } from '../lib/useLoadMore'
import { formatNumber } from '../lib/format'
import { metaTrack, noteAdultSlugs } from '../lib/metaPixel'
import { AdultSectionContext, SEARCH_ROUTING_QUERY, adultGateReason, useAdultAccessState, type SearchRouting } from '../lib/adult'
import AdultGate from '../components/AdultGate'
import { spaceCategories, useAdultSpace } from '../lib/adultMode'
import type { Space } from '../lib/routes'
import { AdultSearchNotice } from '../components/AdultSearchNotice'
import { matchesAll, recordFinalSearch, searchTokens } from '../lib/searchText'
import { noteResultOpen } from '../lib/searchAttribution'

const PAGE_SIZE = 18

const SORTS: { value: ListingSort, label: string }[] = [
  { value: 'RELEVANCE', label: 'Pertinence' },
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
  // City of a category page (/categorie/velos/abidjan): its address word.
  categoryCity?: string
  onCategoryCityChange?: (city: string) => void
  onClearCategoryFilter?: () => void
  onCategorySelect?: (slug: string, city?: string) => void
  searchTerm?: string
  onSearchTermChange?: (term: string) => void
  selectedCity?: string
  initialMaxPrice?: number
  // "Promos" shortcut: open on the items on sale.
  initialPromoOnly?: boolean
  onCityChange?: (city: string) => void
  currentUserId?: string | null
  isLoggedIn?: boolean
  onContactSeller?: (sellerId: string, listingId?: string) => void
  // « Section Adultes »: its search for these words (a search's card).
  onOpenSection?: (term?: string) => void
  // The page's rayon belongs to the section (an old link): the address
  // moves into its space.
  onSpaceKnown?: (space: Space) => void
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

function CheckRow({ checked, label, count, onChange, highlight, logos }: { checked: boolean, label: string, count?: number, onChange: () => void, highlight?: boolean, logos?: string[] }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1 text-body-sm text-on-surface-variant hover:text-on-surface">
      <span className="flex min-w-0 items-center gap-2">
        <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 accent-[var(--primary)]" />
        <span className={`truncate ${checked ? 'font-bold text-on-surface' : 'text-on-surface'}`}>{label}</span>
        {logos && <PaymentLogos methods={logos} size={16} className="shrink-0" />}
      </span>
      {count != null && (
        <span className={`shrink-0 rounded-full px-2 text-label-sm ${checked && highlight ? 'bg-tertiary-soft text-tertiary' : 'text-outline'}`}>{formatNumber(count, 0)}</span>
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
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder.replace(/…$/, '')} className="w-full rounded-lg border-none bg-surface-container-low py-2 pl-8 pr-2 text-body-sm text-on-surface outline-none placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/40" />
      </div>
      <div className="flex max-h-40 flex-col overflow-y-auto">
        {shown.map(f => <CheckRow key={f.value} checked={selected.includes(f.value)} label={f.label} count={f.count} onChange={() => onToggle(f.value)} />)}
        {shown.length === 0 && <span className="py-1 text-body-sm text-outline">Aucun résultat</span>}
      </div>
    </>
  )
}

// Keeps keystrokes local: typing re-renders this input only, not the App,
// the layout and every result card. The term goes up after a 300 ms pause
// (which is when the results query runs anyway).
function DebouncedSearchInput({ value, onCommit, placeholder }: { value: string, onCommit: (term: string) => void, placeholder: string }) {
  const [draft, setDraft] = useState(value)
  const committed = useRef(value)
  const commit = useRef(onCommit)
  commit.current = onCommit
  useEffect(() => { committed.current = value; setDraft(value) }, [value])
  useEffect(() => {
    if (draft === committed.current) return
    const t = setTimeout(() => { committed.current = draft; commit.current(draft) }, 300)
    return () => clearTimeout(t)
  }, [draft])
  return (
    <input
      type="search"
      enterKeyHint="search"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && draft !== committed.current) { committed.current = draft; commit.current(draft) } }}
      placeholder={placeholder}
      aria-label="Rechercher"
      className="h-full w-full min-w-0 rounded-xl border-none bg-transparent pl-11 pr-3 text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/80"
    />
  )
}

export default function SearchPage({
  onNavigate, onSelectListing, favorites, onToggleFavorite, categoryFilter, categoryCity, onCategoryCityChange, onClearCategoryFilter, onCategorySelect,
  searchTerm, onSearchTermChange, selectedCity, initialMaxPrice, initialPromoOnly, currentUserId, isLoggedIn, onContactSeller, onOpenSection, onSpaceKnown,
}: SearchProps) {
  // « Section Adultes »: this page is its search / rayon (/adultes/…), a
  // marketplace of its own — its listings, categories and filters only.
  const adultSpace = useAdultSpace()
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>(() => getStoredViewMode() ?? 'grid')
  const setViewMode = (mode: 'grid' | 'list') => { setViewModeState(mode); setStoredViewMode(mode) }
  const [filtersOpen, setFiltersOpen] = useState(false)

  // « Pertinence » by default: the visitor's interests, proximity,
  // freshness and quality (listings « en vedette » always lead).
  const [sort, setSort] = useState<ListingSort>('RELEVANCE')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [shopsOnly, setShopsOnly] = useState(false)
  const [handoverOnly, setHandoverOnly] = useState(false)
  const [mobileMoneyOnly, setMobileMoneyOnly] = useState(false)
  const mobile = useMobileMethods()
  const countryCode = useMarketCode()
  const [promoOnly, setPromoOnly] = useState(!!initialPromoOnly)
  useEffect(() => { if (initialPromoOnly) setPromoOnly(true) }, [initialPromoOnly])
  const [categorySlugs, setCategorySlugs] = useState<string[]>([])
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [conditions, setConditions] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [sizes, setSizes] = useState<string[]>([])
  // A category page in one city has that city, not the visitor's.
  const [cities, setCities] = useState<string[]>(selectedCity && !categoryCity ? [selectedCity] : [])
  useEffect(() => { if (categoryCity) setCities([]) }, [categoryCity])
  // The initial city is the visitor's detected location, not a choice they made:
  // it is labelled "Près de vous" and left out of the active-filter badge.
  const [nearCity] = useState(categoryCity ? '' : (selectedCity ?? ''))
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice ? String(initialMaxPrice) : '')
  // Typed prices reach the query after a pause — every digit used to refetch
  // the results and the facets. Chips and "clear" apply at once (applyPrice).
  const [appliedPrice, setAppliedPrice] = useState({ min: minPrice, max: maxPrice })
  useEffect(() => {
    const t = setTimeout(() => setAppliedPrice(p => p.min === minPrice && p.max === maxPrice ? p : { min: minPrice, max: maxPrice }), 400)
    return () => clearTimeout(t)
  }, [minPrice, maxPrice])
  const applyPrice = (min: string, max: string) => { setMinPrice(min); setMaxPrice(max); setAppliedPrice({ min, max }) }
  const [search, setSearch] = useState(searchTerm || '')
  const [alertState, setAlertState] = useState<'idle' | 'done' | 'error'>('idle')

  // The mobile input already debounces before lifting the term (see
  // DebouncedSearchInput); other sources (header search, chips) apply at once.
  useEffect(() => { setSearch(searchTerm || '') }, [searchTerm])
  useEffect(() => { setSubcategories([]) }, [categoryFilter])

  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY, { variables: useMarketVars() })
  const categories = categoriesData?.categories ?? []
  // The page's rubric: a category, or a subcategory with its own page
  // (/categorie/velos) — then its category.
  const subOwner = categoryFilter && !categories.some(c => c.slug === categoryFilter)
    ? categories.find(c => c.subcategories.some(s => s.slug === categoryFilter))
    : undefined
  const category = subOwner ?? categories.find(c => c.slug === categoryFilter)
  const subcategory = subOwner?.subcategories.find(s => s.slug === categoryFilter)
  // « Section Adultes »: its pages need the visitor's access (else the gate,
  // and no listing query at all). While the access is being asked, a
  // neutral loading state — never « Connectez-vous » for a member whose
  // session is being restored.
  const { access, loading: accessLoading } = useAdultAccessState()
  const adultOk = access?.status === 'OK'
  const rubricAdult = !!(category?.adult || subcategory?.adult) || (!!categoryFilter && categoryFilter === 'adultes')
  // A rayon of the section reached in the general marketplace (an old
  // link): it is the section's page.
  useEffect(() => { if (rubricAdult && !adultSpace) onSpaceKnown?.('adult') }, [rubricAdult, adultSpace]) // eslint-disable-line react-hooks/exhaustive-deps
  const inSection = adultSpace || rubricAdult
  const accessPending = inSection && accessLoading && !access
  const gated = inSection && !!access && !adultOk
  useEffect(() => {
    const slugs = categories.flatMap(c => [...(c.adult ? [c.slug] : []), ...c.subcategories.filter(x => c.adult || x.adult).map(x => x.slug)])
    if (slugs.length) noteAdultSlugs(slugs)
  }, [categories])
  // Filters: each marketplace its own categories (the section's never in
  // the general one).
  const filterCategories = adultSpace ? spaceCategories(categories) : categories.filter(c => !c.adult)
  const closeCategories = useMemo(() => {
    if (!search.trim()) return []
    const out: { slug: string, name: string }[] = []
    for (const c of filterCategories) {
      if (matchesAll(c.name, search)) out.push({ slug: c.slug, name: c.name })
      for (const sc of c.subcategories) if ((adultSpace || !sc.adult) && matchesAll(sc.name, search)) out.push({ slug: sc.slug, name: sc.name })
    }
    return out.slice(0, 5)
  }, [search, filterCategories, adultSpace])
  // A rayon's address in this marketplace.
  const rubricHref = (slug: string, city?: string) => adultSpace ? `/adultes/${slug}` : `/categorie/${slug}${city ? `/${city}` : ''}`
  // Category page: the team's texts and the links to neighbouring pages.
  const { data: landingData } = useQuery<{ categoryLanding: CategoryLanding | null }>(CATEGORY_LANDING_QUERY, {
    variables: { slug: categoryFilter ?? '', city: categoryCity || null, country: countryCode ?? null },
    skip: !categoryFilter || inSection,
  })
  const landing = categoryFilter ? landingData?.categoryLanding ?? null : null
  // The city of a city page, from the country lists (at once), else the
  // server's: a city, else a district of a main city (« Cocody », whose
  // listings are Abidjan's with that « quartier ») — the server's order.
  const countries = useCountries()
  const market = countries.find(c => c.code === countryCode)
  const pageCity = useMemo((): { name: string, countryCode: string, parent: string | null } | null => {
    if (!categoryCity) return null
    const word = slugify(categoryCity)
    for (const c of countries) {
      const name = c.cities.find(n => slugify(n) === word)
      if (name) return { name, countryCode: c.code, parent: null }
    }
    for (const c of countries) {
      const name = c.mainCity ? c.districts.find(n => slugify(n) === word) : undefined
      if (name) return { name, countryCode: c.code, parent: c.mainCity }
    }
    return landing?.city ? { name: landing.city.name, countryCode: landing.city.countryCode, parent: landing.city.parentCity } : null
  }, [categoryCity, countries, landing])
  // « Abidjan », « Cocody, Abidjan ».
  const pagePlace = pageCity ? (pageCity.parent ? `${pageCity.name}, ${pageCity.parent}` : pageCity.name) : ''
  const rubricName = subcategory?.name ?? category?.name ?? landing?.name
  // A category address opened directly: wait for the categories (a
  // subcategory's page needs its category) rather than flash « 0 article ».
  const rubricPending = !!categoryFilter && !categoriesData
  // Category links are real addresses (crawlable); a click stays in the app.
  const goCategory = (slug: string, city?: string) => (e: React.MouseEvent) => { e.preventDefault(); onCategorySelect?.(slug, city) }

  const filter: ListingFilterInput = useMemo(() => ({
    // Listings of the visitor's country (all for « Tous les pays »).
    // A city page shows its city's country, whatever the visitor's.
    ...(pageCity ? { countryCode: pageCity.countryCode } : countryCode ? { countryCode } : {}),
    ...(search ? { search } : {}),
    ...(category ? { categorySlug: category.slug } : categoryFilter ? { categorySlug: categoryFilter } : {}),
    ...(subcategory ? { subcategorySlugs: [subcategory.slug] } : subcategories.length ? { subcategorySlugs: subcategories } : {}),
    ...(conditions.length ? { conditions } : {}),
    ...(brands.length ? { brands } : {}),
    ...(sizes.length ? { sizes } : {}),
    ...(pageCity ? { cities: [pageCity.parent ?? pageCity.name], ...(pageCity.parent ? { districts: [pageCity.name] } : {}) } : cities.length ? { cities } : {}),
    ...(verifiedOnly ? { verifiedSellersOnly: true } : {}),
    ...(shopsOnly ? { officialShopsOnly: true } : {}),
    ...(handoverOnly ? { handoverOnly: true } : {}),
    ...(mobileMoneyOnly ? { mobileMoneyOnly: true } : {}),
    ...(promoOnly ? { promoOnly: true } : {}),
    ...(categorySlugs.length ? { categorySlugs } : {}),
    ...(appliedPrice.min ? { minPrice: Number(appliedPrice.min) } : {}),
    ...(appliedPrice.max ? { maxPrice: Number(appliedPrice.max) } : {}),
    // Each marketplace its own listings (Backend ListingSpace).
    space: inSection ? 'ADULT' : 'GENERAL',
  }), [inSection, countryCode, pageCity, search, category, subcategory, categoryFilter, subcategories, conditions, brands, sizes, cities, verifiedOnly, shopsOnly, handoverOnly, mobileMoneyOnly, promoOnly, categorySlugs, appliedPrice])

  useEffect(() => { setAlertState('idle') }, [filter, sort])

  // Results grow as the visitor scrolls (InfiniteLoader): each next page is
  // appended to the cached list — a new filter or sort starts it over.
  // « Rechercher plutôt … »: the words as typed, without the automatic
  // correction of a search that finds nothing (until the words change).
  const [asTyped, setAsTyped] = useState('')
  const { data, previousData, loading, error: listingsError, refetch, fetchMore } = useQuery<{ listings: { items: RemoteListing[]; totalCount: number; page: number; totalPages: number; searchCorrection: SearchCorrection | null; promoted?: PromotedPlace[] | null; rankingVariant?: string | null } }>(LISTINGS_QUERY, {
    // rotationSeed: listings « en vedette » keep one order across the pages
    // of this visit.
    variables: { filter, sort, page: 1, pageSize: PAGE_SIZE, rotationSeed: rotationSeed(), interestCategories: isLoggedIn ? undefined : interestCategories(), searchAsTyped: !!search && asTyped === search },
    skip: rubricPending || gated || (inSection && !access),
  })
  // The server refused the section's listings: the gate, with its reason.
  const gateReason = adultGateReason(listingsError)
  const showGate = gated || !!gateReason

  // A search shown with its results is counted once settled (typing on the
  // phone's input lifts the words after a pause: a short wait more), once
  // per session — never while typing.
  useEffect(() => {
    const words = search.trim()
    if (!words || !data) return
    const t = setTimeout(() => recordFinalSearch(words, countryCode, inSection), 1500)
    return () => clearTimeout(t)
  }, [search, data, countryCode, inSection])
  const { data: routingData } = useQuery<{ searchRouting: SearchRouting }>(SEARCH_ROUTING_QUERY, {
    variables: { term: search.trim(), countryCode: countryCode ?? null },
    skip: search.trim().length < 2,
  })
  // Inside the section, only the « no pornographic content » note.
  const routing = search.trim().length >= 2 && (!inSection || routingData?.searchRouting.intent === 'PORN') ? routingData?.searchRouting ?? null : null
  const result = (data ?? previousData)?.listings
  const items = result?.items ?? []
  // Where these cards are counted as seen: words typed = a search, else
  // a category page, else a city page.
  const placement = search ? 'SEARCH' : filter.categorySlug || filter.subcategorySlugs?.length || filter.categorySlugs?.length ? 'CATEGORY' : pageCity || filter.city ? 'CITY' : 'SEARCH'
  const correction = data?.listings.searchCorrection ?? null
  // The words the results answer (the correction's when it was applied):
  // a result opened, then a contact, count as this search's success.
  const effectiveSearch = correction?.applied ? correction.corrected : search
  const openResult = (id: string) => {
    // The « Pertinence » group the page was served with (A/B measure).
    const variant = sort === 'RELEVANCE' ? data?.listings.rankingVariant ?? null : null
    noteResultOpen(id, { term: effectiveSearch, countryCode, variant, placement: search.trim() ? 'SEARCH' : 'CATEGORY', adult: inSection })
    onSelectListing(id)
  }
  const total = result?.totalCount ?? 0
  const listKey = JSON.stringify([filter, sort])
  const nextPage = useLoadMore({ fetchMore, page: data?.listings.page, totalPages: data?.listings.totalPages, key: listKey })
  // « Mesure d'audience »: one `search` per words / category, once its
  // results are in. Never the words themselves (they can hold a name or a
  // number): the category, whether words were typed, and the count.
  const trackedSearch = useRef('')
  useEffect(() => {
    if (!data || (!search && !categoryFilter)) return
    const key = `${search}|${categoryFilter}`
    if (trackedSearch.current === key) return
    trackedSearch.current = key
    // Anonymous interests (this device only): the category searched in
    // (never the « Section Adultes »).
    if (categoryFilter && !inSection) noteInterest(category?.slug ?? categoryFilter, 0.5)
    track('search', { search_category: categoryFilter || 'toutes', with_words: !!search.trim(), results_count: data.listings.totalCount, country: countryCode ?? undefined })
    // Meta Pixel: the first results' ids (the catalogue's ids); a category
    // page without words is a ViewCategory.
    const firstIds = data.listings.items.slice(0, 10).map((l) => l.id)
    // Nothing about the « Section Adultes » (its listings' ids are left out
    // by lib/metaPixel; its pages send nothing).
    if (inSection) return
    if (search.trim()) metaTrack('Search', { search_string: search, content_ids: firstIds, content_category: categoryFilter || undefined })
    else metaTrack('ViewCategory', { content_ids: firstIds, content_category: categoryFilter })
  }, [data, search, categoryFilter, countryCode, inSection])

  const { data: facetsData } = useQuery<{ listingFacets: ListingFacets }>(LISTING_FACETS_QUERY, { variables: { filter }, skip: rubricPending || showGate || (inSection && !access) })
  const facets = facetsData?.listingFacets
  const noCommission = useNoCommissionClaims()

  const [createSavedSearch, { loading: savingAlert }] = useMutation(CREATE_SAVED_SEARCH_MUTATION)
  const createAlert = async () => {
    if (!isLoggedIn) { setAuthReason('alert'); onNavigate('auth'); return }
    const label = search || (pageCity && rubricName ? `${rubricName} à ${pagePlace}` : rubricName) || 'Ma recherche'
    try {
      await createSavedSearch({ variables: { label, filter } })
      setAlertState('done')
    } catch {
      setAlertState('error')
    }
  }

  const resetAll = () => {
    setVerifiedOnly(false); setShopsOnly(false); setSubcategories([]); setConditions([]); setBrands([]); setSizes([]); setCities([])
    setHandoverOnly(false); setMobileMoneyOnly(false); setPromoOnly(false); setCategorySlugs([])
    applyPrice('', '')
    onClearCategoryFilter?.()
    onSearchTermChange?.('')
  }

  const chips: { key: string, label: string, near?: boolean, clear: () => void }[] = [
    ...(search ? [{ key: 'q', label: `« ${search} »`, clear: () => onSearchTermChange?.('') }] : []),
    ...(promoOnly ? [{ key: 'promo', label: 'En promotion', clear: () => setPromoOnly(false) }] : []),
    ...(category ? [{ key: 'cat', label: rubricName ?? category.name, clear: () => onClearCategoryFilter?.() }] : []),
    ...(pageCity ? [{ key: 'page-city', label: `À ${pagePlace}`, clear: () => onCategoryCityChange?.('') }] : []),
    ...subcategories.map(v => ({ key: `sub-${v}`, label: facets?.subcategories.find(f => f.value === v)?.label ?? v, clear: () => setSubcategories(s => s.filter(x => x !== v)) })),
    ...cities.map(v => ({ key: `city-${v}`, label: v === nearCity ? `Près de vous : ${v}` : v, near: v === nearCity, clear: () => setCities(s => s.filter(x => x !== v)) })),
    ...conditions.map(v => ({ key: `cond-${v}`, label: v, clear: () => setConditions(s => s.filter(x => x !== v)) })),
    ...brands.map(v => ({ key: `brand-${v}`, label: v, clear: () => setBrands(s => s.filter(x => x !== v)) })),
    ...sizes.map(v => ({ key: `size-${v}`, label: `Taille : ${v}`, clear: () => setSizes(s => s.filter(x => x !== v)) })),
    ...(minPrice || maxPrice ? [{ key: 'price', label: `${minPrice || 0} – ${maxPrice || '∞'} F`, clear: () => applyPrice('', '') }] : []),
    ...(verifiedOnly ? [{ key: 'verified', label: 'Vendeurs vérifiés', clear: () => setVerifiedOnly(false) }] : []),
    ...(shopsOnly ? [{ key: 'shops', label: 'Boutiques officielles', clear: () => setShopsOnly(false) }] : []),
    ...(handoverOnly ? [{ key: 'handover', label: 'Remise en main propre', clear: () => setHandoverOnly(false) }] : []),
    ...(mobileMoneyOnly ? [{ key: 'momo', label: 'Mobile Money', clear: () => setMobileMoneyOnly(false) }] : []),
    ...categorySlugs.map(v => ({ key: `cats-${v}`, label: categories.find(c => c.slug === v)?.name ?? v, clear: () => setCategorySlugs(s => s.filter(x => x !== v)) })),
  ]

  const chosenCount = chips.filter(c => !c.near).length

  const contact = (l: RemoteListing) => () =>
    isLoggedIn && onContactSeller ? onContactSeller(l.seller.id, l.id) : onSelectListing(l.id)

  const filtersPanel = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-headline-sm text-on-surface"><SlidersHorizontal size={19} className="text-primary" /> Filtres</span>
        <button onClick={resetAll} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-primary hover:underline">Réinitialiser</button>
      </div>

      <label className="relative flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-tertiary-soft p-3">
        <span className="flex items-center gap-2">
          <BadgeCheck size={19} className="text-tertiary" />
          <span className="flex flex-col">
            <span className="text-label-md text-on-surface">Vendeurs vérifiés</span>
            <span className="text-label-sm text-tertiary">Badge Compte vérifié ou Vendeur certifié</span>
          </span>
        </span>
        <input type="checkbox" className="peer sr-only" checked={verifiedOnly} onChange={() => setVerifiedOnly(v => !v)} />
        <span className="relative h-5 w-9 shrink-0 rounded-full bg-surface-container-highest transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-tertiary peer-checked:after:translate-x-4" />
      </label>

      <label className="relative -mt-2 flex cursor-pointer items-center justify-between gap-2 rounded-xl bg-surface-container-low p-3">
        <span className="flex items-center gap-2">
          <Icon name="storefront" size={19} className="text-tertiary" />
          <span className="flex flex-col">
            <span className="text-label-md text-on-surface">Boutiques officielles</span>
            <span className="text-label-sm text-on-surface-variant">Entreprises vérifiées (RCCM ou identifiant fiscal)</span>
          </span>
        </span>
        <input type="checkbox" className="peer sr-only" checked={shopsOnly} onChange={() => setShopsOnly(v => !v)} />
        <span className="relative h-5 w-9 shrink-0 rounded-full bg-surface-container-highest transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-tertiary peer-checked:after:translate-x-4" />
      </label>

      <FilterBlock title="Catégorie">
        {category ? (
          <>
            {/* In the section's space its category is the whole site. */}
            {!(adultSpace && !subcategory) && (
              <button onClick={() => onClearCategoryFilter?.()} className="mb-2 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-primary">
                <ChevronLeft size={14} /> {adultSpace ? 'Toute la section' : 'Toutes les catégories'}
              </button>
            )}
            <div className="mb-1 flex items-center gap-2 text-label-md text-on-surface"><CategoryIcon icon={category.icon} size={20} className="text-primary" /> {category.name}</div>
            {subcategory ? (
              // A subcategory's own page: its neighbours are pages too.
              <div className="flex flex-col">
                {category.subcategories.map(sub => (
                  <a key={sub.id} href={rubricHref(sub.slug, categoryCity || undefined)} onClick={goCategory(sub.slug, categoryCity || undefined)} aria-current={sub.slug === subcategory.slug ? 'page' : undefined}
                    className={`py-1 text-body-sm no-underline hover:text-primary ${sub.slug === subcategory.slug ? 'font-bold text-primary' : 'text-on-surface'}`}>{sub.name}</a>
                ))}
              </div>
            ) : (facets?.subcategories ?? []).map(f => (
              <CheckRow key={f.value} checked={subcategories.includes(f.value)} label={f.label} count={f.count} onChange={() => setSubcategories(s => toggle(s, f.value))} />
            ))}
          </>
        ) : (
          <div className="flex flex-col">
            {filterCategories.map(c => (
              <button key={c.id} onClick={() => onCategorySelect?.(c.slug)} title={c.name} className="flex cursor-pointer items-center justify-between gap-2 border-none bg-transparent px-0 py-1 text-left text-body-sm text-on-surface hover:text-primary">
                <span className="flex min-w-0 items-center gap-2"><CategoryIcon icon={c.icon} size={18} className="shrink-0 text-on-surface-variant" /> <span className="truncate">{c.name}</span></span>
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
                onClick={() => applyPrice(active ? '' : String(b.min ?? ''), active ? '' : String(b.max ?? ''))}
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
        </FilterBlock>
      )}

      {!adultSpace && <FilterBlock title="Bonnes affaires">
        <CheckRow checked={promoOnly} label="En promotion (soldes & campagnes)" onChange={() => setPromoOnly(v => !v)} />
      </FilterBlock>}

      <FilterBlock title="Vendeurs de confiance">
        <CheckRow checked={handoverOnly} label="Remise en main propre privilégiée" onChange={() => setHandoverOnly(v => !v)} />
        <CheckRow checked={mobileMoneyOnly} label="Mobile Money accepté" logos={mobile} onChange={() => setMobileMoneyOnly(v => !v)} />
        <div className="mt-2 flex items-center gap-1 text-label-sm text-tertiary"><Handshake size={13} /> {noCommission ? '0 % de commission, paiement à la remise' : 'Paiement à la remise'}</div>
      </FilterBlock>

      <button onClick={resetAll} className="cursor-pointer rounded-xl border-none bg-surface-container-high py-2.5 text-label-md text-on-surface hover:bg-surface-container-highest">
        Réinitialiser tous les filtres
      </button>
    </div>
  )

  // Category pages: « Mode à Abidjan » (city page), « Mode à Abidjan et en
  // Côte d’Ivoire » (the visitor's country), as search engines get them.
  const rubricTitle = rubricName ? (pageCity ? `${rubricName} à ${pagePlace}` : market ? `${rubricName} à ${market.mainCity} et ${market.inName}` : rubricName) : ''
  const title = search ? `Résultats pour « ${search} »` : rubricPending ? ' ' : adultSpace && rubricName ? rubricName : rubricName ? rubricTitle : adultSpace ? 'Toute la section' : promoOnly ? 'Annonces en promotion' : 'Toutes les annonces'
  // Category pages: same tab title as the one search engines get.
  const countText = `${formatNumber(total, 0)} annonce${total > 1 ? 's' : ''}`
  // With its count while the whole title stays within ~60 characters.
  const brandName = useSite().brand.name
  const counted = `${title} : ${countText}`
  usePageTitle(!inSection && categoryFilter && !search && rubricName && (data || previousData) ? (total > 0 && counted.length + brandName.length + 3 <= 60 ? counted : title) : null)

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-5 md:px-8 lg:px-12">
      {/* Breadcrumb */}
      {/* Mobile: editable query + filters, like the home screen */}
      <div className="mb-4 flex items-center gap-2 lg:hidden">
        <label className="relative flex h-12 min-w-0 flex-1 items-center rounded-xl border border-solid border-outline-variant bg-surface-lowest">
          <SearchIcon size={20} className="pointer-events-none absolute left-3.5 text-primary" />
          <DebouncedSearchInput value={searchTerm ?? ''} onCommit={term => onSearchTermChange?.(term)} placeholder={adultSpace ? 'Rechercher dans la section' : 'Rechercher sur Dilchap'} />
        </label>
        <button onClick={() => setFiltersOpen(true)} aria-label="Filtres" className="relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-inverse-surface text-white">
          <SlidersHorizontal size={20} />
          {chosenCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-white">{chosenCount}</span>}
        </button>
      </div>
      {/* Mobile: one tap to the items on sale (no campaign in the section). */}
      {!adultSpace && <div className="-mt-2 mb-4 lg:hidden">
        <button type="button" aria-pressed={promoOnly} onClick={() => setPromoOnly(v => !v)}
          className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-solid px-3 py-1.5 text-label-md ${promoOnly ? 'border-primary bg-primary text-white' : 'border-outline-variant bg-surface-lowest text-on-surface'}`}>
          <Icon name="percent" size={16} /> En promotion
        </button>
      </div>}

      {/* Category pages: the same trail as their structured data (Backend seo). */}
      <nav aria-label="Fil d'ariane" className={`mb-2 flex-wrap items-center gap-1 text-label-md text-on-surface-variant ${category ? 'flex' : 'hidden lg:flex'}`}>
        <a href={adultSpace ? '/adultes' : '/'} onClick={e => { e.preventDefault(); onNavigate('home') }} className="text-label-md text-on-surface-variant no-underline hover:text-primary">{adultSpace ? 'Section Adultes' : 'Accueil'}</a>
        <ChevronRight size={14} className="text-outline-variant" />
        {category ? (
          <>
            {(subcategory || pageCity) && (
              <>
                <a href={rubricHref(category.slug)} onClick={goCategory(category.slug)} className="text-label-md text-on-surface-variant no-underline hover:text-primary">{category.name}</a>
                <ChevronRight size={14} className="text-outline-variant" />
              </>
            )}
            {subcategory && pageCity && (
              <>
                <a href={rubricHref(subcategory.slug)} onClick={goCategory(subcategory.slug)} className="text-label-md text-on-surface-variant no-underline hover:text-primary">{subcategory.name}</a>
                <ChevronRight size={14} className="text-outline-variant" />
              </>
            )}
            <span className="font-semibold text-on-surface">{pageCity ? pageCity.name : rubricName}</span>
          </>
        ) : <span className="font-semibold text-on-surface">{adultSpace ? 'Recherche' : 'Catalogue'}</span>}
      </nav>

      {/* Heading + sort + view */}
      <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          {verifiedOnly && (
            <span className="mb-1 inline-block rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm uppercase text-primary">Sélection vérifiée</span>
          )}
          <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">{title}</h1>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant">
            {result ? <><span className="font-bold text-on-surface">{formatNumber(total, 0)} article{total > 1 ? 's' : ''}</span> disponible{total > 1 ? 's' : ''} auprès de notre communauté.</> : ' '}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4">
            {/* Transparency: how « Pertinence » ranks (help center). */}
            {sort === 'RELEVANCE' && <HelpLink article="comment-sont-classees-les-annonces" label="Comment sont classées les annonces ?" />}
            {!!result?.promoted?.length && <HelpLink article="badges-des-annonces" label="Pourquoi certaines annonces sont en tête ?" />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-1.5">
            <span className="hidden text-label-sm uppercase text-on-surface-variant sm:inline">Trier :</span>
            <Select value={sort} onChange={e => setSort(e.target.value as ListingSort)} className="cursor-pointer border-none bg-transparent py-1 text-label-md font-bold text-on-surface outline-none">
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
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
                <span key={c.key} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-label-md ${c.near ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-lowest text-on-surface'}`}>
                  {c.near && <MapPin size={13} />}{c.label}
                  <button onClick={c.clear} className="tap-44 relative flex cursor-pointer border-none bg-transparent p-0 text-on-surface-variant hover:text-primary" aria-label={`Retirer ${c.label}`}><X size={13} /></button>
                </span>
              ))}
              <button onClick={resetAll} className="cursor-pointer border-none bg-transparent px-1 text-label-sm text-primary hover:underline">Tout effacer</button>
            </div>
          )}

          {routing && <AdultSearchNotice routing={routing} onOpenSection={() => onOpenSection?.(search)} className="mb-4" />}
          {correction && !showGate && (
            <p role="status" className="m-0 mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-surface-container-low px-3.5 py-2.5 text-body-md text-on-surface">
              <Icon name="spellcheck" size={18} className="text-primary" />
              {correction.applied ? (
                <>
                  <span>Résultats pour <b>« {correction.corrected} »</b>.</span>
                  <button type="button" onClick={() => setAsTyped(search)} className="cursor-pointer border-none bg-transparent p-0 text-body-md text-primary underline">Rechercher plutôt « {correction.original} »</button>
                </>
              ) : (
                <>
                  <span>Vouliez-vous dire</span>
                  <button type="button" onClick={() => onSearchTermChange?.(correction.corrected)} className="cursor-pointer border-none bg-transparent p-0 text-body-md font-bold text-primary underline">« {correction.corrected} »</button>
                  <span>?</span>
                </>
              )}
            </p>
          )}

          {accessPending ? (
            <GridSkeleton count={6} className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 md:gap-4" />
          ) : showGate ? (
            <div className="py-6"><AdultGate reason={gateReason} onNavigate={onNavigate} onConfirmed={() => { void refetch() }} /></div>
          ) : (
          <AdultSectionContext.Provider value={inSection && adultOk}>
          <ImpressionScope placement={placement} promoted={result?.promoted}>
          <div className={loading && !data ? 'opacity-60' : ''}>
            {/* First load: the results' room is kept (the alert box below
                doesn't jump when they land). */}
            {!result && loading ? <GridSkeleton count={6} className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 md:gap-4" /> : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 md:gap-4">
                {items.map((l, i) => (
                  <ListingCard key={l.id} listing={l} onSelect={() => openResult(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUserId} onContact={contact(l)} priority={i < 2} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {items.map(l => (
                  <ListingListCard key={l.id} listing={l} onSelect={() => openResult(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUserId} />
                ))}
              </div>
            )}
            {!showGate && data && <InfiniteLoader key={listKey} list={nextPage} pageSize={PAGE_SIZE} endLabel={items.length > PAGE_SIZE ? 'Vous avez tout vu' : null} />}
            {!loading && items.length === 0 && (
              <>
                <EmptyState icon="empty-search" fallback="search" tone="neutral" title="Aucune annonce ne correspond"
                  text={search && searchTokens(search).length > 2 ? 'Essayez avec moins de mots, élargissez vos filtres ou créez une alerte ci-dessous.' : 'Vérifiez l’orthographe, élargissez vos filtres ou créez une alerte ci-dessous.'} />
                {/* Nearby categories (« telephone » → Téléphones). */}
                {search && closeCategories.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="text-body-sm text-on-surface-variant">Voir aussi :</span>
                    {closeCategories.map(c => (
                      <a key={c.slug} href={rubricHref(c.slug)} onClick={goCategory(c.slug)} className="rounded-full bg-surface-lowest px-3.5 py-1.5 text-label-md text-on-surface no-underline hover:text-primary">{c.name}</a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          </ImpressionScope>
          </AdultSectionContext.Provider>
          )}

          {/* Saved-search alert */}
          {!showGate && !accessPending && <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-surface-container-low p-5 sm:flex-row sm:items-center">
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
          </div>}
          {alertState === 'error' && <p className="mt-2 text-body-sm text-primary">Impossible de créer l'alerte pour le moment.</p>}

          {landing && !search && (
            <CategoryLandingExtras
              landing={landing}
              rubricName={rubricName ?? landing.name}
              cityName={pagePlace || undefined}
              introHtml={landing.introText ? richHtml(landing.introText) : ''}
              onOpen={(slug, city) => onCategorySelect?.(slug, city)}
            />
          )}
        </section>
      </div>

      <FilterSheet
          open={filtersOpen}
          state={{ sort, cities, minPrice, maxPrice, categorySlugs, conditions, verifiedOnly, shopsOnly, handoverOnly, mobileMoneyOnly, promoOnly }}
          onChange={patch => {
            if (patch.sort) setSort(patch.sort)
            if (patch.cities) setCities(patch.cities)
            if (patch.minPrice !== undefined) setMinPrice(patch.minPrice)
            if (patch.maxPrice !== undefined) setMaxPrice(patch.maxPrice)
            if (patch.categorySlugs) setCategorySlugs(patch.categorySlugs)
            if (patch.conditions) setConditions(patch.conditions)
            if (patch.verifiedOnly !== undefined) setVerifiedOnly(patch.verifiedOnly)
            if (patch.shopsOnly !== undefined) setShopsOnly(patch.shopsOnly)
            if (patch.handoverOnly !== undefined) setHandoverOnly(patch.handoverOnly)
            if (patch.mobileMoneyOnly !== undefined) setMobileMoneyOnly(patch.mobileMoneyOnly)
            if (patch.promoOnly !== undefined) setPromoOnly(patch.promoOnly)
          }}
          onReset={resetAll}
          onClose={() => setFiltersOpen(false)}
          facets={facets}
          categories={filterCategories}
          adultSpace={adultSpace}
          total={total}
          nearCity={nearCity}
        />
    </div>
  )
}
