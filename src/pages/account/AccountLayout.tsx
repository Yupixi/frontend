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

// Buyer hand-over pages get their own bar ("Vendeur / Handshake / Reçus /
// Litiges" in the mobile buyer mockups).
const BUYER_MOBILE_TABS = [
  { key: 'buyer-dashboard', icon: 'storefront', label: 'Vendeur', match: [] as string[] },
  { key: 'buyer-purchases', icon: 'qr_code_scanner', label: 'Handshake', match: ['buyer-purchases', 'buyer-handover'] },
  { key: 'buyer-receipts', icon: 'receipt_long', label: 'Reçus', match: ['buyer-receipts', 'buyer-receipt'] },
  { key: 'buyer-disputes', icon: 'gavel', label: 'Litiges', match: ['buyer-disputes', 'buyer-dispute-new'] },
]

// Mobile seller bar ("Accueil / Annonces / Messages / Ventes" in the mobile
// Seller Hub mockups). "Ventes" covers every sales-side page.
const MOBILE_TABS = [
  { key: 'buyer-dashboard', icon: 'storefront', label: 'Accueil', match: ['buyer-dashboard', 'seller-dashboard'] },
  { key: 'seller-listings', icon: 'sell', label: 'Annonces', match: ['seller-listings', 'seller-post', 'seller-edit', 'seller-premium'] },
  { key: 'buyer-messages', icon: 'chat_bubble', label: 'Messages', match: ['buyer-messages'] },
  { key: 'seller-orders', icon: 'account_balance_wallet', label: 'Ventes', match: ['seller-orders', 'seller-handover', 'seller-wallet', 'seller-stats', 'seller-disputes', 'seller-reviews'] },
]

function useUnreadCounts() {
  const { data: listingsData } = useQuery<{ myListings: { totalCount: number } }>(MY_LISTINGS_QUERY, { variables: { page: 1, pageSize: 1 } })
  const { data: conversationsData } = useQuery<{ myConversations: RemoteConversation[] }>(MY_CONVERSATIONS_QUERY, { pollInterval: 30_000 })
  const unreadMessages = (conversationsData?.myConversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0)
  const { data: disputesData } = useQuery<{ myDisputeStats: { active: number } }>(MY_DISPUTE_STATS_QUERY, { pollInterval: 60_000 })
  return { listingsCount: listingsData?.myListings.totalCount, unreadMessages, activeDisputes: disputesData?.myDisputeStats.active ?? 0 }
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

function AccountHeader({ activeLabel, currentUser, onToggleSidebar, onNavigate, onLogout, unreadMessages }: {
  activeLabel: string; currentUser?: AuthUser | null; onToggleSidebar: () => void; onNavigate: (p: any) => void; onLogout: () => void; unreadMessages?: number
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isGuest = !!currentUser?.isGuest
  const displayName = currentUser?.fullName || 'Mon compte'
  const iconBtn = 'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface-variant hover:bg-surface-container-low'
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-0 border-b border-solid border-outline-variant bg-surface-lowest px-4 lg:px-6">
      <button onClick={onToggleSidebar} className={`${iconBtn} lg:hidden`} aria-label="Menu"><Menu size={22} /></button>
      <button onClick={() => onNavigate('home')} className="hidden cursor-pointer border-none bg-transparent p-0 lg:block" aria-label="Accueil"><Logo size="sm" /></button>
      {!isGuest && (
        <span className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-label-sm uppercase md:flex ${currentUser?.isVerified ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
          {currentUser?.isVerified ? <><BadgeCheck size={14} /> Vendeur certifié</> : 'Espace vendeur'}
        </span>
      )}
      <h1 className="m-0 truncate text-label-lg text-on-surface lg:hidden">{activeLabel}</h1>
      <div className="flex-1" />
      <button onClick={() => onNavigate('buyer-messages')} className={iconBtn} aria-label="Messagerie">
        <MessageSquare size={22} />
        {!!unreadMessages && <span className="notif-dot">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
      </button>
      {!isGuest && (
        <>
          <button onClick={() => onNavigate('buyer-notifications')} className={`${iconBtn} hidden sm:flex`} aria-label="Notifications"><Bell size={22} /></button>
          <button onClick={() => onNavigate('seller-post')} className="hidden cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark sm:flex">
            <PlusCircle size={18} /> Nouvel article
          </button>
        </>
      )}
      <div className="relative">
        <button onClick={() => setMenuOpen(o => !o)} className="flex cursor-pointer items-center gap-2 rounded-full border-none bg-transparent p-1 hover:bg-surface-container-low">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">
            {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" className="h-full w-full object-cover" /> : displayName.charAt(0).toUpperCase()}
          </span>
          <span className="hidden max-w-[140px] truncate text-label-md text-on-surface md:block">{displayName}</span>
          <ChevronDown size={16} className="hidden text-on-surface-variant md:block" />
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

export function AccountLayout({ active, onNavigate, children, currentUser, onLogout }: {
  active: string, onNavigate: (p: any) => void, children: React.ReactNode, currentUser?: AuthUser | null, onLogout: () => void
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { listingsCount, unreadMessages, activeDisputes } = useUnreadCounts()
  const isGuest = !!currentUser?.isGuest
  const go = (p: string) => { setSidebarOpen(false); onNavigate(p) }

  return (
    <div className="flex h-screen bg-surface">
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
        <AccountHeader activeLabel={ACCOUNT_PAGE_LABELS[active] || active} currentUser={currentUser} onToggleSidebar={() => setSidebarOpen(o => !o)} onNavigate={onNavigate} onLogout={onLogout} unreadMessages={unreadMessages} />
        <main className="dashboard-main flex-1 overflow-auto px-4 py-5 pb-24 lg:px-8 lg:py-6">
          {children}
        </main>
        {!isGuest && (
          <nav className="fixed inset-x-0 bottom-0 z-50 flex border-0 border-t border-solid border-outline-variant bg-surface-lowest pb-[env(safe-area-inset-bottom)] lg:hidden">
            {(BUYER_MOBILE_TABS.some(t => t.match.includes(active)) ? BUYER_MOBILE_TABS : MOBILE_TABS).map(t => {
              const on = t.match.includes(active)
              return (
                <button key={t.key} onClick={() => go(t.key)} className={`relative flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-none bg-transparent py-2 text-label-sm ${on ? 'text-primary' : 'text-on-surface-variant'}`}>
                  <Icon name={t.icon} size={22} fill={on} />
                  {t.label}
                  {t.key === 'buyer-messages' && !!unreadMessages && <span className="absolute right-[28%] top-1 h-2 w-2 rounded-full bg-primary" />}
                </button>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}
