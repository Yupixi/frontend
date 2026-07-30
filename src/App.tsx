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
  const [selectedSellerId, setSelectedSellerId] = useState('s1')
  const [categoryFilter, setCategoryFilter] = useState('')

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
        return <SearchPage onNavigate={navigate} onSelectListing={selectListing} favorites={favorites} onToggleFavorite={toggleFavorite} categoryFilter={categoryFilter} onClearCategoryFilter={() => setCategoryFilter('')} />
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

      // Seller pages
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
      >
        {renderPage()}
      </Layout>
    </div>
  )
}
