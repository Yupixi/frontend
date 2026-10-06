import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import Icon from '../Icon'
import SafeImg from '../SafeImg'
import ChatBubble from '../ChatBubble'
import OfferBubble from '../OfferBubble'
import { MeetupCard, SystemCard } from './ChatCards'
import { dateFormat } from '../../lib/intl'
import { messagePreview, type RemoteConversation, type RemoteMessage, type SystemCard as Card } from '../../graphql/messaging'

// A message being sent (shown at once, retried on failure).
export type PendingMessage = { id: string; body: string; attachments: string[]; audio: boolean; status: 'sending' | 'failed'; error?: string }

const GROUP_MS = 5 * 60_000
const time = (iso: string) => dateFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const day = same(d, today) ? 'Aujourd’hui' : same(d, yesterday) ? 'Hier' : dateFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}`
}
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Avatar({ url, name, size = 40 }: { url?: string | null; name: string; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high font-bold text-on-surface-variant" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>
      {url ? <SafeImg src={url} alt={name} icon="person" iconSize={Math.round(size / 2)} fallbackClassName="flex h-full w-full items-center justify-center" /> : name.charAt(0).toUpperCase()}
    </span>
  )
}

export function ThreadSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 px-4 py-6" aria-busy="true" aria-label="Chargement de la discussion">
      {[['w-40', false], ['w-56', true], ['w-32', false], ['w-64', true], ['w-44', false]].map(([w, mine], i) => (
        <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`chat-skeleton h-10 rounded-2xl ${w}`} /></div>
      ))}
    </div>
  )
}

// The conversation's messages: day separators, bubbles grouped by sender
// and time, offer / meet-up / Dilchap cards, read state, the optimistic
// messages, the typing indicator; auto-scroll that respects a member
// reading older messages (« nouveaux messages » pill), and a polite live
// region for incoming messages.
export default function ChatThread({ conv, messages, me, pending, otherIsTyping, top, empty, flashId, busyId, onRespondOffer, onAnswerMeetup, meetupAction, onReply, onOpenPhotos, onJumpTo, onCardAction, onRetry, onDiscard }: {
  conv: RemoteConversation
  messages: RemoteMessage[]
  me?: string
  pending: PendingMessage[]
  otherIsTyping: boolean
  top?: ReactNode
  empty?: ReactNode
  flashId: string | null
  busyId: string | null
  onRespondOffer: (offerId: string, accept: boolean) => void
  onAnswerMeetup: (meetupId: string, confirm: boolean) => void
  meetupAction: (m: RemoteMessage) => { label: string; icon: string; onClick: () => void } | undefined
  onReply: (m: RemoteMessage) => void
  onOpenPhotos: (photos: string[], index: number) => void
  onJumpTo: (id: string) => void
  onCardAction: (card: Card, m: RemoteMessage) => void
  onRetry: (p: PendingMessage) => void
  onDiscard: (id: string) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const seen = useRef<{ conv: string; count: number; lastId?: string }>({ conv: '', count: 0 })
  const [unseen, setUnseen] = useState(0)
  const [announce, setAnnounce] = useState('')
  const other = conv.otherParticipant
  const firstName = other.fullName.split(' ')[0]
  const currency = conv.listing?.currency ?? 'XOF'

  const toBottom = (smooth: boolean) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduced() ? 'smooth' : 'auto' })
    setUnseen(0)
  }
  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96
    if (atBottom.current && unseen) setUnseen(0)
  }

  // A new conversation opens at its last message.
  useLayoutEffect(() => {
    if (seen.current.conv === conv.id) return
    seen.current = { conv: conv.id, count: messages.length, lastId: messages[messages.length - 1]?.id }
    atBottom.current = true
    setUnseen(0)
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conv.id, messages])

  // New messages: follow them when the member is at the bottom (or wrote
  // them), else count them on the pill.
  useEffect(() => {
    const s = seen.current
    if (s.conv !== conv.id) return
    const last = messages[messages.length - 1]
    if (!last || last.id === s.lastId) return
    const fresh = messages.slice(s.count)
    s.count = messages.length
    s.lastId = last.id
    const incoming = fresh.filter(m => m.senderId !== me && m.kind !== 'SYSTEM')
    if (incoming.length) setAnnounce(`Nouveau message de ${firstName} : ${messagePreview(incoming[incoming.length - 1]).slice(0, 120)}`)
    if (atBottom.current || last.senderId === me) requestAnimationFrame(() => toBottom(true))
    else setUnseen(n => n + Math.max(1, incoming.length))
  }, [messages, conv.id, me]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pending.length || otherIsTyping) { if (atBottom.current) requestAnimationFrame(() => toBottom(true)) } }, [pending.length, otherIsTyping]) // eslint-disable-line react-hooks/exhaustive-deps

  const lastMine = [...messages].reverse().find(m => m.senderId === me && m.kind !== 'SYSTEM')

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scroller} onScroll={onScroll} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain" role="log" aria-label={`Discussion avec ${other.fullName}`}>
        {top}
        <div className="flex flex-1 flex-col px-3 pb-3 pt-2 sm:px-4">
          {messages.length === 0 && !pending.length && empty}
          {messages.map((m, i) => {
            const mine = m.senderId === me
            const prev = messages[i - 1]
            const next = messages[i + 1]
            const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
            const sys = m.kind === 'SYSTEM' && m.system
            const plain = !sys && !m.offer && !m.meetup
            const joinsPrev = !newDay && plain && !!prev && prev.senderId === m.senderId && prev.kind !== 'SYSTEM' && !prev.offer && !prev.meetup && Date.parse(m.createdAt) - Date.parse(prev.createdAt) < GROUP_MS
            const joinsNext = plain && !!next && next.senderId === m.senderId && next.kind !== 'SYSTEM' && !next.offer && !next.meetup && new Date(next.createdAt).toDateString() === new Date(m.createdAt).toDateString() && Date.parse(next.createdAt) - Date.parse(m.createdAt) < GROUP_MS
            const milestone = m.offer?.status === 'ACCEPTED'
            return (
              <div key={m.id} id={`msg-${m.id}`} className={`chat-in scroll-mt-24 rounded-2xl transition-colors duration-500 ${flashId === m.id ? 'bg-primary-fixed/50' : ''} ${joinsPrev ? 'mt-0.5' : 'mt-3'}`}>
                {newDay && <div className="mb-3 flex justify-center"><span className="rounded-full bg-surface-container/95 px-3 py-1 text-label-sm text-on-surface-variant shadow-sm">{dayLabel(m.createdAt)}</span></div>}
                {sys ? (
                  <SystemCard card={sys} currency={currency} onAction={sys.cta && !(sys.cta === 'REPORT' && mine) ? () => onCardAction(sys, m) : undefined} />
                ) : (
                  <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                    {!mine && !milestone && (joinsNext ? <span className="w-7 shrink-0" /> : <Avatar url={m.sender.avatarUrl} name={m.sender.fullName} size={28} />)}
                    <div className={`flex min-w-0 flex-col ${milestone ? 'w-full' : 'max-w-[85%] sm:max-w-[75%]'} ${mine ? 'items-end' : 'items-start'}`}>
                      {m.offer ? (
                        <OfferBubble offer={m.offer} currency={currency} isMine={mine} canRespond={!mine && conv.canManageDeal} responding={busyId === m.offer.id} onAccept={() => onRespondOffer(m.offer!.id, true)} onReject={() => onRespondOffer(m.offer!.id, false)} listingId={conv.listingId} acceptedBy={mine ? firstName : undefined} />
                      ) : m.meetup ? (
                        <MeetupCard meetup={m.meetup} mine={mine} busy={busyId === m.meetup.id} onConfirm={() => onAnswerMeetup(m.meetup!.id, true)} onChange={() => onAnswerMeetup(m.meetup!.id, false)} action={meetupAction(m)} />
                      ) : (
                        <ChatBubble message={m} mine={mine} grouped={{ top: joinsPrev, bottom: joinsNext }} quoteAuthor={id => (id === me ? 'Vous' : firstName)} onReply={() => onReply(m)} onOpenPhotos={onOpenPhotos} onJumpTo={onJumpTo} />
                      )}
                      {!joinsNext && (
                        <span className={`mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant ${mine ? 'mr-1' : 'ml-1'}`}>
                          {time(m.createdAt)}
                          {mine && <Icon name="done_all" size={14} className={m.readAt ? 'text-primary' : 'text-outline'} />}
                          {mine && m.id === lastMine?.id && <span className={m.readAt ? 'text-primary' : ''}>{m.readAt ? 'Vu' : 'Envoyé'}</span>}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {pending.map(p => (
            <div key={p.id} className="chat-in mt-3 flex justify-end">
              <div className="flex max-w-[85%] flex-col items-end sm:max-w-[75%]">
                <div className={`whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-body-md text-white shadow-sm ${p.status === 'failed' ? 'bg-primary/60' : 'bg-primary/80'}`}>
                  {p.body || (p.audio ? 'Message vocal' : `${p.attachments.length} photo${p.attachments.length > 1 ? 's' : ''}`)}
                </div>
                {p.status === 'sending' ? (
                  <span className="mr-1 mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant"><Icon name="schedule" size={13} /> Envoi…</span>
                ) : (
                  <span className="mr-1 mt-1 flex flex-wrap items-center justify-end gap-x-2 text-[11px] text-primary" role="alert">
                    <span className="flex items-center gap-1"><Icon name="error" size={13} /> {p.error ?? 'Non envoyé'}</span>
                    <button type="button" onClick={() => onRetry(p)} className="cursor-pointer border-none bg-transparent p-0 text-[11px] font-bold text-primary underline">Réessayer</button>
                    <button type="button" onClick={() => onDiscard(p.id)} className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-on-surface-variant underline">Supprimer</button>
                  </span>
                )}
              </div>
            </div>
          ))}
          {otherIsTyping && (
            <div className="chat-in mt-3 flex items-end gap-2" aria-hidden>
              <Avatar url={other.avatarUrl} name={other.fullName} size={28} />
              <span className="rounded-2xl rounded-bl-sm bg-surface-lowest px-3.5 py-3 shadow-sm"><span className="typing-dots"><i /><i /><i /></span></span>
            </div>
          )}
        </div>
      </div>
      {unseen > 0 && (
        <button type="button" onClick={() => toBottom(true)} className="chat-in absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full border-none bg-on-surface px-3.5 py-2 text-label-sm font-semibold text-surface shadow-lg">
          <Icon name="arrow_downward" size={15} /> {unseen > 1 ? `${unseen} nouveaux messages` : 'Nouveau message'}
        </button>
      )}
      <p className="sr-only" aria-live="polite">{announce}</p>
    </div>
  )
}
