import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import {
  LayoutDashboard, PlusCircle, Package, BarChart2, Rocket, Heart, MessageSquare, Truck, Wallet, Star,
  Bell, History, Settings, ChevronDown, Menu, X, LogOut, Home, ShieldCheck, BadgeCheck, Store, Gavel, Handshake,
} from '../../components/icons'
import Icon from '../../components/Icon'
import { MY_DISPUTE_STATS_QUERY } from '../../graphql/sellerTools'
import Logo from '../../components/DilchapLogo'
import { MY_LISTINGS_QUERY } from '../../graphql/listings'
import { MY_CONVERSATIONS_QUERY, type RemoteConversation } from '../../graphql/messaging'
import { MY_NOTIFICATIONS_QUERY, type RemoteNotification } from '../../graphql/account'
import type { AuthUser } from '../../graphql/auth'

// Every member is both a buyer and a seller — one account, one space. This
// shell is the "Espace vendeur" of the Stitch mockups (Booster / Déposer une
// annonce): grouped sidebar, compact header with the publish CTA.
const SECTIONS = [
  {
    title: 'Gestion & Ventes',
    items: [
      { key: 'buyer-dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { key: 'seller-listings', icon: Package, label: 'Mes annonces' },
      { key: 'seller-orders', icon: Truck, label: 'Commandes & Envois' },
      { key: 'seller-disputes', icon: Gavel, label: 'Sécurité & Litiges' },
      { key: 'seller-wallet', icon: Wallet, label: 'Porte-monnaie' },
      { key: 'seller-reviews', icon: Star, label: 'Avis & Réputation' },
      { key: 'seller-premium', icon: Rocket, label: 'Booster & Visibilité' },
      { key: 'buyer-messages', icon: MessageSquare, label: 'Messagerie' },
      { key: 'seller-stats', icon: BarChart2, label: 'Statistiques' },
    ],
  },
  {
    title: 'Acheter & Explorer',
    items: [
      { key: 'buyer-purchases', icon: Handshake, label: 'Mes achats & remises' },
      { key: 'buyer-disputes', icon: Gavel, label: 'Mes litiges' },
      { key: 'buyer-favorites', icon: Heart, label: 'Mes favoris' },
      { key: 'buyer-notifications', icon: Bell, label: 'Notifications' },
      { key: 'buyer-history', icon: History, label: 'Historique' },
    ],
  },
]

export const ACCOUNT_PAGE_LABELS: Record<string, string> = {
  'buyer-dashboard': 'Tableau de bord',
  'seller-post': 'Déposer une annonce',
  'seller-edit': "Modifier l'annonce",
  'seller-listings': 'Mes annonces',
  'buyer-favorites': 'Mes favoris',
  'buyer-messages': 'Messagerie',
  'seller-stats': 'Statistiques',
  'buyer-notifications': 'Notifications',
  'buyer-history': 'Historique',
  'seller-premium': 'Booster & Visibilité',
  'seller-orders': 'Commandes & Envois',
  'seller-wallet': 'Porte-monnaie',
  'seller-reviews': 'Avis & Réputation',
  'buyer-settings': 'Paramètres',
  'seller-disputes': 'Sécurité & Litiges',
  'seller-handover': 'Confirmation de remise',
  'buyer-purchases': 'Mes achats',
  'buyer-receipts': 'Reçus & Clôtures',
  'buyer-handover': 'Mon code de remise',
  'buyer-receipt': 'Reçu de remise',
  'buyer-dispute-new': 'Déclaration de litige',
  'buyer-disputes': 'Suivi des litiges',
}

// Mobile bottom bars — three variants, as in the Stitch mobile mockups:
// the member bar (dashboard, favourites, messages, history, settings…), the
// Seller Hub bar (listings, sales, wallet, boosts) and the hand-over bar
// (code de remise, reçu, litiges). Every bar keeps a way back to the account.
type MobileTab = { key: string; icon: string; label: string; match: string[]; primary?: boolean }

const MEMBER_TABS: MobileTab[] = [
  { key: 'home', icon: 'home', label: 'Accueil', match: [] },
  { key: 'buyer-favorites', icon: 'favorite', label: 'Favoris', match: ['buyer-favorites'] },
  { key: 'seller-post', icon: 'add', label: 'Déposer', match: [], primary: true },
  { key: 'buyer-messages', icon: 'chat', label: 'Messages', match: ['buyer-messages'] },
  { key: 'buyer-dashboard', icon: 'person', label: 'Compte', match: ['buyer-dashboard', 'seller-dashboard', 'buyer-notifications', 'buyer-history', 'buyer-settings', 'buyer-purchases', 'seller-stats', 'seller-reviews'] },
]

const SELLER_TABS: MobileTab[] = [
  { key: 'home', icon: 'storefront', label: 'Accueil', match: [] },
  { key: 'seller-listings', icon: 'sell', label: 'Annonces', match: ['seller-listings', 'seller-premium'] },
  { key: 'buyer-messages', icon: 'chat_bubble', label: 'Messages', match: [] },
  { key: 'seller-orders', icon: 'account_balance_wallet', label: 'Ventes', match: ['seller-orders', 'seller-handover', 'seller-wallet', 'seller-disputes'] },
  { key: 'buyer-dashboard', icon: 'person', label: 'Compte', match: [] },
]

const HANDOVER_TABS: MobileTab[] = [
  { key: 'buyer-dashboard', icon: 'storefront', label: 'Compte', match: [] },
  { key: 'buyer-purchases', icon: 'qr_code_scanner', label: 'Remises', match: ['buyer-handover'] },
  { key: 'buyer-receipts', icon: 'receipt_long', label: 'Reçus', match: ['buyer-receipts', 'buyer-receipt'] },
  { key: 'buyer-disputes', icon: 'gavel', label: 'Litiges', match: ['buyer-disputes'] },
]

function mobileTabsFor(active: string): MobileTab[] | null {
  // Full-screen tasks: the wizard and the dispute form have their own footer.
  if (['seller-post', 'seller-edit', 'buyer-dispute-new'].includes(active)) return null
  if (SELLER_TABS.some(t => t.match.includes(active))) return SELLER_TABS
  if (HANDOVER_TABS.some(t => t.match.includes(active))) return HANDOVER_TABS
  return MEMBER_TABS
}

function useUnreadCounts() {
  const { data: listingsData } = useQuery<{ myListings: { totalCount: number } }>(MY_LISTINGS_QUERY, { variables: { page: 1, pageSize: 1 } })
  const { data: conversationsData } = useQuery<{ myConversations: RemoteConversation[] }>(MY_CONVERSATIONS_QUERY, { pollInterval: 30_000 })
  const unreadMessages = (conversationsData?.myConversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0)
  const { data: disputesData } = useQuery<{ myDisputeStats: { active: number } }>(MY_DISPUTE_STATS_QUERY, { pollInterval: 60_000 })
  const { data: notifData } = useQuery<{ myNotifications: RemoteNotification[] }>(MY_NOTIFICATIONS_QUERY, { pollInterval: 30_000 })
  const unreadNotifications = (notifData?.myNotifications ?? []).filter(n => !n.readAt).length
  return { listingsCount: listingsData?.myListings.totalCount, unreadMessages, unreadNotifications, activeDisputes: disputesData?.myDisputeStats.active ?? 0 }
}

function NavItem({ active, icon: Icon, label, badge, onClick, muted }: {
  active?: boolean, icon: typeof Home, label: string, badge?: React.ReactNode, onClick: () => void, muted?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`mb-0.5 flex w-full cursor-pointer items-center gap-3 rounded-lg border-none px-3 py-2.5 text-left ${active ? 'bg-primary text-white' : `bg-transparent hover:bg-surface-container-low ${muted ? 'text-on-surface-variant' : 'text-on-surface'}`} ${muted ? 'text-body-sm' : 'text-label-md'}`}
    >
      <Icon size={20} className={active ? 'text-white' : 'text-on-surface-variant'} />
      <span className="flex-1">{label}</span>
      {badge}
    </button>
  )
}

function SidebarContent({ active, onNavigate, listingsCount, unreadMessages, activeDisputes, isGuest }: {
  active: string; onNavigate: (p: any) => void; listingsCount?: number; unreadMessages?: number; activeDisputes?: number; isGuest?: boolean
}) {
  // A guest identity only exists to hold a conversation open — there's no
  // account behind it, so every other area stays hidden.
  const sections = isGuest
    ? [{ title: 'Messagerie', items: SECTIONS[0].items.filter(i => i.key === 'buyer-messages') }]
    : SECTIONS
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map(section => (
          <div key={section.title} className="mb-5">
            <div className="mb-2 px-3 text-label-sm uppercase text-on-surface-variant">{section.title}</div>
            {section.items.map(item => {
              const badge = item.key === 'buyer-messages' && unreadMessages
                ? <span className={`rounded-full px-2 text-label-sm ${active === item.key ? 'bg-white text-primary' : 'bg-primary-fixed text-primary'}`}>{unreadMessages} non lu{unreadMessages > 1 ? 's' : ''}</span>
                : item.key === 'seller-listings' && listingsCount
                  ? <span className={`rounded-full px-2 text-label-sm ${active === item.key ? 'bg-white/25 text-white' : 'bg-surface-container text-on-surface-variant'}`}>{listingsCount}</span>
                  : item.key === 'seller-disputes' && activeDisputes
                    ? <span className={`h-2 w-2 rounded-full ${active === item.key ? 'bg-white' : 'bg-primary'}`} aria-label={`${activeDisputes} litige(s) en cours`} />
                    : undefined
              return <NavItem key={item.key} active={active === item.key} icon={item.icon} label={item.label} badge={badge} onClick={() => onNavigate(item.key)} />
            })}
          </div>
        ))}
        {!isGuest && (
          <div className="mx-1 mt-2 rounded-xl bg-tertiary-soft p-3">
            <div className="mb-1 flex items-center gap-1.5 text-label-sm uppercase text-tertiary"><ShieldCheck size={15} /> Sécurité Dilchap</div>
            <p className="m-0 text-body-sm text-on-surface-variant">Vos ventes se règlent de la main à la main, après vérification de l'article. 0 F de commission.</p>
          </div>
        )}
      </div>
      <div className="border-0 border-t border-solid border-outline-variant px-3 py-3">
        <NavItem icon={Store} label="Retour à la boutique" onClick={() => onNavigate('home')} muted />
        {!isGuest && <NavItem active={active === 'buyer-settings'} icon={Settings} label="Paramètres" onClick={() => onNavigate('buyer-settings')} muted />}
      </div>
    </div>
  )
}

function AccountHeader({ activeLabel, isHome, currentUser, onToggleSidebar, onBack, onNavigate, onLogout, unreadMessages, unreadNotifications }: {
  activeLabel: string; isHome: boolean; currentUser?: AuthUser | null; onToggleSidebar: () => void; onBack: () => void; onNavigate: (p: any) => void; onLogout: () => void; unreadMessages?: number; unreadNotifications?: number
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isGuest = !!currentUser?.isGuest
  const displayName = currentUser?.fullName || 'Mon compte'
  const iconBtn = 'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface-variant hover:bg-surface-container-low'
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-0 border-b border-solid border-outline-variant bg-surface-lowest px-4 lg:px-6">
      {/* Mobile: the account home opens the menu ("Dilchap · Mon compte"),
          every other page gets a back arrow + its title, as in the mockups. */}
      {isHome
        ? <button onClick={onToggleSidebar} className={`${iconBtn} -ml-2 lg:hidden`} aria-label="Menu"><Menu size={22} /></button>
        : <button onClick={onBack} className={`${iconBtn} -ml-2 text-on-surface lg:hidden`} aria-label="Retour"><Icon name="arrow_back" size={24} /></button>}
      <button onClick={() => onNavigate('home')} className={`${isHome ? 'block' : 'hidden'} cursor-pointer border-none bg-transparent p-0 lg:block`} aria-label="Accueil"><Logo size="sm" /></button>
      {!isGuest && (
        <span className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-label-sm uppercase md:flex ${currentUser?.isVerified ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
          {currentUser?.isVerified ? <><BadgeCheck size={14} /> Vendeur certifié</> : 'Espace vendeur'}
        </span>
      )}
      <h1 className={`m-0 min-w-0 truncate lg:hidden ${isHome ? 'text-label-md text-on-surface-variant' : 'text-headline-sm text-on-surface'}`}>{isHome ? 'Mon compte' : activeLabel}</h1>
      <div className="flex-1" />
      <button onClick={() => onNavigate('buyer-messages')} className={`${iconBtn} hidden lg:flex`} aria-label="Messagerie">
        <MessageSquare size={22} />
        {!!unreadMessages && <span className="notif-dot">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
      </button>
      {!isGuest && (
        <>
          <button onClick={() => onNavigate('buyer-notifications')} className={iconBtn} aria-label="Notifications">
            <Bell size={22} />
            {!!unreadNotifications && <span className="notif-dot">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
          </button>
          <button onClick={() => onNavigate('seller-post')} className="hidden cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark sm:flex">
            <PlusCircle size={18} /> Nouvel article
          </button>
        </>
      )}
      {/* Sub-pages on a phone: back + title + bell only, so titles fit */}
      <div className={`relative ${isHome ? '' : 'max-lg:hidden'}`}>
        <button onClick={() => setMenuOpen(o => !o)} className="flex cursor-pointer items-center gap-2 rounded-full border-none bg-transparent p-1 hover:bg-surface-container-low">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">
            {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" className="h-full w-full object-cover" /> : displayName.charAt(0).toUpperCase()}
          </span>
          <span className="hidden max-w-[140px] truncate text-label-md text-on-surface md:block">{displayName}</span>
          <span className="hidden md:block"><ChevronDown size={16} className="text-on-surface-variant" /></span>
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-[200] mt-2 w-56 rounded-2xl border border-outline-variant bg-surface-lowest p-2 shadow-float">
            <div className="mb-1 border-0 border-b border-solid border-outline-variant px-3 py-2">
              <div className="truncate text-label-md text-on-surface">{displayName}</div>
              <div className="truncate text-body-sm text-on-surface-variant">{currentUser?.email ?? ''}</div>
            </div>
            {!isGuest && <NavItem icon={Settings} label="Paramètres du compte" onClick={() => { setMenuOpen(false); onNavigate('buyer-settings') }} />}
            <button onClick={() => { setMenuOpen(false); onLogout() }} className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-label-md text-primary hover:bg-primary-fixed/50">
              <LogOut size={20} /> Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export function AccountLayout({ active, onNavigate, children, currentUser, onLogout, title, onBack, hideBottomNav, fill }: {
  active: string, onNavigate: (p: any) => void, children: React.ReactNode, currentUser?: AuthUser | null, onLogout: () => void,
  /** Mobile header title, when the page isn't the one `active` names (e.g. a sub-step). */
  title?: string
  /** Mobile back arrow override (e.g. conversation → conversation list). */
  onBack?: () => void
  /** Full-screen mobile moments where the page has its own footer. */
  hideBottomNav?: boolean
  /** The page manages its own scrolling (chat): <main> gets no padding and
      exactly the height left between the header and the bottom bar, which
      then sits in the flow instead of floating over the content. */
  fill?: boolean
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { listingsCount, unreadMessages, unreadNotifications, activeDisputes } = useUnreadCounts()
  const tabs = hideBottomNav ? null : mobileTabsFor(active)
  const back = onBack ?? (() => (window.history.length > 1 ? window.history.back() : onNavigate('buyer-dashboard')))
  const isGuest = !!currentUser?.isGuest
  const go = (p: string) => { setSidebarOpen(false); onNavigate(p) }

  return (
    <div className={`flex bg-surface ${fill ? 'h-[100dvh]' : 'h-screen'}`}>
      <aside className="hidden w-64 shrink-0 border-0 border-r border-solid border-outline-variant bg-surface-lowest lg:block">
        <SidebarContent active={active} onNavigate={go} listingsCount={listingsCount} unreadMessages={unreadMessages} activeDisputes={activeDisputes} isGuest={isGuest} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[9999] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-surface-lowest">
            <div className="flex items-center justify-between border-0 border-b border-solid border-outline-variant px-4 py-3">
              <Logo size="sm" />
              <button onClick={() => setSidebarOpen(false)} className="flex cursor-pointer border-none bg-transparent p-1 text-on-surface-variant" aria-label="Fermer"><X size={22} /></button>
            </div>
            <div className="min-h-0 flex-1">
              <SidebarContent active={active} onNavigate={go} listingsCount={listingsCount} unreadMessages={unreadMessages} activeDisputes={activeDisputes} isGuest={isGuest} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AccountHeader activeLabel={title || ACCOUNT_PAGE_LABELS[active] || active} isHome={active === 'buyer-dashboard' || active === 'seller-dashboard'} currentUser={currentUser} onToggleSidebar={() => setSidebarOpen(o => !o)} onBack={back} onNavigate={onNavigate} onLogout={onLogout} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
        <main className={fill ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : `dashboard-main flex-1 overflow-auto px-4 py-5 lg:px-8 lg:py-6 ${tabs && !isGuest ? 'pb-24 lg:pb-6' : ''}`}>
          {children}
        </main>
        {!isGuest && tabs && (
          <nav aria-label="Navigation du compte" className={`${fill ? 'relative shrink-0' : 'fixed inset-x-0 bottom-0'} z-50 flex border-0 border-t border-solid border-outline-variant bg-surface-lowest/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden`}>
            {tabs.map(t => {
              const on = t.match.includes(active)
              if (t.primary) {
                return (
                  <button key={t.key} onClick={() => go(t.key)} className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-none bg-transparent pb-1.5 text-label-sm text-primary">
                    <span className="-mt-5 flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px] border-solid border-surface-lowest bg-primary text-white shadow-[0_4px_14px_rgba(254,0,0,0.35)]">
                      <Icon name={t.icon} size={28} />
                    </span>
                    {t.label}
                  </button>
                )
              }
              return (
                <button key={t.key} onClick={() => go(t.key)} className={`relative flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-none bg-transparent pb-1.5 pt-2 text-label-sm ${on ? 'text-primary' : 'text-on-surface-variant'}`}>
                  <Icon name={t.icon} size={22} fill={on} />
                  {t.label}
                  {t.key === 'buyer-messages' && !!unreadMessages && <span className="notif-dot" style={{ top: 2, right: 'calc(50% - 22px)' }}>{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
                </button>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}
