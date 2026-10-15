import { interestCategories } from '../lib/interests'
import { requestOpenHelp, requestOpenLocation } from '../lib/navigation'
import EmptyState from '../components/EmptyState'
import { Fragment, useState, useEffect, useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import {
  ArrowLeft, ArrowRight, ChevronRight, Search, Flame,
  MapPin, Wallet, Smartphone, BadgeCheck, Shirt,
} from '../components/icons'
import Icon, { CategoryIcon } from '../components/Icon'
import { ListingCard, listingImage } from '../components/ListingCard'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'
import { rotationSeed } from '../lib/rotationSeed'
import { formatNumber } from '../lib/format'
import { LISTINGS_QUERY, LISTING_FACETS_QUERY, RECOMMENDED_LISTINGS_QUERY, type ListingFacets, type ListingSort, type RemoteListing } from '../graphql/listings'
import { DEFAULT_HOME, HOME_CONFIG_QUERY, SLIDE_TONE, type HomeConfig, type HomeSectionKey } from '../lib/homeConfig'
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import type { StoredLocation } from '../lib/location'
import type { AuthUser } from '../graphql/auth'
import Select from '../components/Select'
import { PaymentLogos } from '../components/PaymentLogo'
import { countryVars, fillPlacesDeep, useMarket, useMarketCode, useMarketVars, useMethods } from '../lib/countries'
import { ShopCard } from '../components/ShopCard'
import { SHOPS_QUERY, type Shop } from '../graphql/shops'
import { HomePromotions, useLiveCampaignsSettled } from '../components/campaign/CampaignTiles'
import { CategoryRailSkeleton, GridSkeleton, RailSkeleton } from '../components/Skeleton'
import InfiniteLoader from '../components/InfiniteLoader'
import { useLoadMore } from '../lib/useLoadMore'
import { trustTopicOf, useTrustSheet } from '../components/TrustSheet'

// promo: only items on sale (shop sales and Dilchap campaigns).
export type SearchPreset = { city?: string, maxPrice?: number, promo?: boolean }

type HomeProps = {
  onNavigate: (page: any) => void
  onOpenShop?: (slug: string) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onCategorySelect?: (categoryId: string) => void
  currentUser?: AuthUser | null
  location?: StoredLocation | null
  // First visit: market detection still running — hold the market-scoped
  // queries so they don't load twice.
  locationPending?: boolean
  onContactSeller?: (sellerId: string, listingId?: string) => void
  onSearch?: (term: string, preset?: SearchPreset) => void
}

// A page of the feed: 3 rows of 4 on desktop, 3 rows of 2 on phones.
const PAGE_SIZE = 12
const MOBILE_PAGE_SIZE = 6

const SORTS: { value: ListingSort, label: string }[] = [
  { value: 'RECENT', label: 'Récents' },
  { value: 'PRICE_ASC', label: 'Prix croissant' },
  { value: 'PRICE_DESC', label: 'Prix décroissant' },
  { value: 'POPULAR', label: 'Populaires' },
]

// "Explorer par rayon" tiles cycle through the mockup's tints.
const TILE_TINTS = [
  'bg-primary-fixed/50 text-primary',
  'bg-primary-fixed/50 text-primary',
  'bg-surface-container-high text-on-surface',
  'bg-surface-container-high text-on-surface',
  'bg-tertiary-soft text-tertiary',
  'bg-surface-container-high text-on-surface',
  'bg-surface-container-high text-on-surface',
]

function Accent({ children }: { children: React.ReactNode }) {
  return <span className="bg-gradient-to-r from-red-500 to-amber-400 bg-clip-text font-extrabold text-transparent">{children}</span>
}

// "*mot*" in a back-office title marks the highlighted words.
function Title({ text }: { text: string }) {
  return <>{text.split(/\*([^*]+)\*/).map((part, i) => (i % 2 ? <Accent key={i}>{part}</Accent> : part))}</>
}

const MAX_PRICES = [20_000, 50_000, 150_000, 500_000]

function SectionHeading({ title, action }: { title: React.ReactNode, action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface md:text-headline-md">{title}</h2>
      {action}
    </div>
  )
}

function Kicker({ children, className = 'text-primary' }: { children: React.ReactNode, className?: string }) {
  return <span className={`text-label-sm font-bold uppercase tracking-wider ${className}`}>{children}</span>
}

// Mobile follows "Dilchap Mobile – Accueil & Découverte"; desktop (lg+)
// follows the dedicated desktop home mockup.
// The feed's city chip outlives Home unmounting; its loaded pages stay in
// the Apollo cache (lib/apollo, pagedList): opening a listing and coming
// back restores every page already scrolled through (and the scroll
// position, see App), instead of dropping the visitor at the top of page 1.
const feedMemory: { city: string | null } = { city: null }
// The recommendation rails' last lists (this tab), shown while new ones
// load: back from a listing, its category now counts in the interests (a
// new request) — the rails keep their room, so the sections below are laid
// out at once and the scroll position deep in the feed is restored.
const railMemory: { key: string, recommended?: RemoteListing[], forYou?: RemoteListing[] } = { key: '' }

export default function Home({ onOpenShop, onNavigate, onSelectListing, favorites, onToggleFavorite, onCategorySelect, currentUser, location, locationPending, onContactSeller, onSearch }: HomeProps) {
  const [pageSize] = useState(() => (window.innerWidth < 1024 ? MOBILE_PAGE_SIZE : PAGE_SIZE))
  const [sort, setSort] = useState<ListingSort>('RECENT')
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  // Content and layout set in the back-office (« Page d'accueil »), the
  // market's version; the previous one stays while another country loads.
  const { data: homeLive, previousData: homePrevious } = useQuery<{ homeConfig: HomeConfig }>(HOME_CONFIG_QUERY, {
    variables: countryVars(useMarketCode()),
    fetchPolicy: 'cache-and-network',
  })
  const homeData = homeLive ?? homePrevious
  // {{ville}} / {{pays}} in the texts: the visitor's country.
  const market = useMarket()
  const methods = useMethods().filter(m => m !== 'CASH')
  const rawHome = homeData?.homeConfig ?? DEFAULT_HOME
  const home = useMemo(() => fillPlacesDeep(rawHome, market), [rawHome, market])
  const SLIDES = home.hero.slides
  const SLIDE_MS = Math.max(3, home.hero.intervalSec) * 1000

  const categoriesQuery = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY, { variables: useMarketVars() })
  const categoriesData = categoriesQuery.data ?? categoriesQuery.previousData
  // « Section Adultes »: never a tile on the home page.
  const categories = (categoriesData?.categories ?? []).filter(c => !c.adult)
  const topCategories = [...categories].sort((a, b) => (b.listingsCount ?? 0) - (a.listingsCount ?? 0)).slice(0, 7)


  // Pépites à la Une — the server's order: places reserved to listings « en
  // vedette » of the visitor's country (how many per layout is set in the
  // back-office), the recommendation around them.
  // Visitors not signed in send their anonymous interests (categories kept
  // on this device, lib/interests); members use their profile on the server.
  const [anonInterests] = useState(() => (currentUser ? undefined : interestCategories()))
  const personalized = currentUser
    ? (currentUser.notificationPreferences as Record<string, unknown> | undefined)?.personalizeHome !== false
    : !!anonInterests
  const { data: recommendedData, error: recommendedError } = useQuery<{ recommendedListings: RemoteListing[] }>(RECOMMENDED_LISTINGS_QUERY, {
    variables: { limit: isDesktop ? 4 : 12, placement: isDesktop ? 'HOME_DESKTOP' : 'HOME_MOBILE', countryCode: location?.countryCode ?? undefined, city: location?.city ?? undefined, interestCategories: anonInterests },
    skip: locationPending,
  })
  const isFeatured = (l: RemoteListing) => !!l.boostBadges?.some(b => b.kind !== 'URGENT')
  // A showcase rail: listings with a photo only (a grey placeholder card as
  // the first "pépite" reads as broken).
  const railKey = JSON.stringify([isDesktop, location?.countryCode ?? null, location?.city ?? null, currentUser?.id ?? null])
  const keptRails = railMemory.key === railKey ? railMemory : null
  const recommendedList = recommendedData?.recommendedListings ?? keptRails?.recommended
  const recommended = recommendedList ?? []
  const withPhoto = recommended.filter(l => !!listingImage(l))
  // "Boutiques officielles" rail (most followed first).
  const { data: shopsData, error: shopsError } = useQuery<{ shops: { items: Shop[] } }>(SHOPS_QUERY, { variables: { sort: 'POPULAR', pageSize: 8, countryCode: location?.countryCode ?? undefined }, skip: locationPending })
  const shops = shopsData?.shops.items ?? []
  const pepites = withPhoto.length ? withPhoto : recommended
  const hasBoosted = pepites.some(isFeatured)
  // « Pour vous »: personalised only (no reserved places), without the
  // cards already shown in « Pépites à la Une ».
  const { data: forYouData, error: forYouError } = useQuery<{ recommendedListings: RemoteListing[] }>(RECOMMENDED_LISTINGS_QUERY, {
    variables: { limit: isDesktop ? 8 : 12, placement: 'FOR_YOU', countryCode: location?.countryCode ?? undefined, city: location?.city ?? undefined, interestCategories: anonInterests, excludeIds: pepites.map(l => l.id) },
    skip: locationPending || !personalized || !recommendedData,
  })
  const forYouList = forYouData?.recommendedListings ?? keptRails?.forYou
  const forYou = (forYouList ?? []).filter(l => !!listingImage(l))
  useEffect(() => {
    if (!recommendedData) return
    if (railMemory.key !== railKey) railMemory.forYou = undefined
    railMemory.key = railKey
    railMemory.recommended = recommendedData.recommendedListings
  }, [recommendedData, railKey])
  useEffect(() => {
    if (forYouData && railMemory.key === railKey) railMemory.forYou = forYouData.recommendedListings
  }, [forYouData, railKey])
  const forYouHint = currentUser ? 'D’après les annonces que vous consultez, aimez et recherchez.' : 'D’après les catégories consultées sur cet appareil.'

  // Cities (desktop quick filters + hero select) — real cities facet.
  const marketFilter = location?.countryCode ? { countryCode: location.countryCode } : undefined
  const { data: facetsData } = useQuery<{ listingFacets: ListingFacets }>(LISTING_FACETS_QUERY, { variables: { filter: marketFilter }, skip: locationPending })
  const cities = (facetsData?.listingFacets.cities ?? []).map(c => c.value)
  // "Vendeurs certifiés" rail (perk of the paid badge).
  const { data: certifiedData, error: certifiedError } = useQuery<{ listings: { items: RemoteListing[] } }>(LISTINGS_QUERY, {
    variables: { page: 1, pageSize: 8, filter: { ...marketFilter, certifiedSellersOnly: true }, rotationSeed: rotationSeed() },
    skip: locationPending,
  })
  const certified = certifiedData?.listings.items ?? []

  // Dernières annonces — scoped to the market (and city chip), grown in
  // place as the visitor scrolls: each next page is appended (InfiniteLoader).
  const [feedCity, setFeedCity] = useState<string | null>(() => feedMemory.city)
  const cityFilter = feedCity ?? location?.city
  const feedFilter = marketFilter || cityFilter ? { ...marketFilter, ...(cityFilter ? { city: cityFilter } : {}) } : undefined
  const feedKey = JSON.stringify([feedFilter ?? null, sort, pageSize])
  const { data: feedData, previousData: feedPrevious, loading: feedLoading, error: feedError, fetchMore: feedFetchMore } = useQuery<{ listings: { items: RemoteListing[], totalCount: number, page: number, totalPages: number } }>(LISTINGS_QUERY, {
    variables: { sort, page: 1, pageSize, filter: feedFilter, rotationSeed: rotationSeed() },
    skip: locationPending,
  })
  // The previous filter's list stays on screen until the new first page lands.
  const feed = (feedData ?? feedPrevious)?.listings
  const latest = feed?.items ?? []
  const nextFeedPage = useLoadMore({ fetchMore: feedFetchMore, page: feedData?.listings.page, totalPages: feedData?.listings.totalPages, key: feedKey })
  useEffect(() => { feedMemory.city = feedCity }, [feedCity])

  // Hero slider (autoplay with progress bar)
  // One timer per slide (restarted by manual navigation); the progress bar
  // is a CSS animation keyed on the slide. Ticking React state every 100 ms
  // here used to re-render the whole home page ten times a second.
  const [slide, setSlide] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setSlide(s => (s + 1) % SLIDES.length), SLIDE_MS)
    return () => clearTimeout(t)
  }, [slide, SLIDES.length, SLIDE_MS])
  // A config with fewer slides than the current index (BO edit).
  const current = SLIDES[slide % SLIDES.length] ?? SLIDES[0]
  const goSlide = (i: number) => setSlide((i + SLIDES.length) % SLIDES.length)
  // Only the first slide's photo loads with the page; each later one when
  // the slider gets one step away from it (they were all fetched upfront,
  // competing with the first paint).
  const [slidesReached, setSlidesReached] = useState(1)
  const nextReach = Math.min(SLIDES.length - 1, slide + 1)
  if (nextReach > slidesReached) setSlidesReached(nextReach)

  // Hero search form
  const [q, setQ] = useState('')
  const [heroCity, setHeroCity] = useState('')
  const [heroMax, setHeroMax] = useState('')
  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    onSearch?.(q.trim(), { city: heroCity || undefined, maxPrice: heroMax ? Number(heroMax) : undefined })
  }

  const contact = (l: RemoteListing) => () =>
    currentUser && !currentUser.isGuest && onContactSeller ? onContactSeller(l.seller.id, l.id) : onSelectListing(l.id)
  const card = (l: RemoteListing, featured?: boolean, priority?: boolean) => (
    <ListingCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUser?.id} onContact={contact(l)} featured={featured} priority={priority} />
  )
  // « Comment ça marche » behind the reassurance badges.
  const trust = useTrustSheet()

  // Sections are laid out top-down: one still loading holds its room (a
  // placeholder) and the ones below wait for it, so a section landing never
  // pushes down what is already on screen (it was the home's big layout
  // shift on phones). Errors count as settled (the section just isn't there).
  const campaignSettled = useLiveCampaignsSettled()
  const settled: Record<HomeSectionKey, boolean> = {
    reassurance: true,
    sellCta: true,
    howItWorks: true,
    categories: !!categoriesData || !!categoriesQuery.error,
    campaign: campaignSettled,
    pepites: (!!recommendedList || !!recommendedError) && (!personalized || !recommendedList || !!forYouList || !!forYouError),
    shops: !!shopsData || !!shopsError,
    certified: !!certifiedData || !!certifiedError,
    latest: !!feed || !!feedError,
  }
  // The sections of `order` that are shown: up to the first one still
  // loading, which shows its placeholder.
  const laidOut = (order: HomeSectionKey[]) => {
    const stop = order.findIndex(k => !settled[k])
    return stop < 0 ? order : order.slice(0, stop + 1)
  }
  const zone = location?.city ?? market?.name ?? 'Tous les pays'

  const loadMore = !!feedData && <InfiniteLoader key={feedKey} list={nextFeedPage} pageSize={pageSize} endLabel={latest.length > pageSize ? 'Vous avez tout vu' : null} />

  const visibleOrder = home.sections.filter(x => x.visible).map(x => x.key)
  // Desktop: the reassurance band sits full width under the header when it
  // comes first, inline otherwise.
  const bandOnTop = visibleOrder[0] === 'reassurance'
  const desktopOrder = visibleOrder.filter(k => !(k === 'reassurance' && bandOnTop))
  const mobileOrder = visibleOrder.filter(k => k !== 'sellCta' && k !== 'howItWorks')
  const reassuranceBand = (top: boolean) => (
    <section className={top ? 'bg-surface-lowest shadow-sm' : 'mt-10 rounded-2xl bg-surface-lowest shadow-sm'}>
              <div className={`mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 py-2.5 ${top ? 'px-12' : 'px-6'}`}>
                {/* Each badge explains itself (« Comment ça marche »). */}
                {home.reassurance.map((item, i) => (
                  <button key={i} type="button" onClick={() => trust.open(trustTopicOf(item.icon, item.title))} aria-haspopup="dialog" className="flex cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent p-1 text-left hover:bg-surface-container-low">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${['bg-primary/10 text-primary', 'bg-tertiary/10 text-tertiary', 'bg-primary-container/15 text-primary', 'bg-surface-container text-on-surface'][i % 4]}`}><CategoryIcon icon={item.icon} size={20} /></span>
                    <span className="block">
                      <span className="block text-label-md font-bold text-on-surface">{item.title}</span>
                      <span className="block text-body-sm text-on-surface-variant">{item.text}</span>
                      {(item.icon === 'contactless' || item.icon === 'payments') && <PaymentLogos size={18} className="mt-1" methods={methods} />}
                    </span>
                  </button>
                ))}
                <button type="button" onClick={requestOpenLocation} className="hidden cursor-pointer items-center gap-2 rounded-xl border-none bg-surface-container-low px-4 py-2 hover:bg-surface-container 2xl:flex">
                  <Icon name="my_location" size={20} className="text-tertiary" />
                  <span className="text-label-sm font-extrabold uppercase tracking-wider text-tertiary">Zone active :</span>
                  <span className="text-label-md text-on-surface">{zone}</span>
                </button>
              </div>
            </section>
  )
  // Only the layout on screen is built (each render used to create both,
  // every card twice).
  const desktopSections: Partial<Record<HomeSectionKey, React.ReactNode>> = !isDesktop ? {} : {
    campaign: <HomePromotions desktop renderCard={l => card(l)} />,
    categories: <>
          {topCategories.length > 0 && (
            <section className="mt-10">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <Kicker>Univers d'achats</Kicker>
                  <h3 className="m-0 mt-1 text-headline-lg text-on-surface">Parcourez par catégorie</h3>
                </div>
                <button onClick={() => onNavigate('categories')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-lg font-semibold text-primary hover:underline">
                  Voir tout le catalogue <ChevronRight size={18} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-3">
                {topCategories.map((cat, i) => (
                  <button key={cat.id} onClick={() => onCategorySelect?.(cat.slug)} className="cat-tile group flex cursor-pointer flex-col items-center rounded-2xl border-none bg-surface-lowest p-4 text-center shadow-sm transition-all hover:bg-surface-container-low hover:shadow" style={{ '--i': i } as React.CSSProperties}>
                    <span className="cat-tile-icon mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-primary">
                      <CategoryIcon icon={cat.icon} size={28} delay={200 + i * 110} />
                    </span>
                    <span className="text-label-md font-bold leading-snug text-on-surface">{cat.name}</span>
                    <span className="mt-1 text-body-sm text-on-surface-variant">{formatNumber(cat.listingsCount ?? 0, 0)} annonce{(cat.listingsCount ?? 0) > 1 ? 's' : ''}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
    </>,
    pepites: <>
          {pepites.length > 0 && (
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                  </span>
                  <h3 className="m-0 text-headline-lg text-on-surface">Pépites à la Une{hasBoosted && ' & Annonces en vedette'}</h3>
                </div>
                <button type="button" onClick={() => requestOpenHelp('booster-une-annonce')} className="cursor-pointer rounded-full border-none bg-primary/10 px-3 py-1 text-label-sm font-bold uppercase tracking-wider text-primary hover:bg-primary/15">Priorité visibilité</button>
              </div>
              <div className="grid grid-cols-4 items-start gap-6">{pepites.slice(0, 4).map(l => card(l))}</div>
            </section>
          )}
          {forYou.length > 0 && (
            <section data-tour="home-for-you" className="mt-10">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h3 className="m-0 flex items-center gap-2 text-headline-lg text-on-surface"><Icon name="auto_awesome" size={24} className="text-primary" /> Pour vous</h3>
                  <p className="m-0 mt-1 text-body-md text-on-surface-variant">{forYouHint}</p>
                </div>
                <button onClick={() => requestOpenHelp('accueil-personnalise')} className="cursor-pointer whitespace-nowrap border-none bg-transparent p-0 text-label-lg font-semibold text-primary hover:underline">Pourquoi ces annonces ?</button>
              </div>
              <div className="grid grid-cols-4 items-start gap-6">{forYou.slice(0, 8).map(l => card(l))}</div>
            </section>
          )}
    </>,
    shops: <>
          {shops.length > 0 && (
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="m-0 flex items-center gap-2 text-headline-lg text-on-surface"><Icon name="verified" size={26} fill className="text-tertiary" /> Boutiques officielles</h3>
                <button onClick={() => onNavigate('shops')} className="flex cursor-pointer items-center gap-1 whitespace-nowrap border-none bg-transparent p-0 text-label-lg font-semibold text-primary hover:underline">Voir toutes les boutiques <Icon name="arrow_forward" size={18} /></button>
              </div>
              <div className="grid grid-cols-4 gap-6">{shops.slice(0, 4).map(s => <ShopCard key={s.id} shop={s} compact onOpen={() => onOpenShop?.(s.slug)} />)}</div>
            </section>
          )}
    </>,
    certified: <>
          {certified.length > 0 && (
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="m-0 flex items-center gap-2 text-headline-lg text-on-surface"><Icon name="verified" size={26} fill className="text-tertiary" /> Vendeurs certifiés</h3>
                <button type="button" onClick={() => requestOpenHelp('badges-payants')} className="cursor-pointer rounded-full border-none bg-tertiary-soft px-3 py-1 text-label-sm font-bold uppercase tracking-wider text-tertiary">Historique vérifié</button>
              </div>
              <div className="grid grid-cols-4 items-start gap-6">{certified.slice(0, 4).map(l => card(l))}</div>
            </section>
          )}
    </>,
    sellCta: <>
          <section className="relative mt-10 overflow-hidden rounded-3xl bg-surface-container-low p-10 shadow-sm">
            <div className="relative z-10 max-w-2xl">
              {home.sellCta.badge && <span className="rounded-full bg-primary/10 px-3 py-1 text-label-sm font-extrabold uppercase tracking-wider text-primary">{home.sellCta.badge}</span>}
              <h3 className="m-0 mt-2 text-display leading-tight text-on-surface">{home.sellCta.title}</h3>
              {home.sellCta.text && <p className="m-0 mt-2 text-body-lg text-on-surface-variant">{home.sellCta.text}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button onClick={() => onNavigate('seller-post')} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-10 py-3.5 text-label-lg font-bold text-white hover:bg-primary-container">
                  <Icon name="add_photo_alternate" size={22} /> {home.sellCta.button}
                </button>
                {home.sellCta.link && <button onClick={() => onNavigate('seller-premium')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-lg font-bold text-on-surface underline hover:text-primary">
                  {home.sellCta.link} <ChevronRight size={18} />
                </button>}
              </div>
            </div>
            <div className="pointer-events-none absolute -right-10 top-1/2 hidden -translate-y-1/2 items-center gap-4 opacity-90 xl:flex">
              <div className="flex h-72 w-56 rotate-6 flex-col justify-between rounded-2xl bg-surface-lowest p-3 shadow-xl">
                <div className="flex h-40 w-full items-center justify-center rounded-xl bg-surface-container text-outline"><Smartphone size={48} /></div>
                <div><div className="mb-1 h-3 w-24 rounded bg-surface-container" /><div className="h-4 w-32 rounded bg-primary/20" /></div>
              </div>
              <div className="flex h-80 w-60 -rotate-3 flex-col justify-between rounded-2xl bg-surface-lowest p-4 shadow-2xl">
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-tertiary" /><span className="text-label-sm font-bold text-tertiary">Vendu en 45 min</span></div>
                <div className="flex h-44 w-full items-center justify-center rounded-xl bg-surface-container text-outline"><Shirt size={56} /></div>
                <div className="flex items-center justify-between"><span className="text-headline-sm font-bold text-on-surface">18 000 F</span><span className="text-label-sm font-bold text-tertiary">0% com.</span></div>
              </div>
            </div>
          </section>
    </>,
    latest: <>
          <section className="mt-10">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <Kicker className="text-tertiary">Fraîchement arrivées</Kicker>
                <h3 className="m-0 mt-1 text-headline-lg text-on-surface">Dernières annonces publiées</h3>
              </div>
              {cities.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[null, ...cities.slice(0, 5)].map(c => {
                    const active = feedCity === c
                    return (
                      <button key={c ?? 'all'} onClick={() => setFeedCity(c)} className={`cursor-pointer whitespace-nowrap rounded-lg border-none px-3 py-1.5 text-label-md ${active ? 'bg-on-surface font-semibold text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
                        {c ?? 'Toutes'}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 items-start gap-6">{latest.map(l => card(l))}</div>
            {latest.length === 0 && !feedLoading && !locationPending && <EmptyState icon="empty-search" fallback="search" tone="neutral" title="Aucune annonce dans cette zone" text="Changez de zone ou soyez le premier à publier ici." action={{ label: 'Vendre un article', onClick: () => onNavigate('seller-post') }} />}
            {loadMore}
          </section>
    </>,
    howItWorks: <>
          <section className="mb-6 mt-10 rounded-3xl bg-surface-lowest p-10 shadow-sm">
            <div className="mx-auto mb-10 max-w-xl text-center">
              {home.howItWorks.kicker && <Kicker>{home.howItWorks.kicker}</Kicker>}
              <h3 className="m-0 mt-1 text-headline-lg text-on-surface">{home.howItWorks.title}</h3>
              {home.howItWorks.text && <p className="m-0 mt-2 text-body-md text-on-surface-variant">{home.howItWorks.text}</p>}
            </div>
            <div className={`grid gap-6 ${["grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"][home.howItWorks.steps.length - 1] ?? "grid-cols-3"}`}>
              {home.howItWorks.steps.map((s, i) => ({ n: i + 1, box: ['bg-primary', 'bg-tertiary', 'bg-primary-container', 'bg-inverse-surface'][i % 4], ...s })).map(s => (
                <div key={s.n} className="flex flex-col items-center rounded-2xl bg-surface-container-low p-4 text-center">
                  <span className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-headline-md font-bold text-white shadow-md ${s.box}`}>{s.n}</span>
                  <h4 className="m-0 mb-2 text-headline-sm font-bold text-on-surface">{s.title}</h4>
                  <p className="m-0 text-body-sm leading-relaxed text-on-surface-variant">{s.text}</p>
                </div>
              ))}
            </div>
            {home.howItWorks.badges.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-around gap-4 pt-4 text-label-md text-on-surface-variant">
                {home.howItWorks.badges.map((b, i) => (
                  <span key={i} className="flex items-center gap-2">{i % 3 === 0 ? <BadgeCheck size={18} className="text-tertiary" /> : <Icon name={i % 3 === 1 ? 'savings' : 'support_agent'} size={18} className={i % 3 === 1 ? 'text-primary' : 'text-tertiary'} />} {b}</span>
                ))}
              </div>
            )}
          </section>
    </>,
  }
  const mobileSections: Partial<Record<HomeSectionKey, React.ReactNode>> = isDesktop ? {} : {
    reassurance: <>
        {/* Looks like a button: it opens « Comment ça marche ». */}
        <button type="button" onClick={() => trust.open(trustTopicOf('verified_user', home.mobileStrip.title))} aria-haspopup="dialog" className="mb-6 flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border-none bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-high p-3 text-left shadow-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tertiary text-white"><Icon name="verified_user" size={18} /></span>
            <span className="block min-w-0 leading-tight">
              <span className="block truncate text-label-sm font-bold text-on-surface">{home.mobileStrip.title}</span>
              <span className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-body-sm text-on-surface-variant">{home.mobileStrip.text} <PaymentLogos size={16} methods={methods.slice(0, 3)} className="shrink-0" /> ou espèces</span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-0.5 text-label-sm text-primary"><span className="max-[400px]:hidden">Comment ?</span> <Icon name="chevron_right" size={18} /></span>
        </button>
    </>,
    categories: <>
        {!settled.categories && <CategoryRailSkeleton />}
        {categories.length > 0 && (
          <section data-tour="categories" className="mb-8">
            <SectionHeading
              title="Explorer par rayon"
              action={<button onClick={() => onNavigate('categories')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary">Tout voir <ChevronRight size={16} /></button>}
            />
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] md:-mx-8 md:px-8">
              {categories.map((cat, i) => (
                <button key={cat.id} onClick={() => onCategorySelect?.(cat.slug)} className="cat-tile group flex w-[68px] shrink-0 cursor-pointer flex-col items-center gap-1.5 border-none bg-transparent p-0" style={{ '--i': i } as React.CSSProperties}>
                  <span className={`cat-tile-icon flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm ${TILE_TINTS[i % TILE_TINTS.length]}`}>
                    <CategoryIcon icon={cat.icon} size={28} delay={200 + i * 110} />
                  </span>
                  <span title={cat.name} className="w-full truncate text-center text-label-sm font-semibold text-on-surface">{cat.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}
    </>,
    campaign: <HomePromotions desktop={false} renderCard={l => card(l)} />,
    // The pills of the section headings (« En vedette », « Priorité
    // visibilité », « Historique vérifié ») look tappable: they open the
    // help article that explains them.
    pepites: <>
        {!recommendedList && !recommendedError && <RailSkeleton featured />}
        {pepites.length > 0 && (
          <section className="mb-8">
            <SectionHeading
              title={<><Flame size={22} className="text-primary" /> Pépites à la Une</>}
              action={hasBoosted ? <button type="button" onClick={() => requestOpenHelp('booster-une-annonce')} className="cursor-pointer rounded-full border-none bg-tertiary-soft px-2 py-0.5 text-label-sm font-bold text-tertiary">En vedette</button> : undefined}
            />
            <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8">
              {/* The first cards are what a phone shows biggest at load: their photos come first. */}
              {pepites.map((l, i) => <div key={l.id} className="w-[260px] shrink-0 snap-start">{card(l, true, i < 2)}</div>)}
            </div>
          </section>
        )}
        {!settled.pepites && !!recommendedList && <RailSkeleton width={200} />}
        {forYou.length > 0 && (
          <section className="mb-8">
            <SectionHeading
              title={<><Icon name="auto_awesome" size={22} className="text-primary" /> Pour vous</>}
              action={<button onClick={() => requestOpenHelp('accueil-personnalise')} className="cursor-pointer whitespace-nowrap border-none bg-transparent p-0 text-label-md font-semibold text-primary">Pourquoi ?</button>}
            />
            <p className="m-0 -mt-1 mb-2 text-body-sm text-on-surface-variant">{forYouHint}</p>
            <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8">
              {forYou.map(l => <div key={l.id} className="w-[200px] shrink-0 snap-start">{card(l)}</div>)}
            </div>
          </section>
        )}
    </>,
    shops: <>
        {!settled.shops && <RailSkeleton width={250} />}
        {shops.length > 0 && (
          <section className="mb-8">
            <SectionHeading
              title={<><Icon name="verified" size={22} fill className="text-tertiary" /> Boutiques officielles</>}
              action={<button onClick={() => onNavigate('shops')} className="cursor-pointer whitespace-nowrap border-none bg-transparent p-0 text-label-md font-semibold text-primary">Tout voir</button>}
            />
            <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8">
              {shops.map(s => <div key={s.id} className="flex w-[250px] shrink-0 snap-start">{<ShopCard shop={s} compact onOpen={() => onOpenShop?.(s.slug)} />}</div>)}
            </div>
          </section>
        )}
    </>,
    certified: <>
        {!settled.certified && <RailSkeleton featured />}
        {certified.length > 0 && (
          <section className="mb-8">
            <SectionHeading title={<><Icon name="verified" size={22} fill className="text-tertiary" /> Vendeurs certifiés</>} />
            <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8">
              {certified.map(l => <div key={l.id} className="w-[260px] shrink-0 snap-start">{card(l, true)}</div>)}
            </div>
          </section>
        )}
    </>,
    latest: <>
        <section>
          <SectionHeading
            title={<>Dernières annonces <span className="h-2 w-2 rounded-full bg-primary" /></>}
            action={
              <Select value={sort} onChange={e => setSort(e.target.value as ListingSort)} aria-label="Trier les annonces" className="cursor-pointer whitespace-nowrap border-none bg-transparent px-1 py-1 text-label-md text-on-surface-variant outline-none">
                {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            }
          />
          {settled.latest ? <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3">{latest.map(l => card(l))}</div> : <GridSkeleton count={4} />}
          {latest.length === 0 && !feedLoading && !locationPending && <EmptyState icon="empty-search" fallback="search" tone="neutral" title="Aucune annonce dans cette zone" text="Changez de zone ou soyez le premier à publier ici." action={{ label: 'Vendre un article', onClick: () => onNavigate('seller-post') }} />}
          {loadMore}
        </section>
    </>,
  }

  return (
    <>
      {/* ================= DESKTOP ================= */}
      {isDesktop && <div>
        {/* Reassurance band: full width under the header when it comes first. */}
        {bandOnTop && reassuranceBand(true)}
        <div className="mx-auto max-w-[1320px] px-12">
          {/* 2. Hero slider + search / flash card */}
          <section className="mt-6 grid grid-cols-12 items-stretch gap-6">
            <div className="relative col-span-12 flex min-h-[460px] flex-col justify-between overflow-hidden rounded-2xl p-10 shadow-md">
              {SLIDES.map((s, i) => (
                <div key={`${i}-${s.image}`} className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${i === slide % SLIDES.length ? 'opacity-100' : 'opacity-0'}`}>
                  {i <= slidesReached && <img src={s.image} alt="" fetchPriority={i === 0 ? 'high' : 'low'} decoding="async" className="h-full w-full scale-105 object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/45" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                </div>
              ))}
              <div className="absolute left-0 top-0 z-30 h-1 w-full bg-white/20">
                <div key={slide} className="hero-progress h-full w-full bg-primary" style={{ animationDuration: `${SLIDE_MS}ms` }} />
              </div>

              <div className="relative z-20">
                <div className="mb-2 flex items-center justify-between gap-2">
                  {current.badge ? (
                    <span className={`inline-flex items-center gap-2 rounded-full border border-solid px-3 py-1.5 text-white backdrop-blur-md ${SLIDE_TONE[current.tone]?.badge ?? SLIDE_TONE.red.badge}`}>
                      <CategoryIcon icon={current.badgeIcon} size={16} className={SLIDE_TONE[current.tone]?.icon} />
                      <span className="text-label-sm font-extrabold uppercase">{current.badge}</span>
                    </span>
                  ) : <span />}
                  <div className="flex items-center gap-2 rounded-full border border-solid border-white/10 bg-black/40 px-2.5 py-1.5 backdrop-blur-md">
                    <button onClick={() => goSlide(slide - 1)} aria-label="Diapositive précédente" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white/80 hover:bg-white/10 hover:text-white"><ArrowLeft size={18} /></button>
                    <div className="flex items-center gap-1.5 px-1">
                      {SLIDES.map((_, i) => (
                        <button key={i} onClick={() => goSlide(i)} aria-label={`Aller au slide ${i + 1}`} className={`h-2 cursor-pointer rounded-full border-none p-0 transition-all duration-300 ${i === slide % SLIDES.length ? 'w-6 bg-primary' : 'w-2 bg-white/40 hover:bg-white/80'}`} />
                      ))}
                    </div>
                    <button onClick={() => goSlide(slide + 1)} aria-label="Diapositive suivante" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white/80 hover:bg-white/10 hover:text-white"><ArrowRight size={18} /></button>
                  </div>
                </div>
                <div className="min-h-[155px]">
                  <h1 className="m-0 max-w-2xl text-display font-extrabold leading-tight tracking-tight text-white"><Title text={current.title} /></h1>
                  {current.text && <p className="m-0 mt-2 max-w-xl text-body-lg text-white/90">{current.text}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {current.tags.map(t => (
                      <span key={t} className="rounded-full border border-solid border-white/20 bg-white/15 px-2.5 py-0.5 text-label-sm text-white backdrop-blur-sm">{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative z-20 mt-4 rounded-2xl border border-solid border-white/40 bg-white/95 p-2 shadow-xl backdrop-blur-md">
                <form className="flex flex-wrap gap-2" onSubmit={submitSearch}>
                  <label className="flex min-w-0 basis-full items-center rounded-xl border border-solid border-outline-variant/60 bg-surface-container-low/90 px-3 py-2 focus-within:border-primary focus-within:bg-surface-lowest">
                    <Search size={22} className="mr-2 text-outline" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder="Que cherchez-vous ? (iPhone, robe, frigo…)" className="w-full border-none bg-transparent text-body-sm text-on-surface outline-none placeholder:text-outline" />
                  </label>
                  <label className="flex min-w-[200px] flex-1 items-center rounded-xl border border-solid border-outline-variant/60 bg-surface-container-low/90 px-3 py-2">
                    <MapPin size={20} className="mr-2 text-tertiary" />
                    <Select value={heroCity} onChange={e => setHeroCity(e.target.value)} className="w-full cursor-pointer border-none bg-transparent text-label-md text-on-surface outline-none">
                      <option value="">Toutes les villes</option>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </label>
                  <label className="flex min-w-[190px] flex-1 items-center rounded-xl border border-solid border-outline-variant/60 bg-surface-container-low/90 px-3 py-2">
                    <Wallet size={20} className="mr-2 text-outline" />
                    <Select value={heroMax} onChange={e => setHeroMax(e.target.value)} className="w-full cursor-pointer border-none bg-transparent text-label-md text-on-surface outline-none">
                      <option value="">Prix max</option>
                      {MAX_PRICES.map(p => <option key={p} value={p}>Moins de {p.toLocaleString('fr-FR')} F</option>)}
                    </Select>
                  </label>
                  <button type="submit" aria-label="Trouver à proximité" className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-6 py-3 text-label-lg font-bold text-white shadow-sm hover:bg-primary-container">
                    <Icon name="near_me" size={20} /> <span className="hidden xl:inline">Trouver à proximité</span>
                  </button>
                </form>
                <div className="mt-2 flex flex-wrap items-center gap-2 border-0 border-t border-solid border-surface-container-high px-2 pt-2">
                  <span className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">Tendances :</span>
                  {home.trends.map(t => (
                    <button key={t.label} onClick={() => onSearch?.(t.term ?? '', t.maxPrice ? { maxPrice: t.maxPrice } : undefined)} className="cursor-pointer rounded-full border-none bg-surface-container-low px-2.5 py-1 text-label-sm text-on-surface-variant shadow-sm transition-all hover:bg-primary hover:text-white">
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </section>

          {/* The other sections, in the order set in the back-office. */}
          {laidOut(desktopOrder).map(k => <Fragment key={k}>{k === 'reassurance' ? reassuranceBand(false) : desktopSections[k]}{!settled[k] && <GridSkeleton count={4} className="mt-10 grid grid-cols-4 items-start gap-6" />}</Fragment>)}
        </div>
      </div>}

      {/* ================= MOBILE ================= */}
      {!isDesktop && <div className="px-4 pb-4 pt-3 md:px-8 md:pt-6">
        <div className="mb-4 flex flex-col gap-3">
          {/* "Zone active": scopes the latest-listings feed, like the desktop city chips */}
          {/* Always there (its room is kept while the cities load). « Zone
              active » opens the country / city picker of the header; the
              list next to it narrows the feed below to one city. */}
          <div className="flex min-h-8 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <button type="button" onClick={requestOpenLocation} className="flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-sm font-bold uppercase tracking-wider text-on-surface-variant"><Icon name="my_location" size={15} className="text-tertiary" /> Zone active</button>
                <span className="relative flex min-w-0 items-center rounded-full bg-surface-container shadow-sm">
                  <span className="pointer-events-none absolute left-2.5 h-2 w-2 animate-pulse rounded-full bg-tertiary" />
                  {cities.length > 0 ? (
                    <Select value={feedCity ?? ''} onChange={e => setFeedCity(e.target.value || null)} aria-label="Ville des dernières annonces" className="min-w-0 cursor-pointer whitespace-nowrap border-none bg-transparent py-1 pl-6 pr-1.5 text-label-md text-on-surface outline-none">
                      <option value="">{location?.city ? `Tout ${location.city}` : zone}</option>
                      {cities.filter(c => c !== location?.city).map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  ) : (
                    <button type="button" onClick={requestOpenLocation} className="cursor-pointer whitespace-nowrap border-none bg-transparent py-1 pl-6 pr-2.5 text-label-md text-on-surface">{zone}</button>
                  )}
                </span>
              </div>
              {/* Always there: every item on sale right now. */}
              <button onClick={() => onSearch?.('', { promo: true })} className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border-none bg-primary-fixed/50 px-2 py-1 text-label-sm text-primary">
                <Icon name="percent" size={16} /> Promos
              </button>
          </div>
          <div className="flex h-12 w-full items-center rounded-xl bg-surface-lowest px-3 shadow-sm">
            <button onClick={() => onNavigate('search')} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left text-body-md text-outline">
              <Search size={22} className="ml-1 shrink-0 text-primary" />
              <span className="truncate">Que recherchez-vous aujourd'hui ?</span>
            </button>
            <button onClick={() => onNavigate('search')} aria-label="Filtres avancés" className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-container p-1 text-on-surface-variant">
              <Icon name="tune" size={20} />
            </button>
          </div>
        </div>
        {/* Sections in the order set in the back-office. */}
        {laidOut(mobileOrder).map(k => <Fragment key={k}>{mobileSections[k]}</Fragment>)}
      </div>}
      {trust.sheet}
    </>
  )
}
