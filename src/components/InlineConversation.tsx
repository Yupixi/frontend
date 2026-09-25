import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useSubscription } from '@apollo/client/react'
import Icon from './Icon'
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
import { MAKE_OFFER_MUTATION } from '../graphql/offers'
import { storeTokens, getAccessToken } from '../lib/auth'
import { setActiveConversation } from '../lib/activeConversation'
import { useConversationReadRefresh, useOfferUpdatedRefresh, useTypingIndicator } from '../lib/useMessagingLive'
import OfferBubble from './OfferBubble'
import PriceSuggestionHint from './PriceSuggestionHint'

const QUICK_MESSAGES = [
  'Bonjour, l’article est-il toujours disponible ?',
  'Bonjour, votre prix est-il négociable ?',
  'Est-il possible de convenir d’un rendez-vous ?',
]

type InlineConversationProps = {
  sellerId: string
  listingId: string
  sellerName: string
  onAuthenticated: () => void
  onClose: () => void
}

const panel = 'mb-5 rounded-2xl bg-surface-container-low p-3.5'
const field = 'w-full rounded-xl border border-transparent bg-surface-lowest py-2.5 text-body-md text-on-surface outline-none focus:border-primary'
const chip = 'shrink-0 cursor-pointer rounded-full border-none bg-surface-lowest px-3 py-1.5 text-label-sm text-on-surface-variant hover:text-on-surface'

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
      .catch(() => setStartError('Impossible de démarrer la discussion. Réessayez.'))
  }

  // Already authenticated (real account or a guest session from earlier in
  // this browser) — skip straight to the thread, no form to fill.
  useEffect(() => {
    if (getAccessToken()) beginThread()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (conversationId) {
    return <div className={panel}><ThreadView conversationId={conversationId} sellerName={sellerName} onClose={onClose} /></div>
  }

  if (getAccessToken()) {
    return (
      <div className={`${panel} text-center text-body-sm text-on-surface-variant`}>
        {starting ? 'Connexion à la discussion…' : (startError ?? '')}
        {startError && <button onClick={beginThread} className="mx-auto mt-3 block cursor-pointer rounded-xl border-none bg-primary px-4 py-2 text-label-md text-white">Réessayer</button>}
      </div>
    )
  }

  return (
    <div className={panel}>
      <GuestForm sellerId={sellerId} listingId={listingId} onAuthenticated={onAuthenticated} onStarted={setConversationId} />
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
      setError('Indiquez au moins un e-mail ou un numéro de téléphone.')
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

  const withIcon = (icon: string, input: React.ReactNode) => (
    <label className="relative block">
      <Icon name={icon} size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
      {input}
    </label>
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <p className="m-0 flex gap-2 text-body-sm text-on-surface-variant"><Icon name="info" size={17} className="shrink-0 text-tertiary" /> Pas besoin de compte : indiquez comment le vendeur peut vous identifier (e-mail ou téléphone).</p>
      {error && <p className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{error}</p>}
      {withIcon('person', <input className={`${field} pl-10 pr-3`} placeholder="Votre nom" value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} />)}
      {withIcon('call', <input className={`${field} pl-10 pr-3`} type="tel" placeholder="Téléphone (optionnel)" value={phone} onChange={e => setPhone(e.target.value)} />)}
      {withIcon('mail', <input className={`${field} pl-10 pr-3`} type="email" placeholder="E-mail (optionnel)" value={email} onChange={e => setEmail(e.target.value)} />)}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {QUICK_MESSAGES.map(text => <button key={text} type="button" onClick={() => setMessage(text)} className={chip}>{text}</button>)}
      </div>
      <textarea className={`${field} resize-y px-3`} placeholder="Votre message…" value={message} onChange={e => setMessage(e.target.value)} required minLength={2} rows={3} />
      <button type="submit" disabled={sending || loggingIn} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3 text-label-lg text-white hover:bg-primary-dark disabled:opacity-60">
        <Icon name="send" size={18} /> {sending || loggingIn ? 'Envoi…' : 'Envoyer le message'}
      </button>
    </form>
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
  const [makeOffer, { loading: sendingOffer }] = useMutation(MAKE_OFFER_MUTATION)
  const [offerFormOpen, setOfferFormOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerError, setOfferError] = useState<string | null>(null)
  const messages = data?.conversation?.messages ?? []

  // "Me" is whoever ISN'T otherParticipant — the thread has exactly two
  // sides and this component only ever renders for the side that opened it.
  const otherId = data?.conversation?.otherParticipant.id
  const { otherIsTyping, notifyTyping, notifyStoppedTyping } = useTypingIndicator(conversationId, otherId)
  useConversationReadRefresh(conversationId, refetch)
  useOfferUpdatedRefresh(conversationId, refetch)

  // Lets the service worker skip the push alert while this thread is open
  // here in a focused tab — see src/lib/activeConversation.ts.
  useEffect(() => {
    setActiveConversation(conversationId)
    return () => setActiveConversation(null)
  }, [conversationId])

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

  const submitOffer = () => {
    const listingId = data?.conversation?.listingId
    if (!listingId) return
    const amount = Number(offerAmount.replace(/\s/g, ''))
    if (!Number.isInteger(amount) || amount <= 0) {
      setOfferError('Entrez un montant valide.')
      return
    }
    setOfferError(null)
    void makeOffer({ variables: { input: { listingId, amount, conversationId } } })
      .then(() => {
        setOfferFormOpen(false)
        setOfferAmount('')
        void refetch()
      })
      .catch((err: Error) => setOfferError(err.message))
  }

  const canOffer = data?.conversation?.listing?.negotiable && data.conversation.dealStatus === 'DISCUSSING'

  return (
    <div className="flex h-[400px] flex-col">
      <div className="mb-2 flex items-center justify-between">
        <p className="m-0 flex items-center gap-1.5 text-label-lg text-on-surface"><Icon name="chat" size={18} className="text-primary" /> Discussion avec {sellerName}</p>
        <button onClick={onClose} aria-label="Fermer" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container-high text-on-surface-variant"><Icon name="close" size={16} /></button>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto py-1">
        {messages.length === 0 && <p className="m-auto text-center text-body-sm text-on-surface-variant">Message envoyé — la réponse apparaîtra ici.</p>}
        {messages.map((m: RemoteMessage, i: number) => {
          const isMe = m.senderId !== otherId
          const prev = messages[i - 1]
          const showDivider = !prev || messageDayLabel(prev.createdAt) !== messageDayLabel(m.createdAt)
          return (
            <div key={m.id}>
              {showDivider && <div className="my-1.5 text-center"><span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-label-sm text-on-surface-variant">{messageDayLabel(m.createdAt)}</span></div>}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  {m.offer ? (
                    <OfferBubble offer={m.offer} currency={data?.conversation?.listing?.currency ?? 'XOF'} isMine={isMe} canRespond={false} responding={false} onAccept={() => {}} onReject={() => {}} />
                  ) : (
                    <div className={`px-3 py-2 text-body-sm ${isMe ? 'rounded-2xl rounded-br-md bg-primary text-white' : 'rounded-2xl rounded-bl-md bg-surface-lowest text-on-surface'}`}>{m.body}</div>
                  )}
                  <div className={`mt-0.5 flex items-center gap-1 text-label-sm text-on-surface-variant ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {isMe && <Icon name="done_all" size={14} className={m.readAt ? 'text-tertiary' : ''} />}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {otherIsTyping && <p className="m-0 mb-1 text-label-sm italic text-on-surface-variant">{sellerName} est en train d'écrire…</p>}

      {offerFormOpen ? (
        <div className="mt-2 rounded-xl bg-surface-lowest p-3">
          <label className="mb-1.5 block text-label-md text-on-surface">Votre offre ({data?.conversation?.listing?.currency === 'XOF' || !data?.conversation?.listing?.currency ? 'F' : data.conversation.listing.currency})</label>
          <PriceSuggestionHint listingId={data?.conversation?.listingId} onUseAmount={amount => setOfferAmount(String(amount))} />
          <input className={`${field} mb-2 bg-surface-container-low px-3`} inputMode="numeric" placeholder="Ex : 430 000" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} />
          {offerError && <p className="m-0 mb-2 text-body-sm text-primary">{offerError}</p>}
          <div className="flex gap-2">
            <button disabled={sendingOffer} onClick={submitOffer} className="flex-1 cursor-pointer rounded-xl border-none bg-primary py-2.5 text-label-md text-white disabled:opacity-60">{sendingOffer ? 'Envoi…' : "Envoyer l'offre"}</button>
            <button onClick={() => { setOfferFormOpen(false); setOfferError(null) }} aria-label="Annuler" className="flex w-11 cursor-pointer items-center justify-center rounded-xl border-none bg-surface-container-high text-on-surface-variant"><Icon name="close" size={18} /></button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1.5">
            {QUICK_MESSAGES.map(text => <button key={text} type="button" onClick={() => setMsg(text)} className={chip}>{text}</button>)}
          </div>
          <div className="flex gap-2">
            {canOffer && (
              <button title="Faire une offre" onClick={() => setOfferFormOpen(true)} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-surface-lowest text-primary"><Icon name="sell" size={19} /></button>
            )}
            <input
              className={`${field} min-w-0 flex-1 px-3`}
              placeholder="Écrivez votre message…"
              value={msg}
              onChange={e => { setMsg(e.target.value); notifyTyping() }}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={sending || !msg.trim()} aria-label="Envoyer" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-primary text-white disabled:opacity-50"><Icon name="send" size={19} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
