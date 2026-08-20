import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import {
  LayoutDashboard, Plus, Package, BarChart2, Award, Heart, MessageCircle,
  Bell, History, Settings, ChevronDown, Menu, X, LogOut, Home, ArrowLeft,
} from 'lucide-react'
import Logo from '../../components/Logo'
import { MY_LISTINGS_QUERY } from '../../graphql/listings'
import { MY_CONVERSATIONS_QUERY, type RemoteConversation } from '../../graphql/messaging'
import type { AuthUser } from '../../graphql/auth'

// Every Yupixi member is both a buyer and a seller — one account, one
// space. This shell (sidebar + header) is shared by every buyer-* and
// seller-* page instead of the two separate dashboards/sidebars this app
// used to have.
const sidebarItems = [
  { key: 'buyer-dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { key: 'seller-post', icon: Plus, label: 'Publier une annonce' },
  { key: 'seller-listings', icon: Package, label: 'Mes annonces' },
  { key: 'buyer-favorites', icon: Heart, label: 'Mes favoris' },
  { key: 'buyer-messages', icon: MessageCircle, label: 'Messages' },
  { key: 'seller-stats', icon: BarChart2, label: 'Statistiques' },
  { key: 'buyer-notifications', icon: Bell, label: 'Notifications' },
  { key: 'buyer-history', icon: History, label: 'Historique' },
  { key: 'seller-premium', icon: Award, label: 'Boost & Premium' },
  { key: 'buyer-settings', icon: Settings, label: 'Paramètres' },
]

export const ACCOUNT_PAGE_LABELS: Record<string, string> = {
  'buyer-dashboard': 'Tableau de bord',
  'seller-post': 'Publier une annonce',
  'seller-edit': "Modifier l'annonce",
  'seller-listings': 'Mes annonces',
  'buyer-favorites': 'Mes favoris',
  'buyer-messages': 'Messages',
  'seller-stats': 'Statistiques',
  'buyer-notifications': 'Notifications',
  'buyer-history': 'Historique',
  'seller-premium': 'Boost & Premium',
  'buyer-settings': 'Paramètres',
}

function useUnreadCounts() {
  const { data: listingsData } = useQuery<{ myListings: { totalCount: number } }>(MY_LISTINGS_QUERY, {
    variables: { page: 1, pageSize: 1 },
  })
  const { data: conversationsData } = useQuery<{ myConversations: RemoteConversation[] }>(MY_CONVERSATIONS_QUERY, {
    pollInterval: 30_000,
  })
  const unreadMessages = (conversationsData?.myConversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0)
  return { listingsCount: listingsData?.myListings.totalCount, unreadMessages }
}

function SidebarNav({ active, onNavigate, onClose, listingsCount, unreadMessages }: {
  active: string; onNavigate: (p: any) => void; onClose?: () => void; listingsCount?: number; unreadMessages?: number
}) {
  return (
    <>
      {sidebarItems.map(item => {
        const badge = item.key === 'seller-listings' ? listingsCount : item.key === 'buyer-messages' ? unreadMessages : undefined
        return (
          <button
            key={item.key}
            onClick={() => { onNavigate(item.key); onClose?.() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '0.6rem 0.75rem', border: 'none', borderRadius: 10,
              cursor: 'pointer', marginBottom: 2,
              background: active === item.key ? 'rgba(254,0,0,0.07)' : 'transparent',
              color: active === item.key ? '#FE0000' : 'var(--fg-muted)',
              fontFamily: "'Outfit', 'Nunito', sans-serif",
              fontWeight: active === item.key ? 800 : 600,
              fontSize: '0.85rem',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (active !== item.key) e.currentTarget.style.background = 'var(--border-subtle)' }}
            onMouseLeave={e => { if (active !== item.key) e.currentTarget.style.background = 'transparent' }}
          >
            <item.icon size={18} strokeWidth={active === item.key ? 2.5 : 1.8} />
            <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
            {!!badge && (
              <span style={{
                background: active === item.key ? '#FE0000' : 'var(--border)', color: active === item.key ? '#fff' : 'var(--fg-muted)',
                borderRadius: 8, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 800,
              }}>{badge}</span>
            )}
          </button>
        )
      })}
    </>
  )
}

function AccountSidebar({ active, onNavigate, sidebarOpen, onClose, listingsCount, unreadMessages }: {
  active: string; onNavigate: (p: any) => void; sidebarOpen?: boolean; onClose?: () => void; listingsCount?: number; unreadMessages?: number
}) {
  return (
    <>
      <aside className="dashboard-sidebar-desktop" style={{
        width: 230, background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
      }}>
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
          <Logo size="md" colorMode="red" />
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
          <SidebarNav active={active} onNavigate={onNavigate} listingsCount={listingsCount} unreadMessages={unreadMessages} />
        </div>
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => onNavigate('home')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.75rem', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'transparent', color: 'var(--fg-muted)', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={16} />
            <span>Retour au site</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="dashboard-sidebar-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, animation: 'fadeIn 0.15s ease-out' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => onClose?.()} />
          <aside style={{ position: 'relative', width: 280, height: '100%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease-out' }}>
            <div style={{ padding: '1.1rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <Logo size="sm" colorMode="red" />
              <button onClick={() => onClose?.()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
              <SidebarNav active={active} onNavigate={onNavigate} onClose={onClose} listingsCount={listingsCount} unreadMessages={unreadMessages} />
            </div>
            <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { onNavigate('home'); onClose?.() }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.75rem', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'transparent', color: 'var(--fg-muted)', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 600, fontSize: '0.82rem' }}>
                <LogOut size={16} />
                <span>Retour au site</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function AccountHeader({ activeLabel, currentUser, onBack, onToggleSidebar, onNavigate, onLogout }: {
  activeLabel: string; currentUser?: AuthUser | null; onBack: () => void; onToggleSidebar?: () => void; onNavigate: (p: any) => void; onLogout: () => void
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const displayName = currentUser?.fullName || 'Mon compte'
  const displayInitial = displayName.charAt(0).toUpperCase()
  return (
    <header className="dashboard-header" style={{
      height: 60, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 1.25rem', gap: '0.75rem',
      flexShrink: 0,
    }}>
      <button className="dashboard-sidebar-mobile-btn" onClick={onToggleSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)' }}>
        <Menu size={20} />
      </button>
      <button onClick={onBack} title="Retour au site" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', borderRadius: 8, transition: 'all 0.12s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <ArrowLeft size={18} />
      </button>
      <h1 className="desktop-only" style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: 'var(--fg)' }}>{activeLabel}</h1>
      <div style={{ flex: 1 }} />
      <button onClick={() => onNavigate('buyer-notifications')} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', transition: 'all 0.12s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Bell size={18} />
      </button>
      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
      <div style={{ position: 'relative' }}>
        <button onClick={() => setUserMenuOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 10, cursor: 'pointer', background: 'none', border: 'none', transition: 'all 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg, #FE0000, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.8rem', fontFamily: "'Outfit', sans-serif", overflow: 'hidden' }}>
            {currentUser?.avatarUrl
              ? <img src={currentUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : displayInitial}
          </div>
          <div className="desktop-only" style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.78rem', lineHeight: 1.2 }}>{displayName}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--fg-subtle)' }}>{currentUser?.email ?? ''}</div>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--fg-subtle)' }} />
        </button>

        {userMenuOpen && (
          <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: 220, zIndex: 200, padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            {[
              { icon: Home, label: 'Tableau de bord', page: 'buyer-dashboard' as const },
              { icon: Settings, label: 'Paramètres du compte', page: 'buyer-settings' as const },
            ].map(item => (
              <button
                key={item.page}
                onClick={() => { onNavigate(item.page); setUserMenuOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.85rem', borderRadius: 8, textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
              <button
                onClick={() => { setUserMenuOpen(false); onLogout() }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.85rem', borderRadius: 8, textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={16} />
                Se déconnecter
              </button>
            </div>
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
  const { listingsCount, unreadMessages } = useUnreadCounts()

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <AccountSidebar active={active} onNavigate={(p: string) => { setSidebarOpen(false); onNavigate(p) }} sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} listingsCount={listingsCount} unreadMessages={unreadMessages} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AccountHeader activeLabel={ACCOUNT_PAGE_LABELS[active] || active} currentUser={currentUser} onBack={() => onNavigate('home')} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onNavigate={onNavigate} onLogout={onLogout} />
        <main className="dashboard-main" style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
