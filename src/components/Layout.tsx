import AnimatedIcon, { useIncreaseCounter } from './AnimatedIcon'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import {
  Search,
  
  Heart,
  MessageCircle,
  ChevronDown,
  SlidersHorizontal,
  Sun,
  Moon,
  LogOut,
  Settings,
  Package,
  BarChart2,
  PlusCircle,
  Home,
  CheckCircle2,
  Zap,
  CheckCheck,
  BadgeCheck,
  Handshake,
  ShieldCheck,
  Percent,
  Rocket,
} from './icons'
import Logo from './DilchapLogo'
import SearchOverlay from './SearchOverlay'
import LocationPill from './LocationPill'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'
import { FOOTER_SETTINGS_QUERY, ACTIVE_CAMPAIGN_BAR_QUERY, LEGAL_PAGES, type RemoteFooterSettings, type ActiveCampaignBar } from '../graphql/content'
import { PaymentLogos } from './PaymentLogo'
import { MY_NOTIFICATIONS_QUERY, MARK_NOTIFICATION_READ_MUTATION, MARK_ALL_NOTIFICATIONS_READ_MUTATION, type RemoteNotification, NOTIFICATION_META, notificationConversation, notificationTarget } from '../graphql/account'
import { requestOpenConversation } from '../lib/navigation'
import MsIcon from './Icon'
import { MY_CONVERSATIONS_QUERY, messagePreview, type RemoteConversation } from '../graphql/messaging'
import { formatRelativeDate } from '../lib/format'
import type { StoredLocation } from '../lib/location'

type Page =
  | 'home' | 'search' | 'flash-offers' | 'listing-detail' | 'seller-profile' | 'categories' | 'auth'
  | 'buyer-dashboard' | 'buyer-favorites' | 'buyer-messages' | 'buyer-notifications' | 'buyer-history' | 'buyer-settings'
  | 'seller-dashboard' | 'seller-post' | 'seller-edit' | 'seller-listings' | 'seller-stats' | 'seller-premium'
  | 'seller-orders' | 'seller-wallet' | 'seller-reviews' | 'seller-disputes' | 'seller-handover'
  | 'buyer-purchases' | 'buyer-receipts' | 'buyer-handover' | 'buyer-receipt' | 'buyer-dispute-new' | 'buyer-disputes'
  | 'legal'


type LayoutProps = {
  currentPage: Page
  onNavigate: (page: Page) => void
  onOpenLegal?: (slug: string) => void
  onNavigateCategory: (categoryId: string) => void
  activeCategory?: string
  dark: boolean
  onToggleDark: () => void
  children: React.ReactNode
  isLoggedIn: boolean
  currentUser?: { fullName: string; email: string; avatarUrl?: string | null; isGuest?: boolean } | null
  onToggleLogin: () => void
  onSelectListing?: (id: string) => void
  onSetSearchTerm?: (term: string) => void
  onClearCategoryFilter?: () => void
  location?: StoredLocation | null
  onLocationChange?: (location: StoredLocation) => void
}

export default function Layout({
  currentPage,
  onNavigate,
  onOpenLegal,
  onNavigateCategory,
  activeCategory = '',
  dark,
  onToggleDark,
  children,
  isLoggedIn,
  currentUser,
  onToggleLogin,
  onSelectListing,
  onSetSearchTerm,
  onClearCategoryFilter,
  location,
  onLocationChange,
}: LayoutProps) {
  const displayName = currentUser?.fullName || 'Mon compte'
  const displayInitial = displayName.charAt(0).toUpperCase()
  const [search, setSearch] = useState('')
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifMenuOpen, setNotifMenuOpen] = useState(false)
  const [msgMenuOpen, setMsgMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifMenuRef = useRef<HTMLDivElement>(null)
  const msgMenuRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const navCategories = (categoriesData?.categories ?? []).slice(0, 8)

  // BO-authored footer copy — falls back to the default copy below when
  // unconfigured, same convention as the Banner slots.
  const { data: footerData } = useQuery<{ footerSettings: RemoteFooterSettings | null }>(FOOTER_SETTINGS_QUERY)
  const footer = footerData?.footerSettings

  // Site-wide campaign theming — a live campaign's color becomes the accent
  // for the announcement bar below (and anything else that opts into
  // --campaign-accent) without repainting --primary everywhere, which would
  // make every button/link on the site match whatever color an admin picked
  // for the current campaign.
  const { data: campaignData } = useQuery<{ activeCampaign: ActiveCampaignBar | null }>(ACTIVE_CAMPAIGN_BAR_QUERY)
  const activeCampaign = campaignData?.activeCampaign
  useEffect(() => {
    const root = document.documentElement
    if (activeCampaign?.themeColor) {
      root.style.setProperty('--campaign-accent', activeCampaign.themeColor)
    } else {
      root.style.removeProperty('--campaign-accent')
    }
    return () => { root.style.removeProperty('--campaign-accent') }
  }, [activeCampaign?.themeColor])

  const daysRemaining = activeCampaign
    ? Math.max(0, Math.ceil((new Date(activeCampaign.endsAt).getTime() - Date.now()) / 86_400_000))
    : 0

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Closing on an outside click, not just re-toggling the same button, is
  // what makes three independent header dropdowns feel like one coherent
  // menu system instead of stacking on top of each other.
  useEffect(() => {
    if (!userMenuOpen && !notifMenuOpen && !msgMenuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (userMenuRef.current?.contains(target)) return
      if (notifMenuRef.current?.contains(target)) return
      if (msgMenuRef.current?.contains(target)) return
      setUserMenuOpen(false)
      setNotifMenuOpen(false)
      setMsgMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [userMenuOpen, notifMenuOpen, msgMenuOpen])

  const showNotifBell = isLoggedIn && !currentUser?.isGuest
  const { data: notifData, refetch: refetchNotifs } = useQuery<{ myNotifications: RemoteNotification[] }>(MY_NOTIFICATIONS_QUERY, {
    skip: !showNotifBell,
    pollInterval: 30_000,
  })
  const notifications = notifData?.myNotifications ?? []
  const unreadNotifCount = notifications.filter(n => !n.readAt).length
  const bellRings = useIncreaseCounter(unreadNotifCount)
  const [markNotificationRead] = useMutation(MARK_NOTIFICATION_READ_MUTATION)
  const [markAllNotificationsRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ_MUTATION)
  const markAllRead = () => void markAllNotificationsRead().then(() => refetchNotifs())

  const { data: convData } = useQuery<{ myConversations: RemoteConversation[] }>(MY_CONVERSATIONS_QUERY, {
    skip: !isLoggedIn,
    pollInterval: 30_000,
  })
  const conversations = convData?.myConversations ?? []
  const unreadMsgCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  const openNotification = (n: RemoteNotification) => {
    if (!n.readAt) void markNotificationRead({ variables: { id: n.id } }).then(() => refetchNotifs())
    setNotifMenuOpen(false)
    const conversationId = notificationConversation(n)
    const target = notificationTarget(n)
    if (conversationId) requestOpenConversation(conversationId)
    else if (target) onNavigate(target as Page)
    else if (n.listingId) onSelectListing?.(n.listingId)
    else onNavigate('buyer-notifications')
  }

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const openSearchOverlay = () => {
    setSearch('')
    setSearchOverlayOpen(true)
  }

  const handleSearchSubmit = () => {
    onClearCategoryFilter?.()
    onSetSearchTerm?.(search)
    setSearchOverlayOpen(false)
    onNavigate('search')
  }

  const accountLinks = currentUser?.isGuest ? [] : [
    { icon: Home, label: 'Tableau de bord', page: 'buyer-dashboard' as Page },
    { icon: Package, label: 'Mes annonces', page: 'seller-listings' as Page },
    { icon: Rocket, label: 'Booster mes annonces', page: 'seller-premium' as Page },
    { icon: Heart, label: 'Mes favoris', page: 'buyer-favorites' as Page },
    { icon: BarChart2, label: 'Statistiques', page: 'seller-stats' as Page },
    { icon: Settings, label: 'Paramètres du compte', page: 'buyer-settings' as Page },
  ]

  const iconBtn = 'relative flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface'
  const dropdown = 'absolute right-0 top-full z-[200] mt-2.5 overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest shadow-float'

  return (
    <div className="safe-pt flex min-h-screen flex-col bg-surface text-on-surface">
      {/* iPhone PWA (status bar "black-translucent" + viewport-fit=cover):
          content starts below the status bar, and this opaque strip keeps
          scrolled content from showing through it. */}
      <div aria-hidden className="statusbar-backdrop bg-surface" />

      {/* Campaign announcement bar — appears automatically on every page
          while a campaign is ACTIVE and inside its date window, themed with
          the campaign's own color. No BO authoring beyond the campaign
          itself; see the Home campaign rail for the matching product grid. */}
      {activeCampaign && (
        <button
          onClick={() => onNavigate('flash-offers')}
          className="flex w-full cursor-pointer items-center justify-center gap-2 border-none px-4 py-2 text-left text-label-md text-white"
          style={{ background: 'var(--campaign-accent, var(--primary))' }}
        >
          <Zap size={14} className="shrink-0" fill="#FFFFFF" />
          {/* Name + description truncate together on one line rather than
              wrapping to several — a long campaign name/description
              shouldn't push a persistent site-wide bar to 3+ lines on a
              narrow screen. */}
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-bold">
            {activeCampaign.name}
            {activeCampaign.description && (
              <span className="font-medium opacity-90"> — {activeCampaign.description}</span>
            )}
          </span>
          {daysRemaining > 0 && (
            <span className="shrink-0 opacity-85">· se termine dans {daysRemaining}j</span>
          )}
        </button>
      )}

      {/* Listing detail brings its own mobile app bar (back + title +
          share), as in the Stitch mockup — the site header is desktop-only
          there. */}
      <header className={`safe-top sticky z-[100] bg-surface ${currentPage === 'listing-detail' ? 'hidden lg:block' : ''} shadow-[0_1px_8px_rgba(0,0,0,0.04)]`}>
        {/* Reassurance strip — desktop only */}
        <div className="hidden h-9 items-center justify-between bg-surface-container-low px-4 text-label-sm text-on-surface-variant lg:flex lg:px-12">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-tertiary"><BadgeCheck size={15} /> Mise en relation directe 100% gratuite</span>
            <span className="hidden items-center gap-1 lg:flex"><MessageCircle size={15} /> Chat direct &amp; négociation instantanée</span>
            <span className="hidden items-center gap-1 xl:flex"><Handshake size={15} /> Remise en mains propres</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('categories')} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-on-surface">Toutes les catégories</button>
            <span className="text-outline-variant">•</span>
            <button onClick={() => onNavigate('flash-offers')} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-on-surface">Bonnes affaires</button>
          </div>
        </div>

        {/* Main row */}
        <div className="flex h-16 items-center gap-3 px-4 lg:h-20 lg:gap-6 lg:px-12">
          <button onClick={() => onNavigate('home')} className="flex shrink-0 cursor-pointer items-center gap-3 border-none bg-transparent p-0" aria-label="Accueil Dilchap">
            <Logo size={isMobile ? 'sm' : 'md'} />
            <span className="hidden rounded bg-surface-container-high px-2 py-0.5 text-label-sm uppercase tracking-wider text-on-surface-variant xl:inline-block">Seconde main</span>
          </button>

          {/* Desktop search — opens the overlay (suggestions, recent
              searches, categories) rather than being a bare input. */}
          <div className="hidden min-w-0 max-w-3xl flex-1 items-center rounded-xl bg-surface-container-low p-1 lg:flex">
            {onLocationChange && (
              <>
                <LocationPill location={location} onChange={onLocationChange} />
                <div className="mx-1 h-6 w-px bg-outline-variant" />
              </>
            )}
            <button
              onClick={openSearchOverlay}
              className="flex min-w-0 flex-1 cursor-text items-center border-none bg-transparent px-3 py-2 text-left text-body-md text-on-surface-variant/70"
            >
              <span className="truncate">Rechercher un iPhone, une moto, un appartement…</span>
            </button>
            <button onClick={() => onNavigate('search')} className="cursor-pointer border-none bg-transparent p-2 text-on-surface-variant hover:text-on-surface" title="Filtres">
              <SlidersHorizontal size={19} />
            </button>
            <button onClick={openSearchOverlay} className="ml-1 flex cursor-pointer items-center justify-center rounded-lg border-none bg-primary p-2 text-white transition-colors hover:bg-primary-dark" title="Rechercher">
              <Search size={20} />
            </button>
          </div>

          <div className="ml-auto flex items-center gap-1 lg:gap-3">
            {/* Mobile: location + search icon */}
            {onLocationChange && isMobile && (
              <LocationPill location={location} onChange={onLocationChange} compact />
            )}
            <button onClick={openSearchOverlay} className={`${iconBtn} lg:hidden`} title="Rechercher">
              <Search size={21} />
            </button>

            {!currentUser?.isGuest && (
              <button
                onClick={() => { onNavigate('seller-post'); triggerToast('Création d\'une nouvelle annonce') }}
                className="hidden cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-primary px-4 py-2.5 text-label-lg text-white transition-all hover:bg-primary-dark active:scale-95 lg:flex"
              >
                <PlusCircle size={19} />
                <span>Vendre un article</span>
              </button>
            )}

            {isLoggedIn ? (
              <>
                <div className="hidden items-center gap-1 lg:flex">
                  {!currentUser?.isGuest && (
                    <button onClick={() => onNavigate('buyer-favorites')} className={iconBtn} title="Favoris">
                      <Heart size={22} />
                    </button>
                  )}

                  {/* Messages — short preview dropdown */}
                  <div ref={msgMenuRef} className="relative">
                    <button onClick={() => { setMsgMenuOpen(o => !o); setNotifMenuOpen(false); setUserMenuOpen(false) }} className={iconBtn} title="Messages">
                      <MessageCircle size={22} />
                      {unreadMsgCount > 0 && <span className="notif-dot" style={{ background: 'var(--tertiary)' }}>{unreadMsgCount > 9 ? '9+' : unreadMsgCount}</span>}
                    </button>
                    {msgMenuOpen && (
                      <div className={`${dropdown} w-80 max-w-[90vw]`}>
                        <div className="border-b border-outline-variant px-4 py-3 text-label-lg">Messages</div>
                        <div className="max-h-[360px] overflow-y-auto">
                          {conversations.length === 0 && (
                            <p className="m-0 p-5 text-center text-body-sm text-on-surface-variant">Aucune conversation.</p>
                          )}
                          {conversations.slice(0, 5).map(c => (
                            <button
                              key={c.id}
                              onClick={() => { setMsgMenuOpen(false); onNavigate('buyer-messages') }}
                              className={`flex w-full cursor-pointer items-center gap-2.5 border-0 border-b border-solid border-surface-container-low px-4 py-2.5 text-left text-on-surface ${c.unreadCount > 0 ? 'bg-primary-fixed/40' : 'bg-transparent'} hover:bg-surface-container-low`}
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high font-bold text-on-surface-variant">
                                {c.otherParticipant.avatarUrl
                                  ? <img src={c.otherParticipant.avatarUrl} alt="" className="h-full w-full object-cover" />
                                  : c.otherParticipant.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between gap-1.5">
                                  <span className={`truncate text-label-md ${c.unreadCount > 0 ? 'font-extrabold' : ''}`}>{c.otherParticipant.fullName}</span>
                                  <span className="shrink-0 text-[11px] text-outline">{c.lastMessageAt ? formatRelativeDate(c.lastMessageAt) : ''}</span>
                                </div>
                                <p className="m-0 truncate text-body-sm text-on-surface-variant">{messagePreview(c.lastMessage) || 'Nouvelle conversation'}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <button onClick={() => { setMsgMenuOpen(false); onNavigate('buyer-messages') }} className="block w-full cursor-pointer border-0 border-t border-solid border-outline-variant bg-transparent px-4 py-2.5 text-center text-label-md text-primary">
                          Voir tout
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notifications — preview before committing to leave the page */}
                  {!currentUser?.isGuest && (
                    <div ref={notifMenuRef} className="relative">
                      <button onClick={() => { setNotifMenuOpen(o => !o); setMsgMenuOpen(false); setUserMenuOpen(false) }} className={iconBtn} title="Notifications">
                        <AnimatedIcon name="bell" fallback="notifications" size={22} trigger={bellRings} />
                        {unreadNotifCount > 0 && <span className="notif-dot">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>}
                      </button>
                      {notifMenuOpen && (
                        <div className={`${dropdown} w-[340px] max-w-[90vw]`}>
                          <div className="flex items-center gap-2 border-b border-outline-variant px-4 py-3">
                            <span className="text-label-lg">Notifications</span>
                            {unreadNotifCount > 0 && (
                              <span className="rounded-full bg-primary-fixed px-2 text-[11px] font-bold text-primary">{unreadNotifCount}</span>
                            )}
                            {unreadNotifCount > 0 && (
                              <button onClick={markAllRead} className="ml-auto flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-[12px] font-bold text-on-surface-variant">
                                <CheckCheck size={13} /> Tout marquer lu
                              </button>
                            )}
                          </div>
                          <div className="max-h-[380px] overflow-y-auto p-1.5">
                            {notifications.length === 0 && (
                              <p className="m-0 px-4 py-6 text-center text-body-sm text-on-surface-variant">Aucune notification pour l'instant.</p>
                            )}
                            {notifications.slice(0, 5).map(n => {
                              const meta = NOTIFICATION_META[n.type] ?? NOTIFICATION_META.LISTING_STATUS_CHANGED
                              return (
                                <button
                                  key={n.id}
                                  onClick={() => openNotification(n)}
                                  className={`mb-0.5 flex w-full cursor-pointer items-start gap-2.5 rounded-xl border-none p-2.5 text-left text-on-surface ${n.readAt ? 'bg-transparent hover:bg-surface-container-low' : 'bg-primary-fixed/40 hover:bg-primary-fixed/70'}`}
                                >
                                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.cls}`}>
                                    <MsIcon name={meta.icon} size={17} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex justify-between gap-2">
                                      <span className={`truncate text-label-md ${n.readAt ? '' : 'font-extrabold'}`}>{n.title}</span>
                                      <span className="mt-px shrink-0 text-[11px] text-outline">{formatRelativeDate(n.createdAt)}</span>
                                    </div>
                                    <p className="m-0 mt-0.5 truncate text-body-sm text-on-surface-variant">{n.body}</p>
                                  </div>
                                  {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                                </button>
                              )
                            })}
                          </div>
                          <button onClick={() => { setNotifMenuOpen(false); onNavigate('buyer-notifications') }} className="block w-full cursor-pointer border-0 border-t border-solid border-outline-variant bg-transparent px-4 py-2.5 text-center text-label-md text-primary">
                            Voir tout
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Mobile bell — straight to the page, no dropdown */}
                {!currentUser?.isGuest && (
                  <button onClick={() => onNavigate('buyer-notifications')} className={`${iconBtn} lg:hidden`} title="Notifications">
                    <AnimatedIcon name="bell" fallback="notifications" size={21} trigger={bellRings} />
                    {unreadNotifCount > 0 && <span className="notif-dot">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>}
                  </button>
                )}

                <div className="mx-1 hidden h-7 w-px bg-surface-container-high lg:block" />

                {/* Account menu */}
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => { setUserMenuOpen(o => !o); setNotifMenuOpen(false); setMsgMenuOpen(false) }}
                    className="flex cursor-pointer items-center gap-2 rounded-full border-none bg-transparent py-1 pl-1 pr-1 transition-colors hover:bg-surface-container-low lg:pr-2"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[14px] font-bold text-white">
                      {currentUser?.avatarUrl
                        ? <img src={currentUser.avatarUrl} alt="" className="h-full w-full object-cover" />
                        : displayInitial}
                    </div>
                    <div className="hidden flex-col text-left lg:flex">
                      <span className="text-label-md leading-tight text-on-surface">Mon compte</span>
                      <span className="max-w-[120px] truncate text-label-sm leading-tight text-tertiary">{displayName.split(' ')[0]}</span>
                    </div>
                    <ChevronDown size={15} className="hidden text-on-surface-variant lg:inline" />
                  </button>

                  {userMenuOpen && (
                    <div className={`${dropdown} w-64 p-2`}>
                      <div className="mb-1.5 border-b border-outline-variant px-3 py-3">
                        <div className="text-label-lg">{displayName}</div>
                        <div className="mt-0.5 truncate text-body-sm text-on-surface-variant">{currentUser?.email ?? ''}</div>
                      </div>

                      {/* Everyone on Dilchap can both buy and sell — one
                          unified account space. A guest identity (see
                          AuthService.guestLogin) has no such account
                          behind it, so this space stays hidden. */}
                      {accountLinks.map(item => (
                        <button
                          key={item.page}
                          onClick={() => { onNavigate(item.page); setUserMenuOpen(false) }}
                          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md text-on-surface hover:bg-surface-container-low"
                        >
                          <item.icon size={17} className="text-on-surface-variant" />
                          {item.label}
                        </button>
                      ))}

                      <button
                        onClick={() => { onToggleDark(); setUserMenuOpen(false) }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md text-on-surface hover:bg-surface-container-low"
                      >
                        {dark ? <Sun size={17} className="text-amber-600" /> : <Moon size={17} className="text-on-surface-variant" />}
                        {dark ? 'Mode clair' : 'Mode sombre'}
                      </button>

                      <div className="mt-1.5 border-t border-outline-variant pt-1.5">
                        <button
                          onClick={() => { onToggleLogin(); setUserMenuOpen(false) }}
                          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md text-primary hover:bg-primary-fixed/40"
                        >
                          <LogOut size={17} />
                          Se déconnecter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => onNavigate('auth')}
                className="cursor-pointer whitespace-nowrap rounded-lg border-[1.5px] border-solid border-on-surface bg-surface-lowest px-3 py-2 text-label-md text-on-surface transition-colors hover:bg-surface-container-low lg:px-4 lg:py-2.5"
              >
                Se connecter
              </button>
            )}
          </div>
        </div>

        {/* Category nav — real categories, desktop only (mobile reaches
            them from the home rail and the search page). */}
        <nav className="hidden h-11 items-center gap-8 overflow-x-auto whitespace-nowrap px-4 [scrollbar-width:none] lg:flex lg:px-12">
          {[
            { key: 'home', label: 'Nouveautés', active: currentPage === 'home', onClick: () => onNavigate('home') },
            ...navCategories.map(c => ({
              key: c.slug, label: c.name, active: currentPage === 'search' && activeCategory === c.slug, onClick: () => onNavigateCategory(c.slug),
            })),
            { key: 'flash', label: 'Bonnes affaires', active: currentPage === 'flash-offers', onClick: () => onNavigate('flash-offers') },
          ].map(item => (
            <button
              key={item.key}
              onClick={item.onClick}
              className={`cursor-pointer border-0 border-b-2 border-solid bg-transparent px-0 pb-2 pt-1 text-label-md transition-colors ${item.active ? 'border-primary font-bold text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content View */}
      <main className={`page-enter flex-1 ${isMobile && currentPage !== 'listing-detail' ? 'pb-24' : ''}`}>
        {children}
      </main>

      {/* Toast Notification Floating Alert */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <CheckCircle2 size={18} style={{ color: 'var(--tertiary)' }} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Reassurance band + footer — desktop only: the mobile mockups end
          each page on its content, above the bottom nav. */}
      <section className="mt-16 hidden bg-surface-container px-4 py-8 lg:block lg:px-12">
        <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Percent, title: '0% Commission', text: 'Publiez et achetez librement, sans frais cachés ni commission prélevée.', accent: true },
            { icon: MessageCircle, title: 'Négociation par chat', text: 'Discutez directement avec le vendeur et convenez du meilleur prix.' },
            { icon: Handshake, title: 'Remise en main propre', text: 'Inspectez l\'article en personne avant de payer, dans un lieu public.' },
            { icon: ShieldCheck, title: 'Profils vérifiés', text: 'Vendeurs notés par la communauté pour échanger en toute confiance.' },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.accent ? 'bg-tertiary text-white' : 'bg-surface-container-highest text-on-surface'}`}>
                <item.icon size={20} />
              </div>
              <div>
                <div className="text-headline-sm text-on-surface">{item.title}</div>
                <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer — copy is BO-editable (FooterSettings), with fallbacks */}
      <footer className="hidden bg-surface px-4 pb-8 pt-12 lg:block lg:px-12">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <Logo size="lg" />
              <p className="mt-4 max-w-md text-body-md text-on-surface-variant">
                {footer?.tagline ||
                  "Dilchap rend l'achat et la vente entre particuliers simples, fluides et sécurisés en Côte d'Ivoire."}
              </p>
            </div>

            <div>
              <h4 className="mb-4 mt-0 text-label-lg text-on-surface">Recherches rapides</h4>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {(footer?.quickLinks?.length ? footer.quickLinks : [
                  { label: 'Appartements à Abidjan Cocody', query: 'appartement' },
                  { label: 'iPhone 15 Pro Max', query: 'iPhone 15' },
                  { label: 'Toyota RAV4 & Hilux', query: 'Toyota' },
                  { label: 'Robes & sacs de marque', query: 'robe' },
                  { label: 'Services de déménagement', query: 'déménagement' },
                ]).map(item => (
                  <li key={item.label}>
                    <button onClick={() => { onClearCategoryFilter?.(); onSetSearchTerm?.(item.query); onNavigate('search') }} className="cursor-pointer border-none bg-transparent p-0 text-left text-body-sm text-on-surface-variant hover:text-primary">
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 mt-0 text-label-lg text-on-surface">Espace membre</h4>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {(currentUser?.isGuest ? [] : [
                  { label: 'Vendre un article', page: 'seller-post' as Page },
                  { label: 'Mes favoris', page: 'buyer-favorites' as Page },
                  { label: 'Mon tableau de bord', page: 'buyer-dashboard' as Page },
                  { label: 'Booster mes annonces', page: 'seller-premium' as Page },
                  { label: 'Paramètres & sécurité', page: 'buyer-settings' as Page },
                ]).map(item => (
                  <li key={item.label}>
                    <button onClick={() => onNavigate(isLoggedIn ? item.page : 'auth')} className="cursor-pointer border-none bg-transparent p-0 text-left text-body-sm text-on-surface-variant hover:text-primary">
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 mt-0 text-label-lg text-on-surface">Assistance</h4>
              <p className="m-0 text-body-sm text-on-surface-variant">
                {footer?.supportCities || 'Abidjan • Bouaké • Yamoussoukro • San-Pédro • Daloa • Korhogo'}
              </p>
              <p className="mb-0 mt-3 text-label-md text-primary">Support 7j/7 : {footer?.supportPhone || '+225 07 00 00 00 00'}</p>
              <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
                {LEGAL_PAGES.map(p => (
                  <li key={p.slug}>
                    <button onClick={() => onOpenLegal?.(p.slug)} className="cursor-pointer border-none bg-transparent p-0 text-left text-body-sm text-on-surface-variant hover:text-primary">{p.label}</button>
                  </li>
                ))}
              </ul>
              <PaymentLogos className="mt-4" size={26} />
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-6 text-label-sm text-on-surface-variant">
            <p className="m-0">
              {footer?.copyrightText || '© 2026 Dilchap. Tous droits réservés.'}
            </p>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Mise en relation sécurisée · Fait en Côte d'Ivoire</span>
          </div>
        </div>
      </footer>

      {/* Search Overlay */}
      {searchOverlayOpen && (
        <SearchOverlay
          query={search}
          onQueryChange={setSearch}
          onSearch={handleSearchSubmit}
          onSelectListing={onSelectListing ?? (() => onNavigate('search'))}
          onSelectCategory={onNavigateCategory}
          onClose={() => setSearchOverlayOpen(false)}
          onNavigate={onNavigate}
        />
      )}

      {/* Mobile Bottom Navigation — hidden on listing-detail, which has its
          own contextual "Contacter" bar in the same fixed bottom slot. */}
      {isMobile && currentPage !== 'listing-detail' && (
        <nav
          aria-label="Navigation principale"
          className="fixed inset-x-0 bottom-0 z-[300] grid grid-cols-5 border-0 border-t border-solid border-outline-variant bg-surface-lowest"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {[
            // anim: Iconsax Lottie (src/assets/lottie) — plays when the tab
            // becomes active and on press; ms: Material fallback.
            { label: 'Accueil', anim: 'nav-home', ms: 'home', page: 'home' as Page },
            { label: 'Recherche', anim: 'empty-search', ms: 'search', page: 'search' as Page },
            { label: 'Vendre', anim: 'nav-add', ms: 'add', page: 'seller-post' as Page, primary: true },
            { label: 'Messages', anim: 'empty-messages', ms: 'chat', page: (isLoggedIn ? 'buyer-messages' : 'auth') as Page, badge: unreadMsgCount },
            { label: 'Compte', anim: 'nav-profile', ms: 'person', page: (currentUser?.isGuest ? 'buyer-messages' : isLoggedIn ? 'buyer-dashboard' : 'auth') as Page },
          ].map(item => {
            const isActive = currentPage === item.page

            if (item.primary) {
              return (
                <button key={item.label} onClick={() => onNavigate(item.page)} className="flex cursor-pointer flex-col items-center justify-end gap-0.5 border-none bg-transparent pb-1.5 text-[11px] font-bold text-primary">
                  <span className="-mt-5 flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px] border-solid border-surface-lowest bg-primary shadow-[0_4px_14px_rgba(254, 0, 0,0.4)]">
                    <AnimatedIcon name={item.anim} fallback={item.ms} size={28} className="text-white" playOnInteract />
                  </span>
                  {item.label}
                </button>
              )
            }

            return (
              <button
                key={item.label}
                onClick={() => onNavigate(item.page)}
                className={`relative flex cursor-pointer flex-col items-center justify-end gap-0.5 border-none bg-transparent pb-1.5 pt-2 text-[11px] ${isActive ? 'font-bold text-primary' : 'font-medium text-on-surface-variant'}`}
              >
                <span className="relative">
                  <AnimatedIcon name={item.anim} fallback={item.ms} size={24} fill={isActive} trigger={isActive} playOnInteract />
                  {!!item.badge && <span className="notif-dot" style={{ top: -6, right: -10 }}>{item.badge > 9 ? '9+' : item.badge}</span>}
                </span>
                {item.label}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
