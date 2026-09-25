import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  Heart,
  MessageCircle,
  MapPin,
  Trash2,
  Smartphone,
  Moon,
  Sun,
  Lock,
  User,
  Bell,
  ChevronRight,
  Clock,
} from '../../components/icons'
import Price from '../../components/Price'
import BoostRibbon from '../../components/BoostRibbon'
import { MY_FAVORITES_QUERY } from '../../graphql/favorites'
import {
  MY_CONVERSATIONS_QUERY,
  type RemoteConversation,
} from '../../graphql/messaging'
import {
  CHANGE_PASSWORD_MUTATION,
  CLEAR_VIEW_HISTORY_MUTATION,
  MARK_ALL_NOTIFICATIONS_READ_MUTATION,
  MARK_NOTIFICATION_READ_MUTATION,
  MY_NOTIFICATIONS_QUERY,
  MY_VIEW_HISTORY_QUERY,
  UPDATE_NOTIFICATION_PREFERENCES_MUTATION,
  UPDATE_PROFILE_MUTATION,
  type RemoteListingView,
  type RemoteNotification,
} from '../../graphql/account'
import { formatRelativeDate } from '../../lib/format'
import { uploadImages } from '../../lib/upload'
import { getPushAvailability, subscribeToPush, type PushSubscriptionResult } from '../../lib/pushNotifications'
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

      <BoostRibbon onNavigate={onNavigate} />

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
const NOTIFICATION_ICONS: Record<RemoteNotification['type'], string> = {
  MESSAGE: '💬',
  LISTING_APPROVED: '✅',
  LISTING_REJECTED: '⚠️',
  LISTING_STATUS_CHANGED: 'ℹ️',
}

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
    if (n.type === 'MESSAGE') onNavigate('buyer-messages')
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
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: n.readAt ? 'var(--border-subtle)' : 'rgba(187, 0, 19,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              {NOTIFICATION_ICONS[n.type]}
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

// ─── SETTINGS ──────────────────────────────────────────────────────────────
const NOTIFICATION_PREFERENCE_ITEMS: { key: string; label: string; desc: string }[] = [
  { key: 'newMessages', label: 'Nouveaux messages', desc: 'Recevoir des alertes pour les nouveaux messages' },
  { key: 'listingStatus', label: 'Statut de mes annonces', desc: 'Être notifié quand une annonce est approuvée ou rejetée' },
  { key: 'priceAlerts', label: 'Alertes de prix', desc: "Notification quand le prix d'une annonce baisse" },
  { key: 'newListings', label: 'Nouvelles annonces', desc: 'Alertes pour les recherches sauvegardées' },
  { key: 'newsletter', label: 'Newsletter', desc: 'Conseils et sélections de la semaine' },
]

export function BuyerSettings({ onNavigate, dark, onToggleDark, currentUser, onLogout, onProfileUpdated }: { onNavigate: (p: any) => void, dark: boolean, onToggleDark: () => void, currentUser?: AuthUser | null, onLogout: () => void, onProfileUpdated: (user: AuthUser) => void }) {
  const [name, setName] = useState(currentUser?.fullName ?? '')
  const [phone, setPhone] = useState(currentUser?.phone ?? '')
  const [city, setCity] = useState(currentUser?.city ?? 'Abidjan')
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl ?? '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [pushStatus, setPushStatus] = useState<PushSubscriptionResult | 'available'>(() => getPushAvailability())
  const [enablingPush, setEnablingPush] = useState(false)
  const avatarInitial = (currentUser?.fullName || '?').charAt(0).toUpperCase()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [updateProfile, { loading: saving }] = useMutation<{ updateProfile: AuthUser }>(UPDATE_PROFILE_MUTATION)

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [changePassword, { loading: changingPassword }] = useMutation(CHANGE_PASSWORD_MUTATION)

  const [updatePreferences] = useMutation<{ updateNotificationPreferences: { notificationPreferences: Record<string, boolean> } }>(UPDATE_NOTIFICATION_PREFERENCES_MUTATION)
  const preferences = currentUser?.notificationPreferences ?? {}

  // currentUser can still be loading (fetched async in App.tsx) when this
  // page first mounts — sync once it arrives instead of only reading it at
  // the initial useState() call, which would miss that update.
  useEffect(() => {
    if (!currentUser) return
    setName(currentUser.fullName)
    setPhone(currentUser.phone ?? '')
    setCity(currentUser.city ?? 'Abidjan')
    setAvatarUrl(currentUser.avatarUrl ?? '')
  }, [currentUser])

  useEffect(() => {
    if (!currentUser || getPushAvailability() !== 'available') return
    void subscribeToPush(false).then(setPushStatus)
  }, [currentUser])

  const enableMobileNotifications = async () => {
    setEnablingPush(true)
    setPushStatus(await subscribeToPush(true))
    setEnablingPush(false)
  }

  const pushStatusCopy: Record<PushSubscriptionResult | 'available', { title: string; desc: string; tone: string }> = {
    subscribed: { title: 'Notifications activées', desc: 'Ce téléphone recevra les nouveaux messages et les alertes importantes.', tone: '#059669' },
    available: { title: 'Autorisation accordée', desc: 'Activez ce téléphone pour finaliser la réception des notifications.', tone: '#D97706' },
    'permission-required': { title: 'Notifications désactivées', desc: 'Activez-les pour être prévenu même lorsque Dilchap est fermé.', tone: '#D97706' },
    'permission-denied': { title: 'Autorisation bloquée', desc: 'Ouvrez les réglages du navigateur ou du téléphone, autorisez les notifications pour Dilchap, puis réessayez.', tone: '#DC2626' },
    'ios-install-required': { title: "Installation requise sur iPhone", desc: "Dans Safari, touchez Partager puis « Sur l’écran d’accueil ». Ouvrez ensuite Dilchap depuis son icône pour activer les notifications.", tone: '#D97706' },
    unsupported: { title: 'Mobile non compatible', desc: 'Ce navigateur ne prend pas en charge les notifications web. Essayez une version récente de Safari, Chrome ou Edge.', tone: '#64748B' },
    'not-configured': { title: 'Service temporairement indisponible', desc: "Les notifications ne sont pas encore configurées sur le serveur. L’équipe technique doit activer les clés d’envoi.", tone: '#DC2626' },
    error: { title: "Activation impossible", desc: 'Vérifiez votre connexion puis réessayez. Vos notifications restent visibles dans votre espace Dilchap.', tone: '#DC2626' },
  }
  const pushCopy = pushStatusCopy[pushStatus]
  const canEnablePush = ['available', 'permission-required', 'error'].includes(pushStatus)

  const handleAvatarSelected = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const [url] = await uploadImages([file])
      setAvatarUrl(url)
    } catch {
      // Upload failure just leaves the previous avatar in place.
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const { data } = await updateProfile({ variables: { input: { fullName: name, phone: phone || null, city, avatarUrl: avatarUrl || null } } })
      if (data?.updateProfile && currentUser) {
        onProfileUpdated({ ...currentUser, ...data.updateProfile })
      }
      setSaveSuccess(true)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "L'enregistrement a échoué.")
    }
  }

  const handleTogglePreference = (key: string) => {
    const next = { ...preferences, [key]: !(preferences[key] ?? true) }
    void updatePreferences({ variables: { preferences: next } }).then(({ data }) => {
      if (data?.updateNotificationPreferences && currentUser) {
        onProfileUpdated({ ...currentUser, notificationPreferences: data.updateNotificationPreferences.notificationPreferences })
      }
    })
  }

  const handleChangePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      await changePassword({ variables: { input: { currentPassword, newPassword } } })
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Le changement de mot de passe a échoué.')
    }
  }

  const settingSections = [
    {
      title: 'Profil',
      icon: User,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '1.5rem', flexShrink: 0, overflow: 'hidden' }}>
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatarInitial}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => { void handleAvatarSelected(e.target.files); e.target.value = '' }} />
            <button className="btn-outline" style={{ fontSize: '0.875rem' }} disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
              {uploadingAvatar ? 'Envoi...' : 'Changer la photo'}
            </button>
          </div>
          <div className="buyer-settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Nom complet</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Téléphone</label>
              <input className="input" placeholder="+225 XX XX XX XX XX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input" value={currentUser?.email ?? ''} disabled title="La modification de l'email n'est pas encore disponible." style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Ville</label>
              <select className="input" value={city} onChange={e => setCity(e.target.value)}>
                {['Abidjan', 'Bouaké', 'Daloa', 'Korhogo', 'Yamoussoukro'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {saveError && <p style={{ color: '#EF4444', fontSize: '0.85rem', margin: 0 }}>{saveError}</p>}
          {saveSuccess && <p style={{ color: '#10B981', fontSize: '0.85rem', margin: 0 }}>Profil mis à jour.</p>}
          <button className="btn-primary" style={{ alignSelf: 'flex-start', padding: '0.65rem 1.5rem', opacity: saving ? 0.7 : 1 }} disabled={saving} onClick={handleSaveProfile}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      ),
    },
    {
      title: 'Notifications',
      icon: Bell,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem', border: `1px solid ${pushCopy.tone}40`, background: `${pushCopy.tone}0D`, borderRadius: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: pushCopy.tone, background: `${pushCopy.tone}18` }}>
              <Smartphone size={21} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: pushCopy.tone }}>{pushCopy.title}</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--fg-muted)', lineHeight: 1.45, marginTop: 2 }}>{pushCopy.desc}</div>
            </div>
            {canEnablePush && (
              <button className="btn-primary" onClick={enableMobileNotifications} disabled={enablingPush} style={{ padding: '0.55rem 0.85rem', fontSize: '0.76rem', flexShrink: 0 }}>
                {enablingPush ? 'Activation…' : pushStatus === 'error' ? 'Réessayer' : 'Activer'}
              </button>
            )}
          </div>
          {NOTIFICATION_PREFERENCE_ITEMS.map(item => (
            <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--border-subtle)', borderRadius: 10 }}>
              <div>
                <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 2 }}>{item.desc}</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={preferences[item.key] ?? true} onChange={() => handleTogglePreference(item.key)} />
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
              <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{dark ? 'Mode sombre' : 'Mode clair'}</div>
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
          {!showPasswordForm ? (
            <button className="btn-outline" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowPasswordForm(true)}>
              <Lock size={15} /> Changer le mot de passe
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 320 }}>
              <input className="input" type="password" placeholder="Mot de passe actuel" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              <input className="input" type="password" placeholder="Nouveau mot de passe (8 caractères min.)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              {passwordError && <p style={{ color: '#EF4444', fontSize: '0.82rem', margin: 0 }}>{passwordError}</p>}
              {passwordSuccess && <p style={{ color: '#10B981', fontSize: '0.82rem', margin: 0 }}>Mot de passe mis à jour.</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', opacity: changingPassword || !currentPassword || newPassword.length < 8 ? 0.6 : 1 }} disabled={changingPassword || !currentPassword || newPassword.length < 8} onClick={handleChangePassword}>
                  {changingPassword ? '...' : 'Confirmer'}
                </button>
                <button className="btn-outline" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }} onClick={() => { setShowPasswordForm(false); setPasswordError(null); setCurrentPassword(''); setNewPassword('') }}>
                  Annuler
                </button>
              </div>
            </div>
          )}
          <button disabled style={{ alignSelf: 'flex-start', color: 'var(--fg-subtle)', background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.6rem 1.25rem', cursor: 'not-allowed', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={15} /> Vérification 2 étapes — bientôt disponible
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageLayout active="buyer-settings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <h1 className="buyer-page-title" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>Paramètres</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {settingSections.map(section => (
          <div key={section.title} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
              <section.icon size={20} color="var(--primary)" />
              <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '1rem', margin: 0 }}>{section.title}</h2>
            </div>
            {section.content}
          </div>
        ))}
      </div>
    </PageLayout>
  )
}
