import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import SearchPage from './pages/Search'
import ListingDetail from './pages/ListingDetail'
import SellerProfile from './pages/SellerProfile'
import Categories from './pages/Categories'
import Auth from './pages/Auth'
import FlashOffers from './pages/FlashOffers'
import {
  BuyerDashboard, BuyerFavorites, BuyerMessages,
  BuyerNotifications, BuyerHistory, BuyerSettings,
} from './pages/buyer/BuyerPages'
import {
  SellerDashboard, PostListing, SellerListings,
  SellerStats, SellerPayments, SellerPremium,
} from './pages/seller/SellerPages'
import {
  AdminDashboard, AdminUsers, AdminListings,
  AdminCategories, AdminReports, AdminStats, AdminConfig,
} from './pages/admin/AdminPages'

type Page =
  | 'home' | 'search' | 'flash-offers' | 'listing-detail' | 'seller-profile' | 'categories' | 'auth' | 'forgot-password'
  | 'buyer-dashboard' | 'buyer-favorites' | 'buyer-messages' | 'buyer-notifications' | 'buyer-history' | 'buyer-settings'
  | 'seller-dashboard' | 'seller-post' | 'seller-edit' | 'seller-listings' | 'seller-stats' | 'seller-payments' | 'seller-premium'
  | 'admin-dashboard' | 'admin-users' | 'admin-listings' | 'admin-categories' | 'admin-reports' | 'admin-stats' | 'admin-config'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [dark, setDark] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole] = useState<'buyer' | 'seller' | 'admin'>('seller')
  const [favorites, setFavorites] = useState<string[]>(['l1', 'l3'])
  const [selectedListingId, setSelectedListingId] = useState('l1')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchCity, setSearchCity] = useState('Abidjan')
  const [selectedSellerId, setSelectedSellerId] = useState('s1')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
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

  const navigateToCategory = (cat: string) => {
    setCategoryFilter(cat)
    setPage('search')
  }

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  const navigate = (p: Page) => setPage(p)

  const selectListing = (id: string) => {
    setSelectedListingId(id)
    setPage('listing-detail')
  }

  const selectSeller = (id: string) => {
    setSelectedSellerId(id)
    setPage('seller-profile')
  }

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
  }

  const toggleLogin = () => {
    setIsLoggedIn(prev => !prev)
    if (isLoggedIn) {
      setPage('home')
    }
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} onCategorySelect={navigateToCategory} />
      case 'search':
        return <SearchPage onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} categoryFilter={categoryFilter} onClearCategoryFilter={() => setCategoryFilter('')} searchTerm={searchTerm} onSearchTermChange={setSearchTerm} selectedCity={searchCity} onCityChange={setSearchCity} />
      case 'listing-detail':
        return <ListingDetail listingId={selectedListingId} onNavigate={navigate} onSelectSeller={selectSeller} favorites={favorites} onToggleFavorite={toggleFavorite} />
      case 'seller-profile':
        return <SellerProfile sellerId={selectedSellerId} onNavigate={navigate} onSelectListing={selectListing} />
      case 'categories':
        return <Categories onNavigate={navigate} onCategorySelect={navigateToCategory} />
      case 'flash-offers':
        return <FlashOffers onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} />
      case 'auth':
        return <Auth onNavigate={navigate} onLogin={() => setIsLoggedIn(true)} />

      // Buyer pages
      case 'buyer-dashboard':
        return <BuyerDashboard onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} />
      case 'buyer-favorites':
        return <BuyerFavorites onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} />
      case 'buyer-messages':
        return <BuyerMessages onNavigate={navigate} />
      case 'buyer-notifications':
        return <BuyerNotifications onNavigate={navigate} />
      case 'buyer-history':
        return <BuyerHistory onNavigate={navigate} onSelectListing={selectListing} />
      case 'buyer-settings':
        return <BuyerSettings onNavigate={navigate} dark={dark} onToggleDark={() => setDark(d => !d)} />

      // Admin pages
      case 'admin-dashboard':
        return <AdminDashboard onNavigate={navigate} />
      case 'admin-users':
        return <AdminUsers onNavigate={navigate} />
      case 'admin-listings':
        return <AdminListings onNavigate={navigate} onSelectListing={selectListing} />
      case 'admin-categories':
        return <AdminCategories onNavigate={navigate} />
      case 'admin-reports':
        return <AdminReports onNavigate={navigate} />
      case 'admin-stats':
        return <AdminStats onNavigate={navigate} />
      case 'admin-config':
        return <AdminConfig onNavigate={navigate} />

      default:
        return <Home onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} />
    }
  }

  // Seller dashboard gets full viewport layout (standalone)
  if (page.startsWith('seller-')) {
    const sellerContent = (() => {
      switch (page) {
        case 'seller-dashboard':
          return <SellerDashboard onNavigate={navigate} />
        case 'seller-post':
        case 'seller-edit':
          return <PostListing onNavigate={navigate} />
        case 'seller-listings':
          return <SellerListings onNavigate={navigate} onSelectListing={selectListing} />
        case 'seller-stats':
          return <SellerStats onNavigate={navigate} />
        case 'seller-payments':
          return <SellerPayments onNavigate={navigate} />
        case 'seller-premium':
          return <SellerPremium onNavigate={navigate} />
      }
    })()
    return (
      <div className={dark ? 'dark' : ''} style={{ background: 'var(--bg)' }}>
        {sellerContent}
        <InstallBanner show={showInstallBanner} guide={showInstallGuide} onInstall={handleInstall} onDismiss={handleDismiss} />
      </div>
    )
  }

  // Messages page gets full-height special layout
  if (page === 'buyer-messages') {
    return (
      <div className={dark ? 'dark' : ''} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', height: 64, display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '1rem' }}>
          <button onClick={() => navigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <svg width="36" height="36" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#FE0000" />
              <path d="M14 28 C14 36, 34 36, 34 28" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <circle cx="18" cy="19" r="2.5" fill="white" />
              <circle cx="30" cy="19" r="2.5" fill="white" />
              <line x1="24" y1="14" x2="24" y2="22" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.3rem', color: '#FE0000' }}>Yüpixi</span>
          <span style={{ color: 'var(--fg-muted)', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>/ Messages</span>
          <button onClick={() => navigate('home')} style={{ marginLeft: 'auto', color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>
            ← Retour à l'accueil
          </button>
        </div>
        <BuyerMessages onNavigate={navigate} />
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
        dark={dark}
        onToggleDark={() => setDark(d => !d)}
        isLoggedIn={isLoggedIn}
        userRole={userRole}
        onToggleLogin={toggleLogin}
        onSelectListing={selectListing}
        onSetSearchTerm={setSearchTerm}
      >
        {renderPage()}
      </Layout>
      <InstallBanner show={showInstallBanner} guide={showInstallGuide} onInstall={handleInstall} onDismiss={handleDismiss} />
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
          fontFamily: "'Outfit', 'Nunito', sans-serif",
        }} onClick={onDismiss}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420,
            padding: '2rem 1.5rem', textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#FE0000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <img src="/icon-yupixi-white.svg" alt="Yüpixi" style={{ width: 36, height: 36 }} />
            </div>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.2rem', margin: '0 0 0.5rem' }}>Installer Yüpixi</h3>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              {isSafari
                ? 'Appuyez sur le bouton Partager <span style="font-size:1.2rem">⬆️</span> puis choisissez "Sur l\'écran d\'accueil".'
                : isChrome
                  ? 'Appuyez sur le menu ⋮ puis choisissez "Ajouter à l\'écran d\'accueil".'
                  : 'Utilisez le menu du navigateur pour ajouter à l\'écran d\'accueil.'}
            </p>
            <button onClick={onDismiss} style={{ background: '#FE0000', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 32px', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', width: '100%' }}>
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
        fontFamily: "'Outfit', 'Nunito', sans-serif",
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FE0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src="/icon-yupixi-white.svg" alt="Yüpixi" style={{ width: 30, height: 30 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>Installer Yüpixi</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>sur l'écran d'accueil</div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 6, fontSize: '0.85rem', fontWeight: 600 }}>Plus tard</button>
        <button onClick={onInstall} style={{ background: '#FE0000', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          Installer
        </button>
      </div>
    </>
  )
}
