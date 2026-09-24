import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { ArrowDown, ChevronRight, Search, SlidersHorizontal, ShieldCheck, Handshake, Timer, Flame, Loader2 } from 'lucide-react'
import ViewToggle from '../components/ViewToggle'
import { ListingCard, ListingListCard } from '../components/ListingCard'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'
import { LISTINGS_QUERY, RECOMMENDED_LISTINGS_QUERY, type RemoteListing } from '../graphql/listings'
import { ACTIVE_CAMPAIGN_QUERY, type ActiveCampaign } from '../graphql/content'
import { getStoredViewMode, setStoredViewMode } from '../lib/viewMode'
import type { StoredLocation } from '../lib/location'
import type { AuthUser } from '../graphql/auth'

type HomeProps = {
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onCategorySelect?: (categoryId: string) => void
  currentUser?: AuthUser | null
  location?: StoredLocation | null
  onContactSeller?: (sellerId: string, listingId?: string) => void
}

const PAGE_SIZE = 12

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
  return days > 0 ? `${days}j ${h}h : ${m}m` : `${h}h : ${m}m : ${sec}s`
}

function SectionHeading({ title, action }: { title: React.ReactNode, action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface md:text-headline-md">{title}</h2>
      {action}
    </div>
  )
}

// Mockup "Dilchap Mobile – Accueil & Découverte": search, P2P promise,
// rayons, campaign card with countdown, boosted "Pépites à la Une" rail,
// hand-over safety nudge, then "Dernières annonces" with load-more.
export default function Home({ onNavigate, onSelectListing, favorites, onToggleFavorite, onCategorySelect, currentUser, location, onContactSeller }: HomeProps) {
  const [viewMode, setViewModeState] = useState<'grid' | 'list'>(() => getStoredViewMode() ?? 'grid')
  const setViewMode = (mode: 'grid' | 'list') => { setViewModeState(mode); setStoredViewMode(mode) }

  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const categories = categoriesData?.categories ?? []

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

  // Dernières annonces — scoped to the chosen market, grown in place.
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [location?.countryCode, location?.city])
  const { data: feedData, previousData, loading: feedLoading } = useQuery<{ listings: { items: RemoteListing[], totalCount: number } }>(LISTINGS_QUERY, {
    variables: {
      sort: 'RECENT',
      page: 1,
      pageSize: PAGE_SIZE * page,
      filter: location?.countryCode
        ? { countryCode: location.countryCode, ...(location.city ? { city: location.city } : {}) }
        : undefined,
    },
  })
  const feed = (feedData ?? previousData)?.listings
  const latest = feed?.items ?? []
  const canLoadMore = !!feed && feed.totalCount > latest.length

  const contact = (l: RemoteListing) => () =>
    currentUser && !currentUser.isGuest && onContactSeller ? onContactSeller(l.seller.id, l.id) : onSelectListing(l.id)

  const card = (l: RemoteListing) => (
    <ListingCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUser?.id} onContact={contact(l)} />
  )

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-4 pt-4 md:px-8 md:pt-6 lg:px-12">

      {/* Search + P2P promise */}
      <div className="mb-6 flex flex-col gap-3">
        <button
          onClick={() => onNavigate('search')}
          className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-outline-variant bg-surface-lowest px-4 text-left text-body-md text-on-surface-variant/80 lg:hidden"
        >
          <Search size={20} className="text-primary" />
          <span className="flex-1 truncate">Que recherchez-vous aujourd'hui ?</span>
          <SlidersHorizontal size={19} className="text-on-surface-variant" />
        </button>
        <div className="flex items-center gap-3 rounded-xl bg-surface-container px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tertiary text-white"><ShieldCheck size={18} /></span>
          <div className="min-w-0 text-body-sm leading-tight">
            <div className="font-bold text-on-surface">100% P2P • 0% Commission</div>
            <div className="text-on-surface-variant">Remise directe • Paiement à la rencontre</div>
          </div>
        </div>
      </div>

      {/* Explorer par rayon */}
      {categories.length > 0 && (
        <section className="mb-8">
          <SectionHeading
            title="Explorer par rayon"
            action={
              <button onClick={() => onNavigate('categories')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary">
                Tout voir <ChevronRight size={16} />
              </button>
            }
          />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onCategorySelect?.(cat.slug)}
                className="group flex w-[72px] shrink-0 cursor-pointer flex-col items-center gap-1.5 border-none bg-transparent p-0 md:w-[88px]"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl text-[26px] transition-transform group-hover:-translate-y-0.5 md:h-[72px] md:w-[72px]" style={{ background: `${cat.color}1A` }}>
                  {cat.icon}
                </span>
                <span className="line-clamp-2 text-center text-label-md text-on-surface">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Campaign card — live campaign only, with countdown */}
      {campaign && (
        <section className="relative mb-8 overflow-hidden rounded-2xl p-5 text-white md:p-8" style={{ background: campaignColor }}>
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
            <button onClick={() => onNavigate('flash-offers')} className="shrink-0 cursor-pointer rounded-lg border-none bg-white px-5 py-2.5 text-label-lg" style={{ color: campaignColor }}>
              Profiter
            </button>
          </div>
        </section>
      )}

      {/* Pépites à la Une */}
      {pepites.length > 0 && (
        <section className="mb-8">
          <SectionHeading
            title={<><Flame size={22} className="text-primary" /> Pépites à la Une</>}
            action={hasBoosted ? <span className="rounded-full bg-tertiary-soft px-2.5 py-0.5 text-label-sm text-tertiary">Boostées</span> : undefined}
          />
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:gap-4 md:px-0">
            {pepites.map(l => <div key={l.id} className="w-[210px] shrink-0 snap-start md:w-[250px]">{card(l)}</div>)}
          </div>
        </section>
      )}

      {/* Remise en main propre conseillée */}
      <section className="mb-8 flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface-lowest p-4 md:p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Handshake size={24} /></span>
        <div className="min-w-0">
          <div className="text-label-lg text-on-surface">Remise en main propre conseillée</div>
          <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">Vérifiez l'article ensemble dans un lieu public avant de payer.</p>
        </div>
      </section>

      {/* Dernières annonces */}
      <section>
        <SectionHeading
          title={<>Dernières annonces <span className="h-2 w-2 rounded-full bg-primary" /></>}
          action={<ViewToggle viewMode={viewMode} onChange={setViewMode} />}
        />
        {viewMode === 'grid'
          ? <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">{latest.map(card)}</div>
          : <div className="flex flex-col gap-3">{latest.map(l => (
              <ListingListCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUser?.id} />
            ))}</div>}
        {latest.length === 0 && !feedLoading && (
          <p className="rounded-2xl bg-surface-container-low p-8 text-center text-body-md text-on-surface-variant">Aucune annonce pour l'instant dans cette zone.</p>
        )}
        {canLoadMore && (
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={feedLoading}
            className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container-low py-3.5 text-label-lg text-on-surface hover:bg-surface-container disabled:opacity-60"
          >
            {feedLoading ? <Loader2 size={17} className="animate-spin" /> : <>Charger plus d'annonces <ArrowDown size={17} /></>}
          </button>
        )}
      </section>
    </div>
  )
}
