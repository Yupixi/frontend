import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from './Icon'
import ChatComposer from './ChatComposer'
import { SupportObjectCard } from './SupportObjects'
import { helpSlugOf } from '../graphql/help'
import { requestOpenHelp, type SupportAbout } from '../lib/navigation'
import {
  MY_SUPPORT_ATTACHABLE_QUERY, MY_SUPPORT_TICKETS_QUERY, MY_SUPPORT_UNREAD_QUERY, SEND_SUPPORT_ASSISTANT_MUTATION, SUPPORT_ASSISTANT_HANDOFF_MUTATION,
  SUPPORT_ASSISTANT_QUERY,
  type AssistantConversation, type AssistantMessage, type AssistantSendResult, type SupportObjectCard as ObjectCard,
} from '../graphql/support'

type Header = (title: React.ReactNode, sub: React.ReactNode, back?: () => void, extra?: React.ReactNode) => React.ReactNode

type Props = {
  header: Header
  welcomeMessage: string
  suggestions: string[]
  remainingToday: number
  conversation: AssistantConversation | null
  firstName?: string
  // « Contacter le support à propos de… »: the object of the page.
  about: SupportAbout | null
  onBack?: () => void
  // « Parler à un agent » before any message: the classic form.
  onAgentForm: () => void
  onOpenTicket: (id: string) => void
}

// « Bonjour ! … » set in the BO → « Bonjour Aya ! … ».
const greet = (welcome: string, firstName?: string) =>
  !firstName ? welcome : /^bonjour\b/i.test(welcome) ? welcome.replace(/^bonjour\b/i, `Bonjour ${firstName}`) : `Bonjour ${firstName} ! ${welcome}`
const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const REFETCH = [{ query: SUPPORT_ASSISTANT_QUERY }, { query: MY_SUPPORT_TICKETS_QUERY }, { query: MY_SUPPORT_UNREAD_QUERY }]

// « L'assistant Dilchap » answers first in the « Support » tab (AI, never
// presented as a human). One answer at a time, shown whole once ready
// (« L’assistant écrit… » meanwhile): the server decides on the whole
// answer whether to show it or to hand over to an agent. « Parler à un
// agent » is always there; a handoff opens a ticket the member follows in
// the usual conversation.
export default function SupportAssistant({ header, welcomeMessage, suggestions, remainingToday, conversation, firstName, about, onBack, onAgentForm, onOpenTicket }: Props) {
  // Written from a page (« à propos de… »): a new conversation about it.
  // Then kept up to date by the answers of the mutations.
  const [conv, setConv] = useState<AssistantConversation | null>(about ? null : conversation)
  const [text, setText] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [send] = useMutation<{ sendSupportAssistantMessage: AssistantSendResult }>(SEND_SUPPORT_ASSISTANT_MUTATION, { refetchQueries: REFETCH })
  const [handoff, { loading: handingOff }] = useMutation<{ supportAssistantHandoff: AssistantSendResult }>(SUPPORT_ASSISTANT_HANDOFF_MUTATION, { refetchQueries: REFETCH })
  // The page's object, attached to the first message (checked by the API).
  const { data: aboutData } = useQuery<{ mySupportAttachable: ObjectCard }>(MY_SUPPORT_ATTACHABLE_QUERY, { variables: about ?? undefined, skip: !about || !!conv })
  const aboutCard = !conv ? aboutData?.mySupportAttachable ?? null : null

  const end = useRef<HTMLDivElement>(null)
  const count = (conv?.messages.length ?? 0) + (pending ? 1 : 0)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [count])

  const handedOff = conv?.status === 'HANDED_OFF'
  const ask = async (body: string) => {
    const message = body.trim()
    if (!message || pending) return
    setError('')
    setPending(message)
    setText('')
    try {
      const r = await send({ variables: { input: { message, conversationId: conv?.id ?? null, ...(!conv && aboutCard ? { autoObjects: [{ kind: aboutCard.kind, id: aboutCard.id }] } : {}) } } })
      const out = r.data?.sendSupportAssistantMessage
      if (out?.conversation) setConv(out.conversation)
    } catch (e) {
      setError((e as Error).message)
      setText(message)
    } finally {
      setPending(null)
    }
  }
  const toAgent = async () => {
    if (!conv || conv.status !== 'ACTIVE' || !conv.messages.some(m => m.role === 'MEMBER')) return onAgentForm()
    setError('')
    try {
      const r = await handoff({ variables: { conversationId: conv.id } })
      const out = r.data?.supportAssistantHandoff
      if (out?.conversation) setConv(out.conversation)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const agentButton = (
    <button type="button" disabled={handingOff || !!pending} onClick={() => void toAgent()} className="flex h-9 shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border border-solid border-outline-variant bg-surface-lowest px-3 text-label-md text-on-surface hover:bg-surface-container-low disabled:opacity-50">
      <Icon name="support_agent" size={17} className="text-primary" /> <span className="max-[419px]:hidden">Parler à un agent</span><span className="min-[420px]:hidden">Un agent</span>
    </button>
  )
  const messages = conv?.messages ?? []
  const noMore = remainingToday <= 0 && !handedOff
  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {header(
        <span className="flex items-center gap-1.5"><Icon name="auto_awesome" size={19} className="text-primary" /> Assistant Dilchap</span>,
        <span className="text-body-sm text-on-surface-variant">Assistant IA</span>,
        onBack,
        handedOff ? undefined : agentButton,
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-surface px-3 py-3">
        <div className="flex flex-col gap-2">
          <Bot>
            <p className="m-0 whitespace-pre-line break-words">{greet(welcomeMessage, firstName)}</p>
          </Bot>
          {aboutCard && (
            <div className="flex w-[85%] max-w-sm flex-col items-end self-end">
              <span className="mb-0.5 mr-1 flex items-center gap-1 text-label-sm normal-case tracking-normal text-on-surface-variant"><Icon name="attach_file" size={13} /> À propos de</span>
              <span className="w-full"><SupportObjectCard o={aboutCard} tone="mine" /></span>
            </div>
          )}
          {messages.map(m => <Message key={m.id} m={m} />)}
          {pending && (
            <>
              <Mine body={pending} />
              <p className="m-0 flex items-center gap-1.5 self-start px-1 text-body-sm text-on-surface-variant" role="status" aria-live="polite">
                <span className="flex gap-0.5" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant" style={{ animationDelay: `${i * 150}ms` }} />)}</span>
                L’assistant écrit…
              </p>
            </>
          )}
          {!messages.length && !pending && suggestions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5" aria-label="Suggestions">
              {suggestions.map(s => (
                <button key={s} type="button" onClick={() => void ask(s)} className="max-w-full cursor-pointer rounded-full border border-solid border-primary/40 bg-primary-fixed/30 px-3 py-1.5 text-left text-label-md text-primary hover:bg-primary-fixed/60">{s}</button>
              ))}
            </div>
          )}
          {handedOff && conv?.ticket && (
            <button type="button" onClick={() => onOpenTicket(conv.ticket!.id)} className="mx-auto mt-1 flex h-10 max-w-full cursor-pointer items-center gap-1.5 rounded-full border-none bg-primary px-4 text-label-lg text-white hover:bg-primary-dark">
              <Icon name="forum" size={18} /> <span className="truncate">Suivre la demande {conv.ticket.reference}</span>
            </button>
          )}
        </div>
        <div ref={end} />
      </div>
      <div className="shrink-0 border-0 border-t border-solid border-outline-variant/60 bg-surface-lowest px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {error && <p className="m-0 mb-2 text-body-sm text-primary">{error}</p>}
        {handedOff ? (
          <button type="button" onClick={() => setConv(null)} className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-solid border-outline-variant bg-surface-lowest text-label-lg text-on-surface hover:bg-surface-container-low">
            <Icon name="auto_awesome" size={18} className="text-primary" /> Nouvelle question à l’assistant
          </button>
        ) : noMore ? (
          <p className="m-0 text-center text-body-sm text-on-surface-variant">Limite de messages à l’assistant atteinte pour aujourd’hui : parlez à un agent.</p>
        ) : (
          <ChatComposer value={text} onChange={setText} onSend={({ body }) => ask(body)} placeholder="Posez votre question…" noVoice maxPhotos={0} disabled={!!pending} />
        )}
      </div>
    </div>
  )
}

function Bot({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex max-w-[88%] flex-col items-start self-start">
      <span className="mb-0.5 ml-1 flex items-center gap-1 text-label-sm text-on-surface-variant"><Icon name="auto_awesome" size={13} className="text-primary" /> Assistant Dilchap</span>
      <div className="min-w-0 max-w-full rounded-2xl rounded-bl-md bg-surface-lowest px-3 py-2 text-body-md text-on-surface shadow-sm">{children}</div>
    </div>
  )
}

function Mine({ body, at }: { body: string; at?: string }) {
  return (
    <div className="flex max-w-[85%] flex-col items-end self-end">
      <div className="max-w-full rounded-2xl rounded-br-md bg-primary px-3 py-2 text-body-md text-white">
        <p className="selectable m-0 whitespace-pre-line break-words">{body}</p>
      </div>
      {at && <span className="mx-1 mt-0.5 text-[11px] text-on-surface-variant">{time(at)}</span>}
    </div>
  )
}

function Message({ m }: { m: AssistantMessage }) {
  if (m.role === 'MEMBER') return <Mine body={m.body} at={m.createdAt} />
  if (m.role === 'SYSTEM')
    return (
      <p className="m-0 mx-auto my-1 flex max-w-[92%] items-start gap-1.5 rounded-xl bg-primary-fixed/40 px-3 py-2 text-body-sm text-on-surface" role="status">
        <Icon name="support_agent" size={17} className="mt-0.5 shrink-0 text-primary" /> <span className="min-w-0 break-words">{m.body}</span>
      </p>
    )
  const sources = m.sources ?? []
  return (
    <Bot>
      <p className="selectable m-0 whitespace-pre-line break-words">{m.body}</p>
      {sources.length > 0 && (
        <span className="mt-2 flex flex-col gap-1 border-0 border-t border-solid border-outline-variant/50 pt-2">
          <span className="text-label-sm text-on-surface-variant">Sources</span>
          {sources.map(s => (
            <button key={s.key} type="button" onClick={() => requestOpenHelp(helpSlugOf(s.key))} className="flex min-w-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left text-label-md text-primary hover:underline">
              <Icon name="menu_book" size={15} className="shrink-0" /> <span className="min-w-0 break-words">{s.title}</span>
            </button>
          ))}
        </span>
      )}
    </Bot>
  )
}
