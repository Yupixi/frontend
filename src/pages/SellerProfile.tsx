import EmptyState from '../components/EmptyState'
import { SellerReelsGrid, useSellerReels } from '../components/reels/ReelEmbeds'
import Icon from '../components/Icon'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  Star, MapPin, MessageSquare, BadgeCheck, Share2, Home, ChevronRight, Search, Handshake, Percent, ShieldCheck,
  UserPlus, UserCheck, Calendar, Wallet, Flag, CheckCircle2,
} from '../components/icons'
import { ListingCard } from '../components/ListingCard'
import { LISTINGS_QUERY, type RemoteListing, type ListingSort } from '../graphql/listings'
import { ImpressionScope, promotedOf } from '../lib/impressions'
import {
  SELLER_ID_BY_HANDLE_QUERY, SELLER_PROFILE_QUERY, SELLER_REVIEWS_QUERY, CREATE_REVIEW_MUTATION, FOLLOW_SELLER_MUTATION, UNFOLLOW_SELLER_MUTATION,
  formatResponseTime, type RemoteSellerProfile, type RemoteReview,
} from '../graphql/reviews'
import { PAYMENT_LABELS } from './ListingDetail'
import { formatRelativeDate } from '../lib/format'
import Select from '../components/Select'
import ConfirmSheet from '../components/ConfirmSheet'
import { CREATE_REPORT_MUTATION } from '../graphql/reports'
import { setAuthReason, type AuthReason } from '../lib/authReason'
import { SHOP_QUERY, type Shop } from '../graphql/shops'
import ShopPage from './ShopPage'
import SellerBadge from '../components/SellerBadge'
import { BADGE_LABEL } from '../graphql/badges'
import { Claim, useNoCommissionClaims } from '../lib/site'
import { useLists } from '../lib/lists'
import { usePageTitle } from '../lib/site'
import { rememberHandle } from '../lib/routes'
import InfiniteLoader from '../components/InfiniteLoader'
import { fmtCfa, fmtDate, useT } from '../i18n'
import common from '../i18n/ns/common'
import sellerNs from '../i18n/ns/seller'


type SellerProfileProps = {
  sellerId: string
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  onContactSeller: (sellerId: string, listingId?: string) => void
  isLoggedIn: boolean
  favorites?: string[]
  onToggleFavorite?: (id: string) => void
  currentUserId?: string | null
}

const PAGE = 8

function Stars({ rating, size = 14 }: { rating: number, size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={size} fill={s <= Math.round(rating) ? '#F59E0B' : 'none'} color={s <= Math.round(rating) ? '#F59E0B' : 'var(--border)'} />)}
    </span>
  )
}

const memberSince = (iso: string) => fmtDate(iso, { month: 'short', year: 'numeric' })

// dilchap.com/@handle: the member's id first, then their profile.
export default function SellerProfile(props: SellerProfileProps) {
  const t = useT(sellerNs)
  const tc = useT(common)
  const byHandle = props.sellerId.startsWith('@')
  const { data, loading, error } = useQuery<{ sellerIdByHandle: string | null }>(SELLER_ID_BY_HANDLE_QUERY, { variables: { handle: props.sellerId }, skip: !byHandle })
  if (!byHandle) return <SellerProfileView {...props} />
  if (loading) return <div className="p-12 text-center text-on-surface-variant">{tc('loading')}</div>
  // Too many lookups from this connection (rate limit): not « unknown ».
  if (error) return <div className="p-12 text-center text-on-surface-variant">{t('rateLimited')}</div>
  const id = data?.sellerIdByHandle
  if (!id) return (
    <div className="p-12 text-center">
      <p className="mb-4 text-on-surface-variant">{t('noHandle', { handle: props.sellerId })}</p>
      <button onClick={() => props.onNavigate('home')} className="cursor-pointer rounded-lg border-none bg-primary px-5 py-2.5 text-label-lg text-white">{t('backHome')}</button>
    </div>
  )
  return <SellerProfileView {...props} sellerId={id} />
}

function SellerProfileView({ sellerId, onNavigate, onSelectListing, onContactSeller, isLoggedIn, favorites = [], onToggleFavorite, currentUserId }: SellerProfileProps) {
  const t = useT(sellerNs)
  const tc = useT(common)
  const [tab, setTab] = useState<'listings' | 'reels' | 'reviews' | 'terms'>('listings')
  // « Reels »: a tab when the seller has some.
  const sellerReels = useSellerReels(sellerId)
  const noCommission = useNoCommissionClaims()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const [sort, setSort] = useState<ListingSort>('RECENT')
  const [shown, setShown] = useState(PAGE)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const reportReasons = useLists().reportReasons.user
  const [pickedReason, setReportReason] = useState('')
  const reportReason = reportReasons.includes(pickedReason) ? pickedReason : reportReasons[0]
  const [reportMessage, setReportMessage] = useState('')
  const [reportDone, setReportDone] = useState(false)

  // A seller with an official shop is shown through the shop page.
  const { data: shopData, loading: shopLoading } = useQuery<{ shop: Shop }>(SHOP_QUERY, { variables: { key: sellerId }, errorPolicy: 'all' })
  const { data: profileData, loading, refetch: refetchProfile } = useQuery<{ sellerProfile: RemoteSellerProfile }>(SELLER_PROFILE_QUERY, { variables: { sellerId } })
  const seller = profileData?.sellerProfile
  usePageTitle(seller?.fullName)
  // The short address is the one shown and shared (an official shop keeps
  // its /boutique/… address).
  const handle = seller?.handle
  const shopSlug = shopData?.shop?.isOfficial ? shopData.shop.slug : null
  useEffect(() => {
    const path = shopSlug ? `/boutique/${encodeURIComponent(shopSlug)}` : handle ? `/@${handle}` : null
    if (!path) return
    if (handle && !shopSlug) rememberHandle(sellerId, handle)
    if (window.location.pathname !== path) window.history.replaceState(window.history.state, '', path)
  }, [handle, shopSlug, sellerId])
  const { data: listingsData } = useQuery<{ listings: { items: RemoteListing[], totalCount: number } }>(LISTINGS_QUERY, {
    variables: { filter: { sellerId }, sort, pageSize: 100 },
  })
  const all = listingsData?.listings.items ?? []
  const { data: reviewsData, refetch: refetchReviews } = useQuery<{ sellerReviews: RemoteReview[] }>(SELLER_REVIEWS_QUERY, { variables: { sellerId } })
  const reviews = reviewsData?.sellerReviews ?? []

  const [createReview, { loading: submittingReview }] = useMutation(CREATE_REVIEW_MUTATION)
  const [follow] = useMutation(FOLLOW_SELLER_MUTATION)
  const [unfollow] = useMutation(UNFOLLOW_SELLER_MUTATION)
  const [createReport, { loading: reporting }] = useMutation(CREATE_REPORT_MUTATION)

  const categories = useMemo(() => {
    const m = new Map<string, { name: string, count: number }>()
    all.forEach(l => m.set(l.category.slug, { name: l.category.name, count: (m.get(l.category.slug)?.count ?? 0) + 1 }))
    return [...m.entries()].map(([slug, v]) => ({ slug, ...v }))
  }, [all])
  const paymentMethods = useMemo(() => [...new Set(all.flatMap(l => l.paymentMethods ?? []))], [all])
  const meetupSpots = useMemo(() => [...new Set(all.map(l => l.meetupSpot).filter(Boolean) as string[])], [all])
  const filtered = all.filter(l => (!cat || l.category.slug === cat) && (!q || l.title.toLowerCase().includes(q.toLowerCase())))

  if (shopData?.shop?.isOfficial) {
    return <ShopPage shopKey={shopData.shop.slug} preloaded={shopData.shop} onNavigate={onNavigate} onSelectListing={onSelectListing} onContactSeller={onContactSeller} isLoggedIn={isLoggedIn} favorites={favorites} onToggleFavorite={onToggleFavorite} currentUserId={currentUserId} />
  }
  if (loading || shopLoading) return <div className="p-12 text-center text-on-surface-variant">{tc('loading')}</div>
  if (!seller) {
    return (
      <div className="p-12 text-center">
        <p className="mb-4 text-on-surface-variant">{t('notFound')}</p>
        <button onClick={() => onNavigate('home')} className="cursor-pointer rounded-lg border-none bg-primary px-5 py-2.5 text-label-lg text-white">{t('backHome')}</button>
      </div>
    )
  }

  const responseTime = formatResponseTime(seller.responseTimeMinutes)
  // No guest chat here (it needs a listing): visitors log in, and the login
  // screen says why.
  const requireAuth = (fn: () => void, reason: AuthReason) => () => {
    if (isLoggedIn) return fn()
    setAuthReason(reason)
    onNavigate('auth')
  }
  const contact = requireAuth(() => onContactSeller(seller.id), 'contact')
  const toggleFollow = requireAuth(async () => {
    await (seller.isFollowedByMe ? unfollow : follow)({ variables: { sellerId: seller.id } })
    void refetchProfile()
  }, 'follow')
  const sendReport = () => {
    void createReport({ variables: { targetType: 'USER', targetUserId: seller.id, reason: reportReason, message: reportMessage.trim() || undefined } })
      .then(() => { setReportDone(true); setReportOpen(false) })
      .catch(() => undefined)
  }
  const share = async () => {
    const url = `${window.location.origin}${seller.handle ? `/@${seller.handle}` : `/vendeur/${seller.id}`}`
    if (navigator.share) { try { await navigator.share({ title: seller.fullName, url }) } catch { /* cancelled */ } return }
    await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const submitReview = async () => {
    setReviewError(null)
    try {
      await createReview({ variables: { input: { sellerId, rating: reviewRating, comment: reviewComment || undefined } } })
      setReviewSubmitted(true); setReviewComment('')
      void refetchReviews(); void refetchProfile()
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : t('review.error'))
    }
  }

  const stats = [
    { value: seller.reviewsCount ? <>{seller.averageRating.toFixed(1)} <Star size={15} fill="#F59E0B" color="#F59E0B" /></> : '—', label: t('stats.reviews', { count: seller.reviewsCount, n: String(seller.reviewsCount) }) },
    { value: seller.salesCount, label: t('stats.sales', { count: seller.salesCount }) },
    ...(responseTime ? [{ value: responseTime, label: t('stats.response') }] : []),
    { value: seller.followersCount, label: t('stats.followers', { count: seller.followersCount }) },
  ]

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-4 md:px-8 lg:px-12">
      <nav className="mb-3 hidden items-center md:flex gap-1 text-label-md text-on-surface-variant">
        <button onClick={() => onNavigate('home')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Home size={14} /> {t('home')}</button>
        <ChevronRight size={14} className="text-outline-variant" />
        <span>{seller.badge === 'CERTIFIED' ? t('crumb.certified') : seller.badge ? t('crumb.verified') : t('crumb.sellers')}</span>
        <ChevronRight size={14} className="text-outline-variant" />
        <span className="font-semibold text-on-surface">{seller.fullName}</span>
      </nav>

      {/* Header card */}
      <section className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest">
        <div className="relative h-36 bg-surface-container md:h-56">
          <img src={seller.coverUrl || '/stitch/hero-0.webp'} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <button onClick={() => void share()} className="absolute right-3 top-3 flex h-9 cursor-pointer items-center gap-1 rounded-full border-none bg-surface-lowest/90 px-3 text-label-md text-on-surface" aria-label={tc('share')}>
            <Share2 size={17} /> {copied && t('linkCopied')}
          </button>
        </div>
        <div className="px-4 pb-5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            {/* Only the avatar overlaps the cover: the name and details stay
                below it (the positioned cover would paint over them). Mobile:
                name below the avatar; from md, side by side. */}
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
              <div className="relative -mt-10 w-fit shrink-0 md:-mt-12">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-solid border-surface-lowest bg-surface-container-high text-headline-lg text-primary md:h-28 md:w-28">
                  {seller.avatarUrl ? <img src={seller.avatarUrl} alt={seller.fullName} className="h-full w-full object-cover" /> : seller.fullName.charAt(0).toUpperCase()}
                </div>
                {seller.badge && <span className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-solid border-surface-lowest text-white ${seller.badge === 'CERTIFIED' ? 'bg-tertiary' : 'bg-verified'}`}><BadgeCheck size={15} /></span>}
              </div>
              <div className="min-w-0 md:pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="m-0 text-headline-md text-on-surface md:text-headline-lg">{seller.fullName}</h1>
                  <SellerBadge tier={seller.badge} variant="pill" size={15} />
                </div>
                {seller.handle && <button type="button" onClick={() => void share()} title={t('copyLink')} className="mt-0.5 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary"><Icon name="link" size={15} /> {window.location.host}/@{seller.handle}</button>}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
                  {seller.city && <span className="flex items-center gap-1"><MapPin size={14} /> {seller.city}</span>}
                  <span className="flex items-center gap-1"><Calendar size={14} /> {t('memberSince', { date: memberSince(seller.createdAt) })}</span>
                  <Claim><span className="flex items-center gap-1 font-semibold text-tertiary"><Percent size={14} /> {t('noCommission', { amount: fmtCfa(0) })}</span></Claim>
                </div>
              </div>
            </div>
            {currentUserId !== seller.id && (
              <div className="flex flex-wrap gap-2 md:pt-3">
                <button onClick={contact} className="flex cursor-pointer items-center gap-2 rounded-lg border-none bg-primary px-4 py-2.5 text-label-lg text-white hover:bg-primary-dark"><MessageSquare size={18} /> {t('contactDirect')}</button>
                <button onClick={contact} className="flex cursor-pointer items-center gap-2 rounded-lg border-none bg-surface-container-high px-4 py-2.5 text-label-lg text-on-surface hover:bg-surface-container-highest"><Calendar size={18} /> {t('proposeMeetup')}</button>
                <button onClick={toggleFollow} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border-none px-3 py-2.5 text-label-md ${seller.isFollowedByMe ? 'bg-tertiary-soft text-tertiary' : 'bg-primary-fixed text-primary'}`}>
                  {seller.isFollowedByMe ? <><UserCheck size={17} /> {t('followed')}</> : <><UserPlus size={17} /> {t('follow')}</>}
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="m-0 text-body-md text-on-surface">{seller.bio || t('bioFallback', { name: seller.fullName })}</p>
              {([['website', 'language', t('website')], ['facebook', 'thumb_up', 'Facebook'], ['instagram', 'photo_camera', 'Instagram'], ['tiktok', 'music_note', 'TikTok']] as const).some(([k]) => seller[k]) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {([['website', 'language', t('website')], ['facebook', 'thumb_up', 'Facebook'], ['instagram', 'photo_camera', 'Instagram'], ['tiktok', 'music_note', 'TikTok']] as const).filter(([k]) => seller[k]).map(([k, icon, label]) => (
                    <a key={k} href={seller[k]!} target="_blank" rel="noopener noreferrer nofollow" className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-container-low px-3 text-label-md text-on-surface no-underline hover:bg-surface-container"><Icon name={icon} size={16} className="text-primary" /> {label}</a>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="flex items-center gap-1 rounded-lg bg-tertiary-soft px-2 py-1 text-label-sm text-tertiary"><Handshake size={13} /> {meetupSpots[0] || seller.city ? t('handoverPreferredAt', { place: meetupSpots[0] || seller.city }) : t('handoverPreferred')}</span>
                {paymentMethods.length > 0 && (
                  <span className="flex items-center gap-1 rounded-lg bg-primary-fixed px-2 py-1 text-label-sm text-primary"><Wallet size={13} /> {t('payOnSite', { methods: paymentMethods.map(p => PAYMENT_LABELS[p] ?? p).join(', ') })}</span>
                )}
              </div>
            </div>
            <div className={`grid rounded-xl bg-surface-container-low p-3 text-center ${stats.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {stats.map(s => (
                <div key={s.label} className="flex flex-col items-center justify-center px-1">
                  <span className="flex items-center gap-0.5 text-headline-sm font-extrabold text-on-surface">{s.value}</span>
                  <span className="text-[11px] leading-tight text-on-surface-variant">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust tiles */}
      <section className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {[
          { icon: <ShieldCheck size={20} />, box: 'bg-tertiary-soft text-tertiary', title: seller.badge ? BADGE_LABEL[seller.badge] : t('trust.public'), text: seller.badge ? t('trust.identity') : t('trust.publicText') },
          { icon: <MessageSquare size={20} />, box: 'bg-surface-container text-on-surface', title: t('trust.chat'), text: responseTime ? t('trust.repliesIn', { time: responseTime }) : t('trust.messaging') },
          { icon: <Handshake size={20} />, box: 'bg-surface-container text-on-surface', title: t('trust.handover'), text: t('trust.handoverText') },
          ...(noCommission ? [{ icon: <Percent size={20} />, box: 'bg-primary-fixed text-primary', title: t('noCommission', { amount: fmtCfa(0) }), text: t('trust.commissionText') }] : []),
        ].map(tile => (
          <div key={tile.title} className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-lowest p-2.5 sm:p-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${tile.box}`}>{tile.icon}</span>
            <div className="min-w-0"><div className="text-label-md text-on-surface">{tile.title}</div><div className="truncate text-body-sm text-on-surface-variant sm:whitespace-normal">{tile.text}</div></div>
          </div>
        ))}
      </section>

      {/* Tabs — the fade hints that the row scrolls on phones */}
      <div className="relative mt-6">
      <div className="flex gap-2 overflow-x-auto pb-1 pr-8 [scrollbar-width:none] md:pr-0">
        {([['listings', t('tab.listings'), all.length], ...(sellerReels.items.length ? [['reels', 'Reels', sellerReels.items.length + (sellerReels.nextCursor ? '+' : '')] as const] : []), ['reviews', t('tab.reviews'), seller.reviewsCount], ['terms', t('tab.terms'), null]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full border-none px-4 py-2 text-label-md ${tab === key ? 'bg-inverse-surface text-white' : 'bg-surface-lowest text-on-surface hover:bg-surface-container-low'}`}>
            {label}{count != null && <span className={`rounded-full px-1.5 text-label-sm ${tab === key ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}`}>{count}</span>}
          </button>
        ))}
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface to-transparent md:hidden" />
      </div>

      {tab === 'reels' && (
        <section className="mt-4">
          <SellerReelsGrid sellerId={sellerId} onOpenListing={onSelectListing} onOpenSeller={() => undefined} onContactSeller={(id, listingId) => onContactSeller(id, listingId)} onToggleFavorite={id => onToggleFavorite?.(id)} favorites={favorites} currentUserId={currentUserId} isLoggedIn={isLoggedIn} onRequireAuth={() => onNavigate('auth')} />
        </section>
      )}

      {tab === 'listings' && (
        <section className="mt-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg bg-surface-lowest px-3 py-2 md:max-w-sm">
              <Search size={18} className="text-outline" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchPlaceholder', { n: String(all.length) })} className="w-full border-none bg-transparent text-body-sm text-on-surface outline-none" />
            </label>
            {[{ slug: null, name: t('all'), count: all.length }, ...categories].map(c => (
              <button key={c.slug ?? 'all'} onClick={() => setCat(c.slug)} className={`cursor-pointer rounded-lg border-none px-3 py-1.5 text-label-md ${cat === c.slug ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
                {c.name} ({c.count})
              </button>
            ))}
            <Select value={sort} onChange={e => setSort(e.target.value as ListingSort)} className="ml-auto cursor-pointer rounded-lg border-none bg-surface-container-low px-3 py-2 text-label-md text-on-surface outline-none">
              <option value="RECENT">{t('sort.RECENT')}</option>
              <option value="PRICE_ASC">{t('sort.PRICE_ASC')}</option>
              <option value="PRICE_DESC">{t('sort.PRICE_DESC')}</option>
              <option value="POPULAR">{t('sort.POPULAR')}</option>
            </Select>
          </div>
          <ImpressionScope placement="SELLER" promoted={promotedOf(listingsData?.listings)}>
          <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {filtered.slice(0, shown).map(l => (
              <ListingCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite?.(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUserId} onContact={requireAuth(() => onContactSeller(seller.id, l.id), 'contact')} />
            ))}
          </div>
          </ImpressionScope>
          {filtered.length === 0 && <EmptyState icon="empty-search" fallback="search" tone="neutral" title={t('noMatch')} />}
          {/* The seller's listings are all here: the next ones show as the visitor scrolls. */}
          <InfiniteLoader key={`${cat}|${q}|${sort}`} list={{ hasMore: filtered.length > shown, loading: false, error: false, loadMore: () => setShown(s => s + PAGE) }} pageSize={PAGE} label={t('showMore')} />
        </section>
      )}

      {tab === 'reviews' && (
        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-5 text-center">
              <div className="text-display font-extrabold text-on-surface">{seller.reviewsCount ? seller.averageRating.toFixed(1) : '—'}</div>
              <div className="flex justify-center"><Stars rating={seller.averageRating} size={18} /></div>
              <div className="mt-1 text-body-sm text-on-surface-variant">{t('reviews', { count: seller.reviewsCount, n: String(seller.reviewsCount) })}</div>
            </div>
            {seller.canReview && !reviewSubmitted && (
              <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-4">
                <div className="mb-2 text-label-lg text-on-surface">{t('review.leave')}</div>
                <div className="mb-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setReviewRating(s)} className="cursor-pointer border-none bg-transparent p-0" aria-label={t('review.stars', { count: s })}>
                      <Star size={24} fill={s <= reviewRating ? '#F59E0B' : 'none'} color={s <= reviewRating ? '#F59E0B' : 'var(--border)'} />
                    </button>
                  ))}
                </div>
                <textarea className="input mb-2" rows={3} placeholder={t('review.placeholder')} value={reviewComment} onChange={e => setReviewComment(e.target.value)} />
                {reviewError && <p className="m-0 mb-2 text-body-sm text-primary">{reviewError}</p>}
                <button disabled={submittingReview} onClick={() => void submitReview()} className="w-full cursor-pointer rounded-lg border-none bg-primary py-2.5 text-label-md text-white">{submittingReview ? t('sending') : t('review.publish')}</button>
              </div>
            )}
            {reviewSubmitted && <p className="m-0 flex items-center gap-2 rounded-xl bg-tertiary-soft p-3 text-body-sm text-tertiary"><CheckCircle2 size={16} /> {t('review.thanks')}</p>}
          </div>
          <div className="flex flex-col gap-3">
            {reviews.length === 0 && <EmptyState icon="empty-star" fallback="star" title={t('noReviews')} />}
            {reviews.map(r => (
              <div key={r.id} className="rounded-2xl border border-outline-variant bg-surface-lowest p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-surface-container-high font-bold text-on-surface-variant">
                    {r.author.avatarUrl ? <img loading="lazy" decoding="async" src={r.author.avatarUrl} alt="" className="h-full w-full object-cover" /> : r.author.fullName.charAt(0)}
                  </span>
                  <div className="flex-1"><div className="text-label-md text-on-surface">{r.author.fullName}</div><Stars rating={r.rating} size={13} /></div>
                  <span className="text-body-sm text-outline">{formatRelativeDate(r.createdAt)}</span>
                </div>
                {r.comment && <p className="m-0 mt-2 text-body-md italic text-on-surface">{t('quote', { text: r.comment })}</p>}
                {r.reply && (
                  <div className="mt-2 rounded-xl border-l-4 border-solid border-l-outline-variant bg-surface-container-low p-3 text-body-sm">
                    <div className="font-semibold text-on-surface">{t('replyFrom', { name: seller.fullName })}</div>
                    <p className="m-0 mt-0.5 italic text-on-surface-variant">{t('quote', { text: r.reply })}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'terms' && (
        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-5">
            <div className="mb-3 flex items-center gap-2 text-headline-sm text-on-surface"><MapPin size={20} className="text-primary" /> {t('terms.spots')}</div>
            {meetupSpots.length ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">{meetupSpots.map(s => <li key={s} className="flex items-center gap-2 text-body-md text-on-surface"><CheckCircle2 size={16} className="text-tertiary" /> {s}</li>)}</ul>
            ) : <p className="m-0 text-body-md text-on-surface-variant">{seller.city ? t('terms.toAgreeIn', { city: seller.city }) : t('terms.toAgree')}</p>}
          </div>
          <div className="rounded-2xl border border-outline-variant bg-surface-lowest p-5">
            <div className="mb-3 flex items-center gap-2 text-headline-sm text-on-surface"><Wallet size={20} className="text-primary" /> {t('terms.payment')}</div>
            {paymentMethods.length ? (
              <div className="flex flex-wrap gap-2">{paymentMethods.map(p => <span key={p} className="rounded-lg bg-surface-container px-3 py-1.5 text-label-md text-on-surface">{PAYMENT_LABELS[p] ?? p}</span>)}</div>
            ) : <p className="m-0 text-body-md text-on-surface-variant">{t('terms.toAgree')}</p>}
          </div>
        </section>
      )}

      {/* Safety */}
      <section className="mt-8 flex flex-col gap-4 rounded-2xl bg-surface-container-low p-5 md:flex-row md:items-center md:p-6">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tertiary text-white"><ShieldCheck size={28} /></span>
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded bg-tertiary px-2 py-0.5 text-label-sm uppercase text-white">{t('safety.kicker')}</span>
            <span className="text-label-sm text-tertiary">{noCommission ? t('safety.directFree') : t('safety.direct')}</span>
          </div>
          <h3 className="m-0 text-headline-sm text-on-surface">{t('safety.title')}</h3>
          <ol className="m-0 mt-1 list-decimal pl-5 text-body-sm text-on-surface-variant">
            <li>{t('safety.rule1')}</li>
            <li>{t('safety.rule2')}</li>
            <li>{t.rich('safety.rule3', { claim: c => <Claim>{c}</Claim>, amount: fmtCfa(0) })}</li>
          </ol>
        </div>
        {reportDone ? (
          <span className="flex shrink-0 items-center gap-1 self-start text-label-md text-tertiary md:self-center"><CheckCircle2 size={15} /> {t('report.sent')}</span>
        ) : currentUserId !== seller.id && (
          <button onClick={requireAuth(() => setReportOpen(true), 'report')} className="flex shrink-0 cursor-pointer items-center gap-1 self-start rounded-full border border-outline-variant bg-surface-lowest px-4 py-2 text-label-md text-on-surface md:self-center"><Flag size={15} className="text-primary" /> {t('report.button')}</button>
        )}
      </section>

      <ConfirmSheet open={reportOpen} title={t('report.title', { name: seller.fullName })} confirmLabel={reporting ? t('sending') : t('report.send')} onConfirm={sendReport} onClose={() => setReportOpen(false)} loading={reporting}>
        <p className="m-0 mb-3 text-body-sm text-on-surface-variant">{t('report.intro')}</p>
        <label className="text-label-md text-on-surface">{t('report.reason')}
          <Select value={reportReason} onChange={e => setReportReason(e.target.value)} className="input mt-1.5 cursor-pointer">
            {reportReasons.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
        </label>
        <label className="mt-3 block text-label-md text-on-surface">{t('report.details')}
          <textarea className="input mt-1.5" rows={3} value={reportMessage} onChange={e => setReportMessage(e.target.value)} placeholder={t('report.placeholder')} />
        </label>
      </ConfirmSheet>
    </div>
  )
}
