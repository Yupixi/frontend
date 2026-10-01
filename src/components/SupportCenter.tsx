import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useSubscription } from '@apollo/client/react'
import Icon from './Icon'
import ChatComposer from './ChatComposer'
import ImageLightbox from './ImageLightbox'
import SellerBadge from './SellerBadge'
import { thumbnailUrl } from '../lib/media'
import { delayText, useRules } from '../lib/rules'
import { useMemberCountryCode } from '../lib/countries'
import type { AuthUser } from '../graphql/auth'
import {
  ATTACH_SUPPORT_OBJECTS_MUTATION, CATEGORY_LABEL, CLOSE_SUPPORT_TICKET_MUTATION, CREATE_SUPPORT_TICKET_MUTATION, IMPORTANCE_CHOICES, IMPORTANCE_LABEL,
  MARK_SUPPORT_READ_MUTATION, MY_SUPPORT_ATTACHABLE_QUERY, MY_SUPPORT_TICKETS_QUERY, MY_SUPPORT_UNREAD_QUERY, REPLY_SUPPORT_TICKET_MUTATION, SUPPORT_CATEGORIES,
  SUPPORT_ASSISTANT_QUERY, SUPPORT_TICKET_UPDATED_SUBSCRIPTION,
  type AssistantState, type SupportCategory, type SupportImportance, type SupportObjectCard as ObjectCard, type SupportObjectKind, type SupportTicket,
} from '../graphql/support'
import type { SupportAbout } from '../lib/navigation'
import { SupportAttachPicker, SupportObjectCard } from './SupportObjects'
import SupportAssistant from './SupportAssistant'

// 'new': the assistant when it is on, else the form; 'agent': the form.
type View = { kind: 'list' } | { kind: 'new' } | { kind: 'agent' } | { kind: 'thread'; id: string }

const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const STATUS: Record<SupportTicket['status'], [string, string]> = {
  OPEN: ['bg-amber-100 text-amber-800', 'En attente'],
  ANSWERED: ['bg-verified-soft text-verified', 'Répondu'],
  RESOLVED: ['bg-tertiary-soft text-tertiary', 'Résolu'],
}
// The account-access category is for the logged-out recovery form.
const TOPICS = SUPPORT_CATEGORIES.filter(([k]) => k !== 'ACCOUNT_RECOVERY')
const REFETCH = [{ query: MY_SUPPORT_TICKETS_QUERY }, { query: MY_SUPPORT_UNREAD_QUERY }]

type Props = {
  currentUser?: AuthUser | null
  // Opened from a notification ("Réponse du support").
  focusTicketId?: string | null
  // In the « Support » tab: closes it (the header's X).
  onClose?: () => void
  // « Contacter le support à propos de… »: a new conversation with this
  // object of the member attached (nonce: a new request each time).
  about?: (SupportAbout & { nonce: number }) | null
}

// Conversations with the Dilchap team, chat-style: one conversation = one
// ticket in the BO (priority from the badge, importance picked here,
// status). Used by the floating « Support » tab and the "Aide & support"
// account page.
export default function SupportCenter({ currentUser, focusTicketId, onClose, about }: Props) {
  const { data, refetch } = useQuery<{ mySupportTickets: SupportTicket[] }>(MY_SUPPORT_TICKETS_QUERY, { fetchPolicy: 'cache-and-network' })
  // Staff replies arrive live.
  useSubscription(SUPPORT_TICKET_UPDATED_SUBSCRIPTION, { onData: () => void refetch() })
  const tickets = data?.mySupportTickets
  // « L'assistant Dilchap » answers first when it is on for the member's
  // country (an API without it, or an error: tickets only, as before).
  const { data: assistantData } = useQuery<{ supportAssistant: AssistantState }>(SUPPORT_ASSISTANT_QUERY, { fetchPolicy: 'cache-and-network', errorPolicy: 'ignore' })
  const assistant = assistantData?.supportAssistant?.enabled ? assistantData.supportAssistant : null
  const [view, setView] = useState<View | null>(focusTicketId ? { kind: 'thread', id: focusTicketId } : null)
  useEffect(() => { if (focusTicketId) setView({ kind: 'thread', id: focusTicketId }) }, [focusTicketId])
  useEffect(() => { if (about) setView({ kind: 'new' }) }, [about])
  // First visit: straight to a new conversation (kept when the assistant
  // hands it over and the first ticket appears).
  useEffect(() => { if (!view && tickets && !tickets.length) setView({ kind: 'new' }) }, [view, tickets])
  const shown: View = view ?? (tickets && !tickets.length ? { kind: 'new' } : { kind: 'list' })

  const badge = currentUser?.badge ?? null
  const rules = useRules(useMemberCountryCode())
  const hours = badge === 'CERTIFIED' ? rules.SUPPORT_SLA_URGENT_HOURS : badge ? rules.SUPPORT_SLA_HIGH_HOURS : rules.SUPPORT_SLA_NORMAL_HOURS
  const sla = (
    <span className="flex flex-wrap items-center gap-1.5 text-body-sm text-on-surface-variant">
      <Icon name="schedule" size={15} /> Réponse en {delayText(hours)}
      {badge && <SellerBadge tier={badge} variant="pill" short />}
    </span>
  )

  const header = (title: React.ReactNode, sub: React.ReactNode, back?: () => void, extra?: React.ReactNode) => (
    <div className="flex shrink-0 items-start gap-2 border-0 border-b border-solid border-outline-variant/60 px-4 py-3">
      {back && <button type="button" onClick={back} aria-label="Retour aux conversations" className="-ml-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-on-surface hover:bg-surface-container"><Icon name="arrow_back" size={21} /></button>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-label-lg text-on-surface">{title}</div>
        <div className="mt-0.5">{sub}</div>
      </div>
      {extra}
      {onClose && <button type="button" onClick={onClose} aria-label="Fermer le support" className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface-variant hover:text-on-surface"><Icon name="close" size={19} /></button>}
    </div>
  )

  if (shown.kind === 'thread') {
    const t = tickets?.find(x => x.id === shown.id)
    return <Thread key={shown.id} ticket={t} loading={!tickets} header={header} onBack={() => setView({ kind: 'list' })} onChanged={() => void refetch()} />
  }
  const toList = tickets?.length ? () => setView({ kind: 'list' }) : undefined
  if (shown.kind === 'new' && assistant)
    return (
      <SupportAssistant
        key={about?.nonce ?? 0}
        header={header}
        welcomeMessage={assistant.welcomeMessage}
        suggestions={assistant.suggestions}
        remainingToday={assistant.remainingToday}
        conversation={assistant.conversation}
        firstName={currentUser?.fullName?.split(' ')[0]}
        about={about ?? null}
        onBack={toList}
        onAgentForm={() => setView({ kind: 'agent' })}
        onOpenTicket={id => { void refetch(); setView({ kind: 'thread', id }) }}
      />
    )
  if (shown.kind === 'new' || shown.kind === 'agent')
    return <NewConversation key={about?.nonce ?? 0} about={about ?? null} header={header(<span className="flex items-center gap-1.5"><Icon name="support_agent" size={20} className="text-primary" /> {assistant ? 'Écrire à un agent' : 'Nouvelle conversation'}</span>, sla, assistant ? () => setView({ kind: 'new' }) : toList)} firstName={currentUser?.fullName?.split(' ')[0]} onCreated={id => { void refetch(); setView({ kind: 'thread', id }) }} />

  const list = tickets ?? []
  return (
    <div className="flex h-full min-h-0 flex-col">
      {header(<span className="flex items-center gap-1.5"><Icon name="support_agent" size={20} className="text-primary" /> Support Dilchap</span>, sla)}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <button type="button" onClick={() => setView({ kind: 'new' })} className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white shadow-sm hover:bg-primary-dark">
          <Icon name={assistant ? 'auto_awesome' : 'edit_square'} size={19} /> {assistant?.conversation ? 'Reprendre avec l’assistant' : 'Nouvelle conversation'}
        </button>
        {!tickets && <p className="m-0 mt-6 text-center text-body-sm text-on-surface-variant">Chargement…</p>}
        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          {list.map(t => {
            const last = t.messages[t.messages.length - 1]
            const [cls, label] = STATUS[t.status]
            return (
              <li key={t.id}>
                <button type="button" onClick={() => setView({ kind: 'thread', id: t.id })} className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border border-solid p-3 text-left ${t.unread ? 'border-primary/40 bg-primary-fixed/30' : 'border-outline-variant/60 bg-surface-lowest hover:bg-surface-container-low'}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${t.status === 'RESOLVED' ? 'bg-tertiary-soft text-tertiary' : 'bg-primary-fixed text-primary'}`}><Icon name={t.status === 'RESOLVED' ? 'task_alt' : 'forum'} size={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-label-lg text-on-surface ${t.unread ? 'font-bold' : ''}`}>{t.subject}</span>
                      <span className="shrink-0 text-label-sm text-on-surface-variant">{when(t.updatedAt)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-body-sm text-on-surface-variant">{last ? `${last.adminId ? 'Équipe : ' : 'Vous : '}${last.body || 'Photo'}` : ''}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${cls}`}>{label}</span>
                      <span className="whitespace-nowrap text-label-sm text-on-surface-variant">{t.reference}</span>
                      {!!t.objects?.length && <span className="flex items-center gap-0.5 whitespace-nowrap text-label-sm text-on-surface-variant" aria-label={`${t.objects.length} élément(s) joint(s)`}><Icon name="attach_file" size={14} />{t.objects.length}</span>}
                      {t.unread > 0 && <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-label-sm text-white">{t.unread} nouveau{t.unread > 1 ? 'x' : ''}</span>}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

type Header = (title: React.ReactNode, sub: React.ReactNode, back?: () => void, extra?: React.ReactNode) => React.ReactNode

// The member's own objects: category guessed from the first one.
const CATEGORY_OF: Partial<Record<SupportObjectKind, SupportCategory>> = { LISTING: 'LISTING', PAYMENT: 'PAYMENT', DISPUTE: 'DISPUTE', DEAL: 'DISPUTE' }
const refOf = (o: ObjectCard) => ({ kind: o.kind, id: o.id })
const same = (a: { kind: string; id: string }, b: { kind: string; id: string }) => a.kind === b.kind && a.id === b.id

function NewConversation({ header, firstName, onCreated, about }: { header: React.ReactNode; firstName?: string; onCreated: (id: string) => void; about: SupportAbout | null }) {
  const [category, setCategory] = useState<SupportCategory | null>(about ? CATEGORY_OF[about.kind] ?? null : null)
  const [importance, setImportance] = useState<SupportImportance>('NORMAL')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [picked, setPicked] = useState<ObjectCard[]>([])
  const [picking, setPicking] = useState(false)
  // The object of the page written from (checked as the member's by the API).
  const { data: aboutData, error: aboutError } = useQuery<{ mySupportAttachable: ObjectCard }>(MY_SUPPORT_ATTACHABLE_QUERY, { variables: about ?? undefined, skip: !about })
  const [autoRemoved, setAutoRemoved] = useState(false)
  const auto = !autoRemoved ? aboutData?.mySupportAttachable ?? null : null
  const extra = picked.filter(p => !(auto && same(p, auto)))
  const attached = [...(auto ? [auto] : []), ...extra]
  const [create] = useMutation<{ createSupportTicket: SupportTicket }>(CREATE_SUPPORT_TICKET_MUTATION, { refetchQueries: REFETCH })
  const send = async ({ body, attachments }: { body: string; attachments: string[] }) => {
    setError('')
    try {
      const objects = extra.map(refOf)
      const input = {
        message: body, attachments, importance, sourcePath: window.location.pathname + window.location.search,
        category: category ?? (attached[0] ? CATEGORY_OF[attached[0].kind] : undefined) ?? 'OTHER',
        ...(objects.length ? { objects } : {}),
        ...(auto ? { autoObjects: [refOf(auto)] } : {}),
      }
      const r = await create({ variables: { input } })
      setText('')
      if (r.data) onCreated(r.data.createSupportTicket.id)
    } catch (e) {
      setError((e as Error).message)
      throw e
    }
  }
  const chip = (on: boolean) => `flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-solid px-3 py-1.5 text-label-md ${on ? 'border-primary bg-primary-fixed/60 text-primary' : 'border-outline-variant bg-surface-lowest text-on-surface hover:bg-surface-container-low'}`
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <p className="m-0 text-headline-sm text-on-surface">Bonjour{firstName ? ` ${firstName}` : ''} 👋</p>
        <p className="m-0 mt-1 text-body-md text-on-surface-variant">Écrivez-nous : l’équipe Dilchap vous répond ici, et vous recevez une notification.</p>
        <p className="m-0 mt-4 text-label-md text-on-surface">C’est à propos de…</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TOPICS.map(([k, l]) => <button key={k} type="button" aria-pressed={category === k} onClick={() => setCategory(c => c === k ? null : k)} className={chip(category === k)}>{l}</button>)}
        </div>
        <p className="m-0 mt-4 text-label-md text-on-surface">Importance</p>
        <div role="radiogroup" aria-label="Importance" className="mt-2 grid grid-cols-3 gap-1.5">
          {IMPORTANCE_CHOICES.map(([k, l, icon, hint]) => (
            <button key={k} type="button" role="radio" aria-checked={importance === k} onClick={() => setImportance(k)} className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border border-solid px-1.5 py-2 text-center ${importance === k ? (k === 'HIGH' ? 'border-primary bg-primary-fixed/60 text-primary' : 'border-primary bg-primary-fixed/40 text-on-surface') : 'border-outline-variant bg-surface-lowest text-on-surface hover:bg-surface-container-low'}`}>
              <Icon name={icon} size={20} className={importance === k ? 'text-primary' : 'text-on-surface-variant'} />
              <span className="text-label-md">{l}</span>
              <span className="text-label-sm font-normal text-on-surface-variant">{hint}</span>
            </button>
          ))}
        </div>
        {error && <p className="m-0 mt-3 text-body-sm text-primary">{error}</p>}
      </div>
      <div className="shrink-0 border-0 border-t border-solid border-outline-variant/60 bg-surface-lowest px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <AttachRow cards={attached} onAdd={() => setPicking(true)} onRemove={o => (auto && same(o, auto) ? setAutoRemoved(true) : setPicked(p => p.filter(x => !same(x, o))))} note={about && aboutError ? 'L’élément de la page n’a pas pu être joint.' : null} />
        <ChatComposer value={text} onChange={setText} onSend={send} placeholder={attached.length ? 'Expliquez-nous le problème…' : 'Décrivez votre problème…'} noVoice maxPhotos={4} />
      </div>
      {picking && <SupportAttachPicker already={attached.map(refOf)} onClose={() => setPicking(false)} onPick={cards => { setPicked(p => [...p, ...cards]); setPicking(false) }} />}
    </div>
  )
}

// Objects about to be sent (new conversation) and the « Joindre » button.
function AttachRow({ cards, onAdd, onRemove, note, busy }: { cards: ObjectCard[]; onAdd: () => void; onRemove?: (o: ObjectCard) => void; note?: string | null; busy?: boolean }) {
  return (
    <div className="mb-2 space-y-1.5">
      {cards.length > 0 && <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">{cards.map(o => <SupportObjectCard key={`${o.kind}-${o.id}`} o={o} onRemove={onRemove ? () => onRemove(o) : undefined} />)}</div>}
      {note && <p className="m-0 text-body-sm text-primary">{note}</p>}
      <button type="button" disabled={busy || cards.length >= 10} onClick={onAdd} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-solid border-outline-variant bg-surface-lowest px-3 text-label-md text-on-surface hover:bg-surface-container-low disabled:opacity-50">
        <Icon name="attach_file" size={17} className="text-primary" /> Joindre <span className="text-label-sm font-normal normal-case tracking-normal text-on-surface-variant max-[360px]:hidden">une annonce, un achat, un paiement…</span>
      </button>
    </div>
  )
}

function Thread({ ticket: t, loading, header, onBack, onChanged }: { ticket?: SupportTicket; loading: boolean; header: Header; onBack: () => void; onChanged: () => void }) {
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<{ images: string[]; start: number } | null>(null)
  const [reply] = useMutation(REPLY_SUPPORT_TICKET_MUTATION, { refetchQueries: REFETCH })
  const [close, { loading: closing }] = useMutation(CLOSE_SUPPORT_TICKET_MUTATION, { refetchQueries: REFETCH })
  const [markRead] = useMutation(MARK_SUPPORT_READ_MUTATION, { refetchQueries: REFETCH })
  const [attach, { loading: attaching }] = useMutation(ATTACH_SUPPORT_OBJECTS_MUTATION, { refetchQueries: REFETCH })
  const [picking, setPicking] = useState(false)
  const [attachError, setAttachError] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const count = (t?.messages.length ?? 0) + (t?.objects?.length ?? 0)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [count])
  // Opening the conversation reads the team's replies.
  const unread = t?.unread ?? 0
  const id = t?.id
  useEffect(() => { if (id && unread) void markRead({ variables: { id } }) }, [id, unread, markRead])

  if (!t) return (
    <div className="flex h-full min-h-0 flex-col">
      {header('Conversation', null, onBack)}
      <p className="m-0 p-6 text-center text-body-sm text-on-surface-variant">{loading ? 'Chargement…' : 'Conversation introuvable.'}</p>
    </div>
  )
  const [cls, label] = STATUS[t.status]
  const lastMine = [...t.messages].reverse().find(m => !m.adminId)
  const send = async ({ body, attachments }: { body: string; attachments: string[] }) => {
    await reply({ variables: { id: t.id, input: { message: body, attachments } } })
    setText('')
    onChanged()
  }
  // Messages and attached objects, in time order.
  const timeline = [
    ...t.messages.map(m => ({ at: m.createdAt, m, o: null })),
    ...(t.objects ?? []).map(o => ({ at: o.createdAt, m: null, o })),
  ].sort((a, b) => a.at.localeCompare(b.at))
  const pick = (cards: ObjectCard[]) => {
    setPicking(false)
    setAttachError('')
    void attach({ variables: { id: t.id, objects: cards.map(refOf) } }).then(onChanged).catch((e: Error) => setAttachError(e.message))
  }
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {header(
        t.subject,
        <span className="flex flex-wrap items-center gap-1.5"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${cls}`}>{label}</span><span className="text-label-sm text-on-surface-variant">{t.reference} • {IMPORTANCE_LABEL[t.importance]}</span></span>,
        onBack,
        t.status !== 'RESOLVED' && <button type="button" disabled={closing} onClick={() => void close({ variables: { id: t.id } }).then(onChanged)} title="Marquer comme résolu" aria-label="Marquer comme résolu" className="flex h-9 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border-none bg-tertiary-soft px-3 text-label-md text-tertiary disabled:opacity-50"><Icon name="task_alt" size={17} /> <span className="max-[380px]:hidden">C’est réglé</span></button>,
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface px-3 py-3">
        <p className="m-0 mx-auto mb-3 max-w-[90%] rounded-xl bg-surface-container-low px-3 py-2 text-center text-label-sm font-normal text-on-surface-variant">
          {CATEGORY_LABEL[t.category]} • ouverte le {when(t.createdAt)}
          {t.status === 'OPEN' && !t.firstResponseAt && <><br />Réponse attendue avant {when(t.dueAt)}</>}
        </p>
        <div className="flex flex-col gap-2">
          {timeline.map(({ m, o }) => {
            if (o) return (
              <div key={`o-${o.id}`} className="flex w-[85%] max-w-sm flex-col items-end self-end">
                <span className="mb-0.5 mr-1 flex items-center gap-1 text-label-sm normal-case tracking-normal text-on-surface-variant"><Icon name="attach_file" size={13} /> {o.auto ? 'Joint depuis la page' : 'Vous avez joint'}</span>
                <span className="w-full"><SupportObjectCard o={o.snapshot} tone="mine" /></span>
                <span className="mx-1 mt-0.5 text-[11px] text-on-surface-variant">{time(o.createdAt)}</span>
              </div>
            )
            if (!m) return null
            const mine = !m.adminId
            return (
              <div key={m.id} className={`flex max-w-[85%] flex-col ${mine ? 'items-end self-end' : 'items-start self-start'}`}>
                {!mine && <span className="mb-0.5 ml-1 flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name="support_agent" size={14} className="text-primary" /> {m.admin?.fullName ? `${m.admin.fullName.split(' ')[0]} • ` : ''}Équipe Dilchap</span>}
                <div className={`rounded-2xl px-3 py-2 text-body-md ${mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-surface-lowest text-on-surface shadow-sm'}`}>
                  {!!m.attachments?.length && (
                    <span className={`mb-1 grid gap-1 ${m.attachments.length > 1 ? 'grid-cols-2' : ''}`}>
                      {m.attachments.map((src, i) => <button key={src} type="button" onClick={() => setPhotos({ images: m.attachments!, start: i })} aria-label={`Voir la photo ${i + 1}`} className="block h-28 w-28 cursor-zoom-in overflow-hidden rounded-lg border-none bg-surface-container p-0"><img src={thumbnailUrl(src)} alt="" loading="lazy" className="h-full w-full object-cover" /></button>)}
                    </span>
                  )}
                  {m.body && <p className="selectable m-0 whitespace-pre-line break-words">{m.body}</p>}
                </div>
                <span className="mx-1 mt-0.5 text-[11px] text-on-surface-variant">{time(m.createdAt)}{mine && m.id === lastMine?.id && m.readAt ? ' • Lu par l’équipe' : ''}</span>
              </div>
            )
          })}
        </div>
        {t.status === 'RESOLVED' && <p className="m-0 mt-3 flex items-center justify-center gap-1.5 text-center text-body-sm text-tertiary"><Icon name="task_alt" size={16} /> Conversation résolue. Écrire la rouvre.</p>}
        <div ref={end} />
      </div>
      <div className="shrink-0 border-0 border-t border-solid border-outline-variant/60 bg-surface-lowest px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <AttachRow cards={[]} onAdd={() => setPicking(true)} busy={attaching || (t.objects?.length ?? 0) >= 10} note={attachError || null} />
        <ChatComposer value={text} onChange={setText} onSend={send} placeholder={t.status === 'RESOLVED' ? 'Écrire rouvre la conversation…' : 'Votre message…'} noVoice maxPhotos={4} />
      </div>
      {picking && <SupportAttachPicker already={(t.objects ?? []).map(o => ({ kind: o.kind, id: o.targetId }))} onClose={() => setPicking(false)} onPick={pick} />}
      {photos && <ImageLightbox images={photos.images} start={photos.start} alt="Photo jointe" onClose={() => setPhotos(null)} />}
    </div>
  )
}
