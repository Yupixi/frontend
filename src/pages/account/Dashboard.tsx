import { useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from './AccountLayout'
import { formatNumber } from '../../lib/format'
import { MY_LISTINGS_QUERY, type MyListingRow } from '../../graphql/listings'
import { MY_CONVERSATIONS_QUERY, type RemoteConversation } from '../../graphql/messaging'
import { MY_REPUTATION_QUERY, MY_SALES_ORDERS_QUERY, MY_WALLET_QUERY, type SalesOrder, type WalletSummary } from '../../graphql/sellerHub'
import { MY_BUYER_DISPUTES_QUERY, MY_DISPUTE_STATS_QUERY, MY_PURCHASE_ORDERS_QUERY, SELLER_STATS_QUERY, disputeIsOpen, type Dispute, type DisputeStats, type PurchaseOrder, type SellerStats } from '../../graphql/sellerTools'
import { FOOTER_SETTINGS_QUERY } from '../../graphql/content'
import type { AuthUser } from '../../graphql/auth'

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

function Kpi({ label, icon, value, sub, onClick, accent }: { label: string; icon: string; value: React.ReactNode; sub: React.ReactNode; onClick: () => void; accent?: string }) {
  return (
    <button onClick={onClick} className="flex cursor-pointer flex-col rounded-2xl border-none bg-surface-lowest p-4 text-left shadow-sm hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2"><span className="text-label-sm uppercase text-on-surface-variant">{label}</span><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/60 text-primary"><Icon name={icon} size={18} /></span></div>
      <div className={`mt-2 text-headline-sm font-extrabold ${accent ?? 'text-on-surface'}`}>{value}</div>
      <div className="truncate text-body-sm text-on-surface-variant">{sub}</div>
    </button>
  )
}

// "Tableau de bord" (Stitch desktop + mobile): buyer and seller overview.
export default function Dashboard({ onNavigate, onSelectListing, onOpenPurchase, onOpenConversation, onOpenHandover, currentUser, onLogout }: Props) {
  const { data: salesData } = useQuery<{ mySalesOrders: SalesOrder[] }>(MY_SALES_ORDERS_QUERY)
  const { data: purchasesData } = useQuery<{ myPurchaseOrders: PurchaseOrder[] }>(MY_PURCHASE_ORDERS_QUERY)
  const { data: walletData } = useQuery<{ myWallet: WalletSummary }>(MY_WALLET_QUERY)
  const { data: repData } = useQuery<{ myReputation: { averageRating: number; reviewsCount: number; salesCount: number; isVerified: boolean } }>(MY_REPUTATION_QUERY)
  const { data: convData } = useQuery<{ myConversations: RemoteConversation[] }>(MY_CONVERSATIONS_QUERY)
  const { data: disputeStats } = useQuery<{ myDisputeStats: DisputeStats }>(MY_DISPUTE_STATS_QUERY)
  const { data: buyerDisputes } = useQuery<{ myBuyerDisputes: Dispute[] }>(MY_BUYER_DISPUTES_QUERY)
  const { data: listingsData } = useQuery<{ myListings: { items: MyListingRow[] } }>(MY_LISTINGS_QUERY, { variables: { page: 1, pageSize: 50 } })
  const { data: statsData } = useQuery<{ sellerStats: SellerStats }>(SELLER_STATS_QUERY, { variables: { days: 7 } })
  const { data: footerData } = useQuery<{ footerSettings: { supportPhone: string | null } | null }>(FOOTER_SETTINGS_QUERY)

  const sales = salesData?.mySalesOrders ?? []
  const purchases = purchasesData?.myPurchaseOrders ?? []
  const activeSales = sales.filter(o => o.stage === 'PENDING' || o.stage === 'IN_PROGRESS')
  const activePurchases = purchases.filter(o => o.stage === 'PENDING' || o.stage === 'IN_PROGRESS')
  const unreadConvs = (convData?.myConversations ?? []).filter(c => c.unreadCount > 0).length
  const activeDisputes = (disputeStats?.myDisputeStats.active ?? 0) + (buyerDisputes?.myBuyerDisputes ?? []).filter(d => disputeIsOpen(d.status)).length
  const rep = repData?.myReputation
  const wallet = walletData?.myWallet
  const stats = statsData?.sellerStats
  const firstName = currentUser?.fullName.split(' ')[0] ?? ''
  const support = footerData?.footerSettings?.supportPhone

  const upcoming: Upcoming | undefined = [
    // Only deals still to hand over — a finished or disputed sale must not be
    // pushed as "today's meet-up" with a code that no longer applies.
    ...activePurchases.map(o => ({ id: o.id, role: 'BUYER' as const, listing: o.listing, otherId: o.seller.id, other: o.seller.fullName, m: o.meetup, amount: o.agreedPrice, reference: o.reference })),
    ...activeSales.map(o => ({ id: o.id, role: 'SELLER' as const, listing: o.listing, otherId: o.buyer.id, other: o.buyer.fullName, m: o.meetup, amount: o.agreedPrice, reference: o.reference })),
  ].filter(o => o.m?.status === 'CONFIRMED' && o.m && new Date(o.m.scheduledAt).getTime() > Date.now() - 3 * 3600_000)
    .sort((a, b) => new Date(a.m!.scheduledAt).getTime() - new Date(b.m!.scheduledAt).getTime())
    .map(o => ({ id: o.id, role: o.role, listing: o.listing, otherId: o.otherId, other: o.other, place: o.m!.place, at: o.m!.scheduledAt, amount: o.amount, reference: o.reference }))[0]
  const upcomingIsToday = upcoming && new Date(upcoming.at).toDateString() === new Date().toDateString()
  const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')

  const live = (listingsData?.myListings.items ?? []).filter(l => l.status === 'APPROVED')
  const perf = new Map((stats?.listings ?? []).map(p => [p.listing.id, p]))
  const toBoost = [...live].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 3)
  const series = stats?.series ?? []
  const maxDay = Math.max(1, ...series.map(s => s.views))
  const codePurchase = activePurchases.find(o => o.meetup?.status === 'CONFIRMED' && o.meetup.handoverCode)

  return (
    <AccountLayout active="buyer-dashboard" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        {/* Greeting */}
        <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5">
          <span className="relative">
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-primary text-headline-sm text-white">{currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" className="h-full w-full object-cover" /> : firstName.charAt(0)}</span>
            {currentUser?.isVerified && <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-solid border-surface-lowest bg-tertiary text-white"><Icon name="check" size={12} /></span>}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="m-0 text-headline-md text-on-surface">Bonjour {firstName}</h1>
              <span className="hidden items-center gap-1 rounded-full bg-primary-fixed px-2 py-0.5 text-label-sm text-primary md:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Vendeur &amp; Acheteur actif</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
              {currentUser?.city && <span className="flex items-center gap-1"><Icon name="location_on" size={14} className="text-primary" /> {currentUser.city}</span>}
              {!!rep?.reviewsCount && <span className="flex items-center gap-1"><Icon name="star" size={14} className="text-primary" /> {rep.averageRating.toFixed(1)}/5 ({rep.reviewsCount} avis)</span>}
              {currentUser?.isVerified && <span className="flex items-center gap-1 text-tertiary"><Icon name="verified_user" size={14} /> Identité certifiée</span>}
            </div>
          </div>
          <div className="flex basis-full items-center gap-3 rounded-xl bg-surface-container-low px-4 py-2.5 sm:basis-auto">
            <Icon name="payments" size={22} className="text-tertiary" />
            <div><div className="text-label-sm uppercase text-on-surface-variant">Ventes encaissées</div><div className="text-headline-sm font-extrabold text-tertiary"><Price amount={wallet?.totalSales ?? 0} /></div></div>
          </div>
          <button onClick={() => onNavigate('seller-post')} className="hidden cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-4 py-3 text-label-md text-white md:flex"><Icon name="add_circle" size={19} /> Vendre un article</button>
        </section>

        {/* Mobile: today's meet-up first */}
        {upcoming && (
          <section className="mt-4 rounded-2xl bg-primary p-4 text-white md:hidden">
            <div className="flex items-center justify-between"><span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-label-sm uppercase"><Icon name="alarm" size={14} /> {upcomingIsToday ? "Rendez-vous aujourd'hui" : 'Prochain rendez-vous'}</span><span className="text-label-lg">{time(upcoming.at)}</span></div>
            <div className="mt-3 flex gap-3">
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/20">{upcoming.listing.coverImageUrl && <img src={upcoming.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
              <div className="min-w-0"><div className="truncate text-label-lg">{upcoming.listing.title}</div><div className="flex items-center gap-1 text-body-sm text-white/85"><Icon name="location_on" size={14} /> {upcoming.place}</div><div className="text-label-md"><Price amount={upcoming.amount} currency={upcoming.listing.currency} /></div></div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => (upcoming.role === 'BUYER' ? onOpenPurchase(upcoming.id) : onOpenHandover(upcoming.id))} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-white py-2.5 text-label-md text-primary"><Icon name="handshake" size={18} /> {upcoming.role === 'BUYER' ? 'Voir code de remise' : 'Valider la remise'}</button>
              <button onClick={() => onOpenConversation(upcoming.otherId, upcoming.listing.id)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-none bg-white/15 text-white" aria-label="Chat"><Icon name="chat" size={19} /></button>
            </div>
          </section>
        )}

        {/* KPIs */}
        <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Ventes en cours" icon="storefront" value={`${activeSales.length} active${activeSales.length > 1 ? 's' : ''}`} sub={<><Price amount={activeSales.reduce((n, o) => n + (o.agreedPrice ?? 0), 0)} /> en attente</>} onClick={() => onNavigate('seller-orders')} />
          <Kpi label="RDV du jour" icon="event_available" accent="text-primary" value={upcoming && upcomingIsToday ? time(upcoming.at) : '—'} sub={upcoming && upcomingIsToday ? upcoming.place : 'Aucun rendez-vous'} onClick={() => (upcoming ? (upcoming.role === 'BUYER' ? onOpenPurchase(upcoming.id) : onOpenHandover(upcoming.id)) : onNavigate('seller-orders'))} />
          <Kpi label="Achats en cours" icon="shopping_bag" value={`${activePurchases.length} achat${activePurchases.length > 1 ? 's' : ''}`} sub={<span className="text-tertiary">{codePurchase ? 'Code de remise prêt' : 'Voir mes achats'}</span>} onClick={() => onNavigate('buyer-purchases')} />
          <Kpi label="Crédits boost" icon="bolt" value={<>{wallet?.credits ?? 0} <span className="text-body-sm font-normal text-on-surface-variant">crédits</span></>} sub={<span className="text-primary">+ Recharger</span>} onClick={() => onNavigate('seller-wallet')} />
          <Kpi label="Discussions" icon="forum" value={<>{unreadConvs} {unreadConvs > 0 && <span className="inline-block h-2 w-2 rounded-full bg-primary align-middle" />}</>} sub={unreadConvs ? `${unreadConvs} conversation${unreadConvs > 1 ? 's' : ''} en attente` : 'Tout est lu'} onClick={() => onNavigate('buyer-messages')} />
          <Kpi label="Garantie Dilchap" icon="verified_user" accent={activeDisputes ? 'text-primary' : 'text-tertiary'} value={`${activeDisputes} litige${activeDisputes > 1 ? 's' : ''}`} sub={activeDisputes ? 'Dossier en cours' : 'Aucun incident'} onClick={() => onNavigate(activeDisputes ? 'seller-disputes' : 'buyer-disputes')} />
        </section>

        {/* Desktop: today's meet-up */}
        <section className="mt-6 hidden md:block">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="m-0 flex items-center gap-2 text-headline-md text-on-surface"><span className="h-2 w-2 rounded-full bg-primary" /> Rendez-vous &amp; remise en main propre</h2>
            <span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary"><Icon name="verified_user" size={14} /> Lieux publics recommandés</span>
          </div>
          {upcoming ? (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5 rounded-2xl bg-surface-lowest p-5 shadow-sm">
              <div className="relative h-60 overflow-hidden rounded-2xl bg-surface-container">
                {upcoming.listing.coverImageUrl && <img src={upcoming.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}
                {upcoming.listing.condition && upcoming.listing.condition !== 'N/A' && <span className="absolute left-3 top-3 rounded bg-surface-lowest/90 px-2 py-0.5 text-label-sm uppercase text-tertiary">{upcoming.listing.condition}</span>}
                <span className="absolute bottom-3 right-3 rounded bg-inverse-surface/80 px-2 py-0.5 text-label-sm text-white">Réf : #{upcoming.reference}</span>
              </div>
              <div>
                <div className="text-label-sm uppercase text-on-surface-variant">{upcoming.role === 'BUYER' ? 'Achat confirmé • En attente de remise' : 'Vente confirmée • En attente de remise'}</div>
                <h3 className="m-0 mt-1 text-headline-sm text-on-surface">{upcoming.listing.title}</h3>
                <div className="text-body-sm text-on-surface-variant">{upcoming.role === 'BUYER' ? 'Vendeur' : 'Acheteur'} : {upcoming.other}</div>
                <div className="mt-2 text-headline-md font-extrabold text-primary"><Price amount={upcoming.amount} currency={upcoming.listing.currency} /></div>
                <div className="text-label-sm text-tertiary">0 F de frais, payé directement à la remise</div>
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-surface-container-low p-3">
                  <div className="flex gap-2"><Icon name="storefront" size={20} className="text-primary" /><div><div className="text-label-sm uppercase text-on-surface-variant">Lieu de rencontre</div><div className="text-label-md text-on-surface">{upcoming.place}</div></div></div>
                  <div className="flex gap-2"><Icon name="schedule" size={20} className="text-tertiary" /><div><div className="text-label-sm uppercase text-on-surface-variant">Créneau horaire</div><div className="text-label-md text-on-surface">{new Date(upcoming.at).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div></div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => (upcoming.role === 'BUYER' ? onOpenPurchase(upcoming.id) : onOpenHandover(upcoming.id))} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white"><Icon name="pin" size={18} /> {upcoming.role === 'BUYER' ? 'Afficher mon code de remise' : 'Valider la remise (code acheteur)'}</button>
                  <button onClick={() => onOpenConversation(upcoming.otherId, upcoming.listing.id)} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-surface-container-high px-4 py-2.5 text-label-md text-on-surface"><Icon name="chat" size={18} /> Chat avec {upcoming.other.split(' ')[0]}</button>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(upcoming.place)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2.5 text-label-md text-on-surface no-underline"><Icon name="near_me" size={18} /> Itinéraire</a>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-5"><Icon name="event_busy" size={26} className="text-on-surface-variant" /><div><div className="text-label-lg text-on-surface">Aucun rendez-vous confirmé</div><div className="text-body-sm text-on-surface-variant">Proposez un lieu et une heure dans la messagerie pour organiser une remise.</div></div></div>
          )}
        </section>

        {/* Mobile: purchases with code */}
        {codePurchase && (
          <section className="mt-5 md:hidden">
            <div className="mb-2 flex items-center justify-between"><h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="verified_user" size={20} className="text-tertiary" /> Achats sécurisés</h2><span className="text-label-sm text-on-surface-variant">{activePurchases.length} actif{activePurchases.length > 1 ? 's' : ''}</span></div>
            <div className="rounded-2xl bg-surface-lowest p-3 shadow-sm">
              <div className="flex gap-3">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-container">{codePurchase.listing.coverImageUrl && <img src={codePurchase.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><span className="rounded bg-tertiary-soft px-1.5 text-label-sm text-tertiary">Remise en main propre</span><span className="text-label-md text-on-surface"><Price amount={codePurchase.agreedPrice} /></span></div><div className="truncate text-label-lg text-on-surface">{codePurchase.listing.title}</div><div className="text-body-sm text-on-surface-variant">Vendeur : {codePurchase.seller.fullName}</div></div>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface-container-low p-2.5">
                <Icon name="pin" size={20} className="text-primary" />
                <div className="min-w-0 flex-1"><div className="text-label-sm text-on-surface-variant">Code de remise à donner au vendeur</div><div className="text-label-lg tracking-[0.3em] text-primary">{codePurchase.meetup!.handoverCode}</div></div>
                <button onClick={() => onOpenPurchase(codePurchase.id)} className="cursor-pointer rounded-lg border-none bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface">Détails</button>
              </div>
            </div>
          </section>
        )}

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          {/* Listings */}
          <section className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div><h2 className="m-0 text-headline-md text-on-surface">Mes annonces actives</h2><p className="m-0 hidden text-body-sm text-on-surface-variant md:block">Surveillez vos vues et boostez pour multiplier les prises de contact.</p></div>
              <button onClick={() => onNavigate('seller-listings')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary">Tout voir ({live.length}) <Icon name="chevron_right" size={17} /></button>
            </div>
            {toBoost.length === 0 && (
              <div className="rounded-2xl bg-surface-container-low p-6 text-center"><p className="m-0 text-label-lg text-on-surface">Aucune annonce en ligne</p><button onClick={() => onNavigate('seller-post')} className="mt-3 cursor-pointer rounded-xl border-none bg-primary px-4 py-2 text-label-md text-white">Déposer une annonce</button></div>
            )}
            <div className="flex flex-col gap-3">
              {toBoost.map(l => {
                const p = perf.get(l.id)
                const boosted = !!l.boostExpiresAt && new Date(l.boostExpiresAt) > new Date()
                return (
                  <article key={l.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-lowest p-3 shadow-sm">
                    <button onClick={() => onSelectListing(l.id)} className="h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border-none bg-surface-container p-0">{l.coverImageUrl && <img src={l.coverImageUrl} alt="" className="h-full w-full object-cover" />}</button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-label-sm text-on-surface-variant">{l.condition && l.condition !== 'N/A' && <span className="rounded bg-tertiary-soft px-1.5 text-tertiary">{l.condition}</span>}<span>{l.city}</span></div>
                      <button onClick={() => onSelectListing(l.id)} className="block max-w-full cursor-pointer truncate border-none bg-transparent p-0 text-left text-label-lg text-on-surface">{l.title}</button>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3"><span className="text-headline-sm font-extrabold text-on-surface"><Price amount={l.price} currency={l.currency} /></span>
                        <span className="flex items-center gap-2 text-label-sm text-on-surface-variant"><span className="flex items-center gap-0.5"><Icon name="visibility" size={14} /> {formatNumber(l.viewsCount)}</span><span className="flex items-center gap-0.5"><Icon name="favorite" size={14} /> {l.favoritesCount}</span>{!!l.pendingOffersCount && <span className="flex items-center gap-0.5 text-primary"><Icon name="local_offer" size={14} /> {l.pendingOffersCount} offre{l.pendingOffersCount > 1 ? 's' : ''}</span>}</span>
                      </div>
                    </div>
                    {boosted
                      ? <span className="flex items-center gap-1 rounded-lg bg-tertiary-soft px-2.5 py-1.5 text-label-sm text-tertiary"><Icon name="bolt" size={14} /> Boost actif{p ? ` • ${p.boostedViews} vues` : ''}</span>
                      : <button onClick={() => onNavigate('seller-premium')} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white"><Icon name="bolt" size={16} /> Booster dès 500 F</button>}
                  </article>
                )
              })}
            </div>
            {stats && (
              <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl bg-surface-container-low p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-lowest text-primary"><Icon name="trending_up" size={22} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-label-sm uppercase text-on-surface-variant">Performance 7 derniers jours</div>
                  <div className="text-headline-sm text-on-surface">{formatNumber(stats.views)} vues • {stats.funnel.favorites} favoris • {stats.contacts} contacts</div>
                </div>
                <div className="flex h-10 items-end gap-1">{series.map(s => <span key={s.day} className="w-2.5 rounded-t bg-primary/70" style={{ height: `${Math.max(4, (s.views / maxDay) * 40)}px` }} />)}</div>
              </div>
            )}
          </section>

          {/* Shortcuts + safety */}
          <aside className="flex flex-col gap-4">
            <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
              <h2 className="m-0 text-headline-sm text-on-surface">Raccourcis rapides</h2>
              <div className="mt-3 flex flex-col gap-1">
                {[
                  { icon: 'add_photo_alternate', title: 'Déposer une nouvelle annonce', sub: 'Photos, prix et point de remise', go: () => onNavigate('seller-post') },
                  { icon: 'account_balance_wallet', title: 'Recharger mes crédits boost', sub: 'Via Wave, Orange Money ou MTN', go: () => onNavigate('seller-wallet') },
                  { icon: 'receipt_long', title: "Consulter mes reçus d'achat", sub: 'Remises effectuées et reçus', go: () => onNavigate('buyer-receipts') },
                  ...(support ? [{ icon: 'support_agent', title: 'Support WhatsApp Dilchap', sub: `Assistance directe • ${support}`, go: () => window.open(`https://wa.me/${support.replace(/[^\d]/g, '')}`, '_blank') }] : []),
                ].map(s => (
                  <button key={s.title} onClick={s.go} className="flex cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent p-2 text-left hover:bg-surface-container-low">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-primary"><Icon name={s.icon} size={20} /></span>
                    <span className="min-w-0 flex-1"><span className="block text-label-md text-on-surface">{s.title}</span><span className="block truncate text-body-sm text-on-surface-variant">{s.sub}</span></span>
                    <Icon name="arrow_forward" size={18} className="text-on-surface-variant" />
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-2xl bg-tertiary-soft p-4">
              <div className="flex items-center gap-2 text-label-lg text-tertiary"><Icon name="verified_user" size={20} /> Sécurité anti-arnaque Dilchap</div>
              <p className="m-0 mt-1 text-body-sm text-on-surface">Ne payez jamais avant d'avoir inspecté l'article, et ne donnez votre code de remise qu'une fois l'article vérifié.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{['Wave', 'Orange Money', 'MTN MoMo', 'Espèces'].map(m => <span key={m} className="rounded-lg bg-surface-lowest px-2 py-1 text-label-sm text-on-surface">{m}</span>)}</div>
            </section>
            {upcoming && upcomingIsToday && (
              <section className="hidden rounded-2xl bg-surface-lowest p-4 shadow-sm md:block">
                <div className="flex items-center justify-between text-label-sm uppercase text-on-surface-variant">Point de remise d'aujourd'hui <span className="flex items-center gap-1 text-tertiary"><span className="h-2 w-2 rounded-full bg-tertiary" /> {time(upcoming.at)}</span></div>
                <div className="mt-2 text-label-lg text-on-surface">{upcoming.place}</div>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(upcoming.place)}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-surface-container-low py-2.5 text-label-md text-on-surface no-underline"><Icon name="map" size={18} /> Ouvrir dans Maps</a>
              </section>
            )}
          </aside>
        </div>
      </div>
    </AccountLayout>
  )
}
