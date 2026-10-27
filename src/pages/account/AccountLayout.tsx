import LanguagePicker from '../../components/LanguagePicker'
import AnimatedIcon, { useIncreaseCounter } from '../../components/AnimatedIcon'
import { useEffect, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import {
  LayoutDashboard, PlusCircle, Package, BarChart2, Rocket, Heart, MessageSquare, Truck, Wallet, Star,
  Bell, History, Settings, ChevronDown, Menu, X, LogOut, Home, ShieldCheck, BadgeCheck, QrCode, Store, Gavel, Handshake, Tag, Megaphone, Headset, Video,
} from '../../components/icons'
import Icon from '../../components/Icon'
import { MY_DISPUTE_STATS_QUERY } from '../../graphql/sellerTools'
import Logo from '../../components/DilchapLogo'
import { MY_LISTINGS_QUERY } from '../../graphql/listings'
import { MY_CONVERSATIONS_QUERY, type RemoteConversation } from '../../graphql/messaging'
import { MY_NOTIFICATIONS_QUERY, type RemoteNotification } from '../../graphql/account'
import type { AuthUser } from '../../graphql/auth'
import { syncAppBadge } from '../../lib/pushNotifications'
import { BADGE_LABEL } from '../../graphql/badges'
import { Claim } from '../../lib/site'
import OfferBanner from '../../components/OfferBanner'
import AdultModeBar from '../../components/AdultModeBar'
import { fmtCfa, useT } from '../../i18n'
import common from '../../i18n/ns/common'
import account from '../../i18n/ns/account'
// French titles: the ids folded sections are remembered under (unchanged
// whatever the language).
import frAccount from '../../i18n/locales/fr/account.json'

// Every member is both a buyer and a seller — one account, one space. This
// shell is the "Espace vendeur" of the Stitch mockups (Booster / Déposer une
// annonce): grouped sidebar, compact header with the publish CTA.
type NavLeaf = { key: string; icon: typeof Home; label: string }
// A sub-group folds a few related links under one collapsible entry.
type NavGroup = { id: string; label: string; icon: typeof Home; items: NavLeaf[] }
type NavEntry = NavLeaf | NavGroup
const isGroup = (e: NavEntry): e is NavGroup => 'items' in e
const leaves = (entries: NavEntry[]) => entries.flatMap(e => (isGroup(e) ? e.items : [e]))

// Labels are getters: read at each render, in the page's language.
const tAny = (key: string) => (account.t as unknown as (k: string) => string)(key)
const navLeaf = (key: string, icon: typeof Home): NavLeaf => ({ key, icon, get label() { return tAny(`nav.${key}`) } })
type GroupKey = 'group.listings' | 'group.shop' | 'group.sales' | 'group.reputation'
const navGroup = (k: GroupKey, icon: typeof Home, items: NavLeaf[]): NavGroup => ({ id: frAccount[k], icon, items, get label() { return account.t(k) } })
type SectionKey = 'section.sales' | 'section.buy'
const navSection = (k: SectionKey, items: NavEntry[]) => ({ id: frAccount[k], items, get title() { return account.t(k) } })

const SECTIONS: { id: string; title: string; items: NavEntry[] }[] = [
  navSection('section.sales', [
    navLeaf('buyer-dashboard', LayoutDashboard),
    navGroup('group.listings', Package, [
      navLeaf('seller-listings', Package),
      navLeaf('seller-reels', Video),
      navLeaf('seller-premium', Rocket),
      navLeaf('seller-stats', BarChart2),
    ]),
    navGroup('group.shop', Store, [
      navLeaf('seller-shop', Store),
      navLeaf('seller-shop-promos', Tag),
      navLeaf('seller-campaigns', Megaphone),
    ]),
    navGroup('group.sales', Truck, [
      navLeaf('seller-orders', Truck),
      navLeaf('seller-disputes', Gavel),
      navLeaf('seller-wallet', Wallet),
    ]),
    navGroup('group.reputation', Star, [
      navLeaf('seller-reviews', Star),
      navLeaf('seller-badge', BadgeCheck),
      navLeaf('seller-qr', QrCode),
    ]),
    navLeaf('buyer-messages', MessageSquare),
  ]),
  navSection('section.buy', [
    navLeaf('buyer-purchases', Handshake),
    navLeaf('buyer-disputes', Gavel),
    navLeaf('buyer-favorites', Heart),
    navLeaf('buyer-notifications', Bell),
    navLeaf('buyer-history', History),
    navLeaf('support', Headset),
  ]),
]

// Folded sections / sub-groups, remembered per browser (keys: French titles, labels).
const FOLDED_KEY = 'dilchap_sidebar_folded'
const readFolded = (): string[] => { try { return JSON.parse(localStorage.getItem(FOLDED_KEY) ?? '[]') as string[] } catch { return [] } }

// Page titles by route (« page.<route> » keys), read in the page's language.
const PAGE_ROUTES = Object.keys(frAccount).filter(k => k.startsWith('page.')).map(k => k.slice(5))
export const ACCOUNT_PAGE_LABELS: Record<string, string> = Object.defineProperties({} as Record<string, string>,
  Object.fromEntries(PAGE_ROUTES.map(r => [r, { get: () => tAny(`page.${r}`), enumerable: true }])))

// Mobile bottom bars — three variants, as in the Stitch mobile mockups:
// the member bar (dashboard, favourites, messages, history, settings…), the
// Seller Hub bar (listings, sales, wallet, boosts) and the hand-over bar
// (code de remise, reçu, litiges). Every bar keeps a way back to the account.
type MobileTab = { key: string; icon: string; label: string; match: string[]; primary?: boolean }
type TabKey = 'tab.home' | 'tab.favorites' | 'tab.sell' | 'tab.messages' | 'tab.account' | 'tab.listings' | 'tab.sales' | 'tab.handovers' | 'tab.receipts' | 'tab.disputes'
const mobileTab = (key: string, icon: string, label: TabKey, match: string[], primary?: boolean): MobileTab => ({
  key, icon, match, ...(primary ? { primary } : {}), get label() { return account.t(label) },
})

const MEMBER_TABS: MobileTab[] = [
  mobileTab('home', 'home', 'tab.home', []),
  mobileTab('buyer-favorites', 'favorite', 'tab.favorites', ['buyer-favorites']),
  mobileTab('seller-post', 'add', 'tab.sell', [], true),
  mobileTab('buyer-messages', 'chat', 'tab.messages', ['buyer-messages']),
  mobileTab('buyer-dashboard', 'person', 'tab.account', ['buyer-dashboard', 'seller-dashboard', 'buyer-notifications', 'buyer-history', 'buyer-settings', 'buyer-purchases', 'seller-stats', 'seller-reviews', 'seller-badge', 'seller-qr', 'support']),
]

const SELLER_TABS: MobileTab[] = [
  mobileTab('home', 'storefront', 'tab.home', []),
  mobileTab('seller-listings', 'sell', 'tab.listings', ['seller-listings', 'seller-reels', 'seller-premium', 'seller-shop', 'seller-shop-stats', 'seller-shop-promos', 'seller-campaigns']),
  mobileTab('buyer-messages', 'chat_bubble', 'tab.messages', []),
  mobileTab('seller-orders', 'account_balance_wallet', 'tab.sales', ['seller-orders', 'seller-handover', 'seller-wallet', 'seller-disputes']),
  mobileTab('buyer-dashboard', 'person', 'tab.account', []),
]

const HANDOVER_TABS: MobileTab[] = [
  mobileTab('buyer-dashboard', 'storefront', 'tab.account', []),
  mobileTab('buyer-purchases', 'qr_code_scanner', 'tab.handovers', ['buyer-handover']),
  mobileTab('buyer-receipts', 'receipt_long', 'tab.receipts', ['buyer-receipts', 'buyer-receipt']),
  mobileTab('buyer-disputes', 'gavel', 'tab.disputes', ['buyer-disputes']),
]

// Iconsax animation per tab icon (src/assets/lottie); the Material name
// stays as the fallback.
const TAB_ANIM: Record<string, string> = {
  home: 'nav-home', favorite: 'heart', add: 'nav-add', chat: 'empty-messages', chat_bubble: 'empty-messages', person: 'nav-profile',
  storefront: 'nav-shop', sell: 'nav-tag', account_balance_wallet: 'empty-wallet',
  qr_code_scanner: 'nav-scan', receipt_long: 'nav-receipt', gavel: 'empty-shield',
}

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
  useEffect(() => { if (notifData) syncAppBadge(unreadNotifications) }, [notifData, unreadNotifications])
  return { listingsCount: listingsData?.myListings.totalCount, unreadMessages, unreadNotifications, activeDisputes: disputesData?.myDisputeStats.active ?? 0 }
}

const SIDEBAR_KEY = 'dilchap_sidebar_collapsed'

function NavItem({ active, icon: Icon, label, badge, dot, onClick, muted, collapsed, nested }: {
  active?: boolean, icon: typeof Home, label: string, badge?: React.ReactNode, dot?: string | number, onClick: () => void, muted?: boolean, collapsed?: boolean
  /** Link inside a sub-group: indented under the group's line. */
  nested?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={`relative mb-0.5 flex w-full cursor-pointer items-center gap-3 rounded-lg border-none py-2.5 text-left ${collapsed ? 'justify-center px-0' : nested ? 'pl-9 pr-3' : 'px-3'} ${active ? 'bg-primary text-white' : `bg-transparent hover:bg-surface-container-low ${muted ? 'text-on-surface-variant' : 'text-on-surface'}`} ${muted ? 'text-body-sm' : 'text-label-md'}`}
    >
      <Icon size={nested ? 18 : 20} className={active ? 'text-white' : 'text-on-surface-variant'} />
      {collapsed
        // Reduced rail: counters become a small bubble on the icon.
        ? dot !== undefined && <span className={`absolute right-2 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${active ? 'bg-white text-primary' : 'bg-primary text-white'}`}>{dot}</span>
        : <><span className="flex-1 whitespace-nowrap">{label}</span>{badge}</>}
    </button>
  )
}

function SidebarContent({ active, onNavigate, listingsCount, unreadMessages, activeDisputes, isGuest, collapsed }: {
  active: string; onNavigate: (p: any) => void; listingsCount?: number; unreadMessages?: number; activeDisputes?: number; isGuest?: boolean
  // Desktop only: icons-only rail (switched from the header).
  collapsed?: boolean
}) {
  const t = useT(account)
  // A guest identity only exists to hold a conversation open — there's no
  // account behind it, so every other area stays hidden.
  const sections = isGuest
    ? [{ id: frAccount.messages, title: t('messages'), items: leaves(SECTIONS[0].items).filter(i => i.key === 'buyer-messages') as NavEntry[] }]
    : SECTIONS
  const [folded, setFolded] = useState<string[]>(readFolded)
  const setAndSave = (next: string[]) => { try { localStorage.setItem(FOLDED_KEY, JSON.stringify(next)) } catch { /* private mode */ } return next }
  const toggle = (key: string) => setFolded(f => setAndSave(f.includes(key) ? f.filter(k => k !== key) : [...f, key]))
  // Reaching a page unfolds its section and sub-group (folding it again by
  // hand stays possible while on it).
  useEffect(() => {
    const keys = SECTIONS.flatMap(sec => sec.items.flatMap(e => (
      isGroup(e) ? (e.items.some(i => i.key === active) ? [sec.id, `${sec.id}›${e.id}`] : []) : e.key === active ? [sec.id] : []
    )))
    if (keys.length) setFolded(f => (f.some(k => keys.includes(k)) ? setAndSave(f.filter(k => !keys.includes(k))) : f))
  }, [active])

  const badgeOf = (key: string) => key === 'buyer-messages' && unreadMessages
    ? <span className={`rounded-full px-2 text-label-sm ${active === key ? 'bg-white text-primary' : 'bg-primary-fixed text-primary'}`}>{t('unread', { count: unreadMessages })}</span>
    : key === 'seller-listings' && listingsCount
      ? <span className={`rounded-full px-2 text-label-sm ${active === key ? 'bg-white/25 text-white' : 'bg-surface-container text-on-surface-variant'}`}>{listingsCount}</span>
      : key === 'seller-disputes' && activeDisputes
        ? <span className={`h-2 w-2 rounded-full ${active === key ? 'bg-white' : 'bg-primary'}`} aria-label={t('disputesAria', { n: activeDisputes })} />
        : undefined
  const dotOf = (key: string) => key === 'buyer-messages' && unreadMessages ? unreadMessages
    : key === 'seller-disputes' && activeDisputes ? activeDisputes : undefined
  // What a folded section / sub-group still shows: unread messages + disputes.
  const pending = (items: NavLeaf[]) => items.reduce((n, i) => n + (Number(dotOf(i.key)) || 0), 0)
  const chip = (n: number) => n > 0 && <span className="rounded-full bg-primary px-1.5 text-label-sm text-white">{n > 99 ? '99+' : n}</span>
  const leaf = (item: NavLeaf, nested = false) => (
    <NavItem key={item.key} collapsed={collapsed} nested={nested} active={active === item.key} icon={item.icon} label={item.label} badge={badgeOf(item.key)} dot={dotOf(item.key)} onClick={() => onNavigate(item.key)} />
  )

  return (
    <div className="flex h-full flex-col">
      <div className={`flex-1 overflow-y-auto overflow-x-hidden py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${collapsed ? 'px-2' : 'px-3'}`}>
        {sections.map((section, i) => {
          // Icons-only rail: every link, no folding.
          if (collapsed) return (
            <div key={section.id} className="mb-3">
              {i > 0 && <div className="mx-2 mb-3 border-0 border-t border-solid border-outline-variant" />}
              {leaves(section.items).map(item => leaf(item))}
            </div>
          )
          const open = !folded.includes(section.id)
          return (
            <div key={section.id} className="mb-4">
              {section.items.length > 1 ? (
                <button type="button" onClick={() => toggle(section.id)} aria-expanded={open}
                  className="mb-1 flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-3 py-1.5 text-left text-label-sm uppercase text-on-surface-variant hover:text-on-surface">
                  <span className="min-w-0 flex-1 truncate">{section.title}</span>
                  {!open && chip(pending(leaves(section.items)))}
                  <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
                </button>
              ) : <div className="mb-2 whitespace-nowrap px-3 text-label-sm uppercase text-on-surface-variant">{section.title}</div>}
              {open && section.items.map(e => {
                if (!isGroup(e)) return leaf(e)
                const key = `${section.id}›${e.id}`
                const here = e.items.some(it => it.key === active)
                const groupOpen = !folded.includes(key)
                const GroupIcon = e.icon
                return (
                  <div key={key}>
                    <button type="button" onClick={() => toggle(key)} aria-expanded={groupOpen}
                      className={`mb-0.5 flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md hover:bg-surface-container-low ${here ? 'font-bold text-on-surface' : 'text-on-surface'}`}>
                      <GroupIcon size={20} className="shrink-0 text-on-surface-variant" />
                      <span className="flex-1 whitespace-nowrap">{e.label}</span>
                      {!groupOpen && chip(pending(e.items))}
                      <ChevronDown size={16} className={`shrink-0 text-on-surface-variant transition-transform duration-200 ${groupOpen ? '' : '-rotate-90'}`} />
                    </button>
                    {groupOpen && (
                      <div className="relative before:absolute before:bottom-1 before:left-[1.4rem] before:top-1 before:w-px before:bg-outline-variant">
                        {e.items.map(item => leaf(item, true))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
        {!isGuest && !collapsed && (
          <div className="mx-1 mt-2 rounded-xl bg-tertiary-soft p-3">
            <div className="mb-1 flex items-center gap-1.5 text-label-sm uppercase text-tertiary"><ShieldCheck size={15} /> {t('safety.title')}</div>
            <p className="m-0 text-body-sm text-on-surface-variant">{t.rich('safety.text', { price: fmtCfa(0), claim: c => <Claim>{c}</Claim> })}</p>
          </div>
        )}
      </div>
      <div className={`border-0 border-t border-solid border-outline-variant py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        <NavItem collapsed={collapsed} icon={Store} label={t('backToShop')} onClick={() => onNavigate('home')} muted />
        {!isGuest && <NavItem collapsed={collapsed} active={active === 'buyer-settings'} icon={Settings} label={t('settings')} onClick={() => onNavigate('buyer-settings')} muted />}
      </div>
    </div>
  )
}

function AccountHeader({ activeLabel, isHome, currentUser, onToggleSidebar, onBack, onNavigate, onLogout, unreadMessages, unreadNotifications, collapsed, onToggleCollapsed }: {
  activeLabel: string; isHome: boolean; currentUser?: AuthUser | null; onToggleSidebar: () => void; onBack: () => void; onNavigate: (p: any) => void; onLogout: () => void; unreadMessages?: number; unreadNotifications?: number
  /** Desktop: the sidebar is reduced to icons, and the button switching it. */
  collapsed?: boolean; onToggleCollapsed?: () => void
}) {
  const t = useT(account)
  const tc = useT(common)
  const [menuOpen, setMenuOpen] = useState(false)
  const bellRings = useIncreaseCounter(unreadNotifications ?? 0)
  const isGuest = !!currentUser?.isGuest
  const displayName = currentUser?.fullName || t('myAccount')
  const iconBtn = 'relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface-variant hover:bg-surface-container-low'
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-0 border-b border-solid border-outline-variant bg-surface-lowest px-4 lg:px-6">
      {/* Mobile: the account home opens the menu ("Dilchap · Mon compte"),
          every other page gets a back arrow + its title, as in the mockups. */}
      {isHome
        ? <button onClick={onToggleSidebar} className={`${iconBtn} -ml-2 lg:hidden`} aria-label={t('menu')}><Menu size={22} /></button>
        : <button onClick={onBack} className={`${iconBtn} -ml-2 text-on-surface lg:hidden`} aria-label={tc('back')}><Icon name="arrow_back" size={24} /></button>}
      <button onClick={() => onNavigate('home')} className={`${isHome ? 'block' : 'hidden'} cursor-pointer border-none bg-transparent p-0 lg:block`} aria-label={t('home')}><Logo size="sm" /></button>
      {/* Desktop: collapse / expand the sidebar, after a separator. */}
      {!isGuest && onToggleCollapsed && (
        <>
          <span aria-hidden className="hidden h-6 w-px bg-outline-variant lg:block" />
          <button onClick={onToggleCollapsed} title={collapsed ? t('expandMenu') : t('collapseMenu')} aria-label={collapsed ? t('expandMenu') : t('collapseMenu')} aria-expanded={!collapsed} className={`${iconBtn} hidden lg:flex`}>
            <Icon name={collapsed ? 'left_panel_open' : 'left_panel_close'} size={22} />
          </button>
        </>
      )}
      {!isGuest && currentUser?.badge && (
        <span className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-label-sm uppercase md:flex ${currentUser.badge === 'CERTIFIED' ? 'bg-tertiary-soft text-tertiary' : 'bg-verified-soft text-verified'}`}>
          <BadgeCheck size={14} /> {BADGE_LABEL[currentUser.badge]}
        </span>
      )}
      <h1 className={`m-0 min-w-0 truncate lg:hidden ${isHome ? 'text-label-md text-on-surface-variant' : 'text-headline-sm text-on-surface'}`}>{isHome ? t('myAccount') : activeLabel}</h1>
      <div className="flex-1" />
      <button onClick={() => onNavigate('buyer-messages')} className={`${iconBtn} hidden lg:flex`} aria-label={t('messages')}>
        <MessageSquare size={22} />
        {!!unreadMessages && <span className="notif-dot">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
      </button>
      {!isGuest && (
        <>
          <button onClick={() => onNavigate('buyer-notifications')} className={iconBtn} aria-label={t('notifications')}>
            <AnimatedIcon name="bell" fallback="notifications" size={22} trigger={bellRings} />
            {!!unreadNotifications && <span className="notif-dot">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
          </button>
          <button onClick={() => onNavigate('seller-post')} className="hidden cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark sm:flex">
            <PlusCircle size={18} /> {t('newItem')}
          </button>
        </>
      )}
      {/* Sub-pages on a phone: back + title + bell only, so titles fit */}
      <div className={`relative ${isHome ? '' : 'max-lg:hidden'}`}>
        <button onClick={() => setMenuOpen(o => !o)} aria-label={t('accountMenu')} aria-expanded={menuOpen} className="flex cursor-pointer items-center gap-2 rounded-full border-none bg-transparent p-1 hover:bg-surface-container-low">
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
              <div className="truncate text-body-sm text-on-surface-variant">{currentUser?.email ?? currentUser?.phone ?? ''}</div>
            </div>
            {!isGuest && <NavItem icon={Settings} label={t('accountSettings')} onClick={() => { setMenuOpen(false); onNavigate('buyer-settings') }} />}
            <button onClick={() => { setMenuOpen(false); onLogout() }} className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3 py-2.5 text-label-md text-primary hover:bg-primary-fixed/50">
              <LogOut size={20} /> {t('signOut')}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export function AccountLayout({ active, onNavigate, children, currentUser, onLogout, title, onBack, hideBottomNav, fill, immersive }: {
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
  /** Phone full-screen moment (an open conversation): no account header nor
      bottom bar below 768 px, the page brings its own compact header; the
      height follows the visual viewport (iOS keyboard) via --chat-vh. */
  immersive?: boolean
}) {
  const t = useT(account)
  const tc = useT(common)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Desktop sidebar reduced to icons (remembered).
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(SIDEBAR_KEY) === '1' } catch { return false } })
  const toggleCollapsed = () => setCollapsed(c => { try { localStorage.setItem(SIDEBAR_KEY, c ? '0' : '1') } catch { /* private mode */ } return !c })
  const { listingsCount, unreadMessages, unreadNotifications, activeDisputes } = useUnreadCounts()
  const tabs = hideBottomNav || immersive ? null : mobileTabsFor(active)
  const back = onBack ?? (() => (window.history.length > 1 ? window.history.back() : onNavigate('buyer-dashboard')))
  const isGuest = !!currentUser?.isGuest
  const go = (p: string) => { setSidebarOpen(false); onNavigate(p) }

  return (
    <div className={`safe-pt flex bg-surface ${fill ? 'h-[100dvh]' : 'h-screen'} ${immersive ? 'max-md:h-[var(--chat-vh,100dvh)]' : ''}`}>
      <aside className={`hidden shrink-0 border-0 border-r border-solid border-outline-variant bg-surface-lowest transition-[width] duration-200 lg:block ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        <SidebarContent active={active} onNavigate={go} listingsCount={listingsCount} unreadMessages={unreadMessages} activeDisputes={activeDisputes} isGuest={isGuest} collapsed={collapsed} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[9999] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="safe-pt relative flex h-full w-72 flex-col bg-surface-lowest">
            <div className="flex items-center justify-between border-0 border-b border-solid border-outline-variant px-4 py-3">
              <Logo size="sm" />
              <button onClick={() => setSidebarOpen(false)} className="flex cursor-pointer border-none bg-transparent p-1 text-on-surface-variant" aria-label={tc('close')}><X size={22} /></button>
            </div>
            <div className="min-h-0 flex-1">
              <SidebarContent active={active} onNavigate={go} listingsCount={listingsCount} unreadMessages={unreadMessages} activeDisputes={activeDisputes} isGuest={isGuest} />
            </div>
            <LanguagePicker variant="menu" className="border-0 border-t border-solid border-outline-variant" />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* A conversation about an adult listing (lib/adultMode). */}
        <AdultModeBar onLeave={() => onNavigate('home')} />
        <div className={immersive ? 'max-md:hidden' : 'contents'}>
        <AccountHeader activeLabel={title || ACCOUNT_PAGE_LABELS[active] || active} isHome={active === 'buyer-dashboard' || active === 'seller-dashboard'} currentUser={currentUser} onToggleSidebar={() => setSidebarOpen(o => !o)} onBack={back} onNavigate={onNavigate} onLogout={onLogout} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        </div>
        {!fill && <OfferBanner />}
        <main className={fill ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : `dashboard-main flex-1 overflow-auto px-4 py-5 lg:px-8 lg:py-6 ${tabs && !isGuest ? 'pb-24 lg:pb-6' : ''}`}>
          {children}
        </main>
        {!isGuest && tabs && (
          <nav aria-label={t('accountNav')} className={`${fill ? 'relative shrink-0' : 'fixed inset-x-0 bottom-0'} z-50 flex border-0 border-t border-solid border-outline-variant bg-surface-lowest pb-[env(safe-area-inset-bottom)] lg:hidden`}>
            {tabs.map(tab => {
              const on = tab.match.includes(active)
              if (tab.primary) {
                return (
                  <button key={tab.key} onClick={() => go(tab.key)} className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-none bg-transparent pb-1.5 text-label-sm text-primary">
                    <span className="-mt-5 flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px] border-solid border-surface-lowest bg-primary text-white shadow-[0_4px_14px_rgba(254,0,0,0.35)]">
                      <AnimatedIcon name={TAB_ANIM[tab.icon] ?? tab.icon} fallback={tab.icon} size={30} playOnInteract preload />
                    </span>
                    {tab.label}
                  </button>
                )
              }
              return (
                <button key={tab.key} onClick={() => go(tab.key)} className={`relative flex flex-1 cursor-pointer flex-col items-center gap-0.5 border-none bg-transparent pb-1.5 pt-2 text-label-sm ${on ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {/* Active tab plays when its page opens; any tab plays on press. */}
                  <AnimatedIcon name={TAB_ANIM[tab.icon] ?? tab.icon} fallback={tab.icon} size={24} fill={on} playOnMount={on} playOnInteract preload />
                  {tab.label}
                  {tab.key === 'buyer-messages' && !!unreadMessages && <span className="notif-dot" style={{ top: 2, right: 'calc(50% - 22px)' }}>{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
                </button>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}
