import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useSubscription } from '@apollo/client/react'
import {
  ArrowLeft, Search, CheckCheck, Send, Tag, X, MapPin, ShieldCheck, BadgeCheck, Star, Handshake, CircleX, Flag,
  Calendar, CheckCircle2, Wallet, ExternalLink, Info, Lock, Zap,
} from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import OfferBubble from '../../components/OfferBubble'
import PriceSuggestionHint from '../../components/PriceSuggestionHint'
import { AccountLayout } from '../account/AccountLayout'
import { PAYMENT_LABELS } from '../ListingDetail'
import { MAKE_OFFER_MUTATION, RESPOND_TO_OFFER_MUTATION } from '../../graphql/offers'
import { CREATE_REPORT_MUTATION } from '../../graphql/reports'
import { SELLER_PROFILE_QUERY, formatResponseTime, type RemoteSellerProfile } from '../../graphql/reviews'
import { useConversationReadRefresh, useOfferUpdatedRefresh, useTypingIndicator } from '../../lib/useMessagingLive'
import {
  CONVERSATION_QUERY, CONVERSATION_UPDATED_SUBSCRIPTION, MARK_CONVERSATION_READ_MUTATION, MESSAGE_ADDED_SUBSCRIPTION,
  MY_CONVERSATIONS_QUERY, SEND_MESSAGE_MUTATION, SET_CONVERSATION_DEAL_STATUS_MUTATION, START_CONVERSATION_MUTATION,
  PROPOSE_MEETUP_MUTATION, RESPOND_TO_MEETUP_MUTATION,
  type RemoteConversation, type RemoteMessage, type RemoteMeetup,
} from '../../graphql/messaging'
import { formatRelativeDate } from '../../lib/format'
import { setActiveConversation } from '../../lib/activeConversation'
import type { AuthUser } from '../../graphql/auth'

const BUYER_SUGGESTIONS = [
  'L’article est-il toujours disponible ?',
  'Votre prix est-il négociable ?',
  'Je serai là avec 5 min d’avance',
  'Paiement par Wave direct ?',
]
const SELLER_SUGGESTIONS = [
  'Oui, toujours disponible !',
  'Le prix est ferme, désolé.',
  'Dites-moi vos disponibilités pour un RDV.',
  'Paiement Wave ou espèces à la remise.',
]

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  if (same(d, today)) return `Aujourd'hui • ${date}`
  if (same(d, yesterday)) return `Hier • ${date}`
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

function Avatar({ url, name, size = 40, verified }: { url?: string | null, name: string, size?: number, verified?: boolean }) {
  return (
    <span className="relative shrink-0">
      <span className="flex items-center justify-center overflow-hidden rounded-full bg-surface-container-high font-bold text-on-surface-variant" style={{ width: size, height: size }}>
        {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
      </span>
      {verified && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-solid border-surface-lowest bg-tertiary" />}
    </span>
  )
}

function MeetupCard({ meetup, mine, busy, onConfirm, onChange }: { meetup: RemoteMeetup, mine: boolean, busy: boolean, onConfirm: () => void, onChange: () => void }) {
  const when = new Date(meetup.scheduledAt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="w-72 max-w-full rounded-2xl border border-outline-variant bg-surface-lowest p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Icon name="storefront" size={20} /></span>
        <div className="min-w-0">
          <div className="text-label-lg text-on-surface">{meetup.place}</div>
          <div className="text-body-sm capitalize text-on-surface-variant">{when}</div>
        </div>
      </div>
      {meetup.status === 'PROPOSED' ? (
        mine ? (
          <p className="m-0 mt-3 rounded-lg bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">En attente de confirmation…</p>
        ) : (
          <div className="mt-3 flex gap-2">
            <button disabled={busy} onClick={onConfirm} className="flex-1 cursor-pointer rounded-lg border-none bg-primary py-2 text-label-md text-white disabled:opacity-60">Confirmer le RDV</button>
            <button disabled={busy} onClick={onChange} className="cursor-pointer rounded-lg border-none bg-surface-container-high px-3 py-2 text-label-md text-on-surface">Changer</button>
          </div>
        )
      ) : (
        <p className={`m-0 mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-label-md ${meetup.status === 'CONFIRMED' ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
          {meetup.status === 'CONFIRMED' ? <><CheckCircle2 size={16} /> Rendez-vous confirmé</> : <><CircleX size={16} /> Proposition remplacée ou déclinée</>}
        </p>
      )}
    </div>
  )
}

type Props = {
  onNavigate: (p: any) => void
  onSelectListing?: (id: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
  startWith?: { listingId?: string; sellerId: string } | null
  onStartWithConsumed?: () => void
}

// "Boîte de réception & Chat" mockups (desktop 3 columns, mobile thread).
export default function Messages({ onNavigate, onSelectListing, currentUser, onLogout, startWith, onStartWithConsumed }: Props) {
  const { data: listData, refetch: refetchList } = useQuery<{ myConversations: RemoteConversation[] }>(MY_CONVERSATIONS_QUERY)
  const conversations = listData?.myConversations ?? []
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all')
  const [q, setQ] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showList, setShowList] = useState(true)
  const [msg, setMsg] = useState('')
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerError, setOfferError] = useState<string | null>(null)
  const [meetupOpen, setMeetupOpen] = useState(false)
  const [meetupPlace, setMeetupPlace] = useState('')
  const [meetupAt, setMeetupAt] = useState('')
  const [meetupError, setMeetupError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reported, setReported] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const startedFor = useRef<string | null>(null)

  const [startConversation] = useMutation<{ startConversation: RemoteConversation }>(START_CONVERSATION_MUTATION)
  useEffect(() => {
    if (!startWith) return
    const key = `${startWith.listingId}:${startWith.sellerId}`
    if (startedFor.current === key) return
    startedFor.current = key
    void startConversation({ variables: { recipientId: startWith.sellerId, listingId: startWith.listingId } }).then(({ data }) => {
      if (data?.startConversation) { setActiveId(data.startConversation.id); setShowList(false) }
      void refetchList()
      onStartWithConsumed?.()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWith])

  useEffect(() => { if (!activeId && conversations.length > 0) setActiveId(conversations[0].id) }, [conversations, activeId])
  useEffect(() => { setActiveConversation(activeId); return () => setActiveConversation(null) }, [activeId])

  const { data: convData, loading: convLoading, refetch: refetchConv } = useQuery<{ conversation: RemoteConversation }>(CONVERSATION_QUERY, { variables: { id: activeId }, skip: !activeId })
  // Apollo serves the previous thread while the new one loads — only trust
  // data that matches the selection.
  const conv = convData?.conversation?.id === activeId ? convData.conversation : undefined
  const messages = conv?.messages ?? []
  const other = conv?.otherParticipant
  const { data: otherData } = useQuery<{ sellerProfile: RemoteSellerProfile }>(SELLER_PROFILE_QUERY, { variables: { sellerId: other?.id ?? '' }, skip: !other })
  const otherProfile = otherData?.sellerProfile

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE_MUTATION)
  const [markRead] = useMutation(MARK_CONVERSATION_READ_MUTATION)
  const [setDealStatus, { loading: closingDeal }] = useMutation(SET_CONVERSATION_DEAL_STATUS_MUTATION)
  const [makeOffer, { loading: sendingOffer }] = useMutation(MAKE_OFFER_MUTATION)
  const [respondToOffer] = useMutation(RESPOND_TO_OFFER_MUTATION)
  const [proposeMeetup, { loading: proposing }] = useMutation(PROPOSE_MEETUP_MUTATION)
  const [respondToMeetup] = useMutation(RESPOND_TO_MEETUP_MUTATION)
  const [createReport] = useMutation(CREATE_REPORT_MUTATION)
  const { otherIsTyping, notifyTyping, notifyStoppedTyping } = useTypingIndicator(activeId, other?.id)
  useConversationReadRefresh(activeId, refetchConv)
  useOfferUpdatedRefresh(activeId, refetchConv)

  useEffect(() => {
    if (!activeId) return
    void markRead({ variables: { conversationId: activeId } }).then(() => refetchList())
    setOfferOpen(false); setOfferAmount(''); setOfferError(null); setMeetupOpen(false); setReported(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    variables: { conversationId: activeId as string },
    skip: !activeId,
    onData: () => {
      void refetchConv(); void refetchList()
      if (activeId) void markRead({ variables: { conversationId: activeId } })
    },
  })
  useSubscription(CONVERSATION_UPDATED_SUBSCRIPTION, { onData: () => void refetchList() })
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const refresh = () => { void refetchConv(); void refetchList() }
  const send = (text?: string) => {
    const body = (text ?? msg).trim()
    if (!body || !activeId) return
    setMsg('')
    notifyStoppedTyping()
    void sendMessage({ variables: { conversationId: activeId, body } }).then(refresh)
  }
  const closeDeal = (status: 'CONCLUDED' | 'NOT_CONCLUDED') => {
    if (!activeId) return
    const text = status === 'CONCLUDED' ? 'Confirmer que la vente est conclue ? L’annonce sera marquée comme vendue.' : 'Confirmer que cette discussion n’a pas abouti ?'
    if (!window.confirm(text)) return
    void setDealStatus({ variables: { conversationId: activeId, status } }).then(refresh)
  }
  const submitOffer = () => {
    if (!activeId || !conv?.listingId) return
    const amount = Number(offerAmount.replace(/[^\d]/g, ''))
    if (!amount) { setOfferError('Entrez un montant valide.'); return }
    setOfferError(null)
    void makeOffer({ variables: { input: { listingId: conv.listingId, amount, conversationId: activeId } } })
      .then(() => { setOfferOpen(false); setOfferAmount(''); refresh() })
      .catch((err: Error) => setOfferError(err.message))
  }
  const respondOffer = (offerId: string, accept: boolean) => {
    setBusyId(offerId)
    void respondToOffer({ variables: { offerId, accept } }).then(refresh).finally(() => setBusyId(null))
  }
  const openMeetup = () => {
    setMeetupPlace(conv?.listing?.meetupSpot ?? '')
    const d = new Date(Date.now() + 24 * 3600_000); d.setHours(14, 0, 0, 0)
    setMeetupAt(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
    setMeetupError(null)
    setMeetupOpen(true)
  }
  const submitMeetup = () => {
    if (!activeId) return
    if (!meetupPlace.trim() || !meetupAt) { setMeetupError('Indiquez un lieu et une date.'); return }
    void proposeMeetup({ variables: { conversationId: activeId, place: meetupPlace.trim(), scheduledAt: new Date(meetupAt).toISOString() } })
      .then(() => { setMeetupOpen(false); refresh() })
      .catch((err: Error) => setMeetupError(err.message))
  }
  const answerMeetup = (id: string, confirm: boolean) => {
    setBusyId(id)
    void respondToMeetup({ variables: { meetupId: id, confirm } }).then(() => { refresh(); if (!confirm) openMeetup() }).finally(() => setBusyId(null))
  }
  const reportScam = () => {
    if (!other || !window.confirm(`Signaler une tentative d'arnaque de ${other.fullName} ?`)) return
    void createReport({ variables: { targetType: 'USER', targetUserId: other.id, reason: 'Tentative d’arnaque', message: `Conversation ${activeId}` } }).then(() => setReported(true))
  }

  const counts = { all: conversations.length, buy: conversations.filter(c => !c.canManageDeal).length, sell: conversations.filter(c => c.canManageDeal).length }
  const shown = conversations
    .filter(c => filter === 'all' || (filter === 'sell') === c.canManageDeal)
    .filter(c => !q || `${c.otherParticipant.fullName} ${c.listing?.title ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  const unread = conversations.reduce((n, c) => n + c.unreadCount, 0)

  // Deal summary: the accepted offer price wins over the asking price.
  const acceptedOffer = [...messages].reverse().find(m => m.offer?.status === 'ACCEPTED')?.offer
  const agreedPrice = acceptedOffer?.amount ?? conv?.listing?.price ?? null
  const lastMeetup = [...messages].reverse().find(m => m.meetup)?.meetup
  const suggestions = conv?.canManageDeal ? SELLER_SUGGESTIONS : BUYER_SUGGESTIONS
  const canNegotiate = !!conv && !conv.canManageDeal && !!conv.listing?.negotiable && conv.dealStatus === 'DISCUSSING'
  const discussing = conv?.dealStatus === 'DISCUSSING'
  const otherResponse = formatResponseTime(otherProfile?.responseTimeMinutes)

  return (
    <AccountLayout active="buyer-messages" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="-mx-4 -my-5 flex h-[calc(100vh-4rem)] flex-col lg:-mx-8 lg:-my-6">
        {/* Golden rule banner */}
        <div className="hidden items-center gap-3 border-0 border-b border-solid border-outline-variant bg-surface-lowest px-6 py-3 md:flex">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tertiary text-white"><ShieldCheck size={19} /></span>
          <p className="m-0 flex-1 text-body-sm text-on-surface-variant">
            <b className="text-on-surface">Règle d'or Dilchap : remise en main propre &amp; 0 F de frais</b> <span className="font-semibold text-tertiary">• 100% gratuit.</span> Rencontrez-vous dans un lieu public et testez l'article avant tout paiement (espèces, Wave ou Orange Money).
          </p>
          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1 text-label-sm text-tertiary"><Lock size={13} /> Échanges protégés</span>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Conversations */}
          <aside className={`${showList ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-0 border-r border-solid border-outline-variant bg-surface-lowest md:flex md:w-80`}>
            <div className="border-0 border-b border-solid border-outline-variant p-3">
              <div className="mb-2 flex items-center justify-between">
                <h1 className="m-0 text-headline-sm text-on-surface">Boîte de réception</h1>
                {unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-label-sm text-white">{unread} non lu{unread > 1 ? 's' : ''}</span>}
              </div>
              <div className="mb-2 flex gap-1.5">
                {([['all', 'Toutes'], ['buy', 'Achats'], ['sell', 'Ventes']] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setFilter(k)} className={`cursor-pointer rounded-lg border-none px-3 py-1.5 text-label-md ${filter === k ? 'bg-primary text-white' : 'bg-transparent text-on-surface-variant hover:bg-surface-container-low'}`}>{label} ({counts[k]})</button>
                ))}
              </div>
              <label className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2">
                <Search size={17} className="text-outline" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher un contact, un produit…" className="w-full border-none bg-transparent text-body-sm text-on-surface outline-none" />
              </label>
            </div>
            <div className="flex-1 overflow-y-auto">
              {shown.length === 0 && <p className="p-5 text-center text-body-sm text-on-surface-variant">Aucune conversation. Contactez un vendeur depuis une annonce pour démarrer.</p>}
              {shown.map(c => {
                const active = c.id === activeId
                return (
                  <button key={c.id} onClick={() => { setActiveId(c.id); setShowList(false) }} className={`flex w-full cursor-pointer gap-3 border-0 border-b border-l-[3px] border-solid border-b-surface-container-low px-3 py-3 text-left ${active ? 'border-l-primary bg-primary-fixed/30' : 'border-l-transparent bg-transparent hover:bg-surface-container-low'}`}>
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-container">
                      {c.listing?.coverImageUrl ? <img src={c.listing.coverImageUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-outline"><Tag size={18} /></span>}
                      {c.unreadCount > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-solid border-white bg-primary" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-label-md text-on-surface ${c.unreadCount ? 'font-extrabold' : ''}`}>{c.otherParticipant.fullName}</span>
                        <span className="shrink-0 text-[11px] text-outline">{c.lastMessageAt ? formatRelativeDate(c.lastMessageAt) : ''}</span>
                      </span>
                      {c.listing && <span className="block truncate text-body-sm text-primary">{c.listing.title}</span>}
                      <span className="flex items-center gap-1.5">
                        <span className={`min-w-0 flex-1 truncate text-body-sm ${c.unreadCount ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>{c.lastMessage?.body ?? 'Nouvelle conversation'}</span>
                        {c.dealStatus !== 'DISCUSSING' && <span className={`shrink-0 rounded-full px-1.5 text-[10px] font-bold ${c.dealStatus === 'CONCLUDED' ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>{c.dealStatus === 'CONCLUDED' ? 'CONCLU' : 'NON CONCLU'}</span>}
                        <span className={`shrink-0 rounded px-1 text-[10px] font-bold ${c.canManageDeal ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>{c.canManageDeal ? 'Vente' : 'Achat'}</span>
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="m-0 border-0 border-t border-solid border-outline-variant p-3 text-center text-body-sm text-on-surface-variant">Toutes les discussions sont sauvegardées sur votre compte</p>
          </aside>

          {/* Thread */}
          <section className={`${showList ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col bg-surface md:flex`}>
            {!activeId ? (
              <div className="flex flex-1 items-center justify-center text-on-surface-variant">Sélectionnez une conversation</div>
            ) : !conv ? (
              <div className="flex flex-1 items-center justify-center text-on-surface-variant">{convLoading ? 'Chargement…' : ''}</div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 border-0 border-b border-solid border-outline-variant bg-surface-lowest px-3 py-2.5 md:px-4">
                  <button onClick={() => setShowList(true)} className="flex cursor-pointer border-none bg-transparent p-1 text-on-surface-variant md:hidden" aria-label="Retour"><ArrowLeft size={22} /></button>
                  <Avatar url={other!.avatarUrl} name={other!.fullName} verified={other!.isVerified} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-headline-sm text-on-surface"><span className="truncate">{other!.fullName}</span>{other!.isVerified && <BadgeCheck size={18} className="text-tertiary" />}</div>
                    <div className="flex items-center gap-1.5 truncate text-body-sm text-on-surface-variant">
                      {!!other!.reviewsCount && <><Star size={13} fill="#F59E0B" color="#F59E0B" /> {other!.averageRating?.toFixed(1)} ({other!.reviewsCount} avis) •</>}
                      {other!.city && <span>{other!.city}</span>}
                    </div>
                  </div>
                  {discussing && (
                    <button onClick={openMeetup} title="Proposer un lieu de rendez-vous" className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-surface-container-low px-2.5 py-2 text-label-md text-on-surface hover:bg-surface-container">
                      <MapPin size={17} /> <span className="hidden sm:inline">Lieu convenu</span>
                    </button>
                  )}
                  {conv.canManageDeal && conv.listing && discussing && (
                    <>
                      <button disabled={closingDeal} onClick={() => closeDeal('CONCLUDED')} className="flex cursor-pointer items-center gap-1 rounded-lg border-none bg-primary px-2.5 py-2 text-label-md text-white hover:bg-primary-dark">
                        <CheckCircle2 size={17} /> <span className="hidden sm:inline">Marquer conclu</span>
                      </button>
                      <button disabled={closingDeal} onClick={() => closeDeal('NOT_CONCLUDED')} title="Non conclue" className="hidden cursor-pointer rounded-lg border-none bg-transparent p-2 text-on-surface-variant hover:bg-surface-container-low sm:flex"><CircleX size={19} /></button>
                    </>
                  )}
                </div>

                {/* Listing strip */}
                {conv.listing && (
                  <button onClick={() => onSelectListing?.(conv.listing!.id)} className="mx-3 mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-outline-variant bg-surface-lowest p-2.5 text-left md:mx-4">
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container">{conv.listing.coverImageUrl && <img src={conv.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-label-md text-on-surface">{conv.listing.title}</span>
                        {conv.listing.condition && conv.listing.condition !== 'N/A' && <span className="shrink-0 rounded bg-tertiary px-1.5 text-[10px] font-bold text-white">{conv.listing.condition}</span>}
                      </span>
                      <span className="flex items-baseline gap-2">
                        <span className="text-headline-sm font-extrabold text-primary"><Price amount={conv.listing.price} currency={conv.listing.currency} /></span>
                        {conv.listing.originalPrice && <span className="text-body-sm text-outline line-through"><Price amount={conv.listing.originalPrice} currency={conv.listing.currency} /></span>}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1.5 text-label-sm text-on-surface">Voir fiche <ExternalLink size={13} /></span>
                  </button>
                )}

                {conv.dealStatus !== 'DISCUSSING' && (
                  <p className={`mx-3 mt-3 flex items-center gap-2 rounded-xl p-3 text-label-md md:mx-4 ${conv.dealStatus === 'CONCLUDED' ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
                    {conv.dealStatus === 'CONCLUDED' ? <><Handshake size={17} /> Vente conclue — l'annonce est marquée comme vendue.</> : <><CircleX size={17} /> Cette discussion n'a pas abouti à une vente.</>}
                  </p>
                )}

                {/* Messages */}
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-4 md:px-4">
                  <div className="mx-auto mb-2 flex max-w-xl items-start gap-2 rounded-xl bg-surface-container px-3 py-2.5 text-body-sm text-on-surface-variant md:hidden">
                    <ShieldCheck size={17} className="mt-0.5 shrink-0 text-tertiary" /> Testez toujours l'objet avant tout règlement en main propre. 0 F de commission.
                  </div>
                  {messages.length === 0 && (
                    <div className="m-auto max-w-md text-center">
                      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="forum" size={24} /></span>
                      <h3 className="m-0 text-headline-sm text-on-surface">Commencez la discussion</h3>
                      <p className="m-0 mb-3 mt-1 text-body-sm text-on-surface-variant">Choisissez une question ou écrivez votre message. Ne partagez jamais de code reçu par SMS.</p>
                      <div className="flex flex-col gap-2">
                        {suggestions.slice(0, 3).map(s => <button key={s} onClick={() => send(s)} className="cursor-pointer rounded-xl border border-outline-variant bg-surface-lowest px-3 py-2.5 text-left text-body-sm text-on-surface hover:border-primary">{s}</button>)}
                      </div>
                    </div>
                  )}
                  {messages.map((m: RemoteMessage, i: number) => {
                    const mine = m.senderId === currentUser?.id
                    const prev = messages[i - 1]
                    const divider = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
                    return (
                      <div key={m.id}>
                        {divider && <div className="my-2 flex justify-center"><span className="rounded-full bg-surface-container-high px-3 py-1 text-label-sm text-on-surface-variant">{dayLabel(m.createdAt)}</span></div>}
                        <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                          {!mine && <Avatar url={m.sender.avatarUrl} name={m.sender.fullName} size={26} />}
                          <div className={`flex max-w-[80%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                            {m.offer ? (
                              <OfferBubble offer={m.offer} currency={conv.listing?.currency ?? 'XOF'} isMine={mine} canRespond={!mine && conv.canManageDeal} responding={busyId === m.offer.id} onAccept={() => respondOffer(m.offer!.id, true)} onReject={() => respondOffer(m.offer!.id, false)} listingId={conv.listingId} />
                            ) : m.meetup ? (
                              <MeetupCard meetup={m.meetup} mine={mine} busy={busyId === m.meetup.id} onConfirm={() => answerMeetup(m.meetup!.id, true)} onChange={() => answerMeetup(m.meetup!.id, false)} />
                            ) : (
                              <div className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-body-md ${mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md border border-outline-variant bg-surface-lowest text-on-surface'}`}>{m.body}</div>
                            )}
                            <span className="mt-1 flex items-center gap-1 text-[11px] text-outline">
                              {time(m.createdAt)}
                              {mine && <CheckCheck size={13} color={m.readAt ? 'var(--primary)' : 'var(--fg-subtle)'} />}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={endRef} />
                </div>

                {/* Composer */}
                <div className="border-0 border-t border-solid border-outline-variant bg-surface-lowest px-3 pb-3 pt-2 md:px-4">
                  {otherIsTyping && <div className="mb-1 text-center text-body-sm italic text-primary">{other!.fullName} est en train d'écrire…</div>}

                  {meetupOpen && (
                    <div className="mb-2 rounded-xl border border-outline-variant p-3">
                      <div className="mb-2 flex items-center gap-1.5 text-label-md text-on-surface"><MapPin size={16} className="text-primary" /> Proposer un lieu de rendez-vous</div>
                      <div className="grid gap-2 sm:grid-cols-[1fr_200px]">
                        <input className="input" value={meetupPlace} onChange={e => setMeetupPlace(e.target.value)} placeholder="Ex : Playce Cocody (Carrefour)" />
                        <input className="input" type="datetime-local" value={meetupAt} onChange={e => setMeetupAt(e.target.value)} />
                      </div>
                      {meetupError && <p className="m-0 mt-1.5 text-body-sm text-primary">{meetupError}</p>}
                      <div className="mt-2 flex gap-2">
                        <button disabled={proposing} onClick={submitMeetup} className="flex-1 cursor-pointer rounded-lg border-none bg-primary py-2 text-label-md text-white">Envoyer la proposition</button>
                        <button onClick={() => setMeetupOpen(false)} className="cursor-pointer rounded-lg border-none bg-surface-container px-3"><X size={16} /></button>
                      </div>
                    </div>
                  )}

                  {offerOpen && (
                    <div className="mb-2 rounded-xl border border-outline-variant p-3">
                      <div className="mb-1 text-label-md text-on-surface">Votre offre ({conv.listing?.currency ?? 'XOF'})</div>
                      <PriceSuggestionHint listingId={conv.listingId} onUseAmount={a => setOfferAmount(String(a))} />
                      <input className="input" inputMode="numeric" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} placeholder="Ex : 130 000" />
                      {offerError && <p className="m-0 mt-1.5 text-body-sm text-primary">{offerError}</p>}
                      <div className="mt-2 flex gap-2">
                        <button disabled={sendingOffer} onClick={submitOffer} className="flex-1 cursor-pointer rounded-lg border-none bg-primary py-2 text-label-md text-white">{sendingOffer ? 'Envoi…' : "Envoyer l'offre"}</button>
                        <button onClick={() => setOfferOpen(false)} className="cursor-pointer rounded-lg border-none bg-surface-container px-3"><X size={16} /></button>
                      </div>
                    </div>
                  )}

                  {messages.length > 0 && discussing && (
                    <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                      <span className="shrink-0 text-label-sm uppercase text-on-surface-variant">Suggestions :</span>
                      {suggestions.map(s => <button key={s} onClick={() => send(s)} className="shrink-0 cursor-pointer rounded-full border border-outline-variant bg-surface-lowest px-3 py-1 text-body-sm text-on-surface hover:border-primary">« {s} »</button>)}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {canNegotiate && (
                      <button onClick={() => { setOfferOpen(o => !o); setMeetupOpen(false) }} className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border-none bg-transparent px-2 py-2 text-label-md text-primary hover:bg-primary-fixed/40">
                        <Tag size={17} /> <span className="hidden sm:inline">Proposer prix</span>
                      </button>
                    )}
                    <input
                      className="min-w-0 flex-1 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2.5 text-body-md text-on-surface outline-none focus:border-on-surface"
                      placeholder={`Écrivez à ${other!.fullName.split(' ')[0]}… (RDV, disponibilité)`}
                      value={msg}
                      onChange={e => { setMsg(e.target.value); notifyTyping() }}
                      onKeyDown={e => e.key === 'Enter' && send()}
                    />
                    <button disabled={sending || !msg.trim()} onClick={() => send()} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-primary text-white disabled:opacity-50" aria-label="Envoyer"><Send size={19} /></button>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Right panel */}
          {conv && other && (
            <aside className="hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto border-0 border-l border-solid border-outline-variant bg-surface p-3 xl:flex">
              <div className="rounded-2xl bg-surface-lowest p-4">
                <div className="flex items-center gap-3">
                  <Avatar url={other.avatarUrl} name={other.fullName} size={52} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-headline-sm text-on-surface"><span className="truncate">{other.fullName}</span>{other.isVerified && <BadgeCheck size={17} className="text-tertiary" />}</div>
                    {other.createdAt && <div className="text-body-sm text-on-surface-variant">Membre depuis {new Date(other.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</div>}
                    {otherResponse && <div className="flex items-center gap-1 text-body-sm text-tertiary"><Zap size={13} /> Répond en {otherResponse}</div>}
                  </div>
                </div>
                {otherProfile && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-container-low px-3 py-2 text-body-sm">
                    <span className="flex items-center gap-1 text-on-surface">{otherProfile.reviewsCount ? <><Star size={14} fill="#F59E0B" color="#F59E0B" /> {otherProfile.averageRating.toFixed(1)}/5</> : 'Pas encore d’avis'}</span>
                    <span className="text-on-surface-variant">{otherProfile.reviewsCount} avis • {otherProfile.salesCount} vente{otherProfile.salesCount > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {conv.listing && (
                <div className="rounded-2xl bg-surface-lowest p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-label-lg text-on-surface">Récapitulatif convenu</span>
                    <span className="rounded bg-tertiary px-2 py-0.5 text-label-sm text-white">Main propre</span>
                  </div>
                  <dl className="m-0 flex flex-col gap-2 text-body-sm">
                    <div className="flex justify-between"><dt className="text-on-surface-variant">Prix de l'article</dt><dd className="m-0 text-on-surface"><Price amount={conv.listing.price} currency={conv.listing.currency} /></dd></div>
                    {acceptedOffer && <div className="flex justify-between"><dt className="text-on-surface-variant">Offre acceptée</dt><dd className="m-0 text-on-surface"><Price amount={acceptedOffer.amount} currency={conv.listing.currency} /></dd></div>}
                    <div className="flex justify-between"><dt className="flex items-center gap-1 text-tertiary">Commission Dilchap <Info size={13} /></dt><dd className="m-0 font-bold text-tertiary">0 F (0%)</dd></div>
                    <div className="flex justify-between"><dt className="text-on-surface-variant">Frais de réservation</dt><dd className="m-0 text-on-surface">0 F</dd></div>
                  </dl>
                  <div className="mt-3 flex items-center justify-between border-0 border-t border-solid border-outline-variant pt-3">
                    <span className="text-label-md text-on-surface">Montant à régler au vendeur</span>
                    <span className="text-headline-sm font-extrabold text-primary"><Price amount={agreedPrice} currency={conv.listing.currency} /></span>
                  </div>
                  {!!conv.listing.paymentMethods?.length && (
                    <p className="m-0 mt-3 flex items-start gap-2 rounded-lg bg-surface-container-low p-2.5 text-body-sm text-on-surface"><Wallet size={16} className="mt-0.5 shrink-0 text-tertiary" /> Modes acceptés : {conv.listing.paymentMethods.map(p => PAYMENT_LABELS[p] ?? p).join(', ')} à la remise</p>
                  )}
                  {lastMeetup && (
                    <p className="m-0 mt-2 flex items-start gap-2 rounded-lg bg-surface-container-low p-2.5 text-body-sm text-on-surface"><Calendar size={16} className="mt-0.5 shrink-0 text-primary" /> {lastMeetup.place} — {new Date(lastMeetup.scheduledAt).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} {lastMeetup.status === 'CONFIRMED' ? '(confirmé)' : lastMeetup.status === 'PROPOSED' ? '(en attente)' : ''}</p>
                  )}
                </div>
              )}

              <div className="rounded-2xl bg-surface-lowest p-4">
                <div className="mb-2 flex items-center gap-1.5 text-label-md text-primary"><ShieldCheck size={17} /> Checklist sécurité Dilchap</div>
                <ul className="m-0 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface-variant">
                  {['Rendez-vous dans un lieu public et fréquenté', 'Testez l’article avant de payer', 'Ne payez jamais à l’avance', 'Ne communiquez jamais un code reçu par SMS'].map(t => (
                    <li key={t} className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-tertiary" /> {t}</li>
                  ))}
                </ul>
                <button disabled={reported} onClick={reportScam} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-transparent py-2 text-label-md text-on-surface hover:bg-primary-fixed/40 disabled:cursor-default disabled:text-tertiary">
                  {reported ? <><CheckCircle2 size={15} /> Signalement envoyé</> : <><Flag size={15} /> Signaler une tentative d'arnaque</>}
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>
    </AccountLayout>
  )
}
