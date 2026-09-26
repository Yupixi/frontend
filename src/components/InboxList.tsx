import { useMemo, useState } from 'react'
import Icon from './Icon'
import Price from './Price'
import SafeImg from './SafeImg'
import EmptyState from './EmptyState'
import { formatRelativeDate } from '../lib/format'
import { thumbnailUrl } from '../lib/media'
import { formatSeconds } from './VoiceMessage'
import type { RemoteConversation } from '../graphql/messaging'

type Filter = 'all' | 'unread' | 'buy' | 'sell'
type View = 'threads' | 'listings'

const VIEW_KEY = 'dilchap_inbox_view'
const COLLAPSED_KEY = 'dilchap_inbox_collapsed'
const read = <T,>(key: string, fallback: T): T => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback } catch { return fallback } }
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ } }

type Props = {
  conversations: RemoteConversation[]
  activeId: string | null
  currentUserId?: string
  onOpen: (id: string) => void
  onExplore: () => void
}

// What the last message was about, with its icon ("Vous : " when sent by me).
function preview(c: RemoteConversation, me?: string): { icon?: string; text: string } {
  const m = c.lastMessage
  if (!m) return { icon: 'waving_hand', text: 'Démarrez la discussion' }
  const who = m.senderId === me ? 'Vous : ' : ''
  if (m.audioUrl) return { icon: 'mic', text: `${who}Message vocal${m.audioDuration ? ` (${formatSeconds(m.audioDuration)})` : ''}` }
  if (m.offer) return { icon: 'sell', text: `${who}Offre de ${m.offer.amount.toLocaleString('fr-FR')} F` }
  if (m.meetup) return { icon: 'event', text: `${who}Rendez-vous : ${m.meetup.place}` }
  if (!m.body && m.attachments?.length) return { icon: 'photo_camera', text: `${who}${m.attachments.length > 1 ? `${m.attachments.length} photos` : 'Photo'}` }
  return { icon: m.attachments?.length ? 'photo_camera' : undefined, text: `${who}${m.body}` }
}

function Avatar({ c, size }: { c: RemoteConversation; size: number }) {
  const p = c.otherParticipant
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed font-bold text-primary" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>
      {p.avatarUrl ? <SafeImg src={p.avatarUrl} alt={p.fullName} icon="person" iconSize={Math.round(size / 2)} /> : p.fullName.charAt(0).toUpperCase()}
    </span>
  )
}

const DealChip = ({ c }: { c: RemoteConversation }) => c.dealStatus === 'DISCUSSING' ? null : (
  <span className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold ${c.dealStatus === 'CONCLUDED' ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>{c.dealStatus === 'CONCLUDED' ? 'Conclu' : 'Non conclu'}</span>
)

function PreviewLine({ c, me }: { c: RemoteConversation; me?: string }) {
  const p = preview(c, me)
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {p.icon && <Icon name={p.icon} size={15} className={`shrink-0 ${c.unreadCount ? 'text-primary' : 'text-outline'}`} />}
      <span className={`min-w-0 flex-1 truncate text-body-sm ${c.unreadCount ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>{p.text}</span>
      <DealChip c={c} />
      {c.unreadCount > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{c.unreadCount}</span>}
    </span>
  )
}

// Inbox: filters, search, and two views the member picks (remembered):
// one row per discussion, or discussions grouped under each listing.
export default function InboxList({ conversations, activeId, currentUserId, onOpen, onExplore }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [view, setView] = useState<View>(() => read<View>(VIEW_KEY, 'threads'))
  const [collapsed, setCollapsed] = useState<string[]>(() => read<string[]>(COLLAPSED_KEY, []))

  const pickView = (v: View) => { setView(v); save(VIEW_KEY, v) }
  const toggleGroup = (key: string) => setCollapsed(prev => {
    const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    save(COLLAPSED_KEY, next)
    return next
  })

  const unread = conversations.reduce((n, c) => n + c.unreadCount, 0)
  const counts: Record<Filter, number> = {
    all: conversations.length,
    unread: conversations.filter(c => c.unreadCount > 0).length,
    buy: conversations.filter(c => !c.canManageDeal).length,
    sell: conversations.filter(c => c.canManageDeal).length,
  }
  const needle = q.trim().toLowerCase()
  const shown = conversations
    .filter(c => filter === 'all' || (filter === 'unread' ? c.unreadCount > 0 : (filter === 'sell') === c.canManageDeal))
    .filter(c => !needle || `${c.otherParticipant.fullName} ${c.listing?.title ?? ''} ${c.lastMessage?.body ?? ''}`.toLowerCase().includes(needle))

  // Listing groups keep the inbox order (latest activity first).
  const groups = useMemo(() => {
    const map = new Map<string, RemoteConversation[]>()
    for (const c of shown) {
      const key = c.listing?.id ?? 'none'
      map.set(key, [...(map.get(key) ?? []), c])
    }
    return [...map.entries()].map(([key, items]) => ({ key, items, listing: items[0].listing, unread: items.reduce((n, c) => n + c.unreadCount, 0) }))
  }, [shown])

  const chip = (k: Filter, label: string) => (
    <button key={k} onClick={() => setFilter(k)} className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-full border-none px-3 py-1.5 text-label-md transition-colors ${filter === k ? 'bg-on-surface text-surface' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
      {label}{counts[k] > 0 && <span className={`text-label-sm ${filter === k ? 'opacity-80' : 'text-outline'}`}>{counts[k]}</span>}
    </button>
  )

  const row = (c: RemoteConversation) => {
    const active = c.id === activeId
    return (
      <button key={c.id} onClick={() => onOpen(c.id)} className={`group flex w-full cursor-pointer items-center gap-3 rounded-2xl border-none px-2.5 py-2.5 text-left transition-colors ${active ? 'bg-primary-fixed/40' : c.unreadCount ? 'bg-primary-fixed/10 hover:bg-surface-container-low' : 'bg-transparent hover:bg-surface-container-low'}`}>
        {/* Listing thumbnail with the contact's photo as a badge */}
        <span className="relative shrink-0">
          <span className="block h-14 w-14 overflow-hidden rounded-xl bg-surface-container">
            {c.listing?.coverImageUrl ? <SafeImg src={thumbnailUrl(c.listing.coverImageUrl)} alt={c.listing.title} icon="sell" /> : <span className="flex h-full w-full items-center justify-center text-outline"><Icon name={c.listing ? 'sell' : 'forum'} size={24} /></span>}
          </span>
          <span className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-surface-lowest"><Avatar c={c} size={26} /></span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`min-w-0 flex-1 truncate text-label-lg text-on-surface ${c.unreadCount ? 'font-extrabold' : ''}`}>{c.otherParticipant.fullName}</span>
            <span className={`shrink-0 text-[11px] ${c.unreadCount ? 'font-bold text-primary' : 'text-outline'}`}>{c.lastMessageAt ? formatRelativeDate(c.lastMessageAt) : ''}</span>
          </span>
          {c.listing && (
            <span className="flex min-w-0 items-center gap-1.5 text-body-sm">
              <span className={`shrink-0 rounded px-1 text-[10px] font-bold ${c.canManageDeal ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface-variant'}`}>{c.canManageDeal ? 'Vente' : 'Achat'}</span>
              <span className="min-w-0 truncate text-on-surface-variant">{c.listing.title}</span>
              <span className="shrink-0 font-semibold text-on-surface"><Price amount={c.listing.price} currency={c.listing.currency} /></span>
            </span>
          )}
          <PreviewLine c={c} me={currentUserId} />
        </span>
      </button>
    )
  }

  return (
    <>
      <div className="border-0 border-b border-solid border-outline-variant px-3 pb-2 pt-3">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h1 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface">
            Messages {unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-label-sm text-white">{unread}</span>}
          </h1>
          {/* View picker (remembered) */}
          <div role="radiogroup" aria-label="Affichage" className="flex rounded-full bg-surface-container-low p-0.5">
            {([['threads', 'forum', 'Liste', 'Une ligne par discussion'], ['listings', 'storefront', 'Annonces', 'Regrouper par annonce']] as const).map(([v, icon, label, hint]) => (
              <button key={v} role="radio" aria-checked={view === v} title={hint} onClick={() => pickView(v)} className={`flex cursor-pointer items-center gap-1 rounded-full border-none px-2.5 py-1 text-label-sm transition-colors ${view === v ? 'bg-surface-lowest text-on-surface shadow-sm' : 'bg-transparent text-on-surface-variant'}`}>
                <Icon name={icon} size={16} /> {label}
              </button>
            ))}
          </div>
        </div>
        <label className="mb-2 flex items-center gap-2 rounded-full bg-surface-container-low px-3.5 py-2 focus-within:bg-surface-container">
          <Icon name="search" size={18} className="text-outline" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Contact, annonce, message…" className="w-full border-none bg-transparent text-body-sm text-on-surface outline-none" />
          {q && <button onClick={() => setQ('')} aria-label="Effacer" className="flex cursor-pointer border-none bg-transparent p-0 text-outline"><Icon name="close" size={16} /></button>}
        </label>
        <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
          {chip('all', 'Toutes')}{chip('unread', 'Non lues')}{chip('buy', 'Achats')}{chip('sell', 'Ventes')}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1.5 py-2">
        {shown.length === 0 && (conversations.length === 0
          ? <EmptyState className="m-2" icon="empty-messages" fallback="chat" title="Aucune conversation" text="Contactez un vendeur depuis une annonce pour démarrer." action={{ label: 'Explorer les annonces', onClick: onExplore }} />
          : <p className="m-0 px-4 py-10 text-center text-body-sm text-on-surface-variant">Aucune conversation ne correspond.</p>)}

        {view === 'threads' ? (
          <div className="flex flex-col gap-0.5">{shown.map(row)}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map(g => {
              const open = !collapsed.includes(g.key)
              return (
                <section key={g.key} className="overflow-hidden rounded-2xl border border-solid border-outline-variant/60 bg-surface-lowest">
                  <button onClick={() => toggleGroup(g.key)} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-3 border-none bg-surface-container-low/60 px-3 py-2.5 text-left hover:bg-surface-container-low">
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-container">
                      {g.listing?.coverImageUrl ? <SafeImg src={thumbnailUrl(g.listing.coverImageUrl)} alt={g.listing.title} icon="sell" /> : <span className="flex h-full w-full items-center justify-center text-outline"><Icon name="forum" size={22} /></span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label-lg text-on-surface">{g.listing?.title ?? 'Sans annonce'}</span>
                      <span className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                        {g.listing && <span className="font-semibold text-primary"><Price amount={g.listing.price} currency={g.listing.currency} /></span>}
                        <span>{g.items.length} discussion{g.items.length > 1 ? 's' : ''}</span>
                      </span>
                    </span>
                    {g.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{g.unread}</span>}
                    <Icon name="expand_more" size={22} className={`shrink-0 text-outline transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="flex flex-col gap-0.5 p-1">
                      {g.items.map(c => (
                        <button key={c.id} onClick={() => onOpen(c.id)} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-none px-2.5 py-2 text-left transition-colors ${c.id === activeId ? 'bg-primary-fixed/40' : 'bg-transparent hover:bg-surface-container-low'}`}>
                          <Avatar c={c} size={38} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className={`min-w-0 flex-1 truncate text-label-md text-on-surface ${c.unreadCount ? 'font-extrabold' : ''}`}>{c.otherParticipant.fullName}</span>
                              <span className={`shrink-0 text-[11px] ${c.unreadCount ? 'font-bold text-primary' : 'text-outline'}`}>{c.lastMessageAt ? formatRelativeDate(c.lastMessageAt) : ''}</span>
                            </span>
                            <PreviewLine c={c} me={currentUserId} />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
