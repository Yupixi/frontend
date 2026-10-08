import { useState, useEffect, useLayoutEffect, useRef, Suspense, startTransition } from 'react'
import { useApolloClient, useLazyQuery, useMutation, useQuery } from '@apollo/client/react'
import { CombinedGraphQLErrors } from '@apollo/client/errors'
import Layout from './components/Layout'
import { InstallBanner, PushBanner, UpdateBanner, isSnoozed, snooze } from './components/AppBanners'
import ConsentBanner, { useConsentOpen } from './components/ConsentBanner'
import { pageTitle, track, trackPageView } from './lib/analytics'
import { setClarityPage } from './lib/clarity'
import SupportTab from './components/SupportTab'
import ErrorBoundary from './components/ErrorBoundary'
import PaymentReturn from './components/PaymentReturn'
import EmailVerifyPrompt, { verifyPromptDismissed } from './components/EmailVerifyPrompt'
import AccountVerifySheet from './components/AccountVerifySheet'
import { ACCOUNT_VERIFIED_EVENT } from './lib/accountVerify'
import { LOGOUT_MUTATION, ME_QUERY, type AuthUser } from './graphql/auth'
import { MY_FAVORITE_IDS_QUERY, TOGGLE_FAVORITE_MUTATION } from './graphql/favorites'
import { parsePath, pathFor, samePlace } from './lib/routes'
import { conversationFromUrl, remiseFromUrl, NAVIGATE_EVENT, OPEN_CONVERSATION_EVENT, OPEN_LINK_EVENT, OPEN_SHOP_EVENT, OPEN_CAMPAIGN_EVENT, OPEN_HELP_EVENT } from './lib/navigation'
import { clearTokens, getAccessToken, getLegacyRefreshToken, SESSION_EXPIRED_EVENT } from './lib/auth'
import { detectLocationFromIP, earlyLocationLookup, getStoredLocation, setStoredLocation, type StoredLocation } from './lib/location'
import { applyServiceWorkerUpdate, SW_UPDATE_EVENT } from './lib/serviceWorker'
import { subscribeToPush, unsubscribeFromPush, type PushSubscriptionResult } from './lib/pushNotifications'
import Home, { type SearchPreset } from './pages/Home'
import { lazyPage, preloadPages } from './lib/lazyPage'
import { useSeo } from './lib/site'
import { ACCOUNT_COUNTRY_KEY, rememberedAccountCountry, setMarketState, useCountries } from './lib/countries'
import Onboarding from './components/Onboarding'
import { noteTourPage } from './lib/tourControl'

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
const Kyc = lazyPage(() => import('./pages/account/Kyc'))
const MyShop = lazyPage(() => import('./pages/account/MyShop'))
const ShopStats = lazyPage(() => import('./pages/account/ShopStats'))
const ShopPromos = lazyPage(() => import('./pages/account/ShopPromos'))
const MyBadgePage = lazyPage(() => import('./pages/account/MyBadgePage'))
const MyQrPage = lazyPage(() => import('./pages/account/MyQrPage'))
const SellerCampaigns = lazyPage(() => import('./pages/account/SellerCampaigns'))
const Support = lazyPage(() => import('./pages/account/Support'))
const ShopPage = lazyPage(() => import('./pages/ShopPage'))
const ShopsDirectory = lazyPage(() => import('./pages/ShopsDirectory'))
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
const Help = lazyPage(() => import('./pages/Help'))

// Admin BO control lives in the dedicated Backoffice app (real, GraphQL-wired)
// — this Frontend app never had a real admin surface, just a mock
// placeholder from the original scaffold with no nav link ever pointing to
// it (see Phase 1 audit). Removed rather than maintained as a second,
// disconnected "admin" UI.
type Page =
  | 'home' | 'search' | 'flash-offers' | 'listing-detail' | 'seller-profile' | 'categories' | 'auth'
  | 'buyer-dashboard' | 'buyer-favorites' | 'buyer-messages' | 'buyer-notifications' | 'buyer-history' | 'buyer-settings'
  | 'seller-dashboard' | 'seller-post' | 'seller-edit' | 'seller-listings' | 'seller-stats' | 'seller-premium'
  | 'seller-orders' | 'seller-wallet' | 'seller-reviews' | 'seller-disputes' | 'seller-handover' | 'seller-kyc' | 'seller-shop' | 'seller-shop-stats' | 'seller-shop-promos' | 'seller-badge' | 'seller-qr' | 'seller-campaigns' | 'support'
  | 'buyer-purchases' | 'buyer-receipts' | 'buyer-handover' | 'buyer-receipt' | 'buyer-dispute-new' | 'buyer-disputes'
  | 'legal' | 'shop' | 'shops' | 'help'

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
  // City of a category page (/categorie/velos/abidjan), '' = every city.
  categoryCity?: string
  selectedOrderId?: string
  selectedDisputeId?: string
  legalSlug?: string
  shopKey?: string
  campaignSlug?: string
  helpSlug?: string
}
const LOCATION_WAIT_MS = 700

if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

const NAV_STORAGE_KEY = 'yupixi_nav_state'

// Dark theme chosen by the visitor, kept across visits (applied before the
// first render so the page doesn't flash light).
const THEME_KEY = 'yupixi_theme'
function loadDark(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark'
  } catch {
    return false
  }
}
const savedDark = loadDark()
document.documentElement.classList.toggle('dark', savedDark)

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
const SHORTCUT_PAGES: Page[] = [
  'seller-post', 'buyer-messages', 'flash-offers', 'seller-kyc', 'seller-shop', 'seller-shop-promos', 'seller-badge', 'seller-qr', 'seller-campaigns', 'support', 'shops',
  // Notification targets.
  'seller-disputes', 'buyer-disputes', 'buyer-notifications', 'seller-listings', 'seller-orders', 'buyer-purchases', 'seller-wallet', 'seller-premium', 'seller-dashboard', 'buyer-dashboard',
]
function shortcutPage(search: string = window.location.search): Page | null {
  const requested = new URLSearchParams(search).get('shortcut')
  return SHORTCUT_PAGES.includes(requested as Page) ? (requested as Page) : null
}
// Item a notification link focuses on its page (`&dispute=`, `&ticket=`).
const linkParam = (name: string) => new URLSearchParams(window.location.search).get(name)

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

// "?shop=<slug>" opens an official shop (shared link).
function sharedShopKey(): string | null {
  return new URLSearchParams(window.location.search).get('shop')
}

// "?campaign=<slug>" opens a campaign page (its « Partager » button).
function sharedCampaignSlug(): string | null {
  return new URLSearchParams(window.location.search).get('campaign')
}

function sharedListingId(): string | null {
  return new URLSearchParams(window.location.search).get('listing')
}

// The page the address opens (/annonce/…, /categorie/…, /boutique/…; see
// lib/routes). /compte = an account page, restored from the session.
const initialRoute = parsePath(window.location.pathname)
// A remembered page with an address of its own (/aide, /legal…) is not an
// account page: /compte then opens the dashboard.
const routePage = (): Page | null =>
  !initialRoute ? null
    : initialRoute.page === 'account' ? (savedNav.page && pathFor(savedNav.page) === '/compte' ? savedNav.page : 'buyer-dashboard')
      : initialRoute.page
const initialSearch = initialRoute?.page === 'search'

export default function App() {
  const [page, setPage] = useState<Page>(conversationFromUrl() ? 'buyer-messages' : sharedLegalSlug() ? 'legal' : sharedCampaignSlug() ? 'flash-offers' : sharedListingId() ? 'listing-detail' : sharedShopKey() ? 'shop' : sharedSellerId() ? 'seller-profile' : (shortcutPage() ?? routePage() ?? 'home'))
  // Scroll position to apply on the next page change (see the layout effect
  // below); the app restores it itself, the browser's automatic restoration
  // would fight it (it runs before the restored page has rendered).
  const pendingScroll = useRef(0)
  // Bumped on every navigation, so going from one listing (seller, shop…)
  // to another of the same page type also lands at the top.
  const [navSeq, setNavSeq] = useState(0)
  const [legalSlug, setLegalSlug] = useState(sharedLegalSlug() ?? initialRoute?.legalSlug ?? savedNav.legalSlug ?? 'cgu')
  const [shopKey, setShopKey] = useState(sharedShopKey() ?? initialRoute?.shopKey ?? savedNav.shopKey ?? '')
  const [campaignSlug, setCampaignSlug] = useState(sharedCampaignSlug() ?? initialRoute?.campaignSlug ?? savedNav.campaignSlug ?? '')
  // Centre d'aide article shown ('' = the help centre's home).
  const [helpSlug, setHelpSlug] = useState(initialRoute?.page === 'help' ? (initialRoute.helpSlug ?? '') : (savedNav.helpSlug ?? ''))
  const [dark, setDark] = useState(savedDark)
  // The consent banner of the « Mesure d'audience » is up: other bottom banners wait.
  const consentOpen = useConsentOpen()
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getAccessToken())
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [selectedListingId, setSelectedListingId] = useState(sharedListingId() ?? initialRoute?.listingId ?? savedNav.selectedListingId ?? 'l1')
  const [searchTerm, setSearchTerm] = useState(initialSearch ? (new URLSearchParams(window.location.search).get('q') ?? '') : (savedNav.searchTerm ?? ''))
  const [searchCity, setSearchCity] = useState(savedNav.searchCity ?? '')
  const [selectedSellerId, setSelectedSellerId] = useState(sharedSellerId() ?? initialRoute?.sellerId ?? savedNav.selectedSellerId ?? 's1')
  // Transient — consumed once by BuyerMessages on mount to start/open the
  // right conversation, not part of the session-restored nav state.
  const [contactSeller, setContactSeller] = useState<{ listingId?: string; sellerId: string } | null>(null)
  // Conversation to open directly (message notification / push link), consumed by BuyerMessages.
  const [openConversationId, setOpenConversationId] = useState<string | null>(() => conversationFromUrl())
  // …on its « Remise » card (hand-over links: `&remise=1`, orders, purchases).
  const [focusRemise, setFocusRemise] = useState(() => !!conversationFromUrl() && remiseFromUrl())
  const [categoryFilter, setCategoryFilterState] = useState(initialSearch ? (initialRoute?.category ?? '') : (savedNav.categoryFilter ?? ''))
  const [categoryCity, setCategoryCity] = useState(initialSearch ? (initialRoute?.categoryCity ?? '') : (savedNav.categoryCity ?? ''))
  // A category page's city belongs to that category page.
  const setCategoryFilter = (cat: string) => { setCategoryFilterState(cat); setCategoryCity('') }
  // Tab title, description and share tags when moving between pages.
  useSeo(page, page === 'search' && !!categoryFilter)
  const [selectedOrderId, setSelectedOrderId] = useState(savedNav.selectedOrderId ?? '')
  const [selectedDisputeId, setSelectedDisputeId] = useState(linkParam('dispute') ?? savedNav.selectedDisputeId ?? '')
  // Support ticket to open (notification of a reply).
  const [focusTicketId, setFocusTicketId] = useState<string | null>(() => linkParam('ticket'))
  // « Prolonger » in the end-of-boost notification: Booster opens on that listing.
  const [boostListingId, setBoostListingId] = useState<string | null>(() => linkParam('boost'))
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [pushStatus, setPushStatus] = useState<PushSubscriptionResult | null>(null)
  const [enablingPush, setEnablingPush] = useState(false)
  const [pushDismissed, setPushDismissed] = useState(false)
  const [verifyLater, setVerifyLater] = useState(verifyPromptDismissed)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [location, setLocation] = useState<StoredLocation | null>(() => getStoredLocation())
  // True while a first-visit IP lookup is in flight (capped, see below).
  const [locationPending, setLocationPending] = useState(() => !getStoredLocation())

  // Only ever runs the IP lookup once per browser — a stored value (even a
  // manually-cleared "all countries" one) means we already know what to do
  // and silently re-detecting would override a deliberate user choice.
  useEffect(() => {
    if (location) return
    let cancelled = false
    // Past this, the feed loads unscoped and re-scopes when the lookup lands.
    const giveUp = setTimeout(() => setLocationPending(false), LOCATION_WAIT_MS)
    void (earlyLocationLookup ?? detectLocationFromIP()).then(detected => {
      if (cancelled) return
      if (detected) {
        setStoredLocation(detected)
        setLocation(detected)
      }
      setLocationPending(false)
    })
    return () => { cancelled = true; clearTimeout(giveUp) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changeLocation = (next: StoredLocation) => {
    setStoredLocation(next)
    setLocation(next)
  }

  // Market shown: a manual choice, else the member's country, else the IP
  // guess — always an active country, or none (« Tous les pays »).
  const countries = useCountries()
  const active = (code: string | null | undefined) => (code && countries.some(c => c.code === code) ? code : null)
  // The member's country, remembered so a reload shows it at once (not the
  // IP guess for a second while the session loads).
  const accountCountry = active(currentUser?.countryCode ?? (!currentUser && isLoggedIn ? rememberedAccountCountry() : null))
  useEffect(() => {
    try {
      if (currentUser?.countryCode) localStorage.setItem(ACCOUNT_COUNTRY_KEY, currentUser.countryCode)
      else if (!isLoggedIn) localStorage.removeItem(ACCOUNT_COUNTRY_KEY)
    } catch { /* private mode */ }
  }, [currentUser?.countryCode, isLoggedIn])
  const marketLocation: StoredLocation | null = location?.source !== 'manual' && accountCountry
    ? { countryCode: accountCountry, city: location?.countryCode === accountCountry ? location.city : null, source: location?.source ?? 'ip' }
    : location && location.countryCode !== active(location.countryCode) ? { ...location, countryCode: null, city: null } : location
  // The member changed their account country: the market follows it.
  const lastAccount = useRef(accountCountry)
  useEffect(() => {
    const prev = lastAccount.current
    lastAccount.current = accountCountry
    if (prev && accountCountry && prev !== accountCountry && location?.countryCode !== accountCountry) changeLocation({ countryCode: accountCountry, city: null, source: 'manual' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountCountry])
  useLayoutEffect(() => {
    setMarketState({ market: marketLocation?.countryCode ?? null, account: accountCountry, signedIn: isLoggedIn })
  }, [marketLocation?.countryCode, accountCountry, isLoggedIn])

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

  const client = useApolloClient()
  // Always asked to the server: a cached `me` could be the previous
  // account's (shared phone, sign-out then sign-in in the same tab).
  const [fetchMe] = useLazyQuery<{ me: AuthUser }>(ME_QUERY, { fetchPolicy: 'network-only' })
  const [logoutMutation] = useMutation<{ logout: boolean }>(LOGOUT_MUTATION)

  // Account whose data the Apollo cache holds. Another account signing in
  // (guest → member, or after an expired session) starts from an empty cache.
  const cacheOwner = useRef<string | null>(null)
  const acceptUser = (me: AuthUser) => {
    if (cacheOwner.current && cacheOwner.current !== me.id) void client.resetStore().catch(() => undefined)
    cacheOwner.current = me.id
    setCurrentUser(me)
  }

  // The account was just confirmed (SMS code, link): reload the member so
  // the banner, the cards and the gates follow.
  useEffect(() => {
    const onVerified = () => {
      void fetchMe().then(r => { if (r.data?.me) acceptUser(r.data.me) }).catch(() => undefined)
    }
    window.addEventListener(ACCOUNT_VERIFIED_EVENT, onVerified)
    return () => window.removeEventListener(ACCOUNT_VERIFIED_EVENT, onVerified)
  }, [])

  // A silent token refresh can fail well after mount (token expired/revoked
  // mid-session) — apollo.ts clears storage but has no way to touch React
  // state, so it dispatches this event instead.
  useEffect(() => {
    const onSessionExpired = () => {
      setIsLoggedIn(false)
      setCurrentUser(null)
      // Nothing of that account stays on screen or on this device: its
      // cached data (identity, balance, favorites…) and its notifications.
      cacheOwner.current = null
      void client.clearStore().catch(() => undefined)
      void unsubscribeFromPush(null)
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
  // refreshes an expired token before this rejects). Only the server saying
  // so ends the session: a network error (weak signal, API redeploying) keeps
  // it and tries again, with a growing delay or as soon as the device is
  // back online.
  useEffect(() => {
    if (!getAccessToken()) return
    let cancelled = false
    let done = false
    let attempt = 0
    let retry: ReturnType<typeof setTimeout> | undefined
    const restore = () => {
      clearTimeout(retry)
      fetchMe()
        .then(({ data }) => {
          if (cancelled) return
          done = true
          if (data?.me) {
            acceptUser(data.me)
            setIsLoggedIn(true)
            // Refresh an existing subscription after restoring the session.
            // A new permission prompt must be triggered from the settings UI.
            void subscribeToPush(false).then(result => { if (!cancelled) setPushStatus(result) })
          } else {
            clearTokens()
            setIsLoggedIn(false)
          }
        })
        .catch((error: unknown) => {
          if (cancelled) return
          // Refresh refused (apollo.ts cleared the tokens), or the server
          // answered with an error: signed out.
          if (!getAccessToken() || CombinedGraphQLErrors.is(error)) {
            done = true
            clearTokens()
            setIsLoggedIn(false)
            return
          }
          retry = setTimeout(restore, Math.min(30_000, 2_000 * 2 ** attempt++))
        })
    }
    const onOnline = () => { if (!done && !cancelled) restore() }
    window.addEventListener('online', onOnline)
    restore()
    return () => {
      cancelled = true
      clearTimeout(retry)
      window.removeEventListener('online', onOnline)
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

  // A category page, optionally in one city (/categorie/velos/abidjan).
  const navigateToCategory = (cat: string, city = '') => {
    setCategoryFilterState(cat)
    setCategoryCity(typeof city === 'string' ? city : '')
    setSearchTerm('')
    navigate('search')
  }

  // Apply dark mode to document, and remember the choice
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
    } catch { /* private browsing: the choice lasts this visit only */ }
  }, [dark])

  // Native back/forward navigation through the browser history
  useEffect(() => {
    const onPop = () => {
      const st = window.history.state
      // Same transition as navigate() — the current page stays up while the
      // target page's chunk loads.
      // Back/forward lands where the visitor was on that page.
      pendingScroll.current = typeof st?.scrollY === 'number' ? st.scrollY : 0
      startTransition(() => {
        setNavSeq((n) => n + 1)
        if (st && typeof st.__yupixiPage === 'string') {
          // Restore the selection the entry was pushed with too — otherwise
          // "back" to an order or listing shows whatever was selected last.
          if (st.listingId) setSelectedListingId(st.listingId)
          if (st.sellerId) setSelectedSellerId(st.sellerId)
          if (st.orderId !== undefined) setSelectedOrderId(st.orderId)
          if (st.disputeId !== undefined) setSelectedDisputeId(st.disputeId)
          if (st.legalSlug) setLegalSlug(st.legalSlug)
          if (st.shopKey) setShopKey(st.shopKey)
          if (typeof st.campaignSlug === 'string') setCampaignSlug(st.campaignSlug)
          if (typeof st.helpSlug === 'string') setHelpSlug(st.helpSlug)
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
      window.history.replaceState({ __yupixiPage: page, listingId: selectedListingId, sellerId: selectedSellerId, orderId: selectedOrderId, disputeId: selectedDisputeId, shopKey, campaignSlug, helpSlug }, '')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // The storefront pages a visitor is most likely to open next.
  useEffect(() => {
    preloadPages([SearchPage, ListingDetail, SellerProfile, Categories])
  }, [])

  // Page change: top of the new page, or the remembered position on
  // back/forward. Instant and before paint — no slide through the old page.
  const firstPage = useRef(true)
  useLayoutEffect(() => {
    // Not on the first render (already at the top): scrollTo — or even
    // reading scrollY — would force a full synchronous layout of the page
    // being mounted, ~0.5 s of blocked main thread on a mid-range phone.
    if (firstPage.current) { firstPage.current = false; return }
    const top = pendingScroll.current
    pendingScroll.current = 0
    window.scrollTo({ top, behavior: 'instant' })
  }, [page, navSeq])

  // The address bar follows the page: public pages have their own URL
  // (shareable, indexed), account pages sit under /compte.
  useEffect(() => {
    const path = pathFor(page, { listingId: selectedListingId, sellerId: selectedSellerId, shopKey, legalSlug, campaignSlug, category: categoryFilter, categoryCity, searchTerm, helpSlug })
    const here = window.location.pathname + window.location.search
    if (page === 'search' ? here !== path : !samePlace(here, path)) window.history.replaceState(window.history.state, '', path)
  }, [page, selectedListingId, selectedSellerId, shopKey, legalSlug, campaignSlug, categoryFilter, categoryCity, searchTerm, helpSlug])

  // « Mesure d'audience »: one page_view per page or item (after the
  // address bar above; not when only the search words change). Sent only
  // with the visitor's consent, address cleaned (lib/analytics).
  useEffect(() => {
    trackPageView(window.location.href, pageTitle(page, categoryFilter))
  }, [page, selectedListingId, selectedSellerId, shopKey, legalSlug, campaignSlug, categoryFilter, helpSlug])

  // Microsoft Clarity (same consent): stopped on excluded pages (KYC) and
  // on addresses carrying anything but harmless parameters (lib/clarity).
  useEffect(() => {
    setClarityPage(page, window.location.href)
  }, [page, selectedListingId, selectedSellerId, shopKey, legalSlug, campaignSlug, categoryFilter, categoryCity, searchTerm, helpSlug])

  // Tours tied to a page know where the member is.
  useEffect(() => { noteTourPage(page) }, [page])

  // Persist navigation state so a hard reload lands back where the user was.
  useEffect(() => {
    const state: NavState = {
      page, selectedListingId, selectedSellerId, searchTerm, searchCity, categoryFilter, categoryCity, selectedOrderId, selectedDisputeId, legalSlug, shopKey, campaignSlug, helpSlug,
    }
    try { sessionStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(state)) } catch { /* storage blocked: no restore after a reload */ }
  }, [page, selectedListingId, selectedSellerId, searchTerm, searchCity, categoryFilter, categoryCity, selectedOrderId, selectedDisputeId, legalSlug, shopKey, campaignSlug, helpSlug])

  type Selection = { listingId?: string; sellerId?: string; orderId?: string; disputeId?: string; legalSlug?: string; shopKey?: string; campaignSlug?: string; helpSlug?: string }
  const historyEntry = (p: Page, sel: Selection = {}) => ({
    __yupixiPage: p,
    listingId: selectedListingId, sellerId: selectedSellerId, orderId: selectedOrderId, disputeId: selectedDisputeId, legalSlug, shopKey, campaignSlug, helpSlug,
    ...sel,
  })

  // Where to land after signing in: the page the visitor was on (or tried to
  // open) when they were sent to the auth screen, instead of always home.
  const [authReturn, setAuthReturn] = useState<Page | null>(null)

  const isAccountPage = (p: Page) => (p.startsWith('seller-') && p !== 'seller-profile') || p.startsWith('buyer-') || p === 'support'

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
    // Remember where the visitor was, for when they come back to it.
    window.history.replaceState({ ...window.history.state, scrollY: window.scrollY }, '')
    // A transition keeps the current page on screen while the next page's
    // chunk loads, instead of flashing the Suspense fallback.
    startTransition(() => { setPage(p); setNavSeq((n) => n + 1) })
    window.history.pushState(historyEntry(p, sel), '')
  }

  // Page requests from components without an onNavigate prop (lib/navigation).
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  useEffect(() => {
    const onRequest = (e: Event) => {
      const p = (e as CustomEvent<Page>).detail
      if (p === 'help') openHelpRef.current('')
      else navigateRef.current(p)
    }
    const onHelp = (e: Event) => openHelpRef.current((e as CustomEvent<string>).detail ?? '')
    window.addEventListener(NAVIGATE_EVENT, onRequest)
    window.addEventListener(OPEN_HELP_EVENT, onHelp)
    return () => {
      window.removeEventListener(NAVIGATE_EVENT, onRequest)
      window.removeEventListener(OPEN_HELP_EVENT, onHelp)
    }
  }, [])

  // Message notifications open the thread itself: in-app bell/page
  // (OPEN_CONVERSATION_EVENT) and OS notifications clicked while the app is
  // already open (the service worker posts the push link).
  const openConversationRef = useRef((id: string, remise = false) => { setOpenConversationId(id); setFocusRemise(remise); navigate('buyer-messages') })
  openConversationRef.current = (id: string, remise = false) => { setOpenConversationId(id); setFocusRemise(remise); navigate('buyer-messages') }
  const openShopRef = useRef((slug: string) => { setShopKey(slug); navigate('shop', { shopKey: slug }) })
  openShopRef.current = (slug: string) => { setShopKey(slug); navigate('shop', { shopKey: slug }) }
  useEffect(() => {
    const onOpen = (e: Event) => openConversationRef.current((e as CustomEvent<string>).detail)
    const onSwMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; url?: string } | null
      if (data?.type === 'yupixi:open-url' && data.url) openLinkRef.current(data.url)
    }
    const onOpenLink = (e: Event) => openLinkRef.current((e as CustomEvent<string>).detail)
    window.addEventListener(OPEN_LINK_EVENT, onOpenLink)
    const onOpenShop = (e: Event) => openShopRef.current((e as CustomEvent<string>).detail)
    window.addEventListener(OPEN_SHOP_EVENT, onOpenShop)
    window.addEventListener(OPEN_CONVERSATION_EVENT, onOpen)
    navigator.serviceWorker?.addEventListener('message', onSwMessage)
    // The push link is consumed once: a reload shouldn't reopen it.
    if (['conversation', 'shortcut', 'dispute', 'ticket', 'boost'].some(linkParam)) window.history.replaceState(window.history.state, '', window.location.pathname)
    return () => {
      window.removeEventListener(OPEN_CONVERSATION_EVENT, onOpen)
      window.removeEventListener(OPEN_SHOP_EVENT, onOpenShop)
      window.removeEventListener(OPEN_LINK_EVENT, onOpenLink)
      navigator.serviceWorker?.removeEventListener('message', onSwMessage)
    }
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

  // Page a notification link points to (push click with the app open,
  // bell menu, notifications page). Unknown or empty links go home.
  const openLink = (url: string) => {
    let u: URL
    try { u = new URL(url, window.location.origin) } catch { return }
    if (u.origin !== window.location.origin) { window.open(u.href, '_blank', 'noopener'); return }
    const q = u.searchParams
    const route = parsePath(u.pathname)
    if (route?.page === 'listing-detail' && route.listingId) return selectListing(route.listingId)
    if (route?.page === 'seller-profile' && route.sellerId) return selectSeller(route.sellerId)
    if (route?.page === 'shop' && route.shopKey) return openShop(route.shopKey)
    if (route?.page === 'legal' && route.legalSlug) return openLegal(route.legalSlug)
    if (route?.page === 'flash-offers') return openCampaignRef.current(route.campaignSlug ?? '')
    if (route?.page === 'help') return openHelpRef.current(route.helpSlug ?? '')
    if (route?.page === 'search' && route.category) return navigateToCategory(route.category, route.categoryCity)
    if (route && route.page !== 'account') return navigate(route.page)
    const conversation = q.get('conversation')
    if (conversation) return openConversationRef.current(conversation, q.get('remise') === '1')
    if (q.get('shop')) return openShop(q.get('shop')!)
    if (q.get('listing')) return selectListing(q.get('listing')!)
    if (q.get('seller')) return selectSeller(q.get('seller')!)
    if (q.get('legal')) return openLegal(q.get('legal')!)
    if (q.get('campaign') !== null) return openCampaignRef.current(q.get('campaign')!)
    const target = shortcutPage(u.search)
    if (!target) return navigate('home')
    const dispute = q.get('dispute')
    if (dispute) setSelectedDisputeId(dispute)
    setFocusTicketId(q.get('ticket'))
    setBoostListingId(q.get('boost'))
    navigate(target, dispute ? { disputeId: dispute } : undefined)
  }
  const openLinkRef = useRef(openLink)
  openLinkRef.current = openLink

  const openLegal = (slug: string) => {
    setLegalSlug(slug)
    navigate('legal', { legalSlug: slug })
  }

  // Centre d'aide: an article, '' = its home.
  const openHelp = (slug: string) => {
    setHelpSlug(slug)
    navigate('help', { helpSlug: slug })
  }
  const openHelpRef = useRef(openHelp)
  openHelpRef.current = openHelp

  // A given campaign page ('' = the newest live one).
  const openCampaign = (slug: string) => {
    setCampaignSlug(slug)
    navigate('flash-offers', { campaignSlug: slug })
  }
  const openCampaignRef = useRef(openCampaign)
  openCampaignRef.current = openCampaign
  useEffect(() => {
    const onRequest = (e: Event) => openCampaignRef.current((e as CustomEvent<string>).detail)
    window.addEventListener(OPEN_CAMPAIGN_EVENT, onRequest)
    return () => window.removeEventListener(OPEN_CAMPAIGN_EVENT, onRequest)
  }, [])

  const selectListing = (id: string) => {
    setSelectedListingId(id)
    navigate('listing-detail', { listingId: id })
  }

  const editListing = (id: string) => {
    setSelectedListingId(id)
    navigate('seller-edit', { listingId: id })
  }

  const openShop = (key: string) => {
    setShopKey(key)
    navigate('shop', { shopKey: key })
  }

  const selectSeller = (id: string) => {
    setSelectedSellerId(id)
    navigate('seller-profile', { sellerId: id })
  }

  // The hand-over happens in the conversation (the sale id is the
  // conversation id): « Valider la remise », « Mon code de remise »… open
  // it on its « Remise » card. `replace`: from a former hand-over page (an
  // old link), so Back does not land on it again.
  const openRemise = (conversationId: string, replace = false) => {
    setOpenConversationId(conversationId)
    setFocusRemise(true)
    if (replace) {
      startTransition(() => { setPage('buyer-messages'); setNavSeq((n) => n + 1) })
      window.history.replaceState(historyEntry('buyer-messages'), '')
    } else navigate('buyer-messages')
  }
  const openHandover = (orderId: string) => openRemise(orderId)

  const openDispute = (disputeId: string) => {
    setSelectedDisputeId(disputeId)
    navigate('seller-disputes', { disputeId })
  }

  const openPurchase = (orderId: string, target: Page) => {
    if (target === 'buyer-handover') return openRemise(orderId)
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
  // « Discuter », « Contacter », an offer sent… from a listing, a profile or
  // a shop (not reopening a conversation from the account pages): counted
  // in the « Mesure d'audience » with the listing id only.
  const contactSellerFrom = (sellerId: string, listingId?: string) => {
    track('contact_seller', { item_id: listingId, method: 'message' })
    contactSellerAbout(sellerId, listingId)
  }

  // Shared by the full-page Auth screen and the inline guest-messaging flow
  // on ListingDetail (see InlineConversation) — both just need React state
  // to catch up after tokens are already stored.
  const handleAuthenticated = () => {
    setIsLoggedIn(true)
    void fetchMe().then(({ data }) => { if (data?.me) acceptUser(data.me) }, () => undefined)
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
    // Optimistic: the heart fills on tap, the ids list is patched in the
    // cache from the mutation's answer (the new state) — it used to wait for
    // the mutation *and* a refetch of every favorite id.
    const wasFav = favorites.includes(id)
    return toggleFavoriteMutation({
      variables: { listingId: id },
      optimisticResponse: { toggleFavorite: !wasFav },
      update: (cache, { data }) => {
        const nowFav = data?.toggleFavorite ?? !wasFav
        cache.updateQuery<{ myFavoriteIds: string[] }>({ query: MY_FAVORITE_IDS_QUERY }, prev => {
          const ids = prev?.myFavoriteIds ?? []
          return { myFavoriteIds: nowFav ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter(x => x !== id) }
        })
      },
    }).then(() => undefined, () => { void refetchFavorites() })
  }

  const logout = () => {
    // This device stops receiving the account's notifications (needs the
    // token, taken before it is cleared).
    const pushDone = unsubscribeFromPush(getAccessToken())
    // Best-effort: revoke the session server-side and clear the refresh
    // cookie. Local state is cleared regardless of the result.
    const revoked = logoutMutation({ variables: { refreshToken: getLegacyRefreshToken() } }).catch(() => undefined)
    clearTokens()
    setIsLoggedIn(false)
    setCurrentUser(null)
    cacheOwner.current = null
    replacePage('home')
    // Empty the Apollo cache (identity, balance, favorites, conversations…)
    // so the next account never sees them — once the logout request is on
    // its way (clearing the store cancels requests in flight), at most 3 s.
    const settled = Promise.allSettled([revoked, pushDone])
    void Promise.race([settled, new Promise(r => setTimeout(r, 3000))])
      .then(() => client.clearStore())
      .catch(() => undefined)
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home onOpenShop={openShop} onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} onCategorySelect={navigateToCategory} currentUser={currentUser} location={marketLocation} locationPending={locationPending} onContactSeller={contactSellerFrom} onSearch={searchFromHome} />
      case 'search':
        return <SearchPage onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} categoryFilter={categoryFilter} categoryCity={categoryCity} onCategoryCityChange={setCategoryCity} onClearCategoryFilter={() => setCategoryFilter('')} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} selectedCity={searchPreset?.city ?? marketLocation?.city ?? ''} initialMaxPrice={searchPreset?.maxPrice} initialPromoOnly={searchPreset?.promo} onCityChange={setSearchCity} onCategorySelect={navigateToCategory} currentUserId={currentUser?.id} isLoggedIn={isLoggedIn && !currentUser?.isGuest} onContactSeller={contactSellerFrom} />
      case 'listing-detail':
        return <ListingDetail listingId={selectedListingId} onNavigate={navigate} onSelectListing={selectListing} onSelectSeller={selectSeller} favorites={favorites} onToggleFavorite={toggleFavorite} onAuthenticated={handleAuthenticated} currentUser={currentUser} onContactSeller={contactSellerFrom} />
      case 'seller-profile':
        return <SellerProfile sellerId={selectedSellerId} onNavigate={navigate} onSelectListing={selectListing} onContactSeller={contactSellerFrom} isLoggedIn={isLoggedIn && !currentUser?.isGuest} favorites={favorites} onToggleFavorite={toggleFavorite} currentUserId={currentUser?.id} />
      case 'shop':
        return <ShopPage key={shopKey} shopKey={shopKey} onNavigate={navigate} onSelectListing={selectListing} onContactSeller={contactSellerFrom} isLoggedIn={isLoggedIn && !currentUser?.isGuest} favorites={favorites} onToggleFavorite={toggleFavorite} currentUserId={currentUser?.id} />
      case 'shops':
        return <ShopsDirectory onNavigate={navigate} onOpenShop={openShop} isLoggedIn={isLoggedIn && !currentUser?.isGuest} />
      case 'categories':
        return <Categories onNavigate={navigate} onCategorySelect={navigateToCategory} onSearch={searchFromHome} />
      case 'legal':
        return <Legal slug={legalSlug} onOpenLegal={openLegal} onNavigate={navigate} />
      case 'help':
        return <Help slug={helpSlug} onOpenArticle={openHelp} onNavigate={navigate} />
      case 'flash-offers':
        return <FlashOffers key={campaignSlug} campaignSlug={campaignSlug} onOpenCampaign={openCampaign} onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} onContactSeller={contactSellerFrom} isLoggedIn={isLoggedIn && !currentUser?.isGuest} />
      default:
        return <Home onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} currentUser={currentUser} location={marketLocation} />
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
  // What the page shows: a page that failed to render gets another chance
  // as soon as the visitor goes elsewhere (page or item), see ErrorBoundary.
  const pageKey = [page, selectedListingId, selectedSellerId, shopKey, campaignSlug, legalSlug, helpSlug, categoryFilter, categoryCity, searchTerm, selectedOrderId, selectedDisputeId].join('|')

  if (page === 'auth') {
    const close = () => (window.history.length > 1 ? window.history.back() : navigate('home'))
    return (
      <div className={dark ? 'dark' : ''} style={{ background: 'var(--bg)' }}>
        {/* No Suspense here on purpose: while its chunk loads, the page the
            visitor comes from stays up (navigation is a transition). */}
        <ErrorBoundary resetKey={pageKey} fullScreen>
          {/* Microsoft Clarity: the sign-in / sign-up screens are masked. */}
          <div data-clarity-mask="True" className="contents">
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
        </ErrorBoundary>
        <ConsentBanner onOpenLegal={openLegal} />
      </div>
    )
  }

  // Signed up, address not confirmed yet: one top prompt at a time (the
  // update banner first), not over the listing form.
  // Welcome tour / « Nouveau » announcements of signed-in members.
  const onboarding = <Onboarding page={page} enabled={isLoggedIn && !!currentUser && !currentUser.isGuest} />

  // An account confirmed by neither its phone (SMS code) nor its e-mail:
  // a code by SMS first (EmailVerifyPrompt), else the e-mail again.
  const verifyPrompt = isLoggedIn && currentUser && !currentUser.isGuest && (currentUser.email || currentUser.phone) && !currentUser.emailVerifiedAt && !currentUser.phoneVerifiedAt && !verifyLater && !showUpdateBanner && page !== 'seller-post' && page !== 'seller-edit'
    ? <EmailVerifyPrompt email={currentUser.email} phone={currentUser.phone ?? null} onDismiss={() => setVerifyLater(true)} />
    : null
  // « Recevoir un code par SMS » wherever an action needs a confirmed
  // account (contacting, paying, the banner above).
  const verifySheet = isLoggedIn && currentUser && !currentUser.isGuest
    ? <AccountVerifySheet onAddPhone={() => navigate('buyer-settings')} />
    : null

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
          return <Handover orderId={selectedOrderId} onNavigate={navigate} onOpenDispute={openDispute} onOpenRemise={id => openRemise(id, true)} currentUser={currentUser} onLogout={logout} />
        case 'seller-disputes':
          return <Disputes onNavigate={navigate} onSelectListing={selectListing} focusDisputeId={selectedDisputeId} currentUser={currentUser} onLogout={logout} />
        case 'seller-wallet':
          return <Wallet onNavigate={navigate} currentUser={currentUser} onLogout={logout} />
        case 'seller-reviews':
          return <SellerReviews onNavigate={navigate} currentUser={currentUser} onLogout={logout} />
        case 'seller-premium':
          return <SellerPremium key={boostListingId ?? ''} initialListingId={boostListingId} onNavigate={navigate} currentUser={currentUser} onLogout={logout} />
        case 'buyer-purchases':
        case 'buyer-receipts':
          return <Purchases mode={accountPage === 'buyer-receipts' ? 'receipts' : 'purchases'} onNavigate={navigate} onOpenOrder={openPurchase} onOpenDispute={openBuyerDispute} onOpenConversation={contactSellerAbout} currentUser={currentUser} onLogout={logout} />
        case 'buyer-handover':
          return <HandoverCode orderId={selectedOrderId} onNavigate={navigate} onOpenOrder={openPurchase} onOpenDispute={openBuyerDispute} onOpenConversation={contactSellerAbout} onOpenRemise={id => openRemise(id, true)} currentUser={currentUser} onLogout={logout} />
        case 'buyer-receipt':
          return <Receipt orderId={selectedOrderId} onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} currentUser={currentUser} onLogout={logout} />
        case 'buyer-dispute-new':
          return <OpenDispute orderId={selectedOrderId} onNavigate={navigate} onSelectOrder={id => setSelectedOrderId(id)} onOpened={openBuyerDispute} onOpenConversation={contactSellerAbout} currentUser={currentUser} onLogout={logout} />
        case 'buyer-disputes':
          return <DisputeFollow focusDisputeId={selectedDisputeId} onNavigate={navigate} onSelectDispute={id => setSelectedDisputeId(id)} onOpenConversation={contactSellerAbout} currentUser={currentUser} onLogout={logout} />
        case 'buyer-favorites':
          return <Favorites onNavigate={navigate} onSelectListing={selectListing} onToggleFavorite={toggleFavorite} onContactSeller={contactSellerFrom} onSearchCategory={navigateToCategory} currentUser={currentUser} onLogout={logout} />
        case 'buyer-messages':
          return <BuyerMessages onNavigate={navigate} onSelectListing={selectListing} currentUser={currentUser} onLogout={logout} startWith={contactSeller} onStartWithConsumed={() => setContactSeller(null)} openConversationId={openConversationId} focusRemise={focusRemise} onOpenConversationConsumed={() => { setOpenConversationId(null); setFocusRemise(false) }} onOpenDispute={(id, as) => (as === 'SELLER' ? openDispute(id) : openBuyerDispute(id))} />
        case 'buyer-notifications':
          return <Notifications onNavigate={navigate} onSelectListing={selectListing} onOpenPurchase={id => openPurchase(id, 'buyer-handover')} currentUser={currentUser} onLogout={logout} />
        case 'buyer-history':
          return <History onNavigate={navigate} onSelectListing={selectListing} onContactSeller={contactSellerFrom} onSearch={term => searchFromHome(term)} onSearchCategory={navigateToCategory} currentUser={currentUser} onProfileUpdated={setCurrentUser} onLogout={logout} />
        case 'seller-kyc':
          return <Kyc onNavigate={navigate} currentUser={currentUser} onLogout={logout} onViewShop={selectSeller} />
        case 'seller-shop':
          return <MyShop onNavigate={navigate} currentUser={currentUser} onLogout={logout} onOpenShop={openShop} />
        case 'support':
          return <Support onNavigate={navigate} focusTicketId={focusTicketId} currentUser={currentUser} onLogout={logout} />
        case 'seller-campaigns':
          return <SellerCampaigns onNavigate={navigate} currentUser={currentUser} onLogout={logout} />
        case 'seller-badge':
          return <MyBadgePage onNavigate={navigate} currentUser={currentUser} onLogout={logout} onProfileUpdated={setCurrentUser} />
        case 'seller-qr':
          return <MyQrPage onNavigate={navigate} currentUser={currentUser} onLogout={logout} />
        case 'seller-shop-promos':
          return <ShopPromos onNavigate={navigate} currentUser={currentUser} onLogout={logout} onOpenShop={openShop} />
        case 'seller-shop-stats':
          return <ShopStats onNavigate={navigate} onSelectListing={selectListing} currentUser={currentUser} onLogout={logout} />
        case 'buyer-settings':
          return <Settings onNavigate={navigate} dark={dark} onToggleDark={() => setDark(d => !d)} currentUser={currentUser} onLogout={logout} onProfileUpdated={setCurrentUser} onViewShop={selectSeller} />
        default:
          return <Dashboard onNavigate={navigate} onSelectListing={selectListing} onOpenPurchase={id => openPurchase(id, 'buyer-handover')} onOpenConversation={contactSellerAbout} onOpenHandover={openHandover} currentUser={currentUser} onLogout={logout} />
      }
    })()
    return (
      <div className={dark ? 'dark' : ''} style={{ background: 'var(--bg)' }}>
        {/* Only the page: the Support tab, banners… stay mounted. */}
        <ErrorBoundary resetKey={pageKey} fullScreen>
          {/* Microsoft Clarity: every account page is masked (messages,
              credits, payments, settings, shop, orders…). */}
          <div data-clarity-mask="True" className="contents">
            <Suspense fallback={<PageFallback fullScreen />}>{accountContent}</Suspense>
          </div>
        </ErrorBoundary>
        <SupportTab page={accountPage} isLoggedIn={isLoggedIn} currentUser={currentUser} onNavigate={navigate} />
        <PaymentReturn isLoggedIn={isLoggedIn} />
        <ConsentBanner onOpenLegal={openLegal} />
        {verifyPrompt}
        {verifySheet}
        <InstallBanner show={showInstallBanner && !showUpdateBanner && !consentOpen && page !== 'seller-post' && page !== 'seller-edit'} guide={showInstallGuide} onInstall={handleInstall} onDismiss={handleDismiss} />
        {onboarding}
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
        location={marketLocation}
        onLocationChange={changeLocation}
        onOpenLegal={openLegal}
      >
        <ErrorBoundary resetKey={pageKey}>
          <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
        </ErrorBoundary>
      </Layout>
      <InstallBanner show={showInstallBanner && !showUpdateBanner && !consentOpen && page !== 'seller-post' && page !== 'seller-edit'} guide={showInstallGuide} onInstall={handleInstall} onDismiss={handleDismiss} />
      {/* One prompt at a time — stacked banners hid the page on a phone. */}
      {verifyPrompt}
      {verifySheet}
      {isLoggedIn && pushStatus && !verifyPrompt && !showUpdateBanner && !showInstallBanner && !consentOpen && ['permission-required', 'error', 'ios-install-required', 'permission-denied'].includes(pushStatus) && !pushDismissed && !isSnoozed('push') && (
        <PushBanner status={pushStatus} enabling={enablingPush} onEnable={enablePush} onDismiss={() => { snooze('push'); setPushDismissed(true) }} />
      )}
      <UpdateBanner show={showUpdateBanner} onUpdate={applyServiceWorkerUpdate} onDismiss={() => setShowUpdateBanner(false)} />
      <SupportTab page={page} isLoggedIn={isLoggedIn} currentUser={currentUser} onNavigate={navigate} />
      <PaymentReturn isLoggedIn={isLoggedIn} />
      <ConsentBanner onOpenLegal={openLegal} />
      {onboarding}
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
