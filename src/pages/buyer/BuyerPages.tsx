import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useSubscription } from '@apollo/client/react'
import {
  Heart, MessageCircle,
  MapPin, Send, Trash2, CheckCheck,
  Smartphone, Moon, Sun, Lock, User, Bell,
  ChevronRight, Clock, ArrowLeft, ImageOff, Handshake, CircleX, Tag, X,
} from 'lucide-react'
import Price from '../../components/Price'
import BoostRibbon from '../../components/BoostRibbon'
import OfferBubble from '../../components/OfferBubble'
import PriceSuggestionHint from '../../components/PriceSuggestionHint'
import { MY_FAVORITES_QUERY } from '../../graphql/favorites'
import { MAKE_OFFER_MUTATION, RESPOND_TO_OFFER_MUTATION } from '../../graphql/offers'
import { useConversationReadRefresh, useOfferUpdatedRefresh, useTypingIndicator } from '../../lib/useMessagingLive'
import {
  CONVERSATION_QUERY,
  CONVERSATION_UPDATED_SUBSCRIPTION,
  MARK_CONVERSATION_READ_MUTATION,
  MESSAGE_ADDED_SUBSCRIPTION,
  MY_CONVERSATIONS_QUERY,
  SEND_MESSAGE_MUTATION,
  SET_CONVERSATION_DEAL_STATUS_MUTATION,
  START_CONVERSATION_MUTATION,
  type RemoteConversation,
  type RemoteMessage,
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
    { label: 'Favoris', value: favorites.length, icon: Heart, color: '#FE0000', bg: 'rgba(254,0,0,0.08)' },
    { label: 'Messages non lus', value: unreadMessages, icon: MessageCircle, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
  ]

  return (
    <PageLayout active="buyer-dashboard" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <h1 className="buyer-page-title" style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>
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
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: 0, fontSize: '1rem' }}>Messages récents</h2>
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
              style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem', borderBottom: i < recentConversations.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: conv.unreadCount > 0 ? 'rgba(254,0,0,0.02)' : 'transparent' }}
              onClick={() => onNavigate('buyer-messages')}
            >
              <div style={{ position: 'relative', flexShrink: 0, width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: 'var(--fg-muted)' }}>
                {conv.otherParticipant.avatarUrl ? (
                  <img src={conv.otherParticipant.avatarUrl} alt={conv.otherParticipant.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  conv.otherParticipant.fullName.charAt(0).toUpperCase()
                )}
                {conv.unreadCount > 0 && <span className="notif-dot" style={{ top: 0, right: 0 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{conv.otherParticipant.fullName}</span>
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
                <div className="price-tag"><Price amount={l.price} currency={l.currency} /></div>
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
function messageDayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return "Aujourd'hui"
  if (sameDay(d, yesterday)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
}

export function BuyerMessages({ onNavigate, onSelectListing, currentUser, onLogout, startWith, onStartWithConsumed }: { onNavigate: (p: any) => void, onSelectListing?: (id: string) => void, currentUser?: AuthUser | null, onLogout: () => void, startWith?: { listingId?: string; sellerId: string } | null, onStartWithConsumed?: () => void }) {
  const { data: listData, refetch: refetchList } = useQuery<{ myConversations: RemoteConversation[] }>(MY_CONVERSATIONS_QUERY)
  const conversations = listData?.myConversations ?? []
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showList, setShowList] = useState(true)
  const [msg, setMsg] = useState('')
  const [offerFormOpen, setOfferFormOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerError, setOfferError] = useState<string | null>(null)
  const [respondingOfferId, setRespondingOfferId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [startConversation] = useMutation<{ startConversation: RemoteConversation }>(START_CONVERSATION_MUTATION)
  // Guards against firing the mutation twice for the same target — React
  // StrictMode double-invokes mount effects in dev, and this one isn't
  // idempotent to trigger redundantly (the backend now tolerates a true
  // race, but there's no reason to make two requests for one intent).
  const startedForRef = useRef<string | null>(null)

  // "Contacter le vendeur" on a listing lands here with a target instead of
  // just the generic inbox — find or create that conversation and open it.
  useEffect(() => {
    if (!startWith) return
    const key = `${startWith.listingId}:${startWith.sellerId}`
    if (startedForRef.current === key) return
    startedForRef.current = key
    void startConversation({ variables: { recipientId: startWith.sellerId, listingId: startWith.listingId } }).then(({ data }) => {
      if (data?.startConversation) {
        setActiveId(data.startConversation.id)
        setShowList(false)
      }
      void refetchList()
      onStartWithConsumed?.()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWith])

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id)
  }, [conversations, activeId])

  const { data: convData, loading: convLoading, refetch: refetchConv } = useQuery<{ conversation: RemoteConversation }>(CONVERSATION_QUERY, {
    variables: { id: activeId },
    skip: !activeId,
  })
  // Apollo keeps serving the PREVIOUS conversation's data while the new
  // variables' query is in flight, so without this guard, switching threads
  // briefly shows the wrong person's name/messages under the new selection —
  // exactly the kind of mix-up that reads as "a message went to the wrong
  // person". Only trust convData once it actually matches activeId.
  const activeConv = convData?.conversation?.id === activeId ? convData.conversation : undefined
  const messages = activeConv?.messages ?? []

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE_MUTATION)
  const [markConversationRead] = useMutation(MARK_CONVERSATION_READ_MUTATION)
  const [setDealStatus, { loading: updatingDeal }] = useMutation(SET_CONVERSATION_DEAL_STATUS_MUTATION)
  const [makeOffer, { loading: sendingOffer }] = useMutation(MAKE_OFFER_MUTATION)
  const [respondToOffer] = useMutation(RESPOND_TO_OFFER_MUTATION)
  const { otherIsTyping, notifyTyping, notifyStoppedTyping } = useTypingIndicator(activeId, activeConv?.otherParticipant.id)
  useConversationReadRefresh(activeId, refetchConv)
  useOfferUpdatedRefresh(activeId, refetchConv)

  useEffect(() => {
    if (!activeId) return
    void markConversationRead({ variables: { conversationId: activeId } }).then(() => refetchList())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    setOfferFormOpen(false)
    setOfferAmount('')
    setOfferError(null)
  }, [activeId])

  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { conversationId: activeId as string },
    skip: !activeId,
    onData: () => {
      void refetchConv()
      void refetchList()
      if (activeId) void markConversationRead({ variables: { conversationId: activeId } })
    },
  })

  // Live inbox: fires for ANY conversation the moment a new message lands,
  // not just the one currently open (messageAdded above only covers that
  // case) — this is what keeps the conversation list itself real-time.
  useSubscription(CONVERSATION_UPDATED_SUBSCRIPTION, {
    onData: () => void refetchList(),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    const body = msg.trim()
    if (!body || !activeId) return
    setMsg('')
    notifyStoppedTyping()
    void sendMessage({ variables: { conversationId: activeId, body } }).then(() => refetchConv())
  }

  const conversationStarters = [
    'Bonjour, cette annonce est-elle toujours disponible ?',
    "Bonjour, pouvez-vous m’en dire plus sur l’état de l’article ?",
    'Bonjour, la livraison ou une remise en main propre est-elle possible ?',
  ]

  const closeDeal = (status: 'CONCLUDED' | 'NOT_CONCLUDED') => {
    if (!activeId) return
    const message = status === 'CONCLUDED'
      ? "Confirmer que la vente est conclue ? L’annonce sera marquée comme vendue."
      : "Confirmer que cette discussion n’a pas abouti à une vente ?"
    if (!window.confirm(message)) return
    void setDealStatus({ variables: { conversationId: activeId, status } })
      .then(() => { void refetchConv(); void refetchList() })
  }

  const submitOffer = () => {
    if (!activeId || !activeConv?.listingId) return
    const amount = Number(offerAmount.replace(/\s/g, ''))
    if (!Number.isInteger(amount) || amount <= 0) {
      setOfferError('Entrez un montant valide.')
      return
    }
    setOfferError(null)
    void makeOffer({ variables: { input: { listingId: activeConv.listingId, amount, conversationId: activeId } } })
      .then(() => {
        setOfferFormOpen(false)
        setOfferAmount('')
        void refetchConv()
        void refetchList()
      })
      .catch((err: Error) => setOfferError(err.message))
  }

  const respondOffer = (offerId: string, accept: boolean) => {
    setRespondingOfferId(offerId)
    void respondToOffer({ variables: { offerId, accept } })
      .then(() => { void refetchConv(); void refetchList() })
      .finally(() => setRespondingOfferId(null))
  }

  return (
    <PageLayout active="buyer-messages" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div style={{ display: 'flex', height: 'calc(100vh - 60px - 3rem)', margin: '-1.5rem -2rem', position: 'relative' }}>
        {/* Conversation list */}
        <div className={`buyer-msg-list ${showList ? '' : 'buyer-msg-list-hidden'}`} style={{ width: 300, borderRight: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0, overflowY: 'auto' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: 0, fontSize: '1rem' }}>Messages</h2>
          </div>
          {conversations.length === 0 && (
            <p style={{ padding: '1.25rem', color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
              Aucune conversation pour l'instant. Contactez un vendeur depuis une annonce pour démarrer une discussion.
            </p>
          )}
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => { setActiveId(conv.id); setShowList(false) }}
              style={{ display: 'flex', gap: '0.7rem', padding: '0.875rem 1rem', cursor: 'pointer', background: activeId === conv.id ? 'rgba(254,0,0,0.04)' : 'transparent', borderLeft: activeId === conv.id ? '3px solid var(--primary)' : '3px solid transparent', borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div style={{ position: 'relative', flexShrink: 0, width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: 'var(--fg-muted)' }}>
                {conv.otherParticipant.avatarUrl ? (
                  <img src={conv.otherParticipant.avatarUrl} alt={conv.otherParticipant.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  conv.otherParticipant.fullName.charAt(0).toUpperCase()
                )}
                {conv.unreadCount > 0 && <span className="notif-dot" style={{ top: 0, right: 0 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: conv.unreadCount > 0 ? 800 : 600, fontSize: '0.85rem' }}>{conv.otherParticipant.fullName}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--fg-subtle)', flexShrink: 0 }}>{conv.lastMessageAt ? formatRelativeDate(conv.lastMessageAt) : ''}</span>
                </div>
                {conv.listing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, minWidth: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, overflow: 'hidden', flexShrink: 0, background: 'var(--border-subtle)' }}>
                      {conv.listing.coverImageUrl && <img src={conv.listing.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.listing.title}
                    </span>
                    {conv.dealStatus !== 'DISCUSSING' && (
                      <span style={{ flexShrink: 0, borderRadius: 999, padding: '1px 5px', fontSize: '0.6rem', fontWeight: 800, background: conv.dealStatus === 'CONCLUDED' ? 'rgba(16,185,129,0.12)' : 'var(--border-subtle)', color: conv.dealStatus === 'CONCLUDED' ? '#059669' : 'var(--fg-muted)' }}>
                        {conv.dealStatus === 'CONCLUDED' ? 'VENDU' : 'NON CONCLUE'}
                      </span>
                    )}
                  </div>
                )}
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: conv.unreadCount > 0 ? 700 : 400 }}>
                  {conv.lastMessage?.body ?? 'Nouvelle conversation'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Chat view */}
        <div className={`buyer-msg-chat ${showList ? 'buyer-msg-chat-hidden' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', minWidth: 0 }}>
          {!activeId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', fontSize: '0.9rem' }}>
              Sélectionnez une conversation
            </div>
          ) : !activeConv ? (
            // activeId is set but convData hasn't caught up yet (switching
            // threads, or the very first load) — show a neutral loading
            // state instead of stale content from the previous conversation.
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)', fontSize: '0.85rem' }}>
              {convLoading ? 'Chargement...' : ''}
            </div>
          ) : (
            <>
              <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button className="buyer-msg-back" onClick={() => setShowList(true)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 0, marginRight: 4 }}>
                  <ArrowLeft size={20} />
                </button>
                <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: 'var(--fg-muted)', flexShrink: 0 }}>
                  {activeConv.otherParticipant.avatarUrl ? (
                    <img src={activeConv.otherParticipant.avatarUrl} alt={activeConv.otherParticipant.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    activeConv.otherParticipant.fullName.charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.9rem' }}>{activeConv.otherParticipant.fullName}</div>
                  <div style={{ fontSize: '0.7rem', color: activeConv.dealStatus === 'CONCLUDED' ? '#059669' : activeConv.dealStatus === 'NOT_CONCLUDED' ? '#64748B' : '#D97706', fontWeight: 700 }}>
                    {activeConv.dealStatus === 'CONCLUDED' ? 'Vente conclue' : activeConv.dealStatus === 'NOT_CONCLUDED' ? 'Vente non conclue' : 'Discussion en cours'}
                  </div>
                </div>
              </div>

              {/* What this thread is about — always visible while chatting,
                  not just a small pill easy to miss. Clickable through to
                  the listing itself. */}
              {activeConv.listing && (
                <div
                  onClick={() => onSelectListing?.(activeConv.listing!.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)', cursor: onSelectListing ? 'pointer' : 'default' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)' }}>
                    {activeConv.listing.coverImageUrl ? (
                      <img src={activeConv.listing.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageOff size={16} />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeConv.listing.title}</p>
                    <div className="price-tag" style={{ fontSize: '0.8rem' }}><Price amount={activeConv.listing.price} currency={activeConv.listing.currency} /></div>
                  </div>
                  {onSelectListing && <ChevronRight size={16} color="var(--fg-subtle)" style={{ flexShrink: 0 }} />}
                </div>
              )}

              {activeConv.listing && activeConv.canManageDeal && activeConv.dealStatus === 'DISCUSSING' && (
                <div style={{ padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(245,158,11,0.06)' }}>
                  <span style={{ fontSize: '0.76rem', color: 'var(--fg-muted)', fontWeight: 700, marginRight: 'auto' }}>Cette discussion a-t-elle abouti ?</span>
                  <button className="btn-primary" disabled={updatingDeal} onClick={() => closeDeal('CONCLUDED')} style={{ padding: '0.45rem 0.7rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 5, background: '#10B981', borderColor: '#10B981' }}>
                    <Handshake size={14} /> Vente conclue
                  </button>
                  <button className="btn-outline" disabled={updatingDeal} onClick={() => closeDeal('NOT_CONCLUDED')} style={{ padding: '0.45rem 0.7rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CircleX size={14} /> Non conclue
                  </button>
                </div>
              )}

              {activeConv.dealStatus !== 'DISCUSSING' && (
                <div style={{ padding: '0.65rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: activeConv.dealStatus === 'CONCLUDED' ? 'rgba(16,185,129,0.08)' : 'var(--border-subtle)', color: activeConv.dealStatus === 'CONCLUDED' ? '#047857' : 'var(--fg-muted)', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                  {activeConv.dealStatus === 'CONCLUDED' ? <Handshake size={16} /> : <CircleX size={16} />}
                  {activeConv.dealStatus === 'CONCLUDED' ? 'Le vendeur a confirmé que cette vente est conclue.' : 'Le vendeur a indiqué que cette discussion n’a pas abouti à une vente.'}
                </div>
              )}

              <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {messages.length === 0 && (
                  <div style={{ maxWidth: 520, width: '100%', margin: 'auto', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 0.75rem', background: 'rgba(254,0,0,0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageCircle size={23} />
                    </div>
                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem', fontWeight: 800 }}>Commencez la discussion</h3>
                    <p style={{ margin: '0 0 1rem', color: 'var(--fg-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>Choisissez une question ou écrivez votre propre message. Ne partagez pas de coordonnées ou de données sensibles.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {conversationStarters.map(starter => (
                        <button key={starter} className="btn-outline" onClick={() => setMsg(starter)} style={{ padding: '0.65rem 0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600 }}>
                          {starter}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m: RemoteMessage, i: number) => {
                  const isMe = m.senderId === currentUser?.id
                  const prev = messages[i - 1]
                  const showDivider = !prev || messageDayLabel(prev.createdAt) !== messageDayLabel(m.createdAt)
                  return (
                    <div key={m.id}>
                      {showDivider && <div className="chat-day-divider">{messageDayLabel(m.createdAt)}</div>}
                      <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        <div>
                          {m.offer ? (
                            <OfferBubble
                              offer={m.offer}
                              currency={activeConv.listing?.currency ?? 'XOF'}
                              isMine={isMe}
                              canRespond={!isMe && activeConv.canManageDeal}
                              responding={respondingOfferId === m.offer.id}
                              onAccept={() => respondOffer(m.offer!.id, true)}
                              onReject={() => respondOffer(m.offer!.id, false)}
                              listingId={activeConv.listingId}
                            />
                          ) : (
                            <div className={`chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}>
                              {m.body}
                            </div>
                          )}
                          <div style={{ fontSize: '0.7rem', color: 'var(--fg-subtle)', marginTop: 3, textAlign: isMe ? 'right' : 'left', display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                            {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {isMe && <CheckCheck size={12} color={m.readAt ? '#3B82F6' : 'var(--fg-subtle)'} />}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div style={{ padding: '0.75rem 1rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                {otherIsTyping ? (
                  <div style={{ marginBottom: 7, color: 'var(--primary)', fontSize: '0.72rem', textAlign: 'center', fontWeight: 700, fontStyle: 'italic' }}>
                    {activeConv.otherParticipant.fullName} est en train d'écrire...
                  </div>
                ) : (
                  <div style={{ marginBottom: 7, color: 'var(--fg-subtle)', fontSize: '0.7rem', textAlign: 'center' }}>Échange sécurisé sur Yupixi · Ne partagez jamais de code de paiement</div>
                )}
                {offerFormOpen ? (
                  <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '0.5rem' }}>
                    <label style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 700, fontSize: '0.82rem', display: 'block', marginBottom: 6 }}>
                      Votre offre ({activeConv.listing?.currency ?? 'XOF'})
                    </label>
                    <PriceSuggestionHint listingId={activeConv.listingId} onUseAmount={amount => setOfferAmount(String(amount))} />
                    <input className="input" placeholder="Ex: 430 000" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} style={{ marginBottom: 8 }} />
                    {offerError && <p style={{ color: 'var(--primary)', fontSize: '0.78rem', margin: '0 0 8px' }}>{offerError}</p>}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-primary" disabled={sendingOffer} onClick={submitOffer} style={{ flex: 1, padding: '0.55rem', fontSize: '0.82rem' }}>{sendingOffer ? 'Envoi...' : "Envoyer l'offre"}</button>
                      <button onClick={() => { setOfferFormOpen(false); setOfferError(null) }} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.55rem', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {!activeConv.canManageDeal && activeConv.listing?.negotiable && activeConv.dealStatus === 'DISCUSSING' && (
                    <button title="Faire une offre" onClick={() => setOfferFormOpen(true)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: '50%', width: 42, height: 42, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--fg-muted)' }}>
                      <Tag size={18} />
                    </button>
                  )}
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="Écrivez votre message..."
                    value={msg}
                    onChange={e => { setMsg(e.target.value); notifyTyping() }}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                  />
                  <button className="btn-primary" disabled={sending || !msg.trim()} style={{ padding: '0.65rem', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: sending || !msg.trim() ? 0.6 : 1 }} onClick={handleSend}>
                    <Send size={18} />
                  </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────
const NOTIFICATION_ICONS: Record<RemoteNotification['type'], string> = {
  MESSAGE: '💬',
  LISTING_APPROVED: '✅',
  LISTING_REJECTED: '⚠️',
  LISTING_STATUS_CHANGED: 'ℹ️',
}

export function BuyerNotifications({ onNavigate, onSelectListing, onLogout }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void, onLogout: () => void }) {
  const { data, refetch } = useQuery<{ myNotifications: RemoteNotification[] }>(MY_NOTIFICATIONS_QUERY)
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
        <h1 className="buyer-page-title" style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>
          Notifications <span style={{ color: 'var(--fg-muted)', fontSize: '1rem', fontWeight: 600 }}>({items.filter(n => !n.readAt).length} non lues)</span>
        </h1>
        <button onClick={() => void markAllRead().then(() => refetch())} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
          Tout marquer comme lu
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {items.length === 0 && (
          <p style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--fg-muted)', fontSize: '0.9rem' }}>Aucune notification pour l'instant.</p>
        )}
        {items.map((n, i) => (
          <div
            key={n.id}
            onClick={() => handleOpen(n)}
            style={{
              display: 'flex', gap: '0.75rem', padding: '1rem', borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              background: n.readAt ? 'transparent' : 'rgba(254,0,0,0.02)', cursor: 'pointer',
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: n.readAt ? 'var(--border-subtle)' : 'rgba(254,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              {NOTIFICATION_ICONS[n.type]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: n.readAt ? 600 : 800, fontSize: '0.9rem' }}>{n.title}</span>
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
        <h1 className="buyer-page-title" style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Historique de navigation</h1>
        {history.length > 0 && (
          <button onClick={handleClear} disabled={clearing} style={{ color: 'var(--fg-muted)', background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, opacity: clearing ? 0.6 : 1 }}>
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
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', marginBottom: 3 }}>{v.listing.title}</div>
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
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 900, fontSize: '1.5rem', flexShrink: 0, overflow: 'hidden' }}>
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatarInitial}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => { void handleAvatarSelected(e.target.files); e.target.value = '' }} />
            <button className="btn-outline" style={{ fontSize: '0.875rem' }} disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
              {uploadingAvatar ? 'Envoi...' : 'Changer la photo'}
            </button>
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
              <input className="input" value={currentUser?.email ?? ''} disabled title="La modification de l'email n'est pas encore disponible." style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <div>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Ville</label>
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
          {NOTIFICATION_PREFERENCE_ITEMS.map(item => (
            <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--border-subtle)', borderRadius: 10 }}>
              <div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{item.label}</div>
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
          <button disabled style={{ alignSelf: 'flex-start', color: 'var(--fg-subtle)', background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.6rem 1.25rem', cursor: 'not-allowed', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={15} /> Vérification 2 étapes — bientôt disponible
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageLayout active="buyer-settings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
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
