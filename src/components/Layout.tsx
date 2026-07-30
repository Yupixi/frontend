import { useState } from 'react'
import {
  Search, MapPin, Bell, Heart, MessageCircle, Menu, X, ChevronDown,
  Sun, Moon, LogOut, Settings, Package, BarChart2, Shield,
  Plus, Home, Sparkles, CheckCircle2, Zap, Car, Home as HomeIcon, Smartphone,
  Shirt, Wrench, Grid
} from 'lucide-react'
import Logo from './Logo'
import { notifications } from '../data/mockData'

type Page =
  | 'home' | 'search' | 'listing-detail' | 'seller-profile' | 'categories' | 'auth' | 'forgot-password'
  | 'buyer-dashboard' | 'buyer-favorites' | 'buyer-messages' | 'buyer-notifications' | 'buyer-history' | 'buyer-settings'
  | 'seller-dashboard' | 'seller-post' | 'seller-edit' | 'seller-listings' | 'seller-stats' | 'seller-payments' | 'seller-premium'
  | 'admin-dashboard' | 'admin-users' | 'admin-listings' | 'admin-categories' | 'admin-reports' | 'admin-stats' | 'admin-config'

type LayoutProps = {
  currentPage: Page
  onNavigate: (page: Page) => void
  dark: boolean
  onToggleDark: () => void
  children: React.ReactNode
  isLoggedIn: boolean
  userRole: 'buyer' | 'seller' | 'admin'
  onToggleLogin: () => void
  onSelectRole?: (role: 'buyer' | 'seller' | 'admin') => void
}

export default function Layout({
  currentPage,
  onNavigate,
  dark,
  onToggleDark,
  children,
  isLoggedIn,
  userRole,
  onToggleLogin,
  onSelectRole
}: LayoutProps) {
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('Abidjan')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('Accueil')

  const unreadNotifs = notifications.filter(n => !n.read).length

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onNavigate('search')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column' }}>

      {/* Top Banner Notice */}
      <div style={{
        background: '#FFDD21',
        color: '#0F172A',
        padding: '6px 16px',
        fontSize: '0.8rem',
        fontWeight: 800,
        fontFamily: "'Outfit', sans-serif",
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        letterSpacing: '0.01em'
      }}>
        <Sparkles size={14} style={{ color: '#FE0000' }} />
        <span>Yüpixi Côte d'Ivoire — Achetez, vendez et payez par Mobile Money (Wave, Orange Money, MTN MoMo, Moov)</span>
      </div>

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

            {/* Role Switcher */}
            <div className="role-switcher" style={{ display: 'none' }}>
              <button
                className={`role-btn ${userRole === 'buyer' ? 'active' : ''}`}
                onClick={() => onSelectRole?.('buyer')}
              >
                Acheteur
              </button>
              <button
                className={`role-btn ${userRole === 'seller' ? 'active' : ''}`}
                onClick={() => onSelectRole?.('seller')}
              >
                Vendeur
              </button>
              <button
                className={`role-btn ${userRole === 'admin' ? 'active' : ''}`}
                onClick={() => onSelectRole?.('admin')}
              >
                Admin
              </button>
            </div>

            {/* Search bar desktop */}
            <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: 0, maxWidth: 600 }}>
              <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
                <input
                  className="input"
                  style={{
                    paddingLeft: 42,
                    borderRadius: '12px 0 0 12px',
                    borderRight: 'none',
                    background: 'var(--bg-card)',
                    fontSize: '0.9rem'
                  }}
                  placeholder="Rechercher... iPhone 15, Toyota, Villa Cocody..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* City selector */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                borderLeft: 'none',
                borderRight: 'none',
                padding: '0 10px',
                minWidth: 130
              }}>
                <MapPin size={15} style={{ color: 'var(--primary)', marginRight: 6, flexShrink: 0 }} />
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--fg)',
                    fontSize: '0.85rem',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {['Abidjan', 'Bouaké', 'Daloa', 'Korhogo', 'Yamoussoukro', 'San-Pédro', 'Grand-Bassam'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Search button */}
              <button
                type="submit"
                className="btn-primary"
                style={{
                  borderRadius: '0 12px 12px 0',
                  padding: '0 24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Search size={16} />
                <span style={{ fontSize: '0.9rem' }}>Trouver</span>
              </button>
            </form>

            {/* Right Header Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>

              {/* Dark mode toggle */}
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

              {isLoggedIn ? (
                <>
                  {/* Notifications */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false) }}
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
                        position: 'relative'
                      }}
                    >
                      <Bell size={18} />
                      {unreadNotifs > 0 && <span className="notif-dot">+{unreadNotifs}</span>}
                    </button>

                    {/* Notifications popover */}
                    {notifOpen && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', marginTop: 10,
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        width: 360, maxHeight: 420, overflowY: 'auto', zIndex: 200,
                      }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1rem' }}>Notifications</span>
                          <button onClick={() => { onNavigate('buyer-notifications'); setNotifOpen(false) }} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>Voir tout</button>
                        </div>
                        {notifications.slice(0, 5).map(n => (
                          <div
                            key={n.id}
                            style={{
                              padding: '12px 18px',
                              borderBottom: '1px solid var(--border-subtle)',
                              background: n.read ? 'transparent' : 'rgba(254,0,0,0.03)',
                              cursor: 'pointer',
                            }}
                            onClick={() => { setNotifOpen(false); onNavigate('buyer-notifications') }}
                          >
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.875rem', fontFamily: 'Outfit, sans-serif' }}>{n.title}</div>
                                <div style={{ color: 'var(--fg-muted)', fontSize: '0.8rem', marginTop: 2, lineHeight: 1.4 }}>{n.body}</div>
                                <div style={{ color: 'var(--fg-subtle)', fontSize: '0.75rem', marginTop: 4, fontWeight: 600 }}>{n.time}</div>
                              </div>
                              {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', marginLeft: 'auto', marginTop: 4, flexShrink: 0 }} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  <button
                    onClick={() => onNavigate('buyer-messages')}
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
                      position: 'relative'
                    }}
                  >
                    <MessageCircle size={18} />
                    <span className="notif-dot">2</span>
                  </button>

                  {/* Favorites */}
                  <button
                    onClick={() => onNavigate('buyer-favorites')}
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
                  >
                    <Heart size={18} />
                  </button>

                  {/* User Avatar Menu */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false) }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--bg-card)',
                        border: '1.5px solid var(--border)',
                        borderRadius: 999,
                        padding: '4px 12px 4px 5px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        fontFamily: 'Outfit, sans-serif'
                      }}>
                        K
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'var(--fg)' }}>Kouamé</span>
                      <ChevronDown size={14} style={{ color: 'var(--fg-muted)' }} />
                    </button>

                    {userMenuOpen && (
                      <div style={{
                        position: 'absolute', right: 0, top: '100%', marginTop: 10,
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        width: 240, zIndex: 200, padding: 8
                      }}>
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
                          <div style={{ fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>Kouamé Jean-Baptiste</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: 2 }}>kouame@yupixi.ci</div>

                          {/* Role Switch */}
                          <div style={{ marginTop: 10, display: 'flex', gap: 4, background: 'var(--border-subtle)', padding: 3, borderRadius: 8 }}>
                            {(['buyer', 'seller', 'admin'] as const).map(r => (
                              <button
                                key={r}
                                onClick={() => {
                                  onSelectRole?.(r)
                                  triggerToast(`Mode ${r === 'admin' ? 'Administrateur' : r === 'seller' ? 'Vendeur' : 'Acheteur'} activé`)
                                }}
                                style={{
                                  flex: 1,
                                  border: 'none',
                                  borderRadius: 6,
                                  padding: '4px 0',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  fontFamily: 'Outfit, sans-serif',
                                  cursor: 'pointer',
                                  background: userRole === r ? 'var(--primary)' : 'transparent',
                                  color: userRole === r ? '#FFF' : 'var(--fg-muted)'
                                }}
                              >
                                {r === 'admin' ? 'Admin' : r === 'seller' ? 'Vendeur' : 'Acheteur'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {[
                          { icon: Home, label: 'Mon Tableau de Bord', page: `${userRole}-dashboard` as Page },
                          { icon: Package, label: 'Mes Annonces Vente', page: 'seller-listings' as Page },
                          { icon: Heart, label: 'Mes Favoris', page: 'buyer-favorites' as Page },
                          { icon: BarChart2, label: 'Statistiques & Revenus', page: 'seller-stats' as Page },
                          ...(userRole === 'admin' ? [{ icon: Shield, label: 'Administration Center', page: 'admin-dashboard' as Page }] : []),
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

              {/* Action Button "+ Publier" */}
              <button
                onClick={() => {
                  onNavigate('seller-post')
                  triggerToast('Création d\'une nouvelle annonce')
                }}
                className="btn-primary"
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
              { label: 'Offres Flash', icon: Zap, page: 'search' as Page, highlight: true },
              { label: 'Accueil', icon: Home, page: 'home' as Page },
              { label: 'Véhicules', icon: Car, page: 'search' as Page },
              { label: 'Immobilier', icon: HomeIcon, page: 'search' as Page },
              { label: 'Électronique & Phones', icon: Smartphone, page: 'search' as Page },
              { label: 'Mode & Beauté', icon: Shirt, page: 'search' as Page },
              { label: 'Services & Emploi', icon: Wrench, page: 'search' as Page },
              { label: 'Toutes les Catégories', icon: Grid, page: 'categories' as Page },
            ].map(item => {
              const IconComp = item.icon
              const isActive = item.highlight ? false : activeCategory === item.label
              return (
                <button
                  key={item.label}
                  onClick={() => { setActiveCategory(item.label); onNavigate(item.page) }}
                  style={{
                    border: item.highlight ? '1px solid rgba(255,221,33,0.8)' : isActive ? '1px solid var(--primary)' : '1px solid transparent',
                    cursor: 'pointer',
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: '0.825rem',
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 800,
                    color: item.highlight ? '#0F172A' : isActive ? 'var(--primary)' : 'var(--fg-muted)',
                    background: item.highlight ? '#FFDD21' : isActive ? 'rgba(254,0,0,0.08)' : 'transparent',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <IconComp size={15} style={{ color: item.highlight ? '#0F172A' : isActive ? 'var(--primary)' : 'var(--fg-muted)' }} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

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
      <footer style={{ background: '#090D16', color: '#FFFFFF', padding: '3.5rem 1rem 2rem', marginTop: '4rem', borderTop: '3px solid #FE0000' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem', marginBottom: '2.5rem' }}>
            <div>
              <Logo size="lg" colorMode="white" variant="full" />
              <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: '1.25rem', lineHeight: 1.6 }}>
                En associant la loupe au smile, Yüpixi offre une expérience d'achat et de vente simple, fluide et sécurisée en Côte d'Ivoire.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <span className="badge badge-yellow">Orange Money</span>
                <span className="badge badge-blue">Wave</span>
                <span className="badge badge-yellow" style={{ background: '#FFCC00' }}>MTN MoMo</span>
              </div>
            </div>

            <div>
              <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFDD21', marginBottom: '1rem' }}>Recherche Rapide</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Appartements à Abidjan Cocody', 'iPhone 15 Pro Max Neufs', 'Toyota RAV4 & Hilux', 'Robes & Sacs de Marque', 'Services de Déménagement'].map(link => (
                  <li key={link}>
                    <button onClick={() => onNavigate('search')} style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFDD21', marginBottom: '1rem' }}>Espace Membre</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['Publier une Annonce Gratuite', 'Mes Favoris', 'Espace Vendeur Pro', 'Abonnements & Boost Annonces', 'Centre de Sécurité'].map(link => (
                  <li key={link}>
                    <button onClick={() => onNavigate('auth')} style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1rem', color: '#FFDD21', marginBottom: '1rem' }}>Support & Villes</h4>
              <p style={{ color: '#94A3B8', fontSize: '0.875rem', lineHeight: 1.5 }}>
                Abidjan • Bouaké • Yamoussoukro • San-Pédro • Daloa • Korhogo
              </p>
              <div style={{ marginTop: 14 }}>
                <span style={{ color: '#FE0000', fontWeight: 800, fontSize: '0.85rem' }}>Support 7j/7 : +225 07 00 00 00 00</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1E293B', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
              © 2026 Yüpixi CI. Tous droits réservés. Charte Graphique Officielle (Rouge #FE0000, Blanc #FFFFFF, Jaune #FFDD21).
            </p>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ color: '#94A3B8', fontSize: '0.85rem', fontWeight: 700 }}>Fait en Côte d'Ivoire</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
