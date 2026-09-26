import { useState, useEffect, useRef, Suspense, startTransition } from 'react'
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react'
import Layout from './components/Layout'
import { InstallBanner, PushBanner, UpdateBanner, isSnoozed, snooze } from './components/AppBanners'
import PaymentReturn from './components/PaymentReturn'
import { LOGOUT_MUTATION, ME_QUERY, type AuthUser } from './graphql/auth'
import { MY_FAVORITE_IDS_QUERY, TOGGLE_FAVORITE_MUTATION } from './graphql/favorites'
import { NAVIGATE_EVENT } from './lib/navigation'
import { clearTokens, getAccessToken, getRefreshToken, SESSION_EXPIRED_EVENT } from './lib/auth'
import { detectLocationFromIP, getStoredLocation, setStoredLocation, type StoredLocation } from './lib/location'
import { applyServiceWorkerUpdate, SW_UPDATE_EVENT } from './lib/serviceWorker'
import { subscribeToPush, type PushSubscriptionResult } from './lib/pushNotifications'
import Home, { type SearchPreset } from './pages/Home'
import { lazyPage, preloadPages } from './lib/lazyPage'

// Home is the landing page and ships in the entry chunk; every other page is
// its own chunk so a first visit only downloads what it renders (recharts,
// tiptap and the seller hub stay out of the storefront bundle).
const SearchPage = lazyPage(() => import('./pages/Search'))
const ListingDetail = lazyPage(() => import('./pages/ListingDetail'))
const SellerProfile = lazyPage(() => import('./pages/SellerProfile'))
const Categories = lazyPage(() => import('./pages/Categories'))
const Auth = lazyPage(() => import('./pages/Auth'))
const FlashOffers = lazyPage(() => import('./pages/FlashOffers'))
const Orders = lazyPage(() => import('./pages/seller/Orders'))
const Wallet = lazyPage(() => import('./pages/seller/Wallet'))
const SellerReviews = lazyPage(() => import('./pages/seller/Reviews'))
const SellerStats = lazyPage(() => import('./pages/seller/Stats'))
const Disputes = lazyPage(() => import('./pages/seller/Disputes'))
const Handover = lazyPage(() => import('./pages/seller/Handover'))
const Settings = lazyPage(() => import('./pages/seller/Settings'))
const Purchases = lazyPage(() => import('./pages/buyer/Purchases'))
const HandoverCode = lazyPage(() => import('./pages/buyer/HandoverCode'))
const Receipt = lazyPage(() => import('./pages/buyer/Receipt'))
const OpenDispute = lazyPage(() => import('./pages/buyer/OpenDispute'))
const DisputeFollow = lazyPage(() => import('./pages/buyer/DisputeFollow'))
const BuyerMessages = lazyPage(() => import('./pages/buyer/Messages'))
const Dashboard = lazyPage(() => import('./pages/account/Dashboard'))
const Favorites = lazyPage(() => import('./pages/buyer/Favorites'))
const Notifications = lazyPage(() => import('./pages/buyer/Notifications'))
const History = lazyPage(() => import('./pages/buyer/History'))
const PostListing = lazyPage(() => import('./pages/seller/PostListing'))
const SellerListings = lazyPage(() => import('./pages/seller/MyListings'))
const SellerPremium = lazyPage(() => import('./pages/seller/Booster'))
const Legal = lazyPage(() => import('./pages/Legal'))

// Admin BO control lives in the dedicated Backoffice app (real, GraphQL-wired)
// — this Frontend app never had a real admin surface, just a mock
// placeholder from the original scaffold with no nav link ever pointing to
// it (see Phase 1 audit). Removed rather than maintained as a second,
// disconnected "admin" UI.
type Page =
  | 'home' | 'search' | 'flash-offers' | 'listing-detail' | 'seller-profile' | 'categories' | 'auth'
  | 'buyer-dashboard' | 'buyer-favorites' | 'buyer-messages' | 'buyer-notifications' | 'buyer-history' | 'buyer-settings'
  | 'seller-dashboard' | 'seller-post' | 'seller-edit' | 'seller-listings' | 'seller-stats' | 'seller-premium'
  | 'seller-orders' | 'seller-wallet' | 'seller-reviews' | 'seller-disputes' | 'seller-handover'
  | 'buyer-purchases' | 'buyer-receipts' | 'buyer-handover' | 'buyer-receipt' | 'buyer-dispute-new' | 'buyer-disputes'
  | 'legal'

// The app never changes the URL (pushState is only used to make the browser
// back/forward buttons work), so a hard reload always re-mounts at the
// initial state. Session storage survives a reload (unlike history.state,
// which some browsers drop) and lets us restore where the user actually was.
type NavState = {
  page: Page
  selectedListingId: string
  selectedSellerId: string
  searchTerm: string
  searchCity: string
  categoryFilter: string
  selectedOrderId?: string
  selectedDisputeId?: string
  legalSlug?: string
}
const NAV_STORAGE_KEY = 'yupixi_nav_state'

function loadNavState(): Partial<NavState> {
  try {
    const raw = sessionStorage.getItem(NAV_STORAGE_KEY)
    return raw ? JSON.parse(raw) as Partial<NavState> : {}
  } catch {
    return {}
  }
}
const savedNav = loadNavState()

// PWA manifest shortcuts (long-press the home screen icon) launch with
// `?shortcut=<page>` — a real page, not session-restore, takes priority.
const SHORTCUT_PAGES: Page[] = ['seller-post', 'buyer-messages', 'flash-offers']
function shortcutPage(): Page | null {
  const requested = new URLSearchParams(window.location.search).get('shortcut')
  return SHORTCUT_PAGES.includes(requested as Page) ? (requested as Page) : null
}

// "Partager l'annonce" needs a link that actually opens the listing for
// whoever receives it — the app otherwise never puts state in the URL, so
// a shared `window.location.href` would just be the homepage.
function sharedSellerId(): string | null {
  return new URLSearchParams(window.location.search).get('seller')
}

// "?legal=cgu" opens a legal page (shareable, linked from sign-up).
function sharedLegalSlug(): string | null {
  return new URLSearchParams(window.location.search).get('legal')
}

function sharedListingId(): string | null {
  return new URLSearchParams(window.location.search).get('listing')
}

export default function App() {
  const [page, setPage] = useState<Page>(sharedLegalSlug() ? 'legal' : sharedListingId() ? 'listing-detail' : sharedSellerId() ? 'seller-profile' : (shortcutPage() ?? savedNav.page ?? 'home'))
  const [legalSlug, setLegalSlug] = useState(sharedLegalSlug() ?? savedNav.legalSlug ?? 'cgu')
  const [dark, setDark] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getAccessToken())
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [selectedListingId, setSelectedListingId] = useState(sharedListingId() ?? savedNav.selectedListingId ?? 'l1')
  const [searchTerm, setSearchTerm] = useState(savedNav.searchTerm ?? '')
  const [searchCity, setSearchCity] = useState(savedNav.searchCity ?? 'Abidjan')
  const [selectedSellerId, setSelectedSellerId] = useState(sharedSellerId() ?? savedNav.selectedSellerId ?? 's1')
  // Transient — consumed once by BuyerMessages on mount to start/open the
  // right conversation, not part of the session-restored nav state.
  const [contactSeller, setContactSeller] = useState<{ listingId?: string; sellerId: string } | null>(null)
  const [categoryFilter, setCategoryFilter] = useState(savedNav.categoryFilter ?? '')
  const [selectedOrderId, setSelectedOrderId] = useState(savedNav.selectedOrderId ?? '')
  const [selectedDisputeId, setSelectedDisputeId] = useState(savedNav.selectedDisputeId ?? '')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [pushStatus, setPushStatus] = useState<PushSubscriptionResult | null>(null)
  const [enablingPush, setEnablingPush] = useState(false)
  const [pushDismissed, setPushDismissed] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [location, setLocation] = useState<StoredLocation | null>(() => getStoredLocation())

  // Only ever runs the IP lookup once per browser — a stored value (even a
  // manually-cleared "all countries" one) means we already know what to do
  // and silently re-detecting would override a deliberate user choice.
  useEffect(() => {
    if (location) return
    let cancelled = false
    void detectLocationFromIP().then(detected => {
      if (cancelled || !detected) return
      setStoredLocation(detected)
      setLocation(detected)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeLocation = (next: StoredLocation) => {
    setStoredLocation(next)
    setLocation(next)
  }

  useEffect(() => {
    const onUpdateAvailable = () => setShowUpdateBanner(true)
    window.addEventListener(SW_UPDATE_EVENT, onUpdateAvailable)
    return () => window.removeEventListener(SW_UPDATE_EVENT, onUpdateAvailable)
  }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [fetchMe] = useLazyQuery<{ me: AuthUser }>(ME_QUERY)
  const [logoutMutation] = useMutation<{ logout: boolean }>(LOGOUT_MUTATION)

  // A silent token refresh can fail well after mount (token expired/revoked
  // mid-session) — apollo.ts clears storage but has no way to touch React
  // state, so it dispatches this event instead.
  useEffect(() => {
    const onSessionExpired = () => {
      setIsLoggedIn(false)
      setCurrentUser(null)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
  }, [])

  const { data: favoritesData, refetch: refetchFavorites } = useQuery<{ myFavoriteIds: string[] }>(
    MY_FAVORITE_IDS_QUERY,
    { skip: !isLoggedIn },
  )
  const favorites = favoritesData?.myFavoriteIds ?? []
  const [toggleFavoriteMutation] = useMutation<{ toggleFavorite: boolean }>(TOGGLE_FAVORITE_MUTATION)

  // Restore the session on load: a stored access token doesn't mean it's
  // still valid, so confirm with `me` (the Apollo error link transparently
  // refreshes an expired token before this rejects).
  useEffect(() => {
    if (!getAccessToken()) return
    let cancelled = false
    fetchMe()
      .then(({ data }) => {
        if (cancelled) return
        if (data?.me) {
          setCurrentUser(data.me)
          setIsLoggedIn(true)
          // Refresh an existing subscription after restoring the session.
          // A new permission prompt must be triggered from the settings UI.
          void subscribeToPush(false).then(result => { if (!cancelled) setPushStatus(result) })
        } else {
          clearTokens()
          setIsLoggedIn(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTokens()
          setIsLoggedIn(false)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (isMobile && !isSnoozed('install')) setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    const installed = () => { setDeferredPrompt(null); setShowInstallBanner(false); setShowInstallGuide(false) }
    window.addEventListener('appinstalled', installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isMobile && !isStandalone && !isSnoozed('install')) {
      const timer = setTimeout(() => setShowInstallBanner(true), 5000)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handler)
        window.removeEventListener('appinstalled', installed)
      }
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installed)
    }
  }, [isMobile])

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(() => { setDeferredPrompt(null); setShowInstallBanner(false) })
    } else {
      setShowInstallGuide(true)
    }
  }

  const handleDismiss = () => {
    snooze('install')
    setShowInstallBanner(false)
    setShowInstallGuide(false)
  }

  const [searchPreset, setSearchPreset] = useState<SearchPreset | null>(null)
  const searchFromHome = (term: string, preset?: SearchPreset) => {
    setCategoryFilter('')
    setSearchTerm(term)
    setSearchPreset(preset ?? null)
    navigate('search')
  }

  const navigateToCategory = (cat: string) => {
    setCategoryFilter(cat)
    setSearchTerm('')
    navigate('search')
  }

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // Native back/forward navigation through the browser history
  useEffect(() => {
    const onPop = () => {
      const st = window.history.state
      // Same transition as navigate() — the current page stays up while the
      // target page's chunk loads.
      startTransition(() => {
        if (st && typeof st.__yupixiPage === 'string') {
          // Restore the selection the entry was pushed with too — otherwise
          // "back" to an order or listing shows whatever was selected last.
          if (st.listingId) setSelectedListingId(st.listingId)
          if (st.sellerId) setSelectedSellerId(st.sellerId)
          if (st.orderId !== undefined) setSelectedOrderId(st.orderId)
          if (st.disputeId !== undefined) setSelectedDisputeId(st.disputeId)
          if (st.legalSlug) setLegalSlug(st.legalSlug)
          setPage(st.__yupixiPage)
        } else {
          setPage('home')
        }
      })
    }
    // The entry the app was loaded on (session restore, shared link) may
    // carry no state, or a stale one: tag it with the page actually shown,
    // so coming back to it restores that page rather than home.
    if (window.history.state?.__yupixiPage !== page) {
      window.history.replaceState({ __yupixiPage: page, listingId: selectedListingId, sellerId: selectedSellerId, orderId: selectedOrderId, disputeId: selectedDisputeId }, '')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // The storefront pages a visitor is most likely to open next.
  useEffect(() => {
    preloadPages([SearchPage, ListingDetail, SellerProfile, Categories])
  }, [])

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  // Persist navigation state so a hard reload lands back where the user was.
  useEffect(() => {
    const state: NavState = {
      page, selectedListingId, selectedSellerId, searchTerm, searchCity, categoryFilter, selectedOrderId, selectedDisputeId, legalSlug,
    }
    sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(state))
  }, [page, selectedListingId, selectedSellerId, searchTerm, searchCity, categoryFilter, selectedOrderId, selectedDisputeId, legalSlug])

  type Selection = { listingId?: string; sellerId?: string; orderId?: string; disputeId?: string; legalSlug?: string }
  const historyEntry = (p: Page, sel: Selection = {}) => ({
    __yupixiPage: p,
    listingId: selectedListingId, sellerId: selectedSellerId, orderId: selectedOrderId, disputeId: selectedDisputeId, legalSlug,
    ...sel,
  })

  // Where to land after signing in: the page the visitor was on (or tried to
  // open) when they were sent to the auth screen, instead of always home.
  const [authReturn, setAuthReturn] = useState<Page | null>(null)

  const isAccountPage = (p: Page) => (p.startsWith('seller-') && p !== 'seller-profile') || p.startsWith('buyer-')

  // `sel` = the selection that goes with this page, recorded in the history
  // entry so back/forward restores it (the state setters haven't applied yet).
  const navigate = (p: Page, sel?: Selection) => {
    // Account pages need a session: go straight to auth rather than mounting
    // the page and bouncing from an effect, which left the account page in
    // the history and trapped the back button in a redirect loop.
    if (isAccountPage(p) && !isLoggedIn) {
      setAuthReturn(p)
      p = 'auth'
    } else if (p === 'auth' && page !== 'auth') {
      setAuthReturn(page)
    }
    // A transition keeps the current page on screen while the next page's
    // chunk loads, instead of flashing the Suspense fallback.
    startTransition(() => setPage(p))
    window.history.pushState(historyEntry(p, sel), '')
  }

  // Page requests from components without an onNavigate prop (lib/navigation).
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  useEffect(() => {
    const onRequest = (e: Event) => navigateRef.current((e as CustomEvent<Page>).detail)
    window.addEventListener(NAVIGATE_EVENT, onRequest)
    return () => window.removeEventListener(NAVIGATE_EVENT, onRequest)
  }, [])

  const replacePage = (p: Page) => {
    setPage(p)
    window.history.replaceState(historyEntry(p), '')
  }

  // Same guard for pages reached without navigate(): session restore after a
  // reload, browser back/forward, or a session that just expired.
  useEffect(() => {
    if (isAccountPage(page) && !isLoggedIn) {
      setAuthReturn(page)
      replacePage('auth')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, isLoggedIn])

  const openLegal = (slug: string) => {
    setLegalSlug(slug)
    navigate('legal', { legalSlug: slug })
  }

  const selectListing = (id: string) => {
    setSelectedListingId(id)
    navigate('listing-detail', { listingId: id })
  }

  const editListing = (id: string) => {
    setSelectedListingId(id)
    navigate('seller-edit', { listingId: id })
  }

  const selectSeller = (id: string) => {
    setSelectedSellerId(id)
    navigate('seller-profile', { sellerId: id })
  }

  const openHandover = (orderId: string) => {
    setSelectedOrderId(orderId)
    navigate('seller-handover', { orderId })
  }

  const openDispute = (disputeId: string) => {
    setSelectedDisputeId(disputeId)
    navigate('seller-disputes', { disputeId })
  }

  const openPurchase = (orderId: string, target: Page) => {
    setSelectedOrderId(orderId)
    navigate(target, { orderId })
  }

  const openBuyerDispute = (disputeId: string) => {
    setSelectedDisputeId(disputeId)
    navigate('buyer-disputes', { disputeId })
  }

  const contactSellerAbout = (sellerId: string, listingId?: string) => {
    setContactSeller({ listingId, sellerId })
    navigate('buyer-messages')
  }

  // Shared by the full-page Auth screen and the inline guest-messaging flow
  // on ListingDetail (see InlineConversation) — both just need React state
  // to catch up after tokens are already stored.
  const handleAuthenticated = () => {
    setIsLoggedIn(true)
    void fetchMe().then(({ data }) => data?.me && setCurrentUser(data.me))
    // Permission must be requested by a direct click, not after the async login.
    setPushDismissed(false)
    void subscribeToPush(false).then(setPushStatus)
  }

  const enablePush = async () => {
    setEnablingPush(true)
    try {
      setPushStatus(await subscribeToPush(true))
    } finally {
      setEnablingPush(false)
    }
  }

  const toggleFavorite = (id: string) => {
    if (!isLoggedIn) {
      navigate('auth')
      return Promise.resolve()
    }
    return toggleFavoriteMutation({ variables: { listingId: id } }).then(() => {
      void refetchFavorites()
    })
  }

  const logout = () => {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      // Best-effort: revoke server-side so the refresh token can't be reused
      // even if it leaked. Local state is cleared regardless of the result.
      void logoutMutation({ variables: { refreshToken } }).catch(() => undefined)
    }
    clearTokens()
    setIsLoggedIn(false)
    setCurrentUser(null)
    replacePage('home')
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} onCategorySelect={navigateToCategory} currentUser={currentUser} location={location} onContactSeller={contactSellerAbout} onSearch={searchFromHome} />
      case 'search':
        return <SearchPage onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} categoryFilter={categoryFilter} onClearCategoryFilter={() => setCategoryFilter('')} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} selectedCity={searchPreset?.city ?? location?.city ?? ''} initialMaxPrice={searchPreset?.maxPrice} onCityChange={setSearchCity} onCategorySelect={navigateToCategory} currentUserId={currentUser?.id} isLoggedIn={isLoggedIn && !currentUser?.isGuest} onContactSeller={contactSellerAbout} />
      case 'listing-detail':
        return <ListingDetail listingId={selectedListingId} onNavigate={navigate} onSelectListing={selectListing} onSelectSeller={selectSeller} favorites={favorites} onToggleFavorite={toggleFavorite} onAuthenticated={handleAuthenticated} currentUser={currentUser} onContactSeller={contactSellerAbout} />
      case 'seller-profile':
        return <SellerProfile sellerId={selectedSellerId} onNavigate={navigate} onSelectListing={selectListing} onContactSeller={contactSellerAbout} isLoggedIn={isLoggedIn && !currentUser?.isGuest} favorites={favorites} onToggleFavorite={toggleFavorite} currentUserId={currentUser?.id} />
      case 'categories':
        return <Categories onNavigate={navigate} onCategorySelect={navigateToCategory} onSearch={searchFromHome} />
      case 'legal':
        return <Legal slug={legalSlug} onOpenLegal={openLegal} onNavigate={navigate} />
      case 'flash-offers':
        return <FlashOffers onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} onContactSeller={contactSellerAbout} isLoggedIn={isLoggedIn && !currentUser?.isGuest} />
      default:
        return <Home onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} currentUser={currentUser} location={location} />
    }
  }

  // Every member is both buyer and seller — one unified account space (own
  // full-viewport shell, no site header/footer) instead of two separate
  // dashboards. Covers both the buyer-* and seller-* page keys — except
  // seller-profile, which despite the name is a public page (someone
  // else's profile, viewed through the normal site Layout below), not
  // part of the account shell. It was silently falling into this block's
  // default case (the dashboard) and was never actually reachable.
  // Sign-in is a full-screen step (Stitch mobile "Connexion & Inscription"),
  // without the storefront header, bottom nav and footer around it.
  if (page === 'auth') {
    const close = () => (window.history.length > 1 ? window.history.back() : navigate('home'))
    return (
      <div className={dark ? 'dark' : ''} style={{ background: 'var(--bg)' }}>
        <Auth
          onNavigate={navigate}
          onClose={close}
          onLogin={() => {
            handleAuthenticated()
            // Replace the auth entry so "back" doesn't reopen the login form.
            replacePage(authReturn && authReturn !== 'auth' ? authReturn : 'home')
            setAuthReturn(null)
          }}
        />
      </div>
    )
  }

  if (isAccountPage(page)) {
    // A guest identity only exists to hold a conversation open (see
    // AuthService.guestLogin) — there's no real seller/buyer account behind
    // it, so every account-shell page except messaging is off-limits.
    const accountPage = currentUser?.isGuest && page !== 'buyer-messages' ? 'buyer-messages' : page
    const accountContent = (() => {
      switch (accountPage) {
        case 'seller-dashboard':
        case 'buyer-dashboard':
          return <Dashboard onNavigate={navigate} onSelectListing={selectListing} onOpenPurchase={id => openPurchase(id, 'buyer-handover')} onOpenConversation={contactSellerAbout} onOpenHandover={openHandover} currentUser={currentUser} onLogout={logout} />
        case 'seller-post':
          return <PostListing onNavigate={navigate} currentUser={currentUser} onLogout={logout} />
        case 'seller-edit':
          return <PostListing onNavigate={navigate} currentUser={currentUser} onLogout={logout} listingId={selectedListingId} />
        case 'seller-listings':
          return <SellerListings onNavigate={navigate} onSelectListing={selectListing} onEditListing={editListing} currentUser={currentUser} onLogout={logout} />
        case 'seller-stats':
          return <SellerStats onNavigate={navigate} onSelectListing={selectListing} currentUser={currentUser} onLogout={logout} />
        case 'seller-orders':
          return <Orders onNavigate={navigate} onSelectListing={selectListing} onOpenConversation={contactSellerAbout} onOpenHandover={openHandover} onOpenDispute={openDispute} currentUser={currentUser} onLogout={logout} />
        case 'seller-handover':
          return <Handover orderId={selectedOrderId} onNavigate={navigate} onOpenDispute={openDispute} currentUser={currentUser} onLogout={logout} />
        case 'seller-disputes':
          return <Disputes onNavigate={navigate} onSelectListing={selectListing} focusDisputeId={selectedDisputeId} currentUser={currentUser} onLogout={logout} />
        case 'seller-wallet':
          return <Wallet onNavigate={navigate} currentUser={currentUser} onLogout={logout} />
        case 'seller-reviews':
          return <SellerReviews onNavigate={navigate} currentUser={currentUser} onLogout={logout} />
        case 'seller-premium':
          return <SellerPremium onNavigate={navigate} currentUser={currentUser} onLogout={logout} />
        case 'buyer-purchases':
        case 'buyer-receipts':
          return <Purchases mode={accountPage === 'buyer-receipts' ? 'receipts' : 'purchases'} onNavigate={navigate} onOpenOrder={openPurchase} onOpenDispute={openBuyerDispute} onOpenConversation={contactSellerAbout} currentUser={currentUser} onLogout={logout} />
        case 'buyer-handover':
          return <HandoverCode orderId={selectedOrderId} onNavigate={navigate} onOpenOrder={openPurchase} onOpenDispute={openBuyerDispute} onOpenConversation={contactSellerAbout} currentUser={currentUser} onLogout={logout} />
        case 'buyer-receipt':
          return <Receipt orderId={selectedOrderId} onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} currentUser={currentUser} onLogout={logout} />
        case 'buyer-dispute-new':
          return <OpenDispute orderId={selectedOrderId} onNavigate={navigate} onSelectOrder={id => setSelectedOrderId(id)} onOpened={openBuyerDispute} onOpenConversation={contactSellerAbout} currentUser={currentUser} onLogout={logout} />
        case 'buyer-disputes':
          return <DisputeFollow focusDisputeId={selectedDisputeId} onNavigate={navigate} onSelectDispute={id => setSelectedDisputeId(id)} onOpenConversation={contactSellerAbout} currentUser={currentUser} onLogout={logout} />
        case 'buyer-favorites':
          return <Favorites onNavigate={navigate} onSelectListing={selectListing} onToggleFavorite={toggleFavorite} onContactSeller={contactSellerAbout} onSearchCategory={navigateToCategory} currentUser={currentUser} onLogout={logout} />
        case 'buyer-messages':
          return <BuyerMessages onNavigate={navigate} onSelectListing={selectListing} currentUser={currentUser} onLogout={logout} startWith={contactSeller} onStartWithConsumed={() => setContactSeller(null)} onOpenHandover={(id, as) => as === 'SELLER' ? openHandover(id) : openPurchase(id, 'buyer-handover')} />
        case 'buyer-notifications':
          return <Notifications onNavigate={navigate} onSelectListing={selectListing} onOpenPurchase={id => openPurchase(id, 'buyer-handover')} currentUser={currentUser} onLogout={logout} />
        case 'buyer-history':
          return <History onNavigate={navigate} onSelectListing={selectListing} onContactSeller={contactSellerAbout} onSearch={term => searchFromHome(term)} onSearchCategory={navigateToCategory} currentUser={currentUser} onProfileUpdated={setCurrentUser} onLogout={logout} />
        case 'buyer-settings':
          return <Settings onNavigate={navigate} dark={dark} onToggleDark={() => setDark(d => !d)} currentUser={currentUser} onLogout={logout} onProfileUpdated={setCurrentUser} onViewShop={selectSeller} />
        default:
          return <Dashboard onNavigate={navigate} onSelectListing={selectListing} onOpenPurchase={id => openPurchase(id, 'buyer-handover')} onOpenConversation={contactSellerAbout} onOpenHandover={openHandover} currentUser={currentUser} onLogout={logout} />
      }
    })()
    return (
      <div className={dark ? 'dark' : ''} style={{ background: 'var(--bg)' }}>
        <Suspense fallback={<PageFallback fullScreen />}>{accountContent}</Suspense>
        <PaymentReturn isLoggedIn={isLoggedIn} />
        <InstallBanner show={showInstallBanner && !showUpdateBanner && page !== 'seller-post'} guide={showInstallGuide} onInstall={handleInstall} onDismiss={handleDismiss} />
      </div>
    )
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <Layout
        currentPage={page}
        onNavigate={navigate}
        onNavigateCategory={navigateToCategory}
        activeCategory={page === 'search' ? categoryFilter : ''}
        dark={dark}
        onToggleDark={() => setDark(d => !d)}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        onToggleLogin={logout}
        onSelectListing={selectListing}
        onSetSearchTerm={setSearchTerm}
        onClearCategoryFilter={() => setCategoryFilter('')}
        location={location}
        onLocationChange={changeLocation}
        onOpenLegal={openLegal}
      >
        <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
      </Layout>
      <InstallBanner show={showInstallBanner && !showUpdateBanner && page !== 'seller-post'} guide={showInstallGuide} onInstall={handleInstall} onDismiss={handleDismiss} />
      {/* One prompt at a time — stacked banners hid the page on a phone. */}
      {isLoggedIn && pushStatus && !showUpdateBanner && !showInstallBanner && ['permission-required', 'error', 'ios-install-required', 'permission-denied'].includes(pushStatus) && !pushDismissed && !isSnoozed('push') && (
        <PushBanner status={pushStatus} enabling={enablingPush} onEnable={enablePush} onDismiss={() => { snooze('push'); setPushDismissed(true) }} />
      )}
      <UpdateBanner show={showUpdateBanner} onUpdate={applyServiceWorkerUpdate} onDismiss={() => setShowUpdateBanner(false)} />
      <PaymentReturn isLoggedIn={isLoggedIn} />
    </div>
  )
}

function PageFallback({ fullScreen }: { fullScreen?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen' : 'min-h-[60vh]'}`} role="status" aria-label="Chargement">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-surface-container-high border-t-primary" />
    </div>
  )
}
