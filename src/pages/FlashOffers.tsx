import { rotationSeed } from '../lib/rotationSeed'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon, { CategoryIcon } from '../components/Icon'
import { ListingCard } from '../components/ListingCard'
import CampaignHero from '../components/campaign/CampaignHero'
import { CampaignBanner, CampaignCompact } from '../components/campaign/CampaignTiles'
import { POST_CAMPAIGN_KEY } from '../components/CampaignOptIn'
import { CAMPAIGN_PAGE_QUERY, LIVE_CAMPAIGNS_QUERY, isLive, type CampaignPage, type LiveCampaign } from '../graphql/campaigns'
import { LISTINGS_QUERY, type RemoteListing } from '../graphql/listings'
import { ImpressionScope, promotedOf } from '../lib/impressions'
import { placeOptions, useLists } from '../lib/lists'
import { useMarket, useMarketCode, useMarketVars } from '../lib/countries'
import { richHtml } from '../lib/richText'
import { feeOptions, feeText } from '../lib/campaignFees'
import { OPEN_CAMPAIGNS_QUERY, type OpenCampaign } from '../graphql/shops'
import InfiniteLoader from '../components/InfiniteLoader'
import { useLoadMore } from '../lib/useLoadMore'
import { useT } from '../i18n'
import campaignNs from '../i18n/ns/campaign'
import common from '../i18n/ns/common'

type FlashOffersProps = {
  // '' = the newest live campaign.
  campaignSlug?: string
  onOpenCampaign: (slug: string) => void
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onContactSeller?: (sellerId: string, listingId?: string) => void
  isLoggedIn?: boolean
}

type Sort = 'DISCOUNT_DESC' | 'RECENT' | 'PRICE_ASC' | 'PRICE_DESC'
const SORTS: [Sort, 'page.sort.DISCOUNT_DESC' | 'page.sort.RECENT' | 'page.sort.PRICE_ASC' | 'page.sort.PRICE_DESC'][] = [['DISCOUNT_DESC', 'page.sort.DISCOUNT_DESC'], ['RECENT', 'page.sort.RECENT'], ['PRICE_ASC', 'page.sort.PRICE_ASC'], ['PRICE_DESC', 'page.sort.PRICE_DESC']]
const DISCOUNTS = [0, 10, 20, 30, 50]
const PAGE_SIZE = 20

const select = 'h-10 shrink-0 cursor-pointer rounded-xl border border-solid border-outline-variant bg-surface-lowest px-3 text-label-md text-on-surface outline-none focus:border-primary'

// One campaign's page (the one clicked on the home, a category tile or the
// announcement bar): header driven by the BO, search and filters within
// the campaign, top discounts, every offer, the sellers' invitation, and
// the other live campaigns.
export default function FlashOffers({ campaignSlug = '', onOpenCampaign, onNavigate, onSelectListing, favorites, onToggleFavorite, onContactSeller, isLoggedIn }: FlashOffersProps) {
  const t = useT(campaignNs)
  const tc = useT(common)
  const { data: liveData, loading: liveLoading } = useQuery<{ activeCampaigns: LiveCampaign[] }>(LIVE_CAMPAIGNS_QUERY, { variables: useMarketVars(), fetchPolicy: 'cache-and-network' })
  const live = (liveData?.activeCampaigns ?? []).filter(isLive)
  const slug = campaignSlug || live[0]?.slug || ''
  const { data, loading } = useQuery<{ campaign: CampaignPage | null }>(CAMPAIGN_PAGE_QUERY, { variables: { slug, ...useMarketVars() }, skip: !slug })
  const campaign = data?.campaign && isLive(data.campaign) ? data.campaign : null
  // A signed-in member sees their own price (the API's, by seller status).
  const { data: mineData } = useQuery<{ openShopCampaigns: OpenCampaign[] }>(OPEN_CAMPAIGNS_QUERY, { skip: !isLoggedIn || !campaign?.openToShops, fetchPolicy: 'cache-and-network' })
  const mine = mineData?.openShopCampaigns.find(c => c.id === campaign?.id)

  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 350); return () => clearTimeout(t) }, [search])
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [minDiscount, setMinDiscount] = useState(0)
  const [sort, setSort] = useState<Sort>('DISCOUNT_DESC')
  const places = placeOptions(useLists())
  const market = useMarket()
  // Only the visitor's country (a campaign may run in several).
  const marketCode = useMarketCode()
  const inMarket = marketCode ? { countryCode: marketCode } : {}

  const filter = useMemo(() => campaign && ({
    campaignId: campaign.id,
    ...(marketCode ? { countryCode: marketCode } : {}),
    ...(query ? { search: query } : {}),
    ...(category ? { categorySlug: category } : {}),
    ...(city ? { city } : {}),
    ...(minDiscount ? { minDiscountPercent: minDiscount } : {}),
  }), [campaign, marketCode, query, category, city, minDiscount])
  // Every offer, page after page as the visitor scrolls (InfiniteLoader).
  const { data: offersData, loading: offersLoading, fetchMore } = useQuery<{ listings: { items: RemoteListing[]; totalCount: number; page: number; totalPages: number } }>(LISTINGS_QUERY, {
    variables: { filter, sort, page: 1, pageSize: PAGE_SIZE, rotationSeed: rotationSeed() },
    skip: !filter,
  })
  const nextOffers = useLoadMore({ fetchMore, page: offersData?.listings.page, totalPages: offersData?.listings.totalPages, key: JSON.stringify([filter, sort]) })
  const { data: topData } = useQuery<{ listings: { items: RemoteListing[] } }>(LISTINGS_QUERY, {
    variables: { filter: { campaignId: campaign?.id, ...inMarket }, sort: 'DISCOUNT_DESC', page: 1, pageSize: 8, rotationSeed: rotationSeed() },
    skip: !campaign,
  })
  const offers = offersData?.listings.items ?? []
  const total = offersData?.listings.totalCount ?? 0
  const top = topData?.listings.items ?? []
  const filtered = !!(query || category || city || minDiscount)

  const promoted = [...(promotedOf(offersData?.listings) ?? []), ...(promotedOf(topData?.listings) ?? [])]
  const card = (l: RemoteListing) => (
    <ImpressionScope key={l.id} placement="CAMPAIGN" promoted={promoted}>
      <ListingCard listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)}
        onContact={() => (isLoggedIn && onContactSeller ? onContactSeller(l.seller.id, l.id) : onSelectListing(l.id))} />
    </ImpressionScope>
  )

  if ((liveLoading && !liveData) || (loading && !data)) {
    return <div className="mx-auto max-w-[1320px] px-4 py-6 md:px-8"><div className="h-[420px] animate-pulse rounded-2xl bg-surface-container" /></div>
  }
  if (!campaign) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"><Icon name="local_offer" size={30} /></span>
        <h1 className="m-0 text-headline-md text-on-surface">{campaignSlug ? t('page.ended') : t('page.none')}</h1>
        <p className="m-0 mt-2 text-body-md text-on-surface-variant">{t('page.nextHere')}</p>
        {live.length > 0 && campaignSlug
          ? <button onClick={() => onOpenCampaign('')} className="mt-6 cursor-pointer rounded-xl border-none bg-primary px-5 py-3 text-label-lg text-white">{t('page.seeCurrent')}</button>
          : <button onClick={() => onNavigate('home')} className="mt-6 cursor-pointer rounded-xl border-none bg-primary px-5 py-3 text-label-lg text-white">{t('page.backHome')}</button>}
      </div>
    )
  }

  const others = live.filter(c => c.id !== campaign.id)
  const fees = feeOptions({ entryFee: campaign.entryFee, listingFee: campaign.listingFee }, campaign.feeTiers)
  const share = () => {
    const url = `${window.location.origin}/bonnes-affaires/${campaign.slug}`
    if (navigator.share) void navigator.share({ title: campaign.name, url }).catch(() => undefined)
    else void navigator.clipboard?.writeText(url)
  }

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-16 pt-4 md:px-8 md:pt-6">
      <nav className="mb-3 flex items-center justify-between gap-2 text-label-md text-on-surface-variant md:mb-4">
        <span className="flex min-w-0 items-center gap-1">
          <button onClick={() => onNavigate('home')} className="cursor-pointer border-none bg-transparent p-0 text-on-surface-variant hover:text-primary">{t('page.home')}</button>
          <Icon name="chevron_right" size={16} />
          <span className="truncate text-on-surface">{campaign.name}</span>
        </span>
        <button onClick={share} aria-label={t('page.shareAria')} className="flex cursor-pointer items-center gap-1 rounded-full border-none bg-surface-container-low px-3 py-1.5 text-label-md text-on-surface"><Icon name="share" size={16} /> {tc('share')}</button>
      </nav>

      <CampaignHero campaign={campaign} />

      {/* Search & filters within the campaign */}
      <section className="sticky top-[var(--header-h,64px)] z-20 -mx-4 mt-5 bg-surface/95 px-4 py-3 md:static md:mx-0 md:rounded-2xl md:bg-surface-lowest md:p-4 md:shadow-sm">
        <div className="flex flex-wrap items-center gap-2 max-md:flex-nowrap max-md:flex-col max-md:items-stretch">
          <label className="flex h-10 min-w-0 flex-1 basis-60 items-center max-md:basis-auto max-md:flex-none gap-2 rounded-xl border border-solid border-outline-variant bg-surface-lowest px-3">
            <Icon name="search" size={18} className="text-outline" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('page.searchPlaceholder')} aria-label={t('page.searchPlaceholder')} className="min-w-0 flex-1 border-none bg-transparent text-body-md text-on-surface outline-none" />
          </label>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:contents">
          <select aria-label={t('page.place')} value={city} onChange={e => setCity(e.target.value)} className={select}>
            <option value="">{t('page.placeAll')}</option>
            {places.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select aria-label={t('optin.discount')} value={minDiscount} onChange={e => setMinDiscount(Number(e.target.value))} className={select}>
            {DISCOUNTS.map(v => <option key={v} value={v}>{v ? t('page.discountMin', { n: v }) : t('page.discountAll')}</option>)}
          </select>
          <select aria-label={t('page.sortAria')} value={sort} onChange={e => setSort(e.target.value as Sort)} className={select}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{t('page.sortOption', { label: t(l) })}</option>)}
          </select>
          </div>
        </div>
        {campaign.categoryCounts.length > 1 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            {[{ slug: '', name: t('page.all'), icon: null, count: campaign.listingsCount }, ...campaign.categoryCounts].map(c => (
              <button key={c.slug || 'all'} onClick={() => setCategory(c.slug)} className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border-none px-3.5 py-2 text-label-md ${category === c.slug ? 'bg-on-surface text-surface' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
                {c.icon && <CategoryIcon icon={c.icon} size={16} />} {c.name} <span className="opacity-60">({c.count})</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Top discounts */}
      {!filtered && top.length > 2 && (
        <section className="mt-8">
          <p className="m-0 flex items-center gap-1.5 text-label-sm font-bold uppercase tracking-wider text-primary"><Icon name="local_fire_department" size={15} /> {t('page.mustHave')}</p>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="m-0 text-headline-md font-bold text-on-surface md:text-headline-lg">{t('page.topDiscounts')}</h2>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0">
            {top.slice(0, 8).map((l, i) => <div key={l.id} className={`w-[46%] shrink-0 snap-start md:w-auto ${i >= 4 ? 'md:hidden' : ''}`}>{card(l)}</div>)}
          </div>
        </section>
      )}

      {/* The team's banner */}
      {campaign.visuals?.banner && <div className="mt-8"><CampaignBanner c={campaign} /></div>}

      {/* Every offer */}
      <section id="offres" className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="m-0 text-headline-md font-bold text-on-surface md:text-headline-lg">{filtered ? t('page.results') : t('page.allOffers')}</h2>
          <span className="text-label-md text-on-surface-variant">{t('page.shown', { count: offers.length, n: String(offers.length), total: String(total) })}</span>
        </div>
        {offers.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5 xl:grid-cols-5">{offers.map(card)}</div>
        ) : offersLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5 xl:grid-cols-5">{Array.from({ length: 8 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-surface-container" />)}</div>
        ) : (
          <div className="rounded-2xl bg-surface-container-low px-6 py-12 text-center">
            <p className="m-0 text-headline-sm text-on-surface">{t('page.noMatch')}</p>
            {filtered && <button onClick={() => { setSearch(''); setCategory(''); setCity(''); setMinDiscount(0) }} className="mt-3 cursor-pointer rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white">{t('page.clearFilters')}</button>}
          </div>
        )}
        {offersData && <InfiniteLoader key={JSON.stringify([filter, sort])} list={nextOffers} pageSize={PAGE_SIZE} label={t('page.loadMore')} endLabel={offers.length > PAGE_SIZE ? t('page.allSeen') : null} />}
      </section>

      {/* Sellers' invitation */}
      {campaign.openToShops && (
        <section className="mt-10 flex flex-col gap-4 rounded-2xl bg-surface-lowest p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="storefront" size={22} /></span>
            <div>
              <p className="m-0 text-label-sm font-bold uppercase tracking-wider text-primary">{t('page.sellers')}</p>
              <h2 className="m-0 text-headline-sm font-bold text-on-surface">{market ? t('page.sellIn', { city: market.mainCity }) : t('page.sell')}</h2>
              <p className="m-0 mt-1 max-w-2xl text-body-sm text-on-surface-variant">
                {campaign.minDiscountPercent ? t('page.inviteMin', { name: campaign.name, n: campaign.minDiscountPercent }) : t('page.invite', { name: campaign.name })}
              </p>
              <div className="mt-2 max-w-2xl rounded-xl bg-surface-container-low px-3 py-2 text-body-sm">
                {mine ? (
                  <p className="m-0 text-on-surface">{t.rich(mine.entryFeePaid && mine.entryFee > 0 ? 'page.yourRatePaid' : 'page.yourRate', { b: c => <b className="font-semibold">{c}</b>, fee: feeText(mine) })}</p>
                ) : fees.single ? (
                  <p className="m-0 text-on-surface">{t.rich('page.rate', { b: c => <b className="font-semibold">{c}</b>, fee: feeText(fees.cheapest) })}</p>
                ) : (
                  <>
                    <p className="m-0 text-on-surface">{t.rich(isLoggedIn ? 'page.tierRate' : 'page.tierRateLogin', { b: c => <b className="font-semibold">{c}</b>, from: fees.cheapest.entryFee + fees.cheapest.listingFee > 0 ? t('page.fromFee', { fee: feeText(fees.cheapest).replace(/^Participation /, '') }) : t('page.freeForSome') })}</p>
                    <ul className="m-0 mt-1 list-none space-y-0.5 p-0 text-on-surface-variant">
                      {fees.lines.map(l => <li key={l.label}>{t('page.feeLine', { label: l.label, text: l.text })}</li>)}
                    </ul>
                  </>
                )}
                {(mine ? mine.entryFee + mine.listingFee > 0 : fees.anyPaid) && <p className="m-0 mt-1 text-on-surface-variant">{t('page.payInCredits')}</p>}
              </div>
              {campaign.sellerConditions.length > 0 && (
                <details className="mt-2 max-w-2xl text-body-sm">
                  <summary className="cursor-pointer text-label-md text-primary">{t('page.conditions')}</summary>
                  <ul className="m-0 mt-1.5 list-none space-y-1 p-0 text-on-surface-variant">
                    {campaign.sellerConditions.map(l => <li key={l} className="flex items-start gap-1.5"><Icon name="check" size={15} className="mt-0.5 shrink-0 text-primary" /> <span className="min-w-0">{l}</span></li>)}
                  </ul>
                  {campaign.sellerTerms && <div className="rich-text mt-2 text-on-surface" dangerouslySetInnerHTML={{ __html: richHtml(campaign.sellerTerms) }} />}
                </details>
              )}
            </div>
          </div>
          <button
            onClick={() => { try { sessionStorage.setItem(POST_CAMPAIGN_KEY, campaign.id) } catch { /* private mode */ } onNavigate('seller-post') }}
            className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-5 py-3 text-label-lg font-bold text-white hover:bg-primary-dark"
          >
            <Icon name="add_circle" size={19} /> <span className="max-[380px]:hidden">{t('page.sellFor')}</span><span className="min-[381px]:hidden">{t('page.participate')}</span>
          </button>
        </section>
      )}

      {/* Other live campaigns */}
      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="m-0 mb-3 text-headline-md font-bold text-on-surface">{t('page.others')}</h2>
          <div className="grid gap-4 md:grid-cols-3">{others.slice(0, 6).map(c => <CampaignCompact key={c.id} c={c} />)}</div>
        </section>
      )}
    </div>
  )
}
