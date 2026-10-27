import { useState } from 'react'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import Icon from '../components/Icon'
import AdultGate from '../components/AdultGate'
import { ListingCard } from '../components/ListingCard'
import { GridSkeleton, RailSkeleton } from '../components/Skeleton'
import { ImpressionScope } from '../lib/impressions'
import { AdultSectionContext, adultGateReason, useAdultAccessState } from '../lib/adult'
import { useMarketCode } from '../lib/countries'
import { rotationSeed } from '../lib/rotationSeed'
import { formatNumber } from '../lib/format'
import { usePageTitle } from '../lib/site'
import type { RemoteListing } from '../graphql/listings'
import { useT } from '../i18n'
import adultNs from '../i18n/ns/adult'

// « Section Adultes » — the home page of its own marketplace (/adultes):
// its rayons, « À la une » (the team's picks, then the section's boosts),
// its own popular searches, a row per rayon and its newest listings, all
// computed from its listings only (Backend adultHome), behind its gate.

const CARD = `id title description price currency countryCode city locationLabel condition brand modelName size originalPrice meetupSpot paymentMethods minOfferPrice urgentUntil negotiable quantity aisleId featuredAt bundleOffer { name tiers { minQty percent } } deliveryAvailable tags attributes viewsCount favoritesCount publishedAt bumpedAt promoBadge { kind label percent at } createdAt coverImageUrl isAdult boostExpiresAt boostBadges { kind label } activeCampaignDiscount { campaignId campaignName campaignSlug themeColor discountPercent salePrice } media { url } category { slug name } subcategory { slug name } seller { id fullName avatarUrl badge averageRating reviewsCount shop { id slug name logoUrl } }`

export const ADULT_HOME_QUERY = gql`
  query AdultHome($countryCode: String, $rotationSeed: String) {
    adultHome(countryCode: $countryCode, rotationSeed: $rotationSeed) {
      countryCode title intro total
      featured { ${CARD} }
      latest { ${CARD} }
      rails { slug title sort total listings { ${CARD} } }
      popular { term count growth }
      rubrics { slug name categorySlug count }
    }
  }
`

type AdultHomeData = {
  countryCode: string
  title: string
  intro: string
  total: number
  featured: RemoteListing[]
  latest: RemoteListing[]
  rails: { slug: string; title: string; sort: string; total: number; listings: RemoteListing[] }[]
  popular: { term: string; count: number; growth: number }[]
  rubrics: { slug: string; name: string; categorySlug: string; count: number }[]
}

type Props = {
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  // A rayon's page (/adultes/<rayon>), the section's search.
  onOpenRubric: (slug: string) => void
  onSearch: (term?: string) => void
  // « Quitter la section ».
  onLeave: () => void
  currentUserId?: string | null
  isLoggedIn?: boolean
  onContactSeller?: (sellerId: string, listingId?: string) => void
}

function Heading({ icon, title, action }: { icon: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="m-0 flex min-w-0 items-center gap-2 text-headline-sm text-on-surface md:text-headline-md">
        <Icon name={icon} size={22} className="shrink-0 text-primary" /> <span className="truncate">{title}</span>
      </h2>
      {action}
    </div>
  )
}

const rail = '-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8'

export default function AdultHome({ onNavigate, onSelectListing, favorites, onToggleFavorite, onOpenRubric, onSearch, onLeave, currentUserId, isLoggedIn, onContactSeller }: Props) {
  const t = useT(adultNs)
  usePageTitle(t('section'))
  const countryCode = useMarketCode()
  const { access, loading: accessLoading } = useAdultAccessState()
  const { data, previousData, error, refetch } = useQuery<{ adultHome: AdultHomeData }>(ADULT_HOME_QUERY, {
    variables: { countryCode: countryCode ?? null, rotationSeed: rotationSeed() },
    // Asked once the visitor's access is known to be OK: no gate « Se
    // connecter » flashing for a member whose session is being restored.
    skip: access?.status !== 'OK',
  })
  const [words, setWords] = useState('')
  const home = (data ?? previousData)?.adultHome
  const gateReason = adultGateReason(error) ?? (access && access.status !== 'OK' ? access.status : null)

  const card = (l: RemoteListing, i = 9) => (
    <ListingCard listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUserId}
      onContact={() => (isLoggedIn && onContactSeller ? onContactSeller(l.seller.id, l.id) : onSelectListing(l.id))} priority={i < 2} />
  )

  const hero = (
    <section className="mb-6 overflow-hidden rounded-2xl bg-surface-container-low p-5 md:p-8">
      <p className="m-0 flex items-center gap-2 text-label-sm uppercase tracking-wide text-on-surface-variant">
        <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-4 text-white">18+</span> {t('home.kicker')}
      </p>
      <h1 className="m-0 mt-2 text-headline-lg-mobile text-on-surface md:text-headline-lg">{home?.title ?? t('section')}</h1>
      {home?.intro && <p className="m-0 mt-2 max-w-2xl text-body-md text-on-surface-variant">{home.intro}</p>}
      <form className="mt-4 flex max-w-xl gap-2" role="search" onSubmit={e => { e.preventDefault(); onSearch(words) }}>
        <label className="relative flex h-12 min-w-0 flex-1 items-center rounded-xl border border-solid border-outline-variant bg-surface-lowest">
          <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 text-primary" />
          <input type="search" enterKeyHint="search" value={words} onChange={e => setWords(e.target.value)} placeholder={t('home.searchPlaceholder')} aria-label={t('home.searchAria')}
            className="h-full w-full min-w-0 rounded-xl border-none bg-transparent pl-11 pr-3 text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/80" />
        </label>
        <button type="submit" className="flex h-12 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-4 text-label-md text-white">
          <span className="max-sm:hidden">{t('home.search')}</span><span className="flex sm:hidden"><Icon name="arrow_forward" size={18} /></span>
        </button>
      </form>
      {home && <p className="m-0 mt-3 text-body-sm text-on-surface-variant">{t.rich('home.total', { count: home.total, n: formatNumber(home.total, 0), b: c => <b className="text-on-surface">{c}</b> })}</p>}
    </section>
  )

  if (accessLoading && !access) return (
    <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-5 md:px-8 lg:px-12" aria-busy="true">
      <div className="mb-6 h-48 animate-pulse rounded-2xl bg-surface-container-low" />
      <GridSkeleton count={6} className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 lg:grid-cols-4" />
    </div>
  )

  if (gateReason) return (
    <div className="mx-auto max-w-[720px] px-4 py-10">
      <AdultGate reason={gateReason} onNavigate={onNavigate} onConfirmed={() => { void refetch() }} />
      <p className="m-0 mt-6 text-center"><button type="button" onClick={onLeave} className="cursor-pointer border-none bg-transparent text-label-md text-primary">{t('home.backToDilchap')}</button></p>
    </div>
  )

  const rubrics = (home?.rubrics ?? []).filter(r => r.count > 0)
  return (
    <AdultSectionContext.Provider value>
      <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-5 md:px-8 lg:px-12" data-testid="adult-home">
        {hero}

        {!home ? <><RailSkeleton featured /><GridSkeleton count={6} className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 lg:grid-cols-4" /></> : <>
          {rubrics.length > 0 && (
            <nav aria-label={t('home.rubricsAria')} className="-mx-4 mb-7 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-8 md:flex-wrap md:px-8">
              {rubrics.map(r => (
                <a key={r.slug} href={`/adultes/${r.slug}`} onClick={e => { e.preventDefault(); onOpenRubric(r.slug) }}
                  className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-solid border-outline-variant bg-surface-lowest px-3.5 py-2 text-label-md text-on-surface no-underline hover:text-primary">
                  {r.name} <span className="text-label-sm text-on-surface-variant">{formatNumber(r.count, 0)}</span>
                </a>
              ))}
            </nav>
          )}

          {home.featured.length > 0 && (
            <section className="mb-8">
              <Heading icon="local_fire_department" title={t('home.featured')} />
              <div className={rail}>
                <ImpressionScope placement="CATEGORY">{home.featured.map((l, i) => <div key={l.id} className="w-[220px] shrink-0 snap-start md:w-[250px]">{card(l, i)}</div>)}</ImpressionScope>
              </div>
            </section>
          )}

          {home.popular.length > 0 && (
            <section className="mb-8">
              <Heading icon="trending_up" title={t('home.popular')} />
              <div className="flex flex-wrap gap-2">
                {home.popular.map(p => (
                  <button key={p.term} type="button" onClick={() => onSearch(p.term)} className="cursor-pointer rounded-full border-none bg-surface-container-low px-3.5 py-2 text-label-md text-on-surface hover:text-primary">{p.term}</button>
                ))}
              </div>
            </section>
          )}

          {home.rails.map(r => (
            <section key={r.slug} className="mb-8">
              <Heading icon="category" title={r.title} action={
                <a href={`/adultes/${r.slug}`} onClick={e => { e.preventDefault(); onOpenRubric(r.slug) }} className="shrink-0 whitespace-nowrap text-label-md font-semibold text-primary no-underline">{t('home.seeAll', { n: formatNumber(r.total, 0) })}</a>
              } />
              <div className={rail}>
                <ImpressionScope placement="CATEGORY">{r.listings.map(l => <div key={l.id} className="w-[180px] shrink-0 snap-start md:w-[220px]">{card(l)}</div>)}</ImpressionScope>
              </div>
            </section>
          ))}

          <section className="mb-8">
            <Heading icon="new_releases" title={t('home.latest')} action={
              <button type="button" onClick={() => onSearch()} className="shrink-0 cursor-pointer whitespace-nowrap border-none bg-transparent p-0 text-label-md font-semibold text-primary">{t('home.wholeSection')}</button>
            } />
            {home.latest.length ? (
              <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
                <ImpressionScope placement="CATEGORY">{home.latest.map(l => <div key={l.id}>{card(l)}</div>)}</ImpressionScope>
              </div>
            ) : <p className="m-0 rounded-xl bg-surface-container-low p-5 text-center text-body-md text-on-surface-variant">{t('home.empty')}</p>}
          </section>
        </>}

        <section className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-surface-container-low p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="sell" size={22} /></span>
            <div>
              <div className="text-headline-sm text-on-surface">{t('home.sell.title')}</div>
              <p className="m-0 text-body-sm text-on-surface-variant">{t('home.sell.text')}</p>
            </div>
          </div>
          <button type="button" onClick={() => onNavigate('seller-post')} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white">
            <Icon name="add" size={18} /> {t('home.sell.button')}
          </button>
        </section>
        <p className="m-0 mt-5 text-center">
          <button type="button" onClick={onLeave} className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Icon name="logout" size={16} /> {t('home.leave')}</button>
        </p>
      </div>
    </AdultSectionContext.Provider>
  )
}
