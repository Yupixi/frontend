import { useMutation, useQuery } from '@apollo/client/react'
import {
  Heart,
  MessageCircle,
  MapPin,
  Trash2,
  ChevronRight,
  Clock,
} from '../../components/icons'
import Price from '../../components/Price'
import MsIcon from '../../components/Icon'
import { MY_FAVORITES_QUERY } from '../../graphql/favorites'
import {
  MY_CONVERSATIONS_QUERY,
  type RemoteConversation,
} from '../../graphql/messaging'
import {
  CLEAR_VIEW_HISTORY_MUTATION,
  MARK_ALL_NOTIFICATIONS_READ_MUTATION,
  MARK_NOTIFICATION_READ_MUTATION,
  MY_NOTIFICATIONS_QUERY,
  MY_VIEW_HISTORY_QUERY,
  type RemoteListingView,
  type RemoteNotification,
  NOTIFICATION_META,
  notificationTarget,
} from '../../graphql/account'
import { formatRelativeDate } from '../../lib/format'
import type { AuthUser } from '../../graphql/auth'
import { AccountLayout as PageLayout } from '../account/AccountLayout'

type FavoriteListing = {
  id: string
  title: string
  price: number | null
  currency: string
  city: string
  coverImageUrl: string | null
}

// ─── BUYER DASHBOARD ───────────────────────────────────────────────────────
export function BuyerDashboard({ onNavigate, onSelectListing, favorites, currentUser, onLogout }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void, favorites: string[], currentUser?: AuthUser | null, onLogout: () => void }) {
  const { data: favData } = useQuery<{ myFavorites: { items: FavoriteListing[] } }>(MY_FAVORITES_QUERY, {
    variables: { page: 1, pageSize: 4 },
  })
  const recentListings = favData?.myFavorites.items ?? []
  const { data: conversationsData } = useQuery<{ myConversations: RemoteConversation[] }>(MY_CONVERSATIONS_QUERY)
  const recentConversations = (conversationsData?.myConversations ?? []).slice(0, 5)
  const unreadMessages = recentConversations.reduce((sum, c) => sum + c.unreadCount, 0)
  const stats = [
    { label: 'Favoris', value: favorites.length, icon: Heart, color: '#BB0013', bg: 'rgba(187, 0, 19,0.08)' },
    { label: 'Messages non lus', value: unreadMessages, icon: MessageCircle, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  ]

  return (
    <PageLayout active="buyer-dashboard" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <h1 className="buyer-page-title" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>
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
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: 'var(--fg)' }}>{s.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, margin: 0, fontSize: '1rem' }}>Annonces sauvegardées</h2>
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
                  <p style={{ margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.title}</p>
                  <div className="price-tag" style={{ fontSize: '0.9rem', marginTop: 2 }}><Price amount={l.price} currency={l.currency} /></div>
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
          <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, margin: 0, fontSize: '1rem' }}>Messages récents</h2>
          <button onClick={() => onNavigate('buyer-messages')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            Voir tout <ChevronRight size={15} />
          </button>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          {recentConversations.length === 0 && (
            <p style={{ padding: '1.25rem', color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Aucune conversation pour l'instant.</p>
          )}
          {recentConversations.map((conv, i) => (
            <div
              key={conv.id}
              style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem', borderBottom: i < recentConversations.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: conv.unreadCount > 0 ? 'rgba(187, 0, 19,0.02)' : 'transparent' }}
              onClick={() => onNavigate('buyer-messages')}
            >
              <div style={{ position: 'relative', flexShrink: 0, width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, color: 'var(--fg-muted)' }}>
                {conv.otherParticipant.avatarUrl ? (
                  <img src={conv.otherParticipant.avatarUrl} alt={conv.otherParticipant.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  conv.otherParticipant.fullName.charAt(0).toUpperCase()
                )}
                {conv.unreadCount > 0 && <span className="notif-dot" style={{ top: 0, right: 0 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{conv.otherParticipant.fullName}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)' }}>{conv.lastMessageAt ? formatRelativeDate(conv.lastMessageAt) : ''}</span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.lastMessage?.body ?? 'Nouvelle conversation'}</p>
              </div>
              {conv.unreadCount > 0 && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999, padding: '2px 7px', fontSize: '0.7rem', fontWeight: 800, alignSelf: 'center', flexShrink: 0 }}>{conv.unreadCount}</span>}
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}

// ─── BUYER FAVORITES ───────────────────────────────────────────────────────
export function BuyerFavorites({ onNavigate, onSelectListing, onToggleFavorite, onLogout }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void, favorites: string[], onToggleFavorite: (id: string) => void | Promise<void>, onLogout: () => void }) {
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
      <PageLayout active="buyer-favorites" onNavigate={onNavigate} onLogout={onLogout}>
        <p style={{ color: 'var(--fg-muted)' }}>Chargement...</p>
      </PageLayout>
    )
  }

  return (
    <PageLayout active="buyer-favorites" onNavigate={onNavigate} onLogout={onLogout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="buyer-page-title" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>
          Mes favoris <span style={{ color: 'var(--fg-muted)', fontSize: '1rem', fontWeight: 600 }}>({favListings.length})</span>
        </h1>
      </div>

      {favListings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💔</div>
          <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, margin: '0 0 0.5rem' }}>Aucun favori pour l'instant</h3>
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
                <Heart size={16} fill="#BB0013" color="#BB0013" />
              </button>
              <div style={{ height: 170, background: 'var(--border-subtle)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>
                {l.coverImageUrl && (
                  <img src={l.coverImageUrl} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div className="price-tag"><Price amount={l.price} currency={l.currency} /></div>
                <p style={{ margin: '4px 0 6px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.3 }}>{l.title}</p>
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

export { default as BuyerMessages } from './Messages'

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────

export function BuyerNotifications({ onNavigate, onSelectListing, onLogout }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void, onLogout: () => void }) {
  const { data, refetch, loading, error } = useQuery<{ myNotifications: RemoteNotification[] }>(MY_NOTIFICATIONS_QUERY, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 10000,
  })
  const items = data?.myNotifications ?? []
  const [markRead] = useMutation(MARK_NOTIFICATION_READ_MUTATION)
  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ_MUTATION)

  const handleOpen = (n: RemoteNotification) => {
    if (!n.readAt) void markRead({ variables: { id: n.id } }).then(() => refetch())
    const target = notificationTarget(n)
    if (target) onNavigate(target)
    else if (n.listingId) onSelectListing(n.listingId)
  }

  return (
    <PageLayout active="buyer-notifications" onNavigate={onNavigate} onLogout={onLogout}>
      <div className="buyer-notifications-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '0.75rem' }}>
        <h1 className="buyer-page-title" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>
          Notifications <span style={{ color: 'var(--fg-muted)', fontSize: '1rem', fontWeight: 600 }}>({items.filter(n => !n.readAt).length} non lues)</span>
        </h1>
        <button onClick={() => void markAllRead().then(() => refetch())} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
          Tout marquer comme lu
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {error && <p role="alert" style={{ padding: '1rem' }}>Impossible de charger les notifications. <button onClick={() => void refetch().catch(() => {})}>Réessayer</button></p>}
        {loading && items.length === 0 && <p style={{ padding: '1rem' }}>Chargement des notifications…</p>}
        {!loading && !error && items.length === 0 && (
          <p style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--fg-muted)', fontSize: '0.9rem' }}>Aucune notification pour l'instant.</p>
        )}
        {items.map((n, i) => (
          <div
            key={n.id}
            onClick={() => handleOpen(n)}
            style={{
              display: 'flex', gap: '0.75rem', padding: '1rem', borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              background: n.readAt ? 'transparent' : 'rgba(187, 0, 19,0.02)', cursor: 'pointer',
            }}
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${(NOTIFICATION_META[n.type] ?? NOTIFICATION_META.LISTING_STATUS_CHANGED).cls}`}>
              <MsIcon name={(NOTIFICATION_META[n.type] ?? NOTIFICATION_META.LISTING_STATUS_CHANGED).icon} size={21} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: n.readAt ? 600 : 800, fontSize: '0.9rem' }}>{n.title}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)' }}>{formatRelativeDate(n.createdAt)}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--fg-muted)', lineHeight: 1.4 }}>{n.body}</p>
            </div>
            {!n.readAt && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, alignSelf: 'center' }} />}
          </div>
        ))}
      </div>
    </PageLayout>
  )
}

// ─── HISTORY ────────────────────────────────────────────────────────────────
export function BuyerHistory({ onNavigate, onSelectListing, onLogout }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void, onLogout: () => void }) {
  const { data, loading, refetch } = useQuery<{ myViewHistory: RemoteListingView[] }>(MY_VIEW_HISTORY_QUERY)
  const [clearHistory, { loading: clearing }] = useMutation(CLEAR_VIEW_HISTORY_MUTATION)
  const history = data?.myViewHistory ?? []

  const handleClear = () => {
    if (!window.confirm('Effacer tout votre historique de consultation ?')) return
    void clearHistory().then(() => refetch())
  }

  return (
    <PageLayout active="buyer-history" onNavigate={onNavigate} onLogout={onLogout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="buyer-page-title" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Historique de navigation</h1>
        {history.length > 0 && (
          <button onClick={handleClear} disabled={clearing} style={{ color: 'var(--fg-muted)', background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, opacity: clearing ? 0.6 : 1 }}>
            <Trash2 size={15} /> Effacer
          </button>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {!loading && history.length === 0 && (
          <p style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
            Aucune annonce consultée récemment.
          </p>
        )}
        {history.map((v, i) => (
          <div
            key={v.listing.id}
            onClick={() => onSelectListing(v.listing.id)}
            style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem 1rem', borderBottom: i < history.length - 1 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border-subtle)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 64, height: 52, borderRadius: 8, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0 }}>
              {v.listing.coverImageUrl && (
                <img src={v.listing.coverImageUrl} alt={v.listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.875rem', marginBottom: 3 }}>{v.listing.title}</div>
              <div className="price-tag" style={{ fontSize: '0.9rem' }}><Price amount={v.listing.price} currency={v.listing.currency} /></div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--fg-subtle)', fontSize: '0.75rem' }}>
                <Clock size={12} />{formatRelativeDate(v.viewedAt)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--fg-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                <MapPin size={11} />{v.listing.city}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  )
}
