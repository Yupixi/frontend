import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import {
  Heart, MessageCircle, Bell, History, Settings, LayoutDashboard,
  Eye, MapPin, Star, Shield, Send, Search, Trash2, CheckCheck,
  Smartphone, Moon, Sun, Lock, User, Globe, BellRing, Package,
  LogOut, ChevronRight, TrendingUp, Clock, ArrowLeft, Menu, X,
} from 'lucide-react'
import { listings, conversations, notifications, sellers } from '../../data/mockData'
import Price from '../../components/Price'
import { MY_FAVORITES_QUERY } from '../../graphql/favorites'
import type { AuthUser } from '../../graphql/auth'

type FavoriteListing = {
  id: string
  title: string
  price: number | null
  currency: string
  city: string
  coverImageUrl: string | null
}

type BuyerSidebarProps = {
  active: string
  onNavigate: (page: any) => void
}

function BuyerSidebarContent({ active, onNavigate, onClose }: { active: string; onNavigate: (p: any) => void; onClose?: () => void }) {
  const items = [
    { key: 'buyer-dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { key: 'buyer-favorites', icon: Heart, label: 'Mes favoris' },
    { key: 'buyer-messages', icon: MessageCircle, label: 'Messages', badge: 3 },
    { key: 'buyer-notifications', icon: Bell, label: 'Notifications', badge: 3 },
    { key: 'buyer-history', icon: History, label: 'Historique' },
    { key: 'buyer-settings', icon: Settings, label: 'Paramètres' },
  ]
  return (
    <>
      <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-subtle)' }}>
        Espace Acheteur
      </div>
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => { onNavigate(item.key); onClose?.() }}
          className={`sidebar-item ${active === item.key ? 'active' : ''}`}
          style={{ width: '100%', border: 'none', position: 'relative' }}
        >
          <item.icon size={18} />
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge && (
            <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 800 }}>{item.badge}</span>
          )}
        </button>
      ))}
      <div style={{ margin: '1rem 8px 0', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
        <button onClick={() => { onNavigate('seller-dashboard'); onClose?.() }} className="sidebar-item" style={{ width: '100%', border: 'none', color: 'var(--primary)' }}>
          <Package size={18} /> Espace Vendeur
        </button>
      </div>
    </>
  )
}

function BuyerSidebar({ active, onNavigate, sidebarOpen, onClose }: { active: string; onNavigate: (p: any) => void; sidebarOpen?: boolean; onClose?: () => void }) {
  return (
    <>
      <aside className="buyer-sidebar-desktop" style={{ position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto', paddingTop: '0.75rem', flexShrink: 0, width: 220 }}>
        <BuyerSidebarContent active={active} onNavigate={onNavigate} />
      </aside>
      {sidebarOpen && (
        <div className="buyer-sidebar-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, animation: 'fadeIn 0.15s ease-out' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => onClose?.()} />
          <aside style={{ position: 'relative', width: 280, height: '100%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease-out' }}>
            <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 900, fontSize: '1rem' }}>Menu</span>
              <button onClick={() => onClose?.()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <BuyerSidebarContent active={active} onNavigate={onNavigate} onClose={onClose} />
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function PageLayout({ active, onNavigate, children }: { active: string, onNavigate: (p: any) => void, children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', maxWidth: 1280, margin: '0 auto' }}>
      <BuyerSidebar active={active} onNavigate={(p: string) => { setSidebarOpen(false); onNavigate(p) }} sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="buyer-main" style={{ flex: 1, padding: '2rem', minWidth: 0 }}>
        <button
          className="buyer-mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', width: 34, height: 34, borderRadius: 8, display: 'none', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', marginBottom: '0.75rem' }}
        >
          <Menu size={20} />
        </button>
        {children}
      </div>
    </div>
  )
}

// ─── BUYER DASHBOARD ───────────────────────────────────────────────────────
export function BuyerDashboard({ onNavigate, onSelectListing, favorites, currentUser }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void, favorites: string[], currentUser?: AuthUser | null }) {
  const { data: favData } = useQuery<{ myFavorites: { items: FavoriteListing[] } }>(MY_FAVORITES_QUERY, {
    variables: { page: 1, pageSize: 4 },
  })
  const recentListings = favData?.myFavorites.items ?? []
  const stats = [
    { label: 'Favoris', value: favorites.length, icon: Heart, color: '#FE0000', bg: 'rgba(254,0,0,0.08)' },
    { label: 'Messages', value: 3, icon: MessageCircle, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Annonces vues', value: 127, icon: Eye, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
    { label: 'Alertes actives', value: 4, icon: BellRing, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  ]

  return (
    <PageLayout active="buyer-dashboard" onNavigate={onNavigate}>
      <h1 className="buyer-page-title" style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>
        Bonjour{currentUser?.fullName ? `, ${currentUser.fullName.split(' ')[0]}` : ''} 👋
      </h1>

      <div className="buyer-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.icon size={22} color={s.color} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: 'var(--fg)' }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: 0, fontSize: '1rem' }}>Annonces sauvegardées</h2>
          <button onClick={() => onNavigate('buyer-favorites')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            Voir tout <ChevronRight size={15} />
          </button>
        </div>
        {recentListings.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Aucune annonce sauvegardée pour l'instant.</p>
        ) : (
          <div className="buyer-fav-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {recentListings.map(l => (
              <div key={l.id} className="card card-hover" style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>
                <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0 }}>
                  {l.coverImageUrl && (
                    <img src={l.coverImageUrl} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</p>
                  <div className="price-tag" style={{ fontSize: '0.9rem', marginTop: 2 }}><Price amount={l.price} /></div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={10} />{l.city}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: 0, fontSize: '1rem' }}>Messages récents</h2>
          <button onClick={() => onNavigate('buyer-messages')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            Voir tout <ChevronRight size={15} />
          </button>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {conversations.map((conv, i) => (
            <div
              key={conv.id}
              style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem', borderBottom: i < conversations.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: conv.unread > 0 ? 'rgba(254,0,0,0.02)' : 'transparent' }}
              onClick={() => onNavigate('buyer-messages')}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={conv.seller.avatar} alt={conv.seller.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                {conv.unread > 0 && <span className="notif-dot" style={{ top: 0, right: 0 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{conv.seller.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)' }}>{conv.lastTime}</span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.lastMessage}</p>
              </div>
              {conv.unread > 0 && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999, padding: '2px 7px', fontSize: '0.7rem', fontWeight: 800, alignSelf: 'center', flexShrink: 0 }}>{conv.unread}</span>}
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}

// ─── BUYER FAVORITES ───────────────────────────────────────────────────────
export function BuyerFavorites({ onNavigate, onSelectListing, onToggleFavorite }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void, favorites: string[], onToggleFavorite: (id: string) => void | Promise<void> }) {
  const { data, loading, refetch } = useQuery<{ myFavorites: { totalCount: number; items: FavoriteListing[] } }>(
    MY_FAVORITES_QUERY,
    { variables: { page: 1, pageSize: 50 } },
  )
  const favListings = data?.myFavorites.items ?? []

  const handleToggle = (id: string) => {
    void Promise.resolve(onToggleFavorite(id)).then(() => refetch())
  }

  if (loading) {
    return (
      <PageLayout active="buyer-favorites" onNavigate={onNavigate}>
        <p style={{ color: 'var(--fg-muted)' }}>Chargement...</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout active="buyer-favorites" onNavigate={onNavigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="buyer-page-title" style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>
          Mes favoris <span style={{ color: 'var(--fg-muted)', fontSize: '1rem', fontWeight: 600 }}>({favListings.length})</span>
        </h1>
      </div>

      {favListings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💔</div>
          <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 0.5rem' }}>Aucun favori pour l'instant</h3>
          <p style={{ color: 'var(--fg-muted)', marginBottom: '1.5rem' }}>Sauvegardez des annonces en cliquant sur le cœur ❤️</p>
          <button className="btn-primary" onClick={() => onNavigate('search')}>Parcourir les annonces</button>
        </div>
      ) : (
        <div className="buyer-fav-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {favListings.map(l => (
            <div key={l.id} className="card card-hover" style={{ overflow: 'hidden', position: 'relative' }}>
              <button
                onClick={() => handleToggle(l.id)}
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Heart size={16} fill="#FE0000" color="#FE0000" />
              </button>
              <div style={{ height: 170, background: 'var(--border-subtle)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>
                {l.coverImageUrl && (
                  <img src={l.coverImageUrl} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div className="price-tag"><Price amount={l.price} /></div>
                <p style={{ margin: '4px 0 6px', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.3 }}>{l.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--fg-muted)', fontSize: '0.78rem' }}>
                  <MapPin size={11} />{l.city}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem' }} onClick={() => onNavigate('buyer-messages')}>Contacter</button>
                  <button className="btn-outline" style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem' }} onClick={() => onSelectListing(l.id)}>Voir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  )
}

// ─── MESSAGES ───────────────────────────────────────────────────────────────
export function BuyerMessages({ onNavigate }: { onNavigate: (p: any) => void }) {
  const [activeConv, setActiveConv] = useState(conversations[0])
  const [msg, setMsg] = useState('')
  const [showList, setShowList] = useState(true)

  return (
    <div style={{ display: 'flex', maxWidth: 1280, margin: '0 auto', height: 'calc(100vh - 120px)', position: 'relative' }}>
      <BuyerSidebar active="buyer-messages" onNavigate={onNavigate} />

      {/* Conversation list */}
      <div className={`buyer-msg-list ${showList ? '' : 'buyer-msg-list-hidden'}`} style={{ width: 280, borderRight: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 0.75rem', fontSize: '1rem' }}>Messages</h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
            <input className="input" style={{ paddingLeft: 32, fontSize: '0.82rem', padding: '0.5rem 0.5rem 0.5rem 30px' }} placeholder="Rechercher..." />
          </div>
        </div>
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => { setActiveConv(conv); setShowList(false) }}
            style={{ display: 'flex', gap: '0.7rem', padding: '0.875rem 1rem', cursor: 'pointer', background: activeConv.id === conv.id ? 'rgba(254,0,0,0.04)' : 'transparent', borderLeft: activeConv.id === conv.id ? '3px solid var(--primary)' : '3px solid transparent', borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img src={conv.seller.avatar} alt={conv.seller.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
              {conv.unread > 0 && <span className="notif-dot" style={{ top: 0, right: 0 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: conv.unread > 0 ? 800 : 600, fontSize: '0.85rem' }}>{conv.seller.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--fg-subtle)' }}>{conv.lastTime}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: conv.unread > 0 ? 700 : 400 }}>
                {conv.lastMessage}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Chat view */}
      <div className={`buyer-msg-chat ${showList ? 'buyer-msg-chat-hidden' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="buyer-msg-back" onClick={() => setShowList(true)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 0, marginRight: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <img src={activeConv.seller.avatar} alt={activeConv.seller.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.9rem' }}>{activeConv.seller.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} /> En ligne
            </div>
          </div>
          <div style={{ marginLeft: 'auto', background: 'var(--border-subtle)', borderRadius: 8, padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: 'var(--fg-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📌 {activeConv.listing.title}
          </div>
        </div>

        <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {activeConv.messages.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: m.sender === 'me' ? 'flex-end' : 'flex-start' }}>
              <div>
                <div className={`chat-bubble ${m.sender === 'me' ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
                  {m.text}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--fg-subtle)', marginTop: 3, textAlign: m.sender === 'me' ? 'right' : 'left', display: 'flex', alignItems: 'center', justifyContent: m.sender === 'me' ? 'flex-end' : 'flex-start', gap: 3 }}>
                  {m.time}
                  {m.sender === 'me' && <CheckCheck size={12} color={m.read ? '#3B82F6' : 'var(--fg-subtle)'} />}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Écrivez votre message..."
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setMsg('')}
          />
          <button className="btn-primary" style={{ padding: '0.65rem', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setMsg('')}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────
export function BuyerNotifications({ onNavigate }: { onNavigate: (p: any) => void }) {
  const [items, setItems] = useState(notifications)
  const markAll = () => setItems(items.map(n => ({ ...n, read: true })))

  return (
    <PageLayout active="buyer-notifications" onNavigate={onNavigate}>
      <div className="buyer-notifications-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '0.75rem' }}>
        <h1 className="buyer-page-title" style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>
          Notifications <span style={{ color: 'var(--fg-muted)', fontSize: '1rem', fontWeight: 600 }}>({items.filter(n => !n.read).length} non lues)</span>
        </h1>
        <button onClick={markAll} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
          Tout marquer comme lu
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {items.map((n, i) => (
          <div
            key={n.id}
            onClick={() => setItems(items.map(x => x.id === n.id ? { ...x, read: true } : x))}
            style={{
              display: 'flex', gap: '0.75rem', padding: '1rem', borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              background: n.read ? 'transparent' : 'rgba(254,0,0,0.02)', cursor: 'pointer',
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: n.read ? 'var(--border-subtle)' : 'rgba(254,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              {n.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: n.read ? 600 : 800, fontSize: '0.9rem' }}>{n.title}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)' }}>{n.time}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--fg-muted)', lineHeight: 1.4 }}>{n.body}</p>
            </div>
            {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, alignSelf: 'center' }} />}
          </div>
        ))}
      </div>
    </PageLayout>
  )
}

// ─── HISTORY ────────────────────────────────────────────────────────────────
export function BuyerHistory({ onNavigate, onSelectListing }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void }) {
  const history = listings.slice(0, 6).map((l, i) => ({
    ...l,
    viewedAt: ['Il y a 10 min', 'Il y a 45 min', 'Il y a 2h', 'Hier, 16:30', 'Hier, 09:00', 'Il y a 3 jours'][i],
  }))

  return (
    <PageLayout active="buyer-history" onNavigate={onNavigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="buyer-page-title" style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Historique de navigation</h1>
        <button style={{ color: 'var(--fg-muted)', background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Trash2 size={15} /> Effacer
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {history.map((l, i) => (
          <div
            key={l.id + i}
            onClick={() => onSelectListing(l.id)}
            style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem 1rem', borderBottom: i < history.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 64, height: 52, borderRadius: 8, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0 }}>
              <img src={l.image} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', marginBottom: 3 }}>{l.title}</div>
              <div className="price-tag" style={{ fontSize: '0.9rem' }}><Price amount={l.price} /></div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--fg-subtle)', fontSize: '0.75rem' }}>
                <Clock size={12} />{l.viewedAt}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--fg-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                <MapPin size={11} />{l.location}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  )
}

// ─── SETTINGS ──────────────────────────────────────────────────────────────
export function BuyerSettings({ onNavigate, dark, onToggleDark, currentUser }: { onNavigate: (p: any) => void, dark: boolean, onToggleDark: () => void, currentUser?: AuthUser | null }) {
  const [name, setName] = useState(currentUser?.fullName ?? '')
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('Abidjan')
  const avatarInitial = (currentUser?.fullName || '?').charAt(0).toUpperCase()

  // currentUser can still be loading (fetched async in App.tsx) when this
  // page first mounts — sync once it arrives instead of only reading it at
  // the initial useState() call, which would miss that update.
  useEffect(() => {
    if (currentUser?.fullName) setName(currentUser.fullName)
    if (currentUser?.email) setEmail(currentUser.email)
  }, [currentUser])

  const settingSections = [
    {
      title: 'Profil',
      icon: User,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 900, fontSize: '1.5rem', flexShrink: 0 }}>{avatarInitial}</div>
            <button className="btn-outline" style={{ fontSize: '0.875rem' }}>Changer la photo</button>
          </div>
          <div className="buyer-settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Nom complet</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Téléphone</label>
              <input className="input" placeholder="+225 XX XX XX XX XX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Ville</label>
              <select className="input" value={city} onChange={e => setCity(e.target.value)}>
                {['Abidjan', 'Bouaké', 'Daloa', 'Korhogo', 'Yamoussoukro'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-primary" style={{ alignSelf: 'flex-start', padding: '0.65rem 1.5rem' }}>Enregistrer</button>
        </div>
      ),
    },
    {
      title: 'Notifications',
      icon: Bell,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {[
            { label: 'Nouveaux messages', desc: 'Recevoir des alertes pour les nouveaux messages' },
            { label: 'Réponses aux offres', desc: 'Être notifié quand un vendeur répond' },
            { label: 'Alertes de prix', desc: "Notification quand le prix d'une annonce baisse" },
            { label: 'Nouvelles annonces', desc: 'Alertes pour les recherches sauvegardées' },
            { label: 'Newsletter', desc: 'Conseils et sélections de la semaine' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--border-subtle)', borderRadius: 10 }}>
              <div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 2 }}>{item.desc}</div>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider" />
              </label>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Apparence',
      icon: Moon,
      content: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--border-subtle)', borderRadius: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {dark ? <Moon size={20} /> : <Sun size={20} />}
            <div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{dark ? 'Mode sombre' : 'Mode clair'}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>Choisissez votre thème d'affichage</div>
            </div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={dark} onChange={onToggleDark} />
            <span className="toggle-slider" />
          </label>
        </div>
      ),
    },
    {
      title: 'Sécurité',
      icon: Lock,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <button className="btn-outline" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={15} /> Changer le mot de passe
          </button>
          <button style={{ alignSelf: 'flex-start', color: '#FE0000', background: 'none', border: '1.5px solid #FE0000', borderRadius: 8, padding: '0.6rem 1.25rem', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={15} /> Activer la vérification 2 étapes
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageLayout active="buyer-settings" onNavigate={onNavigate}>
      <h1 className="buyer-page-title" style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>Paramètres</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {settingSections.map(section => (
          <div key={section.title} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
              <section.icon size={20} color="var(--primary)" />
              <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', margin: 0 }}>{section.title}</h2>
            </div>
            {section.content}
          </div>
        ))}
      </div>
    </PageLayout>
  )
}
