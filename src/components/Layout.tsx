import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import {
  Search, Bell, Heart, MessageCircle, Menu, X, ChevronDown,
  Sun, Moon, LogOut, Settings, Package, BarChart2,
  Plus, Home, CheckCircle2, Zap, Car, Home as HomeIcon, Smartphone,
  Shirt, Wrench, Grid, User
} from 'lucide-react'
import Logo from './Logo'
import SearchOverlay from './SearchOverlay'
import FlashIcon from './FlashIcon'
import { FOOTER_SETTINGS_QUERY, ACTIVE_CAMPAIGN_QUERY, type RemoteFooterSettings, type ActiveCampaign } from '../graphql/content'

type Page =
  | 'home' | 'search' | 'flash-offers' | 'listing-detail' | 'seller-profile' | 'categories' | 'auth' | 'forgot-password'
  | 'buyer-dashboard' | 'buyer-favorites' | 'buyer-messages' | 'buyer-notifications' | 'buyer-history' | 'buyer-settings'
  | 'seller-dashboard' | 'seller-post' | 'seller-edit' | 'seller-listings' | 'seller-stats' | 'seller-premium'

type LayoutProps = {
  currentPage: Page
  onNavigate: (page: Page) => void
  onNavigateCategory: (categoryId: string) => void
  dark: boolean
  onToggleDark: () => void
  children: React.ReactNode
  isLoggedIn: boolean
  currentUser?: { fullName: string; email: string; avatarUrl?: string | null } | null
  onToggleLogin: () => void
  onSelectListing?: (id: string) => void
  onSetSearchTerm?: (term: string) => void
  onClearCategoryFilter?: () => void
}

export default function Layout({
  currentPage,
  onNavigate,
  onNavigateCategory,
  dark,
  onToggleDark,
  children,
  isLoggedIn,
  currentUser,
  onToggleLogin,
  onSelectListing,
  onSetSearchTerm,
  onClearCategoryFilter
}: LayoutProps) {
  const displayName = currentUser?.fullName || 'Mon compte'
  const displayInitial = displayName.charAt(0).toUpperCase()
  const [search, setSearch] = useState('')
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('Accueil')
  const flashTexts = ['Offres Flash', 'Jusqu\'à -50%', 'Livraison Offerte', 'Stock Limitė']
  const [flashIdx, setFlashIdx] = useState(0)

  // BO-authored footer copy — falls back to the default copy below when
  // unconfigured, same convention as the Banner slots.
  const { data: footerData } = useQuery<{ footerSettings: RemoteFooterSettings | null }>(FOOTER_SETTINGS_QUERY)
  const footer = footerData?.footerSettings

  // Site-wide campaign theming — a live campaign's color becomes the accent
  // for the announcement bar below (and anything else that opts into
  // --campaign-accent) without repainting --primary everywhere, which would
  // make every button/link on the site match whatever color an admin picked
  // for the current campaign.
  const { data: campaignData } = useQuery<{ activeCampaign: ActiveCampaign | null }>(ACTIVE_CAMPAIGN_QUERY)
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
    const t = setInterval(() => setFlashIdx(i => (i + 1) % flashTexts.length), 5000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column' }}>

      {/* Campaign announcement bar — appears automatically on every page
          while a campaign is ACTIVE and inside its date window, themed with
          the campaign's own color. No BO authoring beyond the campaign
          itself; see the Home campaign rail for the matching product grid. */}
      {activeCampaign && (
        <button
          onClick={() => onNavigate('flash-offers')}
          style={{
            width: '100%', border: 'none', cursor: 'pointer',
            background: 'var(--campaign-accent, var(--primary))', color: '#FFFFFF',
            padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.82rem', textAlign: 'left',
          }}
        >
          <Zap size={14} style={{ flexShrink: 0 }} fill="#FFFFFF" />
          {/* Name + description truncate together on one line rather than
              wrapping to several — a long campaign name/description
              shouldn't push a persistent site-wide bar to 3+ lines on a
              narrow screen. */}
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeCampaign.name}
            {activeCampaign.description && (
              <span style={{ fontWeight: 600, opacity: 0.9 }}> — {activeCampaign.description}</span>
            )}
          </span>
          {daysRemaining > 0 && (
            <span style={{ opacity: 0.85, flexShrink: 0 }}>· se termine dans {daysRemaining}j</span>
          )}
        </button>
      )}

      {/* Main Header */}
      <header className="glass-header" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', height: 72 }}>

            {/* Official Yüpixi Logo */}
            <button
              onClick={() => onNavigate('home')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <Logo size="md" colorMode="red" />
            </button>

            {/* Search button — opens overlay */}
            <div onClick={openSearchOverlay} className="desktop-only" style={{
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: 12,
              padding: '0 16px',
              height: 42,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              color: 'var(--fg-subtle)',
              fontSize: '0.85rem',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              minWidth: 240,
            }}>
              <Search size={16} />
              <span>Rechercher sur Yüpixi...</span>
            </div>

            {/* Right Header Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>

              {/* Mobile search icon */}
              <button
                onClick={openSearchOverlay}
                className="mobile-search-btn"
                style={{
                  background: 'var(--border-subtle)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  width: 38,
                  height: 38,
                  color: 'var(--fg-muted)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Rechercher"
              >
                <Search size={18} />
              </button>

              <div className="desktop-only">
                <button
                  onClick={onToggleDark}
                  style={{
                    background: 'var(--border-subtle)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    width: 38,
                    height: 38,
                    color: 'var(--fg-muted)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Changer le thème"
                >
                  {dark ? <Sun size={18} style={{ color: '#FFDD21' }} /> : <Moon size={18} />}
                </button>
              </div>

              {isLoggedIn ? (
                <>
                  {/* Notifications — badge/dropdown content will return once
                      real notifications ship; for now just navigate.
                      Desktop only: on mobile these three plus the dark-mode
                      toggle crowded the header past the viewport width —
                      Favoris/Profil already live in the bottom nav, and
                      Messages/Notifications are one tap away from there. */}
                  <button
                    onClick={() => onNavigate('buyer-notifications')}
                    className="desktop-only"
                    style={{
                      background: 'var(--border-subtle)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      width: 38,
                      height: 38,
                      color: 'var(--fg-muted)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Notifications"
                  >
                    <Bell size={18} />
                  </button>

                  {/* Messages */}
                  <button
                    onClick={() => onNavigate('buyer-messages')}
                    className="desktop-only"
                    style={{
                      background: 'var(--border-subtle)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      width: 38,
                      height: 38,
                      color: 'var(--fg-muted)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Messages"
                  >
                    <MessageCircle size={18} />
                  </button>

                  {/* Favorites */}
                  <button
                    onClick={() => onNavigate('buyer-favorites')}
                    className="desktop-only"
                    style={{
                      background: 'var(--border-subtle)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      width: 38,
                      height: 38,
                      color: 'var(--fg-muted)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Favoris"
                  >
                    <Heart size={18} />
                  </button>

                  {/* User Avatar Menu */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--bg-card)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 999,
                        padding: 4,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        fontFamily: 'Outfit, sans-serif',
                        overflow: 'hidden'
                      }}>
                        {currentUser?.avatarUrl
                          ? <img src={currentUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : displayInitial}
                      </div>
                      <span className="desktop-only" style={{ fontSize: '0.875rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'var(--fg)' }}>{displayName.split(' ')[0]}</span>
                      <ChevronDown size={14} className="desktop-only" style={{ color: 'var(--fg-muted)' }} />
                    </button>

                    {userMenuOpen && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', marginTop: 10,
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        width: 240, zIndex: 200, padding: 8
                      }}>
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                          <div style={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>{displayName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: 2 }}>{currentUser?.email ?? ''}</div>
                        </div>

                        {/* Everyone on Yüpixi can both buy and sell — one
                            unified account space, not two dashboards to
                            switch between. */}
                        {[
                          { icon: Home, label: 'Tableau de bord', page: 'buyer-dashboard' as Page },
                          { icon: Package, label: 'Mes Annonces', page: 'seller-listings' as Page },
                          { icon: Heart, label: 'Mes Favoris', page: 'buyer-favorites' as Page },
                          { icon: BarChart2, label: 'Statistiques', page: 'seller-stats' as Page },
                          { icon: Settings, label: 'Paramètres du Compte', page: 'buyer-settings' as Page },
                        ].map(item => (
                          <button
                            key={item.page}
                            onClick={() => { onNavigate(item.page); setUserMenuOpen(false) }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              width: '100%',
                              padding: '10px 14px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--fg)',
                              fontFamily: 'Outfit, sans-serif',
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              borderRadius: 8,
                              textAlign: 'left'
                            }}
                            className="sidebar-item"
                          >
                            <item.icon size={16} />
                            {item.label}
                          </button>
                        ))}

                        <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
                          <button
                            onClick={() => { onToggleLogin(); setUserMenuOpen(false) }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              width: '100%',
                              padding: '10px 14px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--primary)',
                              fontFamily: 'Outfit, sans-serif',
                              fontWeight: 800,
                              fontSize: '0.875rem'
                            }}
                          >
                            <LogOut size={16} />
                            Se Déconnecter
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  onClick={() => onNavigate('auth')}
                  className="btn-outline"
                  style={{ fontSize: '0.85rem', padding: '0.55rem 1.1rem' }}
                >
                  Se Connecter
                </button>
              )}

              {/* Action Button "+ Publier" — desktop only; on mobile this
                  lives in the bottom nav bar instead (see below) */}
              <button
                onClick={() => {
                  onNavigate('seller-post')
                  triggerToast('Création d\'une nouvelle annonce')
                }}
                className="btn-primary desktop-only"
                style={{ fontSize: '0.875rem', padding: '0.6rem 1.25rem' }}
              >
                <Plus size={16} />
                <span>Publier une annonce</span>
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--fg)' }}
                className="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Sub Navbar with Clean Lucide SVG Icons (No AI emojis!) */}
          <nav style={{ display: 'flex', gap: '0.35rem', padding: '0.4rem 0 0.8rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              { label: 'Offres Flash', icon: Zap, page: 'flash-offers' as Page, catId: '', highlight: true, flash: true },
              { label: 'Accueil', icon: Home, page: 'home' as Page, catId: '', highlight: false },
              { label: 'Véhicules', icon: Car, page: 'search' as Page, catId: 'vehicules', highlight: false },
              { label: 'Immobilier', icon: HomeIcon, page: 'search' as Page, catId: 'immobilier', highlight: false },
              { label: 'Électronique & Phones', icon: Smartphone, page: 'search' as Page, catId: 'electronique', highlight: false },
              { label: 'Mode & Beauté', icon: Shirt, page: 'search' as Page, catId: 'mode', highlight: false },
              { label: 'Services & Emploi', icon: Wrench, page: 'search' as Page, catId: 'services', highlight: false },
              { label: 'Toutes les Catégories', icon: Grid, page: 'categories' as Page, catId: '', highlight: false },
            ].map(item => {
              const IconComp = item.icon
              const isActive = item.highlight ? false : activeCategory === item.label
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveCategory(item.label)
                    if (item.page === 'flash-offers' || item.page === 'categories' || item.page === 'home') {
                      onNavigate(item.page)
                    } else {
                      onNavigateCategory(item.catId)
                    }
                  }}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    padding: item.highlight ? '8px 18px' : '6px 14px',
                    borderRadius: 999,
                    fontSize: item.highlight ? '0.9rem' : '0.825rem',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 800,
                    color: item.highlight ? '#FFFFFF' : isActive ? 'var(--primary)' : 'var(--fg-muted)',
                    background: item.highlight ? 'var(--primary)' : isActive ? 'rgba(254,0,0,0.08)' : 'transparent',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onMouseEnter={e => { if (!isActive && !item.highlight) e.currentTarget.style.background = 'var(--border-subtle)' }}
                  onMouseLeave={e => { if (!isActive && !item.highlight) e.currentTarget.style.background = 'transparent' }}
                >
                  <span className={item.highlight ? 'flash-icon' : ''} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {item.highlight ? <FlashIcon size={18} /> : <IconComp size={15} style={{ color: isActive ? 'var(--primary)' : 'var(--fg-muted)' }} />}
                  </span>
                  <span className={item.highlight ? 'flash-btn-text' : ''} key={flashIdx}>{item.highlight ? flashTexts[flashIdx] : item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed', inset: 0, top: 71, zIndex: 99,
          background: 'rgba(0,0,0,0.4)', animation: 'fadeIn 0.15s ease'
        }} onClick={() => setMobileMenuOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', width: '85%', maxWidth: 320,
            height: '100%', padding: '1rem', overflowY: 'auto',
            borderRight: '1px solid var(--border)', animation: 'slideIn 0.2s ease'
          }}>
            {isLoggedIn && (
              <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 900, fontSize: '0.9rem', overflow: 'hidden' }}>
                  {currentUser?.avatarUrl
                    ? <img src={currentUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : displayInitial}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif' }}>{displayName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{currentUser?.email ?? ''}</div>
                </div>
              </div>
            )}
            {[
              { label: 'Accueil', icon: Home, page: 'home' as Page },
              { label: 'Offres Flash', icon: Zap, page: 'flash-offers' as Page },
              { label: 'Toutes les Catégories', icon: Grid, page: 'categories' as Page },
              { label: 'Publier une annonce', icon: Plus, page: 'seller-post' as Page },
              ...(isLoggedIn ? [
                { label: 'Mes Favoris', icon: Heart, page: 'buyer-favorites' as Page },
                { label: 'Messages', icon: MessageCircle, page: 'buyer-messages' as Page },
              ] : []),
            ].map(item => {
              const IconComp = item.icon
              return (
                <button
                  key={item.page}
                  onClick={() => { onNavigate(item.page); setMobileMenuOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '0.85rem 0.75rem',
                    background: item.page === 'flash-offers' ? 'var(--primary)' : 'none',
                    border: 'none', cursor: 'pointer',
                    color: item.page === 'flash-offers' ? '#FFFFFF' : 'var(--fg)',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 700, fontSize: '0.9rem', borderRadius: 8,
                    textAlign: 'left'
                  }}
                >
                  <span className={item.page === 'flash-offers' ? 'flash-icon' : ''} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {item.page === 'flash-offers' ? <FlashIcon size={22} /> : <IconComp size={18} style={{ color: 'var(--fg-muted)' }} />}
                  </span>
                  <span key={item.page === 'flash-offers' ? flashIdx : undefined}>{item.page === 'flash-offers' ? flashTexts[flashIdx] : item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Content View */}
      <main className="page-enter" style={{ flex: 1 }}>
        {children}
      </main>

      {/* Toast Notification Floating Alert */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <CheckCircle2 size={18} style={{ color: '#FFDD21' }} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Official Footer */}
      <footer style={{ background: '#090D16', color: '#FFFFFF', padding: `3.5rem 1rem ${isMobile ? '5.5rem' : '2rem'}`, marginTop: '4rem', borderTop: '3px solid #FE0000' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
            <div>
              <Logo size="lg" colorMode="white" variant="full" />
              <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: '1.25rem', lineHeight: 1.6 }}>
                {footer?.tagline ||
                  "En associant la loupe au smile, Yüpixi offre une expérience d'achat et de vente simple, fluide et sécurisée en Côte d'Ivoire."}
              </p>
            </div>

            <div>
              <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFDD21', marginBottom: '1rem' }}>Recherche Rapide</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(footer?.quickLinks?.length ? footer.quickLinks : [
                  { label: 'Appartements à Abidjan Cocody', query: 'appartement' },
                  { label: 'iPhone 15 Pro Max Neufs', query: 'iPhone 15' },
                  { label: 'Toyota RAV4 & Hilux', query: 'Toyota' },
                  { label: 'Robes & Sacs de Marque', query: 'robe' },
                  { label: 'Services de Déménagement', query: 'déménagement' },
                ]).map(item => (
                  <li key={item.label}>
                    <button onClick={() => { onClearCategoryFilter?.(); onSetSearchTerm?.(item.query); onNavigate('search') }} style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFDD21', marginBottom: '1rem' }}>Espace Membre</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Publier une Annonce Gratuite', page: 'seller-post' as Page },
                  { label: 'Mes Favoris', page: 'buyer-favorites' as Page },
                  { label: 'Mon Tableau de Bord', page: 'buyer-dashboard' as Page },
                  { label: 'Boost & Premium', page: 'seller-premium' as Page },
                  { label: 'Centre de Sécurité', page: 'buyer-settings' as Page },
                ].map(item => (
                  <li key={item.label}>
                    <button onClick={() => onNavigate(isLoggedIn ? item.page : 'auth')} style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFDD21', marginBottom: '1rem' }}>Support & Villes</h4>
              <p style={{ color: '#94A3B8', fontSize: '0.875rem', lineHeight: 1.5 }}>
                {footer?.supportCities || 'Abidjan • Bouaké • Yamoussoukro • San-Pédro • Daloa • Korhogo'}
              </p>
              <div style={{ marginTop: 14 }}>
                <span style={{ color: '#FE0000', fontWeight: 800, fontSize: '0.85rem' }}>Support 7j/7 : {footer?.supportPhone || '+225 07 00 00 00 00'}</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1E293B', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
              {footer?.copyrightText ||
                "© 2026 Yüpixi CI. Tous droits réservés. Charte Graphique Officielle (Rouge #FE0000, Blanc #FFFFFF, Jaune #FFDD21)."}
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ color: '#94A3B8', fontSize: '0.85rem', fontWeight: 700 }}>Fait en Côte d'Ivoire</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Search Overlay */}
      {searchOverlayOpen && (
        <SearchOverlay
          query={search}
          onQueryChange={setSearch}
          onSearch={handleSearchSubmit}
          onSelectListing={onSelectListing || onNavigate}
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
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 300,
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          }}
        >
          {[
            { label: 'Accueil', icon: Home, page: 'home' as Page },
            { label: 'Recherche', icon: Search, page: 'search' as Page },
            { label: 'Publier', icon: Plus, page: 'seller-post' as Page, primary: true },
            { label: 'Favoris', icon: Heart, page: 'buyer-favorites' as Page },
            { label: 'Profil', icon: User, page: (isLoggedIn ? 'buyer-dashboard' : 'auth') as Page },
          ].map(item => {
            const IconComp = item.icon
            const isActive = currentPage === item.page

            if (item.primary) {
              return (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.page)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    padding: '0 0 6px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 800,
                    fontSize: '0.62rem',
                    color: 'var(--primary)',
                  }}
                >
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    marginTop: -20,
                    boxShadow: '0 4px 14px rgba(254,0,0,0.4)',
                    border: '3px solid var(--bg-card)',
                  }}>
                    <IconComp size={22} strokeWidth={2.6} color="#fff" />
                  </span>
                  {item.label}
                </button>
              )
            }

            return (
              <button
                key={item.label}
                onClick={() => onNavigate(item.page)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '8px 0 6px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.62rem',
                  color: isActive ? 'var(--primary)' : 'var(--fg-muted)',
                }}
              >
                <IconComp size={20} strokeWidth={isActive ? 2.4 : 2} />
                {item.label}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}
