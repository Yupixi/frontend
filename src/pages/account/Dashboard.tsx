import ListingThumb from '../../components/ListingThumb'
import AnimatedIcon from '../../components/AnimatedIcon'
import { useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from './AccountLayout'
import AccountVerifyPanel from '../../components/AccountVerifyPanel'
import { formatNumber } from '../../lib/format'
import { MY_LISTINGS_QUERY, type MyListingRow } from '../../graphql/listings'
import { MY_CONVERSATIONS_QUERY, type RemoteConversation } from '../../graphql/messaging'
import { MY_REPUTATION_QUERY, MY_SALES_ORDERS_QUERY, MY_WALLET_QUERY, type SalesOrder, type WalletSummary } from '../../graphql/sellerHub'
import { MY_BUYER_DISPUTES_QUERY, MY_DISPUTE_STATS_QUERY, MY_PURCHASE_ORDERS_QUERY, SELLER_STATS_QUERY, disputeIsOpen, type Dispute, type DisputeStats, type PurchaseOrder, type SellerStats } from '../../graphql/sellerTools'
import type { AuthUser } from '../../graphql/auth'
import Credits from '../../components/Credits'
import PaymentLogo, { paymentLabel } from '../../components/PaymentLogo'
import { useMethods, usePriceVars } from '../../lib/countries'
import { useNoCommissionClaims, useSupportPhone } from '../../lib/site'
import { useT, fmtDate, fmtTime, fmtCfa, getLocale } from '../../i18n'
import dashboard from '../../i18n/ns/dashboard'

type Props = {
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
  onOpenPurchase: (orderId: string) => void
  onOpenConversation: (userId: string, listingId?: string) => void
  onOpenHandover: (orderId: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

type Upcoming = { id: string; role: 'BUYER' | 'SELLER'; listing: { id: string; title: string; price: number | null; currency: string; coverImageUrl: string | null; condition?: string | null }; otherId: string; other: string; place: string; at: string; amount: number | null; reference: string }

// `short` is the mobile label (Stitch mobile tiles use one word); `className`
// lets a tile be desktop-only.
function Kpi({ label, short, icon, animated, value, sub, onClick, accent, className = 'flex' }: { label: string; short?: string; icon: string; animated?: string; value: React.ReactNode; sub: React.ReactNode; onClick: () => void; accent?: string; className?: string }) {
  return (
    <button onClick={onClick} className={`${className} min-w-0 cursor-pointer flex-col rounded-2xl border-none bg-surface-lowest p-4 text-left shadow-sm hover:shadow-card-hover`}>
      <div className="flex items-start justify-between gap-2 max-md:flex-row-reverse"><span className="text-label-sm uppercase text-on-surface-variant max-md:normal-case">{short ? <><span className="md:hidden">{short}</span><span className="max-md:hidden">{label}</span></> : label}</span><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/60 text-primary">{animated ? <AnimatedIcon name={animated} fallback={icon} size={18} playOnView={400} playOnInteract /> : <Icon name={icon} size={18} />}</span></div>
      <div className={`mt-2 text-headline-sm font-extrabold ${accent ?? 'text-on-surface'}`}>{value}</div>
      <div className="truncate text-body-sm text-on-surface-variant">{sub}</div>
    </button>
  )
}

// "Tableau de bord" (Stitch desktop + mobile): buyer and seller overview.
export default function Dashboard({ onNavigate, onSelectListing, onOpenPurchase, onOpenConversation, onOpenHandover, currentUser, onLogout }: Props) {
  const t = useT(dashboard)
  const noCommission = useNoCommissionClaims()
  // Payment methods of the member's country.
  const methods = useMethods(currentUser?.countryCode ?? null)
  const { data: salesData } = useQuery<{ mySalesOrders: SalesOrder[] }>(MY_SALES_ORDERS_QUERY)
  const { data: purchasesData } = useQuery<{ myPurchaseOrders: PurchaseOrder[] }>(MY_PURCHASE_ORDERS_QUERY)
  const { data: walletData } = useQuery<{ myWallet: WalletSummary }>(MY_WALLET_QUERY, { variables: usePriceVars() })
  const { data: repData } = useQuery<{ myReputation: { averageRating: number; reviewsCount: number; salesCount: number; isVerified: boolean } }>(MY_REPUTATION_QUERY)
  const { data: convData } = useQuery<{ myConversations: RemoteConversation[] }>(MY_CONVERSATIONS_QUERY)
  const { data: disputeStats } = useQuery<{ myDisputeStats: DisputeStats }>(MY_DISPUTE_STATS_QUERY)
  const { data: buyerDisputes } = useQuery<{ myBuyerDisputes: Dispute[] }>(MY_BUYER_DISPUTES_QUERY)
  const { data: listingsData } = useQuery<{ myListings: { items: MyListingRow[] } }>(MY_LISTINGS_QUERY, { variables: { page: 1, pageSize: 50 } })
  const { data: statsData } = useQuery<{ sellerStats: SellerStats }>(SELLER_STATS_QUERY, { variables: { days: 7 } })
  const support = useSupportPhone()

  const sales = salesData?.mySalesOrders ?? []
  const purchases = purchasesData?.myPurchaseOrders ?? []
  const activeSales = sales.filter(o => o.stage === 'PENDING' || o.stage === 'IN_PROGRESS')
  const activePurchases = purchases.filter(o => o.stage === 'PENDING' || o.stage === 'IN_PROGRESS')
  // A purchase under an open dispute has its code frozen: never push it as
  // the next hand-over or show its code.
  const handoverPurchases = activePurchases.filter(o => !(o.disputeStatus && disputeIsOpen(o.disputeStatus)))
  const unreadConvs = (convData?.myConversations ?? []).filter(c => c.unreadCount > 0).length
  const buyerOpenDisputes = (buyerDisputes?.myBuyerDisputes ?? []).filter(d => disputeIsOpen(d.status)).length
  const sellerOpenDisputes = disputeStats?.myDisputeStats.active ?? 0
  const activeDisputes = sellerOpenDisputes + buyerOpenDisputes
  const rep = repData?.myReputation
  const wallet = walletData?.myWallet
  const stats = statsData?.sellerStats
  const firstName = currentUser?.fullName.split(' ')[0] ?? ''

  const upcoming: Upcoming | undefined = [
    // Only deals still to hand over — a finished or disputed sale must not be
    // pushed as "today's meet-up" with a code that no longer applies.
    ...handoverPurchases.map(o => ({ id: o.id, role: 'BUYER' as const, listing: o.listing, otherId: o.seller.id, other: o.seller.fullName, m: o.meetup, amount: o.agreedPrice, reference: o.reference })),
    ...activeSales.map(o => ({ id: o.id, role: 'SELLER' as const, listing: o.listing, otherId: o.buyer.id, other: o.buyer.fullName, m: o.meetup, amount: o.agreedPrice, reference: o.reference })),
  ].filter(o => o.m?.status === 'CONFIRMED' && o.m && new Date(o.m.scheduledAt).getTime() > Date.now() - 3 * 3600_000)
    .sort((a, b) => new Date(a.m!.scheduledAt).getTime() - new Date(b.m!.scheduledAt).getTime())
    .map(o => ({ id: o.id, role: o.role, listing: o.listing, otherId: o.otherId, other: o.other, place: o.m!.place, at: o.m!.scheduledAt, amount: o.amount, reference: o.reference }))[0]
  const upcomingIsToday = upcoming && new Date(upcoming.at).toDateString() === new Date().toDateString()
  // « 14h05 » in French only.
  const time = (iso: string) => (getLocale() === 'fr' ? fmtTime(iso).replace(':', 'h') : fmtTime(iso))

  const live = (listingsData?.myListings.items ?? []).filter(l => l.status === 'APPROVED')
  const perf = new Map((stats?.listings ?? []).map(p => [p.listing.id, p]))
  const toBoost = [...live].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 3)
  const series = stats?.series ?? []
  const maxDay = Math.max(1, ...series.map(s => s.views))
  const codePurchase = handoverPurchases.find(o => o.meetup?.status === 'CONFIRMED' && o.meetup.handoverCode)

  return (
    <AccountLayout active="buyer-dashboard" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        {/* Greeting */}
        <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5">
          <span className="relative">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary text-headline-sm text-white">{currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" className="h-full w-full object-cover" /> : firstName.charAt(0)}</span>
            {currentUser?.badge && <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-solid border-surface-lowest text-white ${currentUser.badge === 'CERTIFIED' ? 'bg-tertiary' : 'bg-verified'}`}><Icon name="check" size={12} /></span>}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="m-0 text-headline-md text-on-surface">{t('hello', { name: firstName })}</h1>
              <span className="hidden items-center gap-1 rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary md:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {t('activeBuyerSeller')}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
              {currentUser?.city && <span className="flex items-center gap-1"><Icon name="location_on" size={14} className="text-primary" /> {currentUser.city}</span>}
              {!!rep?.reviewsCount && <span className="flex items-center gap-1"><Icon name="star" size={14} className="text-primary" /> {t('rating', { avg: rep.averageRating.toFixed(1), count: rep.reviewsCount })}</span>}
              {currentUser?.isVerified && <span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-2 py-0.5 text-label-sm text-tertiary"><Icon name="verified_user" size={14} /> {t('identityVerified')}</span>}
            </div>
          </div>
          <div className="flex basis-full items-center gap-3 rounded-xl bg-surface-container-low px-4 py-2.5 sm:basis-auto">
            <Icon name="payments" size={22} className="text-tertiary" />
            <div><div className="text-label-sm uppercase text-on-surface-variant">{t('salesCollected')}</div><div className="text-headline-sm font-extrabold text-tertiary"><Price amount={wallet?.totalSales ?? 0} /></div></div>
          </div>
          <button onClick={() => onNavigate('seller-post')} className="hidden cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-4 py-3 text-label-md text-white md:flex"><Icon name="add_circle" size={19} /> {t('sellItem')}</button>
        </section>

        {/* SMS first: an account confirmed by neither its phone nor its
            e-mail can't publish, contact or pay — confirm it right here. */}
        {currentUser && !currentUser.isGuest && !currentUser.phoneVerifiedAt && !currentUser.emailVerifiedAt && (
          <div className="mt-4"><AccountVerifyPanel onAddPhone={() => onNavigate('buyer-settings')} /></div>
        )}

        {/* Mobile: today's meet-up first */}
        {upcoming && (
          <section className="mt-4 rounded-2xl bg-primary p-4 text-white md:hidden">
            <div className="flex items-center justify-between"><span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-label-sm uppercase"><Icon name="alarm" size={14} /> {upcomingIsToday ? t('meetupToday') : t('nextMeetup')}</span><span className="text-label-lg">{time(upcoming.at)}</span></div>
            <div className="mt-3 flex gap-3">
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/20"><ListingThumb listing={upcoming.listing} src={upcoming.listing.coverImageUrl} fallbackClassName="flex h-full w-full items-center justify-center text-white/80" /></span>
              <div className="min-w-0"><div className="truncate text-label-lg">{upcoming.listing.title}</div><div className="flex items-center gap-1 text-body-sm text-white/85"><Icon name="location_on" size={14} /> {upcoming.place}</div><div className="text-label-md"><Price amount={upcoming.amount} currency={upcoming.listing.currency} /></div></div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => (upcoming.role === 'BUYER' ? onOpenPurchase(upcoming.id) : onOpenHandover(upcoming.id))} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-white py-2.5 text-label-md text-primary"><Icon name="handshake" size={18} /> {upcoming.role === 'BUYER' ? t('seeHandoverCode') : t('validateHandover')}</button>
              <button onClick={() => onOpenConversation(upcoming.otherId, upcoming.listing.id)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-none bg-white/15 text-white" aria-label={t('chatAria')}><Icon name="chat" size={19} /></button>
            </div>
          </section>
        )}

        {/* KPIs */}
        <div className="mb-2 mt-5 flex items-center justify-between md:hidden">
          <h2 className="m-0 text-headline-sm text-on-surface">{t('liveActivity')}</h2>
          <span className="flex items-center gap-1 text-label-sm text-tertiary"><span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> {t('synced')}</span>
        </div>
        <section className="grid grid-cols-2 gap-3 md:mt-4 md:grid-cols-3 2xl:grid-cols-6">
          <Kpi label={t('kpi.sales')} short={t('kpi.salesShort')} icon="storefront" value={t('kpi.salesValue', { count: activeSales.length })} sub={t.rich('kpi.salesPending', { price: <Price amount={activeSales.reduce((n, o) => n + (o.agreedPrice ?? 0), 0)} /> })} onClick={() => onNavigate('seller-orders')} />
          <Kpi label={t('kpi.meetup')} className="hidden md:flex" icon="event_available" accent="text-primary" value={upcoming && upcomingIsToday ? time(upcoming.at) : '—'} sub={upcoming && upcomingIsToday ? upcoming.place : t('kpi.noMeetup')} onClick={() => (upcoming ? (upcoming.role === 'BUYER' ? onOpenPurchase(upcoming.id) : onOpenHandover(upcoming.id)) : onNavigate('seller-orders'))} />
          <Kpi label={t('kpi.purchases')} short={t('kpi.purchasesShort')} icon="shopping_bag" animated="cart" value={t('kpi.purchasesValue', { count: activePurchases.length })} sub={<span className="text-tertiary">{codePurchase ? t('kpi.codeReady') : t('kpi.seePurchases')}</span>} onClick={() => onNavigate('buyer-purchases')} />
          <Kpi label={t('kpi.wallet')} short={t('kpi.walletShort')} icon="toll" value={<Credits n={wallet?.credits ?? 0} />} sub={<span className="text-primary">{t('kpi.buyCredits')}</span>} onClick={() => onNavigate('seller-wallet')} />
          <Kpi label={t('kpi.chats')} short={t('kpi.chatsShort')} icon="forum" value={<>{unreadConvs} {unreadConvs > 0 && <span className="inline-block h-2 w-2 rounded-full bg-primary align-middle" />}</>} sub={unreadConvs ? t('kpi.chatsWaiting', { count: unreadConvs }) : t('kpi.allRead')} onClick={() => onNavigate('buyer-messages')} />
          <Kpi label={t('kpi.guarantee')} className="hidden md:flex" icon="verified_user" accent={activeDisputes ? 'text-primary' : 'text-tertiary'} value={t('kpi.disputes', { count: activeDisputes })} sub={activeDisputes ? t('kpi.disputeOpen') : t('kpi.noIncident')} onClick={() => onNavigate(sellerOpenDisputes && !buyerOpenDisputes ? 'seller-disputes' : 'buyer-disputes')} />
        </section>

        {/* Mobile: round shortcuts (Stitch mobile dashboard) */}
        <section className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-surface-container-low p-3 md:hidden">
          {[
            { icon: 'account_balance_wallet', label: t('shortcut.wallet'), go: () => onNavigate('seller-wallet') },
            { icon: 'history', label: t('shortcut.history'), go: () => onNavigate('buyer-history') },
            { icon: 'favorite', label: t('shortcut.favorites'), go: () => onNavigate('buyer-favorites') },
            ...(support ? [{ icon: 'support_agent', label: 'WhatsApp', go: () => window.open(`https://wa.me/${support.replace(/[^\d]/g, '')}`, '_blank'), sos: true }] : []),
          ].map(s => (
            <button key={s.icon} onClick={s.go} className="flex min-w-0 cursor-pointer flex-col items-center gap-1.5 border-none bg-transparent p-0 text-center">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full shadow-sm ${'sos' in s ? 'bg-tertiary text-white' : 'bg-surface-lowest text-on-surface'}`}><Icon name={s.icon} size={20} /></span>
              <span className="whitespace-nowrap text-label-sm leading-tight text-on-surface">{s.label}</span>
            </button>
          ))}
        </section>

        {/* Desktop: today's meet-up */}
        <section className="mt-6 hidden md:block">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="m-0 flex items-center gap-2 text-headline-md text-on-surface"><span className="h-2 w-2 rounded-full bg-primary" /> {t('meetup.title')}</h2>
            <span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary"><Icon name="verified_user" size={14} /> {t('meetup.publicPlaces')}</span>
          </div>
          {upcoming ? (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
              <div className="relative h-60 overflow-hidden rounded-2xl bg-surface-container">
                <ListingThumb listing={upcoming.listing} src={upcoming.listing.coverImageUrl} iconSize={40} />
                {upcoming.listing.condition && upcoming.listing.condition !== 'N/A' && <span className="absolute left-3 top-3 rounded bg-surface-lowest/90 px-2 py-0.5 text-label-sm uppercase text-tertiary">{upcoming.listing.condition}</span>}
                <span className="absolute bottom-3 right-3 rounded bg-inverse-surface/80 px-2 py-0.5 text-label-sm text-white">{t('meetup.ref', { ref: upcoming.reference })}</span>
              </div>
              <div>
                <div className="text-label-sm uppercase text-on-surface-variant">{upcoming.role === 'BUYER' ? t('meetup.purchaseConfirmed') : t('meetup.saleConfirmed')}</div>
                <h3 className="m-0 mt-1 text-headline-sm text-on-surface">{upcoming.listing.title}</h3>
                <div className="text-body-sm text-on-surface-variant">{upcoming.role === 'BUYER' ? t('meetup.seller', { name: upcoming.other }) : t('meetup.buyer', { name: upcoming.other })}</div>
                <div className="mt-2 text-headline-md font-extrabold text-primary"><Price amount={upcoming.amount} currency={upcoming.listing.currency} /></div>
                <div className="text-label-sm text-tertiary">{noCommission ? t('meetup.noFees', { fee: fmtCfa(0) }) : t('meetup.paidAtHandover')}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-surface-container-low p-3">
                  <div className="flex gap-2"><Icon name="storefront" size={20} className="text-primary" /><div><div className="text-label-sm uppercase text-on-surface-variant">{t('meetup.place')}</div><div className="text-label-md text-on-surface">{upcoming.place}</div></div></div>
                  <div className="flex gap-2"><Icon name="schedule" size={20} className="text-tertiary" /><div><div className="text-label-sm uppercase text-on-surface-variant">{t('meetup.slot')}</div><div className="text-label-md text-on-surface">{fmtDate(upcoming.at, { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div></div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => (upcoming.role === 'BUYER' ? onOpenPurchase(upcoming.id) : onOpenHandover(upcoming.id))} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white"><Icon name="pin" size={18} /> {upcoming.role === 'BUYER' ? t('meetup.showMyCode') : t('meetup.validateWithCode')}</button>
                  <button onClick={() => onOpenConversation(upcoming.otherId, upcoming.listing.id)} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-surface-container-high px-4 py-2.5 text-label-md text-on-surface"><Icon name="chat" size={18} /> {t('meetup.chatWith', { name: upcoming.other.split(' ')[0] })}</button>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(upcoming.place)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2.5 text-label-md text-on-surface no-underline"><Icon name="near_me" size={18} /> {t('meetup.directions')}</a>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-5"><Icon name="event_busy" size={26} className="text-on-surface-variant" /><div><div className="text-label-lg text-on-surface">{t('meetup.none')}</div><div className="text-body-sm text-on-surface-variant">{t('meetup.noneHint')}</div></div></div>
          )}
        </section>

        {/* Mobile: purchases with code */}
        {codePurchase && (
          <section className="mt-5 md:hidden">
            <div className="mb-2 flex items-center justify-between"><h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="verified_user" size={20} className="text-tertiary" /> {t('secure.title')}</h2><span className="text-label-sm text-on-surface-variant">{t('secure.active', { count: activePurchases.length })}</span></div>
            <div className="rounded-2xl bg-surface-lowest p-3 shadow-sm">
              <div className="flex gap-3">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-container"><ListingThumb listing={codePurchase.listing} src={codePurchase.listing.coverImageUrl} icon="shopping_bag" /></span>
                <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><span className="rounded bg-tertiary-soft px-1.5 text-label-sm text-tertiary">{t('secure.inPerson')}</span><span className="text-label-md text-on-surface"><Price amount={codePurchase.agreedPrice} /></span></div><div className="truncate text-label-lg text-on-surface">{codePurchase.listing.title}</div><div className="text-body-sm text-on-surface-variant">{t('meetup.seller', { name: codePurchase.seller.fullName })}</div></div>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface-container-low p-2.5">
                <Icon name="pin" size={20} className="text-primary" />
                <div className="min-w-0 flex-1"><div className="text-label-sm text-on-surface-variant">{t('secure.codeToGive')}</div><div className="text-label-lg tracking-[0.3em] text-primary">{codePurchase.meetup!.handoverCode}</div></div>
                <button onClick={() => onOpenPurchase(codePurchase.id)} className="cursor-pointer rounded-lg border-none bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface">{t('secure.details')}</button>
              </div>
            </div>
          </section>
        )}

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          {/* Listings */}
          <section className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div><h2 className="m-0 text-headline-sm text-on-surface md:text-headline-md">{t('listings.title')}</h2><p className="m-0 hidden text-body-sm text-on-surface-variant md:block">{t('listings.hint')}</p></div>
              <button onClick={() => onNavigate('seller-listings')} className="flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap border-none bg-transparent p-0 text-label-md text-primary">{t('listings.seeAll', { count: live.length })} <Icon name="chevron_right" size={17} /></button>
            </div>
            {toBoost.length === 0 && (
              <div className="rounded-2xl bg-surface-container-low p-6 text-center"><p className="m-0 text-label-lg text-on-surface">{t('listings.none')}</p><button onClick={() => onNavigate('seller-post')} className="mt-3 cursor-pointer rounded-xl border-none bg-primary px-4 py-2 text-label-md text-white">{t('listings.post')}</button></div>
            )}
            <div className="flex flex-col gap-3">
              {toBoost.map(l => {
                const p = perf.get(l.id)
                const boosted = !!l.boostExpiresAt && new Date(l.boostExpiresAt) > new Date()
                return (
                  <article key={l.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-lowest p-3 shadow-sm">
                    <button onClick={() => onSelectListing(l.id)} aria-label={t('listings.viewAria', { title: l.title })} className="h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border-none bg-surface-container p-0"><ListingThumb listing={l} src={l.coverImageUrl} /></button>
                    {/* min width: on narrow phones the Booster button wraps under instead of covering the price */}
                    <div className="min-w-[8.5rem] flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-label-sm text-on-surface-variant">{l.condition && l.condition !== 'N/A' && <span className="rounded bg-tertiary-soft px-1.5 text-tertiary">{l.condition}</span>}<span>{l.city}</span></div>
                      <button onClick={() => onSelectListing(l.id)} className="block max-w-full cursor-pointer truncate border-none bg-transparent p-0 text-left text-label-lg text-on-surface">{l.title}</button>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3"><span className="whitespace-nowrap text-headline-sm font-extrabold text-on-surface max-sm:text-label-lg max-sm:font-extrabold"><Price amount={l.price} currency={l.currency} /></span>
                        <span className="flex items-center gap-2 text-label-sm text-on-surface-variant"><span className="flex items-center gap-0.5"><Icon name="visibility" size={14} /> {formatNumber(l.viewsCount)}</span><span className="flex items-center gap-0.5"><Icon name="favorite" size={14} /> {l.favoritesCount}</span>{!!l.pendingOffersCount && <span className="flex items-center gap-0.5 text-primary"><Icon name="local_offer" size={14} /> {t('listings.offers', { count: l.pendingOffersCount })}</span>}</span>
                      </div>
                    </div>
                    {boosted
                      ? <span className="flex items-center gap-1 rounded-lg bg-tertiary-soft px-2.5 py-1.5 text-label-sm text-tertiary"><Icon name="bolt" size={14} /> {p ? t('listings.boostActiveViews', { views: String(p.boostedViews) }) : t('listings.boostActive')}</span>
                      : <button onClick={() => onNavigate('seller-premium')} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white"><Icon name="bolt" size={16} /> <span className="max-sm:hidden">{t('listings.boostListing')}</span><span className="sm:hidden">{t('listings.boost')}</span></button>}
                  </article>
                )
              })}
            </div>
            {stats && (
              <div className="mt-3 hidden flex-wrap items-center gap-4 rounded-2xl bg-surface-container-low p-4 md:flex">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-lowest text-primary"><Icon name="trending_up" size={22} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-label-sm uppercase text-on-surface-variant">{t('perf.title')}</div>
                  <div className="text-headline-sm text-on-surface">{t('perf.line', { views: formatNumber(stats.views), favorites: String(stats.funnel.favorites), contacts: String(stats.contacts) })}</div>
                </div>
                <div className="flex h-10 items-end gap-1">{series.map(s => <span key={s.day} className="w-2.5 rounded-t bg-primary/70" style={{ height: `${Math.max(4, (s.views / maxDay) * 40)}px` }} />)}</div>
              </div>
            )}
          </section>

          {/* Shortcuts + safety */}
          <aside className="flex flex-col gap-4">
            <section className="hidden rounded-2xl bg-surface-lowest p-4 shadow-sm md:block">
              <h2 className="m-0 text-headline-sm text-on-surface">{t('quick.title')}</h2>
              <div className="mt-3 flex flex-col gap-1">
                {[
                  { icon: 'add_photo_alternate', title: t('quick.post'), sub: t('quick.postSub'), go: () => onNavigate('seller-post') },
                  { icon: 'account_balance_wallet', title: t('quick.credits'), sub: t('quick.creditsSub'), go: () => onNavigate('seller-wallet') },
                  { icon: 'receipt_long', title: t('quick.receipts'), sub: t('quick.receiptsSub'), go: () => onNavigate('buyer-receipts') },
                  ...(support ? [{ icon: 'support_agent', title: t('quick.support'), sub: t('quick.supportSub', { phone: support }), go: () => window.open(`https://wa.me/${support.replace(/[^\d]/g, '')}`, '_blank') }] : []),
                ].map(s => (
                  <button key={s.icon} onClick={s.go} className="flex cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent p-2 text-left hover:bg-surface-container-low">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-primary"><Icon name={s.icon} size={20} /></span>
                    <span className="min-w-0 flex-1"><span className="block text-label-md text-on-surface">{s.title}</span><span className="block truncate text-body-sm text-on-surface-variant">{s.sub}</span></span>
                    <Icon name="arrow_forward" size={18} className="text-on-surface-variant" />
                  </button>
                ))}
              </div>
            </section>
            <section className="flex gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm md:hidden">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="verified_user" size={20} /></span>
              <div><div className="text-label-lg text-on-surface">{t('safety.protocol')}</div><p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">{t('safety.protocolText')}</p></div>
            </section>
            <section className="hidden rounded-2xl bg-tertiary-soft p-4 md:block">
              <div className="flex items-center gap-2 text-label-lg text-tertiary"><Icon name="verified_user" size={20} /> {t('safety.title')}</div>
              <p className="m-0 mt-1 text-body-sm text-on-surface">{t('safety.text')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{methods.map(c => <span key={c} className="flex items-center gap-1.5 rounded-lg bg-surface-lowest py-1 pl-1 pr-2 text-label-sm text-on-surface"><PaymentLogo method={c} size={20} /> {paymentLabel(c)}</span>)}</div>
            </section>
            {upcoming && upcomingIsToday && (
              <section className="hidden rounded-2xl bg-surface-lowest p-4 shadow-sm md:block">
                <div className="flex items-center justify-between text-label-sm uppercase text-on-surface-variant">{t('today.place')} <span className="flex items-center gap-1 text-tertiary"><span className="h-2 w-2 rounded-full bg-tertiary" /> {time(upcoming.at)}</span></div>
                <div className="mt-2 text-label-lg text-on-surface">{upcoming.place}</div>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(upcoming.place)}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-surface-container-low py-2.5 text-label-md text-on-surface no-underline"><Icon name="map" size={18} /> {t('today.openMaps')}</a>
              </section>
            )}
          </aside>
        </div>
      </div>
    </AccountLayout>
  )
}
