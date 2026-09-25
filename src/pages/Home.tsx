import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import {
  ArrowLeft, ArrowRight, ChevronRight, Search, SlidersHorizontal, ShieldCheck, Handshake, Timer, Flame, Loader2,
  Percent, MapPin, Wallet, Smartphone, BadgeCheck, Shirt,
} from '../components/icons'
import Icon, { CategoryIcon } from '../components/Icon'
import ViewToggle from '../components/ViewToggle'
import { ListingCard, ListingListCard } from '../components/ListingCard'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'
import { LISTINGS_QUERY, LISTING_FACETS_QUERY, RECOMMENDED_LISTINGS_QUERY, type ListingFacets, type RemoteListing } from '../graphql/listings'
import { ACTIVE_CAMPAIGN_QUERY, type ActiveCampaign } from '../graphql/content'
import { getStoredViewMode, setStoredViewMode } from '../lib/viewMode'
import type { StoredLocation } from '../lib/location'
import type { AuthUser } from '../graphql/auth'
import Select from '../components/Select'

export type SearchPreset = { city?: string, maxPrice?: number }

type HomeProps = {
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onCategorySelect?: (categoryId: string) => void
  currentUser?: AuthUser | null
  location?: StoredLocation | null
  onContactSeller?: (sellerId: string, listingId?: string) => void
  onSearch?: (term: string, preset?: SearchPreset) => void
}

const PAGE_SIZE = 12

function Accent({ children }: { children: React.ReactNode }) {
  return <span className="bg-gradient-to-r from-red-500 to-amber-400 bg-clip-text font-extrabold text-transparent">{children}</span>
}

// Desktop hero slides — imagery from the Stitch mockup (public/stitch).
const SLIDES = [
  {
    image: '/stitch/hero-0.jpg', badge: 'Plateforme N°1 à Abidjan', badgeIcon: 'local_fire_department', badgeClass: 'bg-primary/25 border-primary/40', iconClass: 'text-amber-400',
    title: <>Achetez et vendez vos <Accent>pépites mode &amp; sneakers</Accent> à Abidjan</>,
    text: "Zéro frais, zéro commission. Des milliers de pièces uniques entre particuliers à Cocody, Marcory, Plateau et partout en Côte d'Ivoire.",
    tags: ['✨ #ModeVintage', '👟 #SneakersRares', '👗 #WaxContemporain', '⚡ #VenteFlash'],
  },
  {
    image: '/stitch/hero-1.jpg', badge: 'High-Tech & Bons Plans', badgeIcon: 'smartphone', badgeClass: 'bg-blue-500/25 border-blue-400/40', iconClass: 'text-blue-300',
    title: <>Donnez une seconde vie à votre <Accent>High-Tech &amp; Audio</Accent> au meilleur prix</>,
    text: 'Smartphones, casques, consoles et accessoires sans intermédiaire. Négociez directement sur le chat.',
    tags: ['🎧 #CasquesSansFil', '📱 #iPhonesReconditionnés', '💻 #LaptopsPro', '🎮 #GamingAbidjan'],
  },
  {
    image: '/stitch/hero-2.jpg', badge: 'Affaires en or', badgeIcon: 'diamond', badgeClass: 'bg-tertiary/30 border-white/30', iconClass: 'text-emerald-300',
    title: <>Trouvez les <Accent>meilleures affaires directes</Accent> 100% P2P</>,
    text: 'Échangez en direct en lieu sécurisé avec Wave, Orange Money ou espèces. Remise en main propre sans surprise.',
    tags: ['📍 #RemiseSécurisée', '🤝 #0Commission', '📲 #PaiementWave', '🛡️ #VendeursVérifiés'],
  },
]
const SLIDE_MS = 6000

const TRENDS: { label: string, term?: string, maxPrice?: number }[] = [
  { label: 'Sneakers authentiques', term: 'sneakers' },
  { label: 'High-Tech', term: 'iphone' },
  { label: 'Dressing', term: 'robe' },
  { label: 'Moins de 20 000 F', maxPrice: 20_000 },
]
const MAX_PRICES = [20_000, 50_000, 150_000, 500_000]

// hh:mm:ss (or "Xj hh:mm") until a campaign's end — ticks every second.
export function useCountdown(endsAt?: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [endsAt])
  if (!endsAt) return null
  const ms = Math.max(0, new Date(endsAt).getTime() - now)
  const days = Math.floor(ms / 86_400_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = pad(Math.floor(ms / 3_600_000) % 24), m = pad(Math.floor(ms / 60_000) % 60), sec = pad(Math.floor(ms / 1000) % 60)
  return days > 0 ? `${days}j ${h}h ${m}m` : `${h}h ${m}m ${sec}s`
}

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
export default function Home({ onNavigate, onSelectListing, favorites, onToggleFavorite, onCategorySelect, currentUser, location, onContactSeller, onSearch }: HomeProps) {
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>(() => getStoredViewMode() ?? 'grid')
  const setViewMode = (mode: 'grid' | 'list') => { setViewModeState(mode); setStoredViewMode(mode) }

  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const categories = categoriesData?.categories ?? []
  const topCategories = [...categories].sort((a, b) => (b.listingsCount ?? 0) - (a.listingsCount ?? 0)).slice(0, 7)

  const { data: campaignData } = useQuery<{ activeCampaign: ActiveCampaign | null }>(ACTIVE_CAMPAIGN_QUERY)
  const campaign = campaignData?.activeCampaign
  const countdown = useCountdown(campaign?.endsAt)
  const bestDiscount = Math.max(0, ...(campaign?.listings ?? []).map(l => l.discountPercent ?? 0))
  const campaignColor = campaign?.themeColor || 'var(--primary)'

  // Pépites à la Une — the recommendation algorithm, boosted listings first.
  const { data: recommendedData } = useQuery<{ recommendedListings: RemoteListing[] }>(RECOMMENDED_LISTINGS_QUERY, {
    variables: { limit: 12, countryCode: location?.countryCode ?? undefined, city: location?.city ?? undefined },
  })
  const isBoosted = (l: RemoteListing) => !!l.boostExpiresAt && new Date(l.boostExpiresAt) > new Date()
  const pepites = [...(recommendedData?.recommendedListings ?? [])].sort((a, b) => Number(isBoosted(b)) - Number(isBoosted(a)))
  const hasBoosted = pepites.some(isBoosted)

  // Cities (desktop quick filters + hero select) — real cities facet.
  const marketFilter = location?.countryCode ? { countryCode: location.countryCode } : undefined
  const { data: facetsData } = useQuery<{ listingFacets: ListingFacets }>(LISTING_FACETS_QUERY, { variables: { filter: marketFilter } })
  const cities = (facetsData?.listingFacets.cities ?? []).map(c => c.value)

  // Dernières annonces — scoped to the market (and city chip), grown in place.
  const [page, setPage] = useState(1)
  const [feedCity, setFeedCity] = useState<string | null>(null)
  useEffect(() => setPage(1), [location?.countryCode, location?.city, feedCity])
  const cityFilter = feedCity ?? location?.city
  const { data: feedData, previousData, loading: feedLoading } = useQuery<{ listings: { items: RemoteListing[], totalCount: number } }>(LISTINGS_QUERY, {
    variables: {
      sort: 'RECENT',
      page: 1,
      pageSize: PAGE_SIZE * page,
      filter: marketFilter || cityFilter ? { ...marketFilter, ...(cityFilter ? { city: cityFilter } : {}) } : undefined,
    },
  })
  const feed = (feedData ?? previousData)?.listings
  const latest = feed?.items ?? []
  const canLoadMore = !!feed && feed.totalCount > latest.length

  // Hero slider (autoplay with progress bar)
  const [slide, setSlide] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 100), 100)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (elapsed >= SLIDE_MS) { setSlide(s => (s + 1) % SLIDES.length); setElapsed(0) }
  }, [elapsed])
  const goSlide = (i: number) => { setSlide((i + SLIDES.length) % SLIDES.length); setElapsed(0) }

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
  const card = (l: RemoteListing, featured?: boolean) => (
    <ListingCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUser?.id} onContact={contact(l)} featured={featured} />
  )
  const zone = location?.city ?? 'Toute la Côte d’Ivoire'

  const loadMore = canLoadMore && (
    <button
      onClick={() => setPage(p => p + 1)}
      disabled={feedLoading}
      className="mx-auto mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container-low px-10 py-3.5 text-label-lg font-bold text-on-surface hover:bg-surface-container disabled:opacity-60 lg:w-auto"
    >
      {feedLoading ? <Loader2 size={18} className="animate-spin" /> : <>Charger plus d'annonces <Icon name="refresh" size={20} /></>}
    </button>
  )

  return (
    <>
      {/* ================= DESKTOP ================= */}
      <div className="hidden lg:block">
        {/* 1. Reassurance band */}
        <section className="bg-surface-lowest shadow-sm">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-12 py-2.5">
            {[
              { icon: <Percent size={20} />, box: 'bg-primary/10 text-primary', title: '100% P2P & Gratuit', text: '0% de commission sur toutes vos ventes' },
              { icon: <Icon name="shield_with_heart" size={20} />, box: 'bg-tertiary/10 text-tertiary', title: 'Remise en main propre', text: 'Vérifiez le produit avant paiement en lieu sécurisé' },
              { icon: <Icon name="contactless" size={20} />, box: 'bg-primary-container/15 text-primary', title: 'Paiements directs acceptés', text: 'Wave, Orange Money ou espèces sans intermédiaire' },
            ].map(item => (
              <div key={item.title} className="flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.box}`}>{item.icon}</span>
                <div>
                  <p className="m-0 text-label-md font-bold text-on-surface">{item.title}</p>
                  <p className="m-0 text-body-sm text-on-surface-variant">{item.text}</p>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2">
              <Icon name="my_location" size={20} className="text-tertiary" />
              <span className="text-label-sm font-extrabold uppercase tracking-wider text-tertiary">Zone active :</span>
              <span className="text-label-md text-on-surface">{zone}</span>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-[1320px] px-12">
          {/* 2. Hero slider + search / flash card */}
          <section className="mt-6 grid grid-cols-12 items-stretch gap-6">
            <div className="relative col-span-8 flex min-h-[500px] flex-col justify-between overflow-hidden rounded-2xl p-10 shadow-md">
              {SLIDES.map((s, i) => (
                <div key={s.image} className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${i === slide ? 'opacity-100' : 'opacity-0'}`}>
                  <img src={s.image} alt="" className="h-full w-full scale-105 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/45" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                </div>
              ))}
              <div className="absolute left-0 top-0 z-30 h-1 w-full bg-white/20">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (elapsed / SLIDE_MS) * 100)}%` }} />
              </div>

              <div className="relative z-20">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full border border-solid px-3 py-1.5 text-white backdrop-blur-md ${SLIDES[slide].badgeClass}`}>
                    <Icon name={SLIDES[slide].badgeIcon} size={16} className={SLIDES[slide].iconClass} />
                    <span className="text-label-sm font-extrabold uppercase">{SLIDES[slide].badge}</span>
                  </span>
                  <div className="flex items-center gap-2 rounded-full border border-solid border-white/10 bg-black/40 px-2.5 py-1.5 backdrop-blur-md">
                    <button onClick={() => goSlide(slide - 1)} aria-label="Diapositive précédente" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white/80 hover:bg-white/10 hover:text-white"><ArrowLeft size={18} /></button>
                    <div className="flex items-center gap-1.5 px-1">
                      {SLIDES.map((_, i) => (
                        <button key={i} onClick={() => goSlide(i)} aria-label={`Aller au slide ${i + 1}`} className={`h-2 cursor-pointer rounded-full border-none p-0 transition-all duration-300 ${i === slide ? 'w-6 bg-primary' : 'w-2 bg-white/40 hover:bg-white/80'}`} />
                      ))}
                    </div>
                    <button onClick={() => goSlide(slide + 1)} aria-label="Diapositive suivante" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-white/80 hover:bg-white/10 hover:text-white"><ArrowRight size={18} /></button>
                  </div>
                </div>
                <div className="min-h-[155px]">
                  <h1 className="m-0 max-w-2xl text-display font-extrabold leading-tight tracking-tight text-white">{SLIDES[slide].title}</h1>
                  <p className="m-0 mt-2 max-w-xl text-body-lg text-white/90">{SLIDES[slide].text}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {SLIDES[slide].tags.map(t => (
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
                  {TRENDS.map(t => (
                    <button key={t.label} onClick={() => onSearch?.(t.term ?? '', t.maxPrice ? { maxPrice: t.maxPrice } : undefined)} className="cursor-pointer rounded-full border-none bg-surface-container-low px-2.5 py-1 text-label-sm text-on-surface-variant shadow-sm transition-all hover:bg-primary hover:text-white">
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Flash card — the live campaign */}
            <div className="relative col-span-4 flex flex-col justify-between overflow-hidden rounded-2xl p-10 text-white shadow-md" style={{ background: campaignColor }}>
              <div className="pointer-events-none absolute inset-0">
                <img src="/stitch/flash-bg.jpg" alt="" className="h-full w-full object-cover opacity-25" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${campaignColor} 30%, transparent)` }} />
              </div>
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-xl" />
              <div className="relative z-10">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded bg-white/20 px-2.5 py-1 text-label-sm font-extrabold uppercase">{campaign ? 'Exclusivité flash' : 'Bons plans'}</span>
                  {countdown && (
                    <span className="flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-label-sm tabular-nums text-primary-fixed backdrop-blur-sm"><Timer size={16} /> {countdown}</span>
                  )}
                </div>
                <h2 className="m-0 mt-2 text-headline-lg font-bold leading-tight">{campaign?.name ?? 'Bons plans du moment'}</h2>
                <p className="m-0 mt-1 text-headline-md font-black text-primary-fixed">{bestDiscount > 0 ? `Jusqu'à -${bestDiscount}%` : 'Prix doux entre particuliers'}</p>
                <p className="m-0 mt-2 text-body-sm text-white/80">{campaign?.description || 'Ventes flash et fins de dressing express, en direct des particuliers.'}</p>
              </div>
              <div className="relative z-10 mt-6 rounded-xl bg-white/10 p-4 backdrop-blur-md">
                {campaign && (
                  <div className="mb-3 flex items-center justify-between text-body-sm">
                    <span>Articles en promotion</span>
                    <span className="font-bold">{campaign.listings.length}</span>
                  </div>
                )}
                <button onClick={() => onNavigate('flash-offers')} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-white py-2.5 text-label-lg font-bold shadow hover:bg-primary-fixed" style={{ color: campaignColor }}>
                  Explorer la sélection flash <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </section>

          {/* 3. Categories */}
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
                {topCategories.map(cat => (
                  <button key={cat.id} onClick={() => onCategorySelect?.(cat.slug)} className="group flex cursor-pointer flex-col items-center rounded-2xl border-none bg-surface-lowest p-4 text-center shadow-sm transition-all hover:bg-surface-container-low hover:shadow">
                    <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-container text-primary transition-transform group-hover:scale-105">
                      <CategoryIcon icon={cat.icon} size={28} />
                    </span>
                    <span className="text-label-md font-bold leading-snug text-on-surface">{cat.name}</span>
                    <span className="mt-1 text-body-sm text-on-surface-variant">{(cat.listingsCount ?? 0).toLocaleString('fr-FR')} annonce{(cat.listingsCount ?? 0) > 1 ? 's' : ''}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 4. Pépites & boosted */}
          {pepites.length > 0 && (
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                  </span>
                  <h3 className="m-0 text-headline-lg text-on-surface">Pépites à la Une{hasBoosted && ' & Annonces Boostées'}</h3>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-label-sm font-bold uppercase tracking-wider text-primary">Priorité visibilité</span>
              </div>
              <div className="grid grid-cols-4 items-start gap-6">{pepites.slice(0, 4).map(l => card(l))}</div>
            </section>
          )}

          {/* 5. Seller incentive */}
          <section className="relative mt-10 overflow-hidden rounded-3xl bg-surface-container-low p-10 shadow-sm">
            <div className="relative z-10 max-w-2xl">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-label-sm font-extrabold uppercase tracking-wider text-primary">Vente éclair</span>
              <h3 className="m-0 mt-2 text-display leading-tight text-on-surface">Vendez en 2 minutes chrono et gardez 100% de votre argent</h3>
              <p className="m-0 mt-2 text-body-lg text-on-surface-variant">Prenez une photo, fixez votre prix en F, et convenez d'un lieu de rendez-vous sécurisé (centres commerciaux, stations-service…).</p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button onClick={() => onNavigate('seller-post')} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-10 py-3.5 text-label-lg font-bold text-white hover:bg-primary-container">
                  <Icon name="add_photo_alternate" size={22} /> Publier une annonce gratuite
                </button>
                <button onClick={() => onNavigate('seller-premium')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-lg font-bold text-on-surface underline hover:text-primary">
                  Découvrir nos options de boost dès 500 F <ChevronRight size={18} />
                </button>
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

          {/* 6. Latest */}
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
            {latest.length === 0 && !feedLoading && <p className="rounded-2xl bg-surface-container-low p-8 text-center text-body-md text-on-surface-variant">Aucune annonce pour l'instant dans cette zone.</p>}
            <div className="flex justify-center">{loadMore}</div>
          </section>

          {/* 7. How it works */}
          <section className="mb-6 mt-10 rounded-3xl bg-surface-lowest p-10 shadow-sm">
            <div className="mx-auto mb-10 max-w-xl text-center">
              <Kicker>Simplicité &amp; Sécurité</Kicker>
              <h3 className="m-0 mt-1 text-headline-lg text-on-surface">Comment fonctionne Dilchap ?</h3>
              <p className="m-0 mt-2 text-body-md text-on-surface-variant">Le circuit court : sans intermédiaire coûteux, en toute confiance.</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[
                { n: 1, box: 'bg-primary', title: 'Dénichez votre pépite', text: 'Parcourez des centaines de pièces uniques publiées chaque jour à proximité de votre commune ou de votre lieu de travail.' },
                { n: 2, box: 'bg-tertiary', title: 'Négociez en direct sur le chat', text: 'Échangez avec le vendeur via la messagerie instantanée, posez vos questions et fixez un prix équitable sans intermédiaire.' },
                { n: 3, box: 'bg-primary-container', title: 'Payez en main propre sécurisé', text: "Rendez-vous dans un lieu public. Testez l'article puis payez directement via Wave, Orange Money ou espèces." },
              ].map(s => (
                <div key={s.n} className="flex flex-col items-center rounded-2xl bg-surface-container-low p-4 text-center">
                  <span className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-headline-md font-bold text-white shadow-md ${s.box}`}>{s.n}</span>
                  <h4 className="m-0 mb-2 text-headline-sm font-bold text-on-surface">{s.title}</h4>
                  <p className="m-0 text-body-sm leading-relaxed text-on-surface-variant">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-around gap-4 pt-4 text-label-md text-on-surface-variant">
              <span className="flex items-center gap-2"><BadgeCheck size={18} className="text-tertiary" /> Profils et avis certifiés</span>
              <span className="flex items-center gap-2"><Icon name="savings" size={18} className="text-primary" /> 0 F de frais de plateforme</span>
              <span className="flex items-center gap-2"><Icon name="support_agent" size={18} className="text-tertiary" /> Équipe de modération active 7j/7</span>
            </div>
          </section>
        </div>
      </div>

      {/* ================= MOBILE ================= */}
      <div className="px-4 pb-4 pt-3 md:px-8 md:pt-6 lg:hidden">
        <div className="mb-6 flex flex-col gap-3">
          {/* "Zone active": scopes the latest-listings feed, like the desktop city chips */}
          {cities.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-label-sm uppercase leading-tight text-on-surface-variant">Zone<br />active</span>
              <span className="relative flex min-w-0 flex-1 items-center rounded-full bg-surface-container-low">
                <span className="pointer-events-none absolute left-3 h-2 w-2 rounded-full bg-tertiary" />
                <Select value={feedCity ?? ''} onChange={e => setFeedCity(e.target.value || null)} aria-label="Zone active" className="w-full min-w-0 cursor-pointer truncate border-none bg-transparent py-2 pl-7 pr-8 text-label-md text-on-surface outline-none">
                  <option value="">{zone}</option>
                  {cities.filter(c => c !== location?.city).map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </span>
            </div>
          )}
          <button onClick={() => onNavigate('search')} className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-outline-variant bg-surface-lowest px-4 text-left text-body-md text-on-surface-variant/80">
            <Search size={20} className="text-primary" />
            <span className="flex-1 truncate">Que recherchez-vous aujourd'hui ?</span>
            <SlidersHorizontal size={19} className="text-on-surface-variant" />
          </button>
          <div className="flex items-center gap-3 rounded-xl bg-surface-container px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tertiary text-white"><ShieldCheck size={18} /></span>
            <div className="min-w-0 text-body-sm leading-tight">
              <div className="font-bold text-on-surface">100% P2P • 0% Commission</div>
              <div className="text-on-surface-variant">Remise directe • Wave • OM • Cash</div>
            </div>
          </div>
        </div>

        {categories.length > 0 && (
          <section className="mb-8">
            <SectionHeading
              title="Explorer par rayon"
              action={<button onClick={() => onNavigate('categories')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary">Tout voir <ChevronRight size={16} /></button>}
            />
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
              {categories.map(cat => (
                <button key={cat.id} onClick={() => onCategorySelect?.(cat.slug)} className="group flex w-[72px] shrink-0 cursor-pointer flex-col items-center gap-1.5 border-none bg-transparent p-0">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container text-primary transition-transform group-hover:-translate-y-0.5">
                    <CategoryIcon icon={cat.icon} size={28} />
                  </span>
                  <span title={cat.name} className="w-full truncate text-center text-label-md text-on-surface">{cat.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {campaign && (
          <section className="relative mb-8 overflow-hidden rounded-2xl p-5 text-white" style={{ background: campaignColor }}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-white px-2 py-0.5 text-label-sm uppercase" style={{ color: campaignColor }}>{campaign.name}</span>
                  {countdown && <span className="flex items-center gap-1 rounded-md bg-black/20 px-2 py-0.5 text-label-sm tabular-nums"><Timer size={13} /> {countdown}</span>}
                </div>
                <div className="text-headline-lg">{bestDiscount > 0 ? `Jusqu'à -${bestDiscount}%` : 'Offres à prix cassés'}</div>
                {campaign.description && <p className="m-0 mt-1 text-body-sm opacity-90">{campaign.description}</p>}
              </div>
              <button onClick={() => onNavigate('flash-offers')} className="shrink-0 cursor-pointer rounded-lg border-none bg-white px-5 py-2.5 text-label-lg" style={{ color: campaignColor }}>Profiter</button>
            </div>
          </section>
        )}

        {pepites.length > 0 && (
          <section className="mb-8">
            <SectionHeading
              title={<><Flame size={22} className="text-primary" /> Pépites à la Une</>}
              action={hasBoosted ? <span className="rounded-full bg-tertiary-soft px-2.5 py-0.5 text-label-sm text-tertiary">Boostées</span> : undefined}
            />
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:px-0">
              {pepites.map(l => <div key={l.id} className="w-[210px] shrink-0 snap-start">{card(l, true)}</div>)}
            </div>
          </section>
        )}

        <section className="mb-8 flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface-lowest p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Handshake size={24} /></span>
          <div className="min-w-0">
            <div className="text-label-lg text-on-surface">Remise en main propre conseillée</div>
            <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">Vérifiez l'article ensemble dans un lieu public avant de payer par Wave ou OM.</p>
          </div>
        </section>

        <section>
          <SectionHeading
            title={<>Dernières annonces <span className="h-2 w-2 rounded-full bg-primary" /></>}
            action={<ViewToggle viewMode={viewMode} onChange={setViewMode} />}
          />
          {viewMode === 'grid'
            ? <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3">{latest.map(l => card(l))}</div>
            : <div className="flex flex-col gap-3">{latest.map(l => (
                <ListingListCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUser?.id} />
              ))}</div>}
          {latest.length === 0 && !feedLoading && <p className="rounded-2xl bg-surface-container-low p-8 text-center text-body-md text-on-surface-variant">Aucune annonce pour l'instant dans cette zone.</p>}
          {loadMore}
        </section>
      </div>
    </>
  )
}
