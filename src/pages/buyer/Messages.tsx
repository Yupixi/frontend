import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useSubscription } from '@apollo/client/react'
import {
  X, MapPin, ShieldCheck, Star, Handshake, CircleX, Flag,
  Calendar, CheckCircle2, Wallet, Info, Lock, Zap,
} from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import SafeImg from '../../components/SafeImg'
import ConfirmSheet from '../../components/ConfirmSheet'
import BottomSheet from '../../components/BottomSheet'
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
  RESPOND_TO_MEETUP_MUTATION,
  byLatestMessage, messagePreview, type RemoteConversation, type RemoteMessage, type SystemCard,
} from '../../graphql/messaging'
import { CHAT_ASSISTANT_QUERY, type ChatAssistantStatus } from '../../graphql/chatAssistant'
import ChatComposer, { type ComposerHandle, type ComposerReply } from '../../components/ChatComposer'
import InboxList from '../../components/InboxList'
import ImageLightbox from '../../components/ImageLightbox'
import ChatThread, { Avatar, ThreadSkeleton, type PendingMessage } from '../../components/chat/ChatThread'
import SafetyBanners from '../../components/chat/SafetyBanners'
import type { AssistantUse } from '../../components/chat/AssistantPanel'
import type { MeetupPrefill } from '../../components/chat/MeetupSheet'
import HandoverCard, { DealDoneCard, DealReview } from '../../components/chat/HandoverCard'
import { setActiveConversation } from '../../lib/activeConversation'
import type { AuthUser } from '../../graphql/auth'
import SellerBadge from '../../components/SellerBadge'
import { Claim } from '../../lib/site'
import { isNotVerifiedError, requestAccountVerification } from '../../lib/accountVerify'
import { useMemberLists } from '../../lib/lists'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { useChatViewport } from '../../lib/useChatViewport'

// Heavy and occasional: loaded on first use only.
const AssistantPanel = lazy(() => import('../../components/chat/AssistantPanel'))
const MeetupSheet = lazy(() => import('../../components/chat/MeetupSheet'))

type Props = {
  onNavigate: (p: any) => void
  onSelectListing?: (id: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
  startWith?: { listingId?: string; sellerId: string } | null
  onStartWithConsumed?: () => void
  // Thread to open directly (message notification), on its « Remise »
  // card when `focusRemise` (hand-over links: orders, purchases, push).
  openConversationId?: string | null
  focusRemise?: boolean
  onOpenConversationConsumed?: () => void
  // « Voir le litige » from a frozen « Remise » card.
  onOpenDispute?: (disputeId: string, as: 'SELLER' | 'BUYER') => void
}

let tmpSeq = 0

// « Boîte de réception & Chat »: conversation list + thread (+ recap panel
// on wide screens). On a phone an open thread is full-screen with its own
// compact header, a sticky listing card, the composer above the keyboard,
// quick actions and « Aide Dilchap » (the member's private AI assistant).
export default function Messages({ onNavigate, onSelectListing, currentUser, onLogout, startWith, onStartWithConsumed, openConversationId, focusRemise, onOpenConversationConsumed, onOpenDispute }: Props) {
  const lists = useMemberLists()
  const isPhone = !useMediaQuery('(min-width: 768px)')
  // ≥ 1280 px: Aide Dilchap is a third column (in place of the recap).
  const isWide = useMediaQuery('(min-width: 1280px)')
  const { data: listData, refetch: refetchList } = useQuery<{ myConversations: RemoteConversation[] }>(MY_CONVERSATIONS_QUERY)
  const conversations = [...(listData?.myConversations ?? [])].sort(byLatestMessage)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showList, setShowList] = useState(true)
  const [msg, setMsg] = useState('')
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerError, setOfferError] = useState<string | null>(null)
  const [meetup, setMeetup] = useState<{ open: boolean; prefill: MeetupPrefill | null; loaded: boolean }>({ open: false, prefill: null, loaded: false })
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantLoaded, setAssistantLoaded] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reported, setReported] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirming, setConfirming] = useState<'CONCLUDED' | 'NOT_CONCLUDED' | 'REPORT' | null>(null)
  // Units sold, when the listing has stock.
  const [soldQty, setSoldQty] = useState(1)
  const inputRef = useRef<ComposerHandle>(null)
  const [replyTo, setReplyTo] = useState<ComposerReply | null>(null)
  const [viewer, setViewer] = useState<{ photos: string[]; index: number } | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [pending, setPending] = useState<(PendingMessage & { conv: string; vars: Record<string, unknown> })[]>([])
  const startedFor = useRef<string | null>(null)

  const [startConversation] = useMutation<{ startConversation: RemoteConversation }>(START_CONVERSATION_MUTATION)
  useEffect(() => {
    if (!startWith) return
    const key = `${startWith.listingId}:${startWith.sellerId}`
    if (startedFor.current === key) return
    startedFor.current = key
    const { sellerId, listingId } = startWith
    // Account not confirmed: « Recevoir un code par SMS » (sheet), then
    // the discussion opens.
    const start = () => void startConversation({ variables: { recipientId: sellerId, listingId } }).then(({ data }) => {
      if (data?.startConversation) { setActiveId(data.startConversation.id); setShowList(false) }
      void refetchList()
      onStartWithConsumed?.()
    }).catch((e: unknown) => {
      if (isNotVerifiedError(e)) requestAccountVerification(start)
      onStartWithConsumed?.()
    })
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWith])

  // « Remise » card opened by hand (header, meet-up card, links) for this
  // conversation, and a scroll to it once the thread is there.
  const [remiseFor, setRemiseFor] = useState<string | null>(null)
  const [scrollRemise, setScrollRemise] = useState(false)
  useEffect(() => {
    if (!openConversationId) return
    setActiveId(openConversationId); setShowList(false)
    if (focusRemise) { setRemiseFor(openConversationId); setScrollRemise(true) }
    onOpenConversationConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openConversationId])

  // Desktop opens the latest conversation; a phone stays on the list.
  useEffect(() => { if (!activeId && !openConversationId && conversations.length > 0 && !isPhone) setActiveId(conversations[0].id) }, [conversations, activeId, openConversationId, isPhone])
  useEffect(() => { setActiveConversation(activeId); return () => setActiveConversation(null) }, [activeId])
  const threadOpen = !!activeId && !showList
  useChatViewport(isPhone && threadOpen)

  const { data: convData, loading: convLoading, refetch: refetchConv } = useQuery<{ conversation: RemoteConversation }>(CONVERSATION_QUERY, { variables: { id: activeId }, skip: !activeId })
  // Apollo serves the previous thread while the new one loads — only trust
  // data that matches the selection.
  const conv = convData?.conversation?.id === activeId ? convData.conversation : undefined
  const messages = conv?.messages ?? []
  const other = conv?.otherParticipant
  const { data: otherData } = useQuery<{ sellerProfile: RemoteSellerProfile }>(SELLER_PROFILE_QUERY, { variables: { sellerId: other?.id ?? '' }, skip: !other })
  const otherProfile = otherData?.sellerProfile
  const { data: assistantData } = useQuery<{ chatAssistant: ChatAssistantStatus }>(CHAT_ASSISTANT_QUERY, { variables: { conversationId: activeId }, skip: !activeId || !!currentUser?.isGuest, fetchPolicy: 'cache-and-network' })
  const assistantOn = !!assistantData?.chatAssistant?.enabled && assistantData.chatAssistant.reason !== 'CLOSED'

  const [sendMessage] = useMutation(SEND_MESSAGE_MUTATION)
  const [markRead] = useMutation(MARK_CONVERSATION_READ_MUTATION)
  const [setDealStatus, { loading: closingDeal }] = useMutation(SET_CONVERSATION_DEAL_STATUS_MUTATION)
  const [makeOffer, { loading: sendingOffer }] = useMutation(MAKE_OFFER_MUTATION)
  const [respondToOffer] = useMutation(RESPOND_TO_OFFER_MUTATION)
  const [respondToMeetup] = useMutation(RESPOND_TO_MEETUP_MUTATION)
  const [createReport] = useMutation(CREATE_REPORT_MUTATION)
  const { otherIsTyping, notifyTyping, notifyStoppedTyping } = useTypingIndicator(activeId, other?.id)
  useConversationReadRefresh(activeId, refetchConv)
  useOfferUpdatedRefresh(activeId, refetchConv)

  useEffect(() => {
    if (!activeId) return
    void markRead({ variables: { conversationId: activeId } }).then(() => refetchList())
    setOfferOpen(false); setOfferAmount(''); setOfferError(null); setReported(false); setMenuOpen(false); setAssistantOpen(false)
    setReplyTo(null)
    // Unsent text is kept per conversation.
    try { setMsg(localStorage.getItem(`dilchap_chat_draft_${activeId}`) ?? '') } catch { setMsg('') }
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

  const refresh = () => Promise.all([refetchConv(), refetchList()])
  const saveDraft = (text: string) => { try { if (activeId) { if (text) localStorage.setItem(`dilchap_chat_draft_${activeId}`, text); else localStorage.removeItem(`dilchap_chat_draft_${activeId}`) } } catch { /* private mode */ } }

  // Optimistic sending: the message shows at once; on failure it stays
  // with « Réessayer ».
  const deliver = (p: PendingMessage & { conv: string; vars: Record<string, unknown> }) => {
    setPending(list => [...list.filter(x => x.id !== p.id), { ...p, status: 'sending', error: undefined }])
    sendMessage({ variables: p.vars })
      .then(() => refresh())
      .then(() => setPending(list => list.filter(x => x.id !== p.id)))
      .catch((e: unknown) => {
        if (isNotVerifiedError(e)) requestAccountVerification(() => deliver(p))
        setPending(list => list.map(x => (x.id === p.id ? { ...x, status: 'failed', error: e instanceof Error && e.message.length < 140 ? e.message : 'Non envoyé' } : x)))
      })
  }
  const send = (text: string) => {
    const body = text.trim()
    if (!body || !activeId) return
    notifyStoppedTyping()
    deliver({ id: `tmp-${++tmpSeq}`, conv: activeId, body, attachments: [], audio: false, status: 'sending', vars: { conversationId: activeId, body } })
  }
  // Composer: text, photos, voice and quoted reply; the draft is cleared at once.
  const sendFromComposer = async ({ body, attachments, replyToId, audioUrl, audioDuration }: { body: string; attachments: string[]; replyToId?: string; audioUrl?: string; audioDuration?: number }) => {
    if (!activeId) return
    notifyStoppedTyping()
    if (!audioUrl) { setMsg(''); saveDraft('') }
    deliver({ id: `tmp-${++tmpSeq}`, conv: activeId, body, attachments, audio: !!audioUrl, status: 'sending', vars: { conversationId: activeId, body, attachments, replyToId, audioUrl, audioDuration } })
  }
  const replyToMessage = (m: RemoteMessage) => setReplyTo({
    id: m.id,
    author: m.senderId === currentUser?.id ? 'vous-même' : m.sender.fullName.split(' ')[0],
    preview: messagePreview(m),
    photo: m.attachments?.[0],
  })
  // Tapping a quote scrolls to the quoted message and flashes it.
  const jumpTo = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlashId(id)
    window.setTimeout(() => setFlashId(f => (f === id ? null : f)), 1400)
  }
  const closeDeal = (status: 'CONCLUDED' | 'NOT_CONCLUDED') => {
    if (!activeId) return
    void setDealStatus({ variables: { conversationId: activeId, status, ...(status === 'CONCLUDED' ? { quantity: soldQty } : {}) } }).then(refresh).finally(() => { setConfirming(null); setSoldQty(1) })
  }
  // Quick replies fill the input rather than sending blind.
  const suggest = (text: string) => { setMsg(text); saveDraft(text); inputRef.current?.focus() }
  const submitOffer = () => {
    if (!activeId || !conv?.listingId) return
    const amount = Number(offerAmount.replace(/[^\d]/g, ''))
    if (!amount) { setOfferError('Entrez un montant valide.'); return }
    setOfferError(null)
    void makeOffer({ variables: { input: { listingId: conv.listingId, amount, conversationId: activeId } } })
      .then(() => { setOfferOpen(false); setOfferAmount(''); void refresh() })
      .catch((err: Error) => setOfferError(err.message))
  }
  const respondOffer = (offerId: string, accept: boolean) => {
    setBusyId(offerId)
    void respondToOffer({ variables: { offerId, accept } }).then(refresh).finally(() => setBusyId(null))
  }
  const openMeetup = (prefill: MeetupPrefill | null = null) => setMeetup({ open: true, prefill, loaded: true })
  const answerMeetup = (id: string, confirm: boolean) => {
    setBusyId(id)
    void respondToMeetup({ variables: { meetupId: id, confirm } }).then(() => { void refresh(); if (!confirm) openMeetup() }).finally(() => setBusyId(null))
  }
  const reportScam = () => {
    if (!other) return
    void createReport({ variables: { targetType: 'USER', targetUserId: other.id, reason: 'Tentative d’arnaque', message: `Conversation ${activeId}` } }).then(() => setReported(true)).finally(() => setConfirming(null))
  }
  const openAssistant = () => { setAssistantLoaded(true); setAssistantOpen(true) }
  const applyAssistant = (u: AssistantUse) => {
    if (u.kind === 'draft') { setMsg(u.text); saveDraft(u.text); setAssistantOpen(false); window.setTimeout(() => inputRef.current?.focus(), 50) }
    else if (u.kind === 'price') { setOfferAmount(String(u.amount)); setOfferOpen(true); setAssistantOpen(false) }
    else { setAssistantOpen(false); openMeetup({ place: u.meetup.place, placeId: u.meetup.placeId, address: u.meetup.address, lat: u.meetup.lat, lng: u.meetup.lng, scheduledAt: u.meetup.scheduledAt }) }
  }
  // « Laisser un avis » is answered inside the « Vente conclue » card.
  const cardAction = (card: SystemCard) => {
    if (card.cta === 'MEETUP') openMeetup()
    else if (card.cta === 'REPORT') setConfirming('REPORT')
  }

  // « Remise »: shown by itself on meet-up day (window set in the
  // Backoffice), or opened from the header / the meet-up card.
  const handover = conv?.handover ?? null
  const remisePending = !!handover && handover.status === 'PENDING' && !!handover.meetupId
  const remiseShown = remisePending && (handover!.inWindow || remiseFor === activeId)
  const openRemise = () => { if (activeId) { setRemiseFor(activeId); setScrollRemise(true) } }
  useEffect(() => {
    if (!scrollRemise || !conv) return
    if (!remiseShown) { if (!convLoading) setScrollRemise(false); return }
    const id = window.requestAnimationFrame(() => {
      const el = document.getElementById('remise-card')
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (handover?.role === 'SELLER' && !isPhone) el?.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]')?.focus({ preventScroll: true })
      setScrollRemise(false)
    })
    return () => window.cancelAnimationFrame(id)
  }, [scrollRemise, remiseShown, conv, convLoading, handover?.role, isPhone])
  const remiseDispute = (id: string) => onOpenDispute?.(id, conv?.canManageDeal ? 'SELLER' : 'BUYER')
  // The sale was concluded: the inline rating sits in the « Vente conclue »
  // Dilchap card, or in a card of its own when the thread has none.
  const hasDealCard = messages.some(m => m.system?.type === 'DEAL_CONCLUDED')

  // Deal summary: the accepted offer price wins over the asking price.
  const latestOffer = [...messages].reverse().find(m => m.offer)?.offer
  const acceptedOffer = [...messages].reverse().find(m => m.offer?.status === 'ACCEPTED')?.offer
  const agreedPrice = acceptedOffer?.amount ?? conv?.listing?.price ?? null
  const lastMeetup = [...messages].reverse().find(m => m.meetup)?.meetup
  const suggestions = conv?.canManageDeal ? lists.quickReplies.seller : lists.quickReplies.buyer
  const canNegotiate = !!conv && !conv.closedAt && !conv.canManageDeal && !!conv.listing?.negotiable && conv.dealStatus === 'DISCUSSING'
  const closed = !!conv?.closedAt
  const discussing = conv?.dealStatus === 'DISCUSSING' && !closed
  // An inactive conversation is revived by contacting the member again.
  const [reopening, setReopening] = useState(false)
  const reopen = () => {
    if (!other) return
    setReopening(true)
    void startConversation({ variables: { recipientId: other.id, listingId: conv?.listingId ?? undefined } })
      .then(refresh)
      .catch((e: unknown) => { if (isNotVerifiedError(e)) requestAccountVerification(reopen) })
      .finally(() => setReopening(false))
  }
  const otherResponse = formatResponseTime(otherProfile?.responseTimeMinutes)
  // "Quartier, ville": the member's own city, else — when they're the seller —
  // where their listing is.
  const otherPlace = other?.city || (conv && !conv.canManageDeal && conv.listing ? [conv.listing.locationLabel, conv.listing.city].filter(Boolean).join(', ') : '')
  const firstName = other?.fullName.split(' ')[0] ?? ''
  const menuItems = !conv ? [] : [
    discussing && { icon: 'location_on', label: 'Fixer un rendez-vous', onClick: () => openMeetup() },
    conv.listing && { icon: 'open_in_new', label: 'Voir la fiche', onClick: () => onSelectListing?.(conv.listing!.id) },
    remisePending && { icon: 'task_alt', label: conv.canManageDeal ? 'Confirmer la remise' : 'Mon code de remise', onClick: openRemise },
    conv.canManageDeal && conv.listing && discussing && { icon: 'handshake', label: 'Marquer la vente conclue', onClick: () => setConfirming('CONCLUDED') },
    conv.canManageDeal && conv.listing && discussing && { icon: 'cancel', label: 'Discussion non conclue', onClick: () => setConfirming('NOT_CONCLUDED') },
    !reported && { icon: 'flag', label: 'Signaler une arnaque', onClick: () => setConfirming('REPORT'), danger: true },
  ].filter(Boolean) as { icon: string, label: string, onClick: () => void, danger?: boolean }[]
  const myPending = pending.filter(p => p.conv === activeId)
  const offerChip = latestOffer && conv?.listing && (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold ${latestOffer.status === 'ACCEPTED' ? 'bg-tertiary-soft text-tertiary' : latestOffer.status === 'PENDING' ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100' : 'bg-surface-container text-on-surface-variant'}`}>
      {latestOffer.status === 'ACCEPTED' ? 'Offre acceptée' : latestOffer.status === 'PENDING' ? 'Offre en attente' : 'Offre refusée'} <Price amount={latestOffer.amount} currency={conv.listing.currency} />
    </span>
  )

  // Sticky listing card: photo, title, price, offer status, quick actions.
  const listingBar = conv?.listing && (
    <div className="z-10 shrink-0 border-0 border-b border-solid border-outline-variant/70 bg-surface-lowest/95 px-3 py-2 sm:px-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onSelectListing?.(conv.listing!.id)} aria-label={`Voir l’annonce ${conv.listing.title}`} className="h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border-none bg-surface-container-high p-0"><SafeImg src={conv.listing.coverImageUrl} alt={conv.listing.title} icon="sell" /></button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-label-md font-bold text-on-surface">{conv.listing.title}</div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="whitespace-nowrap text-label-lg font-extrabold text-primary"><Price amount={conv.listing.price} currency={conv.listing.currency} /></span>
            {!!conv.listing.originalPrice && conv.listing.price != null && conv.listing.originalPrice > conv.listing.price && <span className="whitespace-nowrap text-body-sm text-on-surface-variant line-through"><Price amount={conv.listing.originalPrice} currency={conv.listing.currency} /></span>}
            {offerChip ?? <span className="whitespace-nowrap rounded-md bg-tertiary-soft px-1.5 py-0.5 text-[11px] font-bold text-tertiary">Main propre</span>}
          </div>
        </div>
        {discussing && (
          <div className="flex shrink-0 gap-1.5">
            {canNegotiate && !remisePending && <button type="button" onClick={() => { setOfferOpen(o => !o) }} className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border-none bg-primary px-3 py-2 text-label-sm font-semibold text-white max-[379px]:px-2.5"><Icon name="sell" size={15} /> <span className="max-[379px]:hidden">Offre</span></button>}
            {remisePending ? (
              // Confirmed meet-up: the hand-over, from anywhere in the thread.
              <button type="button" onClick={openRemise} aria-label={conv.canManageDeal ? 'Confirmer la remise' : 'Mon code de remise'} className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border-none bg-primary px-3 py-2 text-label-sm font-semibold text-white">
                <Icon name="task_alt" size={15} /> <span className="max-[379px]:hidden">{conv.canManageDeal ? 'Confirmer la remise' : 'Code de remise'}</span><span className="min-[380px]:hidden">Remise</span>
              </button>
            ) : (
              <button type="button" onClick={() => openMeetup()} aria-label="Fixer un rendez-vous" className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border-none bg-surface-container px-3 py-2 text-label-sm font-semibold text-on-surface max-[379px]:px-2.5"><Icon name="event" size={15} /> <span className="max-sm:hidden">Rendez-vous</span></button>
            )}
          </div>
        )}
      </div>
    </div>
  )

  const chips: { key: string; icon: string; label: string; onClick: () => void; accent?: boolean }[] = !discussing ? [] : [
    ...(assistantOn ? [{ key: 'ai', icon: 'auto_awesome', label: 'Aide Dilchap', onClick: openAssistant, accent: true }] : []),
    ...(canNegotiate ? [{ key: 'offer', icon: 'sell', label: 'Proposer un prix', onClick: () => setOfferOpen(o => !o) }] : []),
    { key: 'meetup', icon: 'event', label: 'Fixer un rendez-vous', onClick: () => openMeetup() },
    { key: 'photo', icon: 'photo_camera', label: 'Envoyer une photo', onClick: () => inputRef.current?.pickPhotos() },
  ]

  const assistantColumn = (
    <Suspense fallback={<div className="p-4"><div className="chat-skeleton h-40 rounded-2xl" /></div>}>
      {activeId && <AssistantPanel conversationId={activeId} isBuyer={!conv?.canManageDeal} canOffer={canNegotiate} onUse={applyAssistant} onClose={() => setAssistantOpen(false)} />}
    </Suspense>
  )
  const desktopAssistant = !isPhone && !isWide && assistantOpen && activeId && (
    <div className="chat-drawer absolute inset-y-0 right-0 z-30 flex w-[min(400px,100%)] flex-col border-0 border-l border-solid border-outline-variant bg-surface shadow-2xl">
      <Suspense fallback={<div className="p-4"><div className="chat-skeleton h-40 rounded-2xl" /></div>}>
        <AssistantPanel conversationId={activeId} isBuyer={!conv?.canManageDeal} canOffer={canNegotiate} onUse={applyAssistant} onClose={() => setAssistantOpen(false)} />
      </Suspense>
    </div>
  )

  return (
    <AccountLayout active="buyer-messages" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} fill immersive={threadOpen} onBack={showList ? undefined : () => setShowList(true)} title={showList ? undefined : 'Conversation'}>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Golden rule banner */}
        <div className="hidden items-center gap-3 border-0 border-b border-solid border-outline-variant bg-surface-lowest px-6 py-2.5 lg:flex">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tertiary text-white"><ShieldCheck size={17} /></span>
          <p className="m-0 flex-1 text-body-sm text-on-surface-variant">
            <b className="text-on-surface">Règle d'or Dilchap : remise en main propre<Claim> &amp; 0 F de frais</Claim></b> <Claim><span className="font-semibold text-tertiary">• 100% gratuit.</span> </Claim>Rencontrez-vous dans un lieu public et testez l'article avant tout paiement (espèces ou Mobile Money).
          </p>
          <span className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-container-low px-2.5 py-1 text-label-sm text-tertiary"><Lock size={13} /> Échanges protégés</span>
        </div>

        <div className="relative flex min-h-0 flex-1">
          {/* Conversations */}
          <aside className={`${showList ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-0 border-r border-solid border-outline-variant bg-surface-lowest md:flex md:w-80 lg:w-[340px]`}>
            {!listData ? (
              <div className="flex flex-col gap-2 p-3" aria-busy="true">{[0, 1, 2, 3, 4].map(i => <div key={i} className="flex items-center gap-3 p-2"><div className="chat-skeleton h-14 w-14 rounded-xl" /><div className="flex-1 space-y-2"><div className="chat-skeleton h-3.5 w-2/3 rounded" /><div className="chat-skeleton h-3 w-1/2 rounded" /></div></div>)}</div>
            ) : (
              <InboxList
                conversations={conversations}
                activeId={activeId}
                currentUserId={currentUser?.id}
                onOpen={id => { setActiveId(id); setShowList(false) }}
                onExplore={() => onNavigate('search')}
              />
            )}
            {/* max-lg:pb-8: the raised « Déposer » button of the bottom bar sits over this line */}
            <p className="m-0 border-0 border-t border-solid border-outline-variant p-3 text-center text-body-sm text-on-surface-variant max-lg:pb-8">Toutes les discussions sont sauvegardées sur votre compte</p>
          </aside>

          {/* Thread */}
          <section className={`${showList ? 'hidden' : 'flex'} relative min-w-0 flex-1 flex-col bg-surface md:flex`} aria-label="Discussion">
            {!activeId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-on-surface-variant"><Icon name="forum" size={36} className="text-outline" /> Sélectionnez une conversation</div>
            ) : !conv ? (
              <>
                <div className="flex items-center gap-3 bg-surface-lowest px-3 py-2.5 shadow-sm"><div className="chat-skeleton h-10 w-10 rounded-full" /><div className="chat-skeleton h-4 w-40 rounded" /></div>
                {convLoading ? <ThreadSkeleton /> : <div className="flex-1" />}
              </>
            ) : (
              <>
                {/* Compact contact header */}
                <header className="relative z-20 flex items-center gap-2.5 bg-surface-lowest px-2 py-2 shadow-sm sm:px-4">
                  <button type="button" onClick={() => setShowList(true)} aria-label="Retour aux conversations" className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface md:hidden"><Icon name="arrow_back" size={22} /></button>
                  <Avatar url={other!.avatarUrl} name={other!.fullName} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-label-lg font-bold text-on-surface"><span className="truncate">{other!.fullName}</span><SellerBadge tier={other!.badge} size={17} /></div>
                    <div className="flex min-w-0 items-center gap-1.5 truncate text-[12px] text-on-surface-variant">
                      {otherIsTyping ? <span className="font-semibold text-primary">écrit…</span> : (
                        <>
                          {!!other!.reviewsCount && <span className="flex shrink-0 items-center gap-0.5"><Star size={12} fill="#F59E0B" color="#F59E0B" /> {other!.averageRating?.toFixed(1)}</span>}
                          {otherResponse && <span className="flex shrink-0 items-center gap-0.5"><Zap size={12} className="text-tertiary" /> Répond en {otherResponse}</span>}
                          {otherPlace && <span className="flex min-w-0 items-center gap-0.5 max-sm:hidden"><MapPin size={12} className="shrink-0" /><span className="truncate">{otherPlace}</span></span>}
                        </>
                      )}
                    </div>
                  </div>
                  {assistantOn && (
                    <button type="button" onClick={() => (assistantOpen ? setAssistantOpen(false) : openAssistant())} aria-expanded={assistantOpen} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-none bg-primary-fixed/70 px-3 py-2 text-label-sm font-semibold text-primary hover:bg-primary-fixed max-[379px]:px-2.5">
                      <Icon name="auto_awesome" size={17} /> <span className="max-[379px]:hidden">Aide Dilchap</span>
                    </button>
                  )}
                  {conv.canManageDeal && conv.listing && discussing && !remisePending && (
                    <button disabled={closingDeal} onClick={() => setConfirming('CONCLUDED')} className="flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border-none bg-primary px-3 py-2 text-label-sm text-white hover:bg-primary-dark max-lg:hidden">
                      <CheckCircle2 size={16} /> Marquer conclu
                    </button>
                  )}
                  {menuItems.length > 0 && (
                    <div className="relative shrink-0">
                      <button onClick={() => setMenuOpen(o => !o)} aria-label="Options du fil" aria-expanded={menuOpen} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface hover:bg-surface-container-high">
                        <Icon name="more_vert" size={20} />
                      </button>
                      {menuOpen && (
                        <>
                          <div className="fixed inset-0 z-[90]" onClick={() => setMenuOpen(false)} />
                          <div role="menu" className="absolute right-0 top-full z-[100] mt-2 w-64 rounded-2xl border border-outline-variant bg-surface-lowest p-1.5 shadow-float">
                            {menuItems.map(it => (
                              <button key={it.label} role="menuitem" onClick={() => { setMenuOpen(false); it.onClick() }} className={`flex w-full cursor-pointer items-center gap-3 whitespace-nowrap rounded-lg border-none bg-transparent px-3 py-2.5 text-left text-label-md hover:bg-surface-container-low ${it.danger ? 'text-primary' : 'text-on-surface'}`}>
                                <Icon name={it.icon} size={20} className={it.danger ? 'text-primary' : 'text-on-surface-variant'} /> {it.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </header>

                {listingBar}

                <ChatThread
                  conv={conv}
                  messages={messages}
                  me={currentUser?.id}
                  pending={myPending}
                  otherIsTyping={otherIsTyping}
                  flashId={flashId}
                  busyId={busyId}
                  top={(
                    <div className="flex flex-col gap-2 px-3 pt-3 sm:px-4">
                      {conv.dealStatus !== 'DISCUSSING' && (
                        <p className={`m-0 flex items-center gap-2 rounded-xl p-3 text-label-md ${conv.dealStatus === 'CONCLUDED' ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>
                          {conv.dealStatus === 'CONCLUDED' ? <><Handshake size={17} className="shrink-0" /> Remise effectuée — la vente est conclue et l'annonce est marquée comme vendue.</> : <><CircleX size={17} className="shrink-0" /> Cette discussion n'a pas abouti à une vente.</>}
                        </p>
                      )}
                      <div className="flex items-start gap-2 rounded-xl bg-surface-container-high/70 p-2.5 lg:hidden">
                        <Icon name="shield" size={18} fill className="mt-0.5 shrink-0 text-tertiary" />
                        <p className="m-0 text-body-sm text-on-surface-variant"><b className="text-on-surface">Sécurité Dilchap :</b> lieu public, article vérifié, paiement à la remise uniquement.<Claim> 0 F de commission.</Claim></p>
                      </div>
                    </div>
                  )}
                  empty={!closed && (
                    <div className="m-auto max-w-md py-6 text-center">
                      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="forum" size={24} /></span>
                      <h3 className="m-0 text-headline-sm text-on-surface">Commencez la discussion</h3>
                      <p className="m-0 mb-3 mt-1 text-body-sm text-on-surface-variant">Choisissez une question ou écrivez votre message. Ne partagez jamais de code reçu par SMS.</p>
                      <div className="flex flex-col gap-2">
                        {suggestions.slice(0, 3).map(s => <button key={s} onClick={() => send(s)} className="cursor-pointer rounded-xl border border-outline-variant bg-surface-lowest px-3 py-2.5 text-left text-body-sm text-on-surface hover:border-primary">{s}</button>)}
                      </div>
                    </div>
                  )}
                  onRespondOffer={respondOffer}
                  onAnswerMeetup={answerMeetup}
                  meetupAction={m => !remisePending || !m.meetup || m.meetup.id !== handover!.meetupId ? undefined
                    : { label: conv.canManageDeal ? 'Confirmer la remise' : 'Mon code de remise', icon: 'task_alt', onClick: openRemise }}
                  footer={handover && (remiseShown
                    ? <HandoverCard h={handover} conversationId={conv.id} otherName={firstName || 'l’autre membre'} onConfirmed={() => void refresh()} onOpenDispute={remiseDispute} onHide={handover.inWindow ? undefined : () => setRemiseFor(null)} />
                    : handover.status === 'DONE' && !hasDealCard && (handover.inlineRating || handover.myReview)
                      ? <DealDoneCard h={handover} conversationId={conv.id} otherName={firstName || 'l’autre membre'} amount={agreedPrice} currency={conv.listing?.currency ?? 'XOF'} onSaved={() => void refetchConv()} />
                      : null)}
                  cardExtra={card => card.type === 'DEAL_CONCLUDED' && handover?.status === 'DONE'
                    ? <DealReview h={handover} conversationId={conv.id} otherName={firstName || 'l’autre membre'} onSaved={() => void refetchConv()} />
                    : null}
                  onReply={replyToMessage}
                  onOpenPhotos={(photos, index) => setViewer({ photos, index })}
                  onJumpTo={jumpTo}
                  onCardAction={cardAction}
                  onRetry={p => { const full = pending.find(x => x.id === p.id); if (full) deliver(full) }}
                  onDiscard={id => setPending(list => list.filter(x => x.id !== id))}
                />

                {/* Closed conversation: no composer. */}
                {closed ? (
                  <div className="shrink-0 bg-surface-lowest px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
                    <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${conv.closedReason === 'DEAL_CONCLUDED' ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          <Icon name={conv.closedReason === 'DEAL_CONCLUDED' ? 'handshake' : 'lock'} size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-label-lg text-on-surface">Discussion fermée</div>
                          <div className="text-body-sm text-on-surface-variant">
                            {conv.closedReason === 'DEAL_CONCLUDED'
                              ? 'La vente est conclue : plus aucun message ni offre n’est possible, pour votre sécurité.'
                              : 'Fermée faute d’activité. Vous pouvez la relancer si l’article vous intéresse toujours.'}
                          </div>
                        </div>
                      </div>
                      {conv.closedReason === 'INACTIVE' && (
                        <button onClick={reopen} disabled={reopening} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white disabled:opacity-60">
                          <Icon name="refresh" size={18} /> {reopening ? 'Un instant…' : 'Relancer la discussion'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="shrink-0 bg-surface-lowest px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] sm:px-4">
                    {!!conv.safetyAlerts?.length && (
                      <div className="mb-2"><SafetyBanners alerts={conv.safetyAlerts} conversationId={conv.id} otherId={other?.id} onDone={() => void refetchConv()} /></div>
                    )}
                    {conv.closesAt && (
                      <p className="m-0 mb-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-body-sm text-amber-900">
                        <Icon name="schedule" size={18} className="mt-0.5 shrink-0" />
                        <span>Sans nouveau message, cette discussion sera fermée le <b>{new Date(conv.closesAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</b>. Écrivez pour la garder ouverte.</span>
                      </p>
                    )}

                    {offerOpen && (
                      <div className="chat-in mb-2 rounded-2xl border border-solid border-outline-variant p-3">
                        <div className="mb-1 flex items-center gap-1.5 text-label-md text-on-surface"><Icon name="sell" size={16} className="text-primary" /> Votre offre ({conv.listing?.currency === 'XOF' || !conv.listing ? 'F' : conv.listing.currency})</div>
                        <PriceSuggestionHint listingId={conv.listingId} onUseAmount={a => setOfferAmount(String(a))} />
                        <input className="input" inputMode="numeric" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} placeholder="Ex : 130 000" aria-label="Montant de votre offre" />
                        {offerError && <p className="m-0 mt-1.5 text-body-sm text-primary">{offerError}</p>}
                        <div className="mt-2 flex gap-2">
                          <button disabled={sendingOffer} onClick={submitOffer} className="flex-1 cursor-pointer rounded-lg border-none bg-primary py-2 text-label-md text-white">{sendingOffer ? 'Envoi…' : "Envoyer l'offre"}</button>
                          <button onClick={() => setOfferOpen(false)} aria-label="Fermer" className="cursor-pointer rounded-lg border-none bg-surface-container px-3"><X size={16} /></button>
                        </div>
                      </div>
                    )}

                    {(chips.length > 0 || (messages.length > 0 && discussing)) && (
                      <div className="-mx-3 mb-2 flex items-center gap-1.5 overflow-x-auto px-3 [scrollbar-width:none] sm:-mx-4 sm:px-4">
                        {chips.map(c => (
                          <button key={c.key} type="button" onClick={c.onClick} className={`flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border border-solid px-3 py-1.5 text-label-sm font-semibold ${c.accent ? 'border-primary/30 bg-primary-fixed/50 text-primary' : 'border-outline-variant bg-surface-lowest text-on-surface hover:bg-surface-container-low'}`}>
                            <Icon name={c.icon} size={15} /> {c.label}
                          </button>
                        ))}
                        {messages.length > 0 && discussing && suggestions.map(s => <button key={s} onClick={() => suggest(s)} className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border-none bg-surface-container px-3 py-1.5 text-label-sm text-on-surface hover:bg-surface-container-high">{s}</button>)}
                      </div>
                    )}

                    <ChatComposer
                      ref={inputRef}
                      value={msg}
                      onChange={text => { setMsg(text); saveDraft(text) }}
                      onTyping={notifyTyping}
                      onSend={sendFromComposer}
                      replyTo={replyTo}
                      onCancelReply={() => setReplyTo(null)}
                      placeholder={`Écrivez à ${firstName}…`}
                    />
                  </div>
                )}
              </>
            )}
            {desktopAssistant}
          </section>

          {/* Right panel: Aide Dilchap when open, else the recap */}
          {conv && isWide && assistantOpen && (
            <aside className="chat-drawer flex w-[360px] shrink-0 flex-col border-0 border-l border-solid border-outline-variant bg-surface" aria-label="Aide Dilchap">{assistantColumn}</aside>
          )}
          {conv && other && !(isWide && assistantOpen) && (
            <aside className="hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto border-0 border-l border-solid border-outline-variant bg-surface p-3 xl:flex">
              <div className="rounded-2xl bg-surface-lowest p-4">
                <div className="flex items-center gap-3">
                  <Avatar url={other.avatarUrl} name={other.fullName} size={52} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-headline-sm text-on-surface"><span className="truncate">{other.fullName}</span><SellerBadge tier={other.badge} size={17} /></div>
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
                    <Claim><div className="flex justify-between"><dt className="flex items-center gap-1 text-tertiary">Commission Dilchap <Info size={13} /></dt><dd className="m-0 font-bold text-tertiary">0 F (0%)</dd></div>
                    <div className="flex justify-between"><dt className="text-on-surface-variant">Frais de réservation</dt><dd className="m-0 text-on-surface">0 F</dd></div></Claim>
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
                <button disabled={reported} onClick={() => setConfirming('REPORT')} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-transparent py-2 text-label-md text-on-surface hover:bg-primary-fixed/40 disabled:cursor-default disabled:text-tertiary">
                  {reported ? <><CheckCircle2 size={15} /> Signalement envoyé</> : <><Flag size={15} /> Signaler une tentative d'arnaque</>}
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>
      {viewer && <ImageLightbox images={viewer.photos} start={viewer.index} alt={`Photos de ${other?.fullName ?? 'la discussion'}`} onClose={() => setViewer(null)} />}
      {meetup.loaded && activeId && (
        <Suspense fallback={null}>
          <MeetupSheet open={meetup.open} onClose={() => setMeetup(m => ({ ...m, open: false }))} onSent={() => void refresh()} conversationId={activeId} otherName={firstName || 'l’autre membre'} listing={conv?.listing} prefill={meetup.prefill} />
        </Suspense>
      )}
      {isPhone && assistantLoaded && activeId && (
        <BottomSheet open={assistantOpen} onClose={() => setAssistantOpen(false)} title="Aide Dilchap" maxHeight="88dvh">
          <Suspense fallback={<div className="chat-skeleton h-40 rounded-2xl" />}>
            <AssistantPanel asSheet conversationId={activeId} isBuyer={!conv?.canManageDeal} canOffer={canNegotiate} onUse={applyAssistant} onClose={() => setAssistantOpen(false)} />
          </Suspense>
        </BottomSheet>
      )}
      <ConfirmSheet
        open={!!confirming}
        title={confirming === 'REPORT' ? 'Signaler une tentative d’arnaque' : confirming === 'CONCLUDED' ? 'Confirmer la remise ?' : 'Discussion non conclue ?'}
        confirmLabel={confirming === 'REPORT' ? 'Signaler' : 'Confirmer'}
        loading={closingDeal}
        tone={confirming === 'REPORT' ? 'danger' : 'primary'}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming === 'REPORT' ? reportScam() : confirming && closeDeal(confirming)}
      >
        {confirming === 'REPORT' ? `Signaler ${other?.fullName ?? 'ce membre'} à l’équipe Dilchap ? La conversation sera jointe au signalement.`
          : confirming === 'CONCLUDED' ? ((conv?.listing?.quantity ?? 1) > 1
            ? <>
              La remise est enregistrée maintenant et la discussion sera fermée. Les exemplaires vendus sont retirés du stock ({conv!.listing!.quantity} disponibles).
              <span className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-3">
                <span className="text-label-md text-on-surface">Exemplaires vendus</span>
                <span className="flex items-center gap-1">
                  <button type="button" aria-label="Un de moins" disabled={soldQty <= 1} onClick={() => setSoldQty(q => Math.max(1, q - 1))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest text-on-surface disabled:opacity-40"><Icon name="remove" size={17} /></button>
                  <span className="w-8 text-center text-label-lg text-on-surface">{soldQty}</span>
                  <button type="button" aria-label="Un de plus" disabled={soldQty >= conv!.listing!.quantity!} onClick={() => setSoldQty(q => Math.min(conv!.listing!.quantity!, q + 1))} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-lowest text-on-surface disabled:opacity-40"><Icon name="add" size={17} /></button>
                </span>
              </span>
            </>
            : 'La remise est enregistrée maintenant : l’annonce passe en vendue et la discussion sera fermée. Si vous êtes avec l’acheteur, préférez son code de remise.') : 'Cette discussion sera marquée comme n’ayant pas abouti.'}
      </ConfirmSheet>
    </AccountLayout>
  )
}
