import { cloneElement, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useSubscription } from '@apollo/client/react'
import { Send, X, User, Mail, Phone, CheckCheck } from 'lucide-react'
import {
  CONVERSATION_QUERY,
  MARK_CONVERSATION_READ_MUTATION,
  MESSAGE_ADDED_SUBSCRIPTION,
  SEND_MESSAGE_MUTATION,
  START_CONVERSATION_MUTATION,
  type RemoteConversation,
  type RemoteMessage,
} from '../graphql/messaging'
import { GUEST_LOGIN_MUTATION } from '../graphql/auth'
import type { AuthPayload } from '../graphql/auth'
import { storeTokens, getAccessToken } from '../lib/auth'
import { useConversationReadRefresh, useTypingIndicator } from '../lib/useMessagingLive'

type InlineConversationProps = {
  sellerId: string
  listingId: string
  sellerName: string
  onAuthenticated: () => void
  onClose: () => void
}

// A visibly distinct "panel within the card" — a sunken/tinted surface so
// the chat reads as its own widget rather than blending into the flat
// white "Discutez avec le vendeur" card around it.
const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.85rem',
  marginBottom: '1.25rem',
}

// The whole point: never navigate away from the listing to talk to a
// seller. A logged-in visitor goes straight to the thread; an anonymous
// one fills a tiny name/email form first (creating a lightweight guest
// account behind the scenes — see Backend AuthService.guestLogin) — either
// way the conversation opens right here, in place, on this same page.
export default function InlineConversation({ sellerId, listingId, sellerName, onAuthenticated, onClose }: InlineConversationProps) {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [startConversation, { loading: starting }] = useMutation<{ startConversation: RemoteConversation }>(START_CONVERSATION_MUTATION)

  const beginThread = () => {
    setStartError(null)
    void startConversation({ variables: { recipientId: sellerId, listingId } })
      .then(({ data }) => data?.startConversation && setConversationId(data.startConversation.id))
      .catch(() => setStartError("Impossible de démarrer la discussion. Réessayez."))
  }

  // Already authenticated (real account or a guest session from earlier in
  // this browser) — skip straight to the thread, no form to fill.
  useEffect(() => {
    if (getAccessToken()) beginThread()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (conversationId) {
    return (
      <div style={PANEL_STYLE}>
        <ThreadView conversationId={conversationId} sellerName={sellerName} onClose={onClose} />
      </div>
    )
  }

  if (getAccessToken()) {
    return (
      <div style={{ ...PANEL_STYLE, textAlign: 'center', color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
        {starting ? 'Connexion à la discussion...' : (startError ?? '')}
        {startError && (
          <button className="btn-primary" style={{ display: 'block', margin: '0.75rem auto 0', padding: '0.5rem 1rem', fontSize: '0.82rem' }} onClick={beginThread}>
            Réessayer
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={PANEL_STYLE}>
      <GuestForm
        sellerId={sellerId}
        listingId={listingId}
        onAuthenticated={onAuthenticated}
        onStarted={setConversationId}
      />
    </div>
  )
}

function GuestForm({ sellerId, listingId, onAuthenticated, onStarted }: {
  sellerId: string
  listingId: string
  onAuthenticated: () => void
  onStarted: (conversationId: string) => void
}) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guestLogin, { loading: loggingIn }] = useMutation<{ guestLogin: AuthPayload }>(GUEST_LOGIN_MUTATION)
  const [startConversation] = useMutation<{ startConversation: RemoteConversation }>(START_CONVERSATION_MUTATION)
  const [sendMessage] = useMutation(SEND_MESSAGE_MUTATION)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() && !phone.trim()) {
      setError('Indiquez au moins un email ou un numéro de téléphone.')
      return
    }
    setError(null)
    setSending(true)
    try {
      const { data } = await guestLogin({ variables: { input: { fullName, email: email.trim() || undefined, phone: phone.trim() || undefined } } })
      if (!data) throw new Error()
      storeTokens(data.guestLogin.accessToken, data.guestLogin.refreshToken)

      const { data: convData } = await startConversation({ variables: { recipientId: sellerId, listingId } })
      const conversationId = convData?.startConversation.id
      if (!conversationId) throw new Error()

      await sendMessage({ variables: { conversationId, body: message.trim() } })
      onStarted(conversationId)
      // Deferred until after the whole flow succeeds: calling this earlier
      // triggers an app-wide re-render (isLoggedIn flips) that can unmount
      // this form mid-flight, aborting the still-in-progress
      // startConversation/sendMessage calls before they finish.
      onAuthenticated()
    } catch (err: any) {
      setError(err?.message?.includes('déjà associé')
        ? err.message
        : "Impossible d'envoyer le message. Vérifiez vos informations et réessayez.")
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <p style={{ margin: '0 0 0.2rem', fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
        Indiquez comment le vendeur peut vous identifier — aucun compte n'est nécessaire. Email ou téléphone suffit.
      </p>

      {error && (
        <div style={{ background: 'rgba(254,0,0,0.06)', border: '1px solid rgba(254,0,0,0.2)', borderRadius: 8, padding: '0.6rem 0.75rem', color: 'var(--primary-dark)', fontSize: '0.8rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      <MiniField icon={User}><input className="input" placeholder="Votre nom" value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} /></MiniField>
      <MiniField icon={Phone}><input className="input" type="tel" placeholder="Téléphone (optionnel)" value={phone} onChange={e => setPhone(e.target.value)} /></MiniField>
      <MiniField icon={Mail}><input className="input" type="email" placeholder="Email (optionnel)" value={email} onChange={e => setEmail(e.target.value)} /></MiniField>

      <textarea
        className="input"
        placeholder="Votre message..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        required
        minLength={2}
        rows={3}
        style={{ resize: 'vertical' }}
      />

      <button type="submit" className="btn-primary" disabled={sending || loggingIn} style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: sending || loggingIn ? 0.7 : 1 }}>
        <Send size={16} /> {sending || loggingIn ? 'Envoi...' : 'Envoyer le message'}
      </button>
    </form>
  )
}

function MiniField({ icon: Icon, children }: { icon: typeof User, children: React.ReactElement<{ style?: React.CSSProperties, className?: string }> }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }} />
      {cloneElement(children, { style: { ...children.props.style, paddingLeft: 34 } })}
    </div>
  )
}

function messageDayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return "Aujourd'hui"
  if (sameDay(d, yesterday)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function ThreadView({ conversationId, sellerName, onClose }: { conversationId: string, sellerName: string, onClose: () => void }) {
  const [msg, setMsg] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { data, refetch } = useQuery<{ conversation: RemoteConversation }>(CONVERSATION_QUERY, { variables: { id: conversationId } })
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE_MUTATION)
  const [markRead] = useMutation(MARK_CONVERSATION_READ_MUTATION)
  const messages = data?.conversation?.messages ?? []

  // "Me" is whoever ISN'T otherParticipant — the thread has exactly two
  // sides and this component only ever renders for the side that opened it.
  const otherId = data?.conversation?.otherParticipant.id
  const { otherIsTyping, notifyTyping, notifyStoppedTyping } = useTypingIndicator(conversationId, otherId)
  useConversationReadRefresh(conversationId, refetch)

  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { conversationId },
    onData: () => {
      void refetch()
      void markRead({ variables: { conversationId } })
    },
  })

  useEffect(() => {
    void markRead({ variables: { conversationId } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = () => {
    const body = msg.trim()
    if (!body) return
    setMsg('')
    notifyStoppedTyping()
    void sendMessage({ variables: { conversationId, body } }).then(() => refetch())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 380 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <p style={{ margin: 0, fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, fontSize: '0.88rem' }}>Discussion avec {sellerName}</p>
        <button onClick={onClose} aria-label="Fermer" style={{ background: 'var(--border-subtle)', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--fg-muted)' }}>
          <X size={13} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem 0' }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--fg-subtle)', fontSize: '0.8rem', margin: 'auto' }}>Message envoyé — la réponse apparaîtra ici.</p>
        )}
        {messages.map((m: RemoteMessage, i: number) => {
          const isMe = m.senderId !== otherId
          const prev = messages[i - 1]
          const showDivider = !prev || messageDayLabel(prev.createdAt) !== messageDayLabel(m.createdAt)
          return (
            <div key={m.id}>
              {showDivider && <div className="chat-day-divider" style={{ fontSize: '0.65rem', margin: '0.35rem 0' }}>{messageDayLabel(m.createdAt)}</div>}
              <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div>
                  <div className={`chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`} style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}>
                    {m.body}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--fg-subtle)', marginTop: 2, textAlign: isMe ? 'right' : 'left', display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                    {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {isMe && <CheckCheck size={11} color={m.readAt ? '#3B82F6' : 'var(--fg-subtle)'} />}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {otherIsTyping && (
        <p style={{ margin: '0 0 0.35rem', fontSize: '0.72rem', color: 'var(--fg-subtle)', fontStyle: 'italic' }}>
          {sellerName} est en train d'écrire...
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: '0.5rem' }}>
        <input
          className="input"
          style={{ flex: 1, padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
          placeholder="Écrivez votre message..."
          value={msg}
          onChange={e => { setMsg(e.target.value); notifyTyping() }}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="btn-primary" disabled={sending || !msg.trim()} style={{ padding: '0.55rem', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: sending || !msg.trim() ? 0.6 : 1, flexShrink: 0 }} onClick={handleSend}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
