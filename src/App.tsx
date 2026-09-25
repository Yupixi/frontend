import { useState, useEffect } from 'react'
import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react'
import Layout from './components/Layout'
import { LOGOUT_MUTATION, ME_QUERY, type AuthUser } from './graphql/auth'
import { MY_FAVORITE_IDS_QUERY, TOGGLE_FAVORITE_MUTATION } from './graphql/favorites'
import { clearTokens, getAccessToken, getRefreshToken, SESSION_EXPIRED_EVENT } from './lib/auth'
import { detectLocationFromIP, getStoredLocation, setStoredLocation, type StoredLocation } from './lib/location'
import { applyServiceWorkerUpdate, SW_UPDATE_EVENT } from './lib/serviceWorker'
import { subscribeToPush, type PushSubscriptionResult } from './lib/pushNotifications'
import Home, { type SearchPreset } from './pages/Home'
import Orders from './pages/seller/Orders'
import Wallet from './pages/seller/Wallet'
import SellerReviews from './pages/seller/Reviews'
import SellerStats from './pages/seller/Stats'
import Disputes from './pages/seller/Disputes'
import Handover from './pages/seller/Handover'
import Settings from './pages/seller/Settings'
import Purchases from './pages/buyer/Purchases'
import HandoverCode from './pages/buyer/HandoverCode'
import Receipt from './pages/buyer/Receipt'
import OpenDispute from './pages/buyer/OpenDispute'
import DisputeFollow from './pages/buyer/DisputeFollow'
import SearchPage from './pages/Search'
import ListingDetail from './pages/ListingDetail'
import SellerProfile from './pages/SellerProfile'
import Categories from './pages/Categories'
import Auth from './pages/Auth'
import FlashOffers from './pages/FlashOffers'
import {
  BuyerDashboard, BuyerFavorites, BuyerMessages,
  BuyerNotifications, BuyerHistory,
} from './pages/buyer/BuyerPages'
import {
  PostListing, SellerListings, SellerPremium,
} from './pages/seller/SellerPages'

// Admin BO control lives in the dedicated Backoffice app (real, GraphQL-wired)
// — this Frontend app never had a real admin surface, just a mock
// placeholder from the original scaffold with no nav link ever pointing to
// it (see Phase 1 audit). Removed rather than maintained as a second,
// disconnected "admin" UI.
type Page =
  | 'home' | 'search' | 'flash-offers' | 'listing-detail' | 'seller-profile' | 'categories' | 'auth' | 'forgot-password'
  | 'buyer-dashboard' | 'buyer-favorites' | 'buyer-messages' | 'buyer-notifications' | 'buyer-history' | 'buyer-settings'
  | 'seller-dashboard' | 'seller-post' | 'seller-edit' | 'seller-listings' | 'seller-stats' | 'seller-premium'
  | 'seller-orders' | 'seller-wallet' | 'seller-reviews' | 'seller-disputes' | 'seller-handover'
  | 'buyer-purchases' | 'buyer-receipts' | 'buyer-handover' | 'buyer-receipt' | 'buyer-dispute-new' | 'buyer-disputes'

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

function sharedListingId(): string | null {
  return new URLSearchParams(window.location.search).get('listing')
}

export default function App() {
  const [page, setPage] = useState<Page>(sharedListingId() ? 'listing-detail' : sharedSellerId() ? 'seller-profile' : (shortcutPage() ?? savedNav.page ?? 'home'))
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
      if (isMobile) setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    const installed = () => { setDeferredPrompt(null); setShowInstallBanner(false); setShowInstallGuide(false) }
    window.addEventListener('appinstalled', installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isMobile && !isStandalone) {
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
      if (st && typeof st.__yupixiPage === 'string') {
        setPage(st.__yupixiPage)
      } else {
        setPage('home')
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  // Persist navigation state so a hard reload lands back where the user was.
  useEffect(() => {
    const state: NavState = {
      page, selectedListingId, selectedSellerId, searchTerm, searchCity, categoryFilter, selectedOrderId, selectedDisputeId,
    }
    sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(state))
  }, [page, selectedListingId, selectedSellerId, searchTerm, searchCity, categoryFilter, selectedOrderId, selectedDisputeId])

  const navigate = (p: Page) => {
    setPage(p)
    window.history.pushState({ __yupixiPage: p }, '')
  }

  const selectListing = (id: string) => {
    setSelectedListingId(id)
    navigate('listing-detail')
  }

  const editListing = (id: string) => {
    setSelectedListingId(id)
    navigate('seller-edit')
  }

  const selectSeller = (id: string) => {
    setSelectedSellerId(id)
    navigate('seller-profile')
  }

  const openHandover = (orderId: string) => {
    setSelectedOrderId(orderId)
    navigate('seller-handover')
  }

  const openDispute = (disputeId: string) => {
    setSelectedDisputeId(disputeId)
    navigate('seller-disputes')
  }

  const openPurchase = (orderId: string, target: Page) => {
    setSelectedOrderId(orderId)
    navigate(target)
  }

  const openBuyerDispute = (disputeId: string) => {
    setSelectedDisputeId(disputeId)
    navigate('buyer-disputes')
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
    setPage('home')
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} onCategorySelect={navigateToCategory} currentUser={currentUser} location={location} onContactSeller={contactSellerAbout} onSearch={searchFromHome} />
      case 'search':
        return <SearchPage onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} categoryFilter={categoryFilter} onClearCategoryFilter={() => setCategoryFilter('')} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} selectedCity={searchPreset?.city ?? location?.city ?? ''} initialMaxPrice={searchPreset?.maxPrice} onCityChange={setSearchCity} onCategorySelect={navigateToCategory} currentUserId={currentUser?.id} isLoggedIn={isLoggedIn && !currentUser?.isGuest} onContactSeller={contactSellerAbout} />
      case 'listing-detail':
        return <ListingDetail listingId={selectedListingId} onNavigate={navigate} onSelectListing={selectListing} onSelectSeller={selectSeller} favorites={favorites} onToggleFavorite={toggleFavorite} onAuthenticated={handleAuthenticated} currentUser={currentUser} />
      case 'seller-profile':
        return <SellerProfile sellerId={selectedSellerId} onNavigate={navigate} onSelectListing={selectListing} onContactSeller={contactSellerAbout} isLoggedIn={isLoggedIn && !currentUser?.isGuest} favorites={favorites} onToggleFavorite={toggleFavorite} currentUserId={currentUser?.id} />
      case 'categories':
        return <Categories onNavigate={navigate} onCategorySelect={navigateToCategory} />
      case 'flash-offers':
        return <FlashOffers onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} onContactSeller={contactSellerAbout} isLoggedIn={isLoggedIn && !currentUser?.isGuest} />
      case 'auth':
        return <Auth onNavigate={navigate} onLogin={handleAuthenticated} />

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
  // default case (BuyerDashboard) and was never actually reachable.
  if ((page.startsWith('seller-') && page !== 'seller-profile') || page.startsWith('buyer-')) {
    // A guest identity only exists to hold a conversation open (see
    // AuthService.guestLogin) — there's no real seller/buyer account behind
    // it, so every account-shell page except messaging is off-limits.
    const accountPage = currentUser?.isGuest && page !== 'buyer-messages' ? 'buyer-messages' : page
    const accountContent = (() => {
      switch (accountPage) {
        case 'seller-dashboard':
        case 'buyer-dashboard':
          return <BuyerDashboard onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} currentUser={currentUser} onLogout={logout} />
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
          return <BuyerFavorites onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} onLogout={logout} />
        case 'buyer-messages':
          return <BuyerMessages onNavigate={navigate} onSelectListing={selectListing} currentUser={currentUser} onLogout={logout} startWith={contactSeller} onStartWithConsumed={() => setContactSeller(null)} onOpenHandover={(id, as) => as === 'SELLER' ? openHandover(id) : openPurchase(id, 'buyer-handover')} />
        case 'buyer-notifications':
          return <BuyerNotifications onNavigate={navigate} onSelectListing={selectListing} onLogout={logout} />
        case 'buyer-history':
          return <BuyerHistory onNavigate={navigate} onSelectListing={selectListing} onLogout={logout} />
        case 'buyer-settings':
          return <Settings onNavigate={navigate} dark={dark} onToggleDark={() => setDark(d => !d)} currentUser={currentUser} onLogout={logout} onProfileUpdated={setCurrentUser} />
        default:
          return <BuyerDashboard onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} currentUser={currentUser} onLogout={logout} />
      }
    })()
    return (
      <div className={dark ? 'dark' : ''} style={{ background: 'var(--bg)' }}>
        {accountContent}
        <InstallBanner show={showInstallBanner} guide={showInstallGuide} onInstall={handleInstall} onDismiss={handleDismiss} />
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
      >
        {renderPage()}
      </Layout>
      <InstallBanner show={showInstallBanner} guide={showInstallGuide} onInstall={handleInstall} onDismiss={handleDismiss} />
      {isLoggedIn && pushStatus && pushStatus !== 'subscribed' && !pushDismissed && (
        <div role="status" style={{ position: 'fixed', top: 76, left: 16, right: 16, zIndex: 1000, margin: '0 auto', maxWidth: 600, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
          <strong>Recevoir les notifications sur cet appareil</strong>
          <p style={{ margin: '8px 0', fontSize: '0.85rem' }}>{
            pushStatus === 'ios-install-required' ? 'Sur iPhone ou iPad, ajoutez Dilchap à l’écran d’accueil puis ouvrez-le depuis son icône pour activer les notifications.'
              : pushStatus === 'permission-denied' ? 'Les notifications sont bloquées. Autorisez-les dans les réglages du navigateur puis réessayez.'
              : pushStatus === 'not-configured' ? 'Le serveur de notifications n’est pas configuré. L’activation sera possible une fois le service rétabli.'
              : pushStatus === 'unsupported' ? 'Les notifications ne sont pas disponibles dans ce navigateur. Ouvrez le site en HTTPS dans un navigateur compatible.'
              : pushStatus === 'error' ? 'Cet appareil n’a pas pu être inscrit aux notifications. Vérifiez la connexion puis réessayez.'
              : 'Activez les notifications pour recevoir vos nouveaux messages même lorsque Dilchap est fermé.'
          }</p>
          {!['ios-install-required', 'unsupported', 'not-configured'].includes(pushStatus) && <button className="btn-primary" disabled={enablingPush} onClick={enablePush}>{enablingPush ? 'Activation…' : pushStatus === 'permission-required' ? 'Activer les notifications' : 'Réessayer'}</button>}
          <button className="btn-ghost" onClick={() => setPushDismissed(true)} style={{ marginLeft: 8 }}>Plus tard</button>
        </div>
      )}
      <UpdateBanner show={showUpdateBanner} onUpdate={applyServiceWorkerUpdate} onDismiss={() => setShowUpdateBanner(false)} />
    </div>
  )
}

function UpdateBanner({ show, onUpdate, onDismiss }: { show: boolean; onUpdate: () => void; onDismiss: () => void }) {
  if (!show) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem' }}>
        Une nouvelle version de Dilchap est disponible.
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 6, fontSize: '0.8rem', fontWeight: 600 }}>Plus tard</button>
      <button onClick={onUpdate} style={{ background: '#BB0013', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
        Mettre à jour
      </button>
    </div>
  )
}

function InstallBanner({ show, guide, onInstall, onDismiss }: { show: boolean; guide: boolean; onInstall: () => void; onDismiss: () => void }) {
  if (!show) return null
  const isSafari = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isChrome = /chrome|crios/i.test(navigator.userAgent)
  return (
    <>
      {guide && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }} onClick={onDismiss}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420,
            padding: '2rem 1.5rem', textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#BB0013', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <img src="/icon-192.png" alt="Dilchap" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            </div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '1.2rem', margin: '0 0 0.5rem' }}>Installer Dilchap</h3>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              {isSafari
                ? 'Appuyez sur le bouton Partager <span style="font-size:1.2rem">⬆️</span> puis choisissez "Sur l\'écran d\'accueil".'
                : isChrome
                  ? 'Appuyez sur le menu ⋮ puis choisissez "Ajouter à l\'écran d\'accueil".'
                  : 'Utilisez le menu du navigateur pour ajouter à l\'écran d\'accueil.'}
            </p>
            <button onClick={onDismiss} style={{ background: '#BB0013', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 32px', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', width: '100%' }}>
              J'ai compris
            </button>
          </div>
        </div>
      )}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#BB0013', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src="/icon-192.png" alt="Dilchap" style={{ width: 30, height: 30, objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>Installer Dilchap</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>sur l'écran d'accueil</div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 6, fontSize: '0.85rem', fontWeight: 600 }}>Plus tard</button>
        <button onClick={onInstall} style={{ background: '#BB0013', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          Installer
        </button>
      </div>
    </>
  )
}
