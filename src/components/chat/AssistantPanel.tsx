import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../Icon'
import Price from '../Price'
import {
  ACCEPT_CHAT_ASSISTANT_NOTICE, ASK_CHAT_ASSISTANT, CHAT_ASSISTANT_QUERY,
  type ChatAssistantAction, type ChatAssistantAnswer, type ChatAssistantStatus,
} from '../../graphql/chatAssistant'

const ACTION_ICON: Record<ChatAssistantAction, string> = {
  FAIR_PRICE: 'price_check',
  MEETUP_PREP: 'event',
  INSPECT: 'checklist',
  DRAFT_REPLY: 'edit_note',
  SCAM_CHECK: 'gpp_maybe',
}
const RISK: Record<string, { label: string; cls: string }> = {
  none: { label: 'Aucun signe relevé', cls: 'bg-tertiary-soft text-tertiary' },
  low: { label: 'Risque faible', cls: 'bg-tertiary-soft text-tertiary' },
  medium: { label: 'Risque moyen', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100' },
  high: { label: 'Risque élevé', cls: 'bg-primary text-white' },
}

export type AssistantUse =
  | { kind: 'draft'; text: string }
  | { kind: 'price'; amount: number }
  | { kind: 'meetup'; meetup: NonNullable<ChatAssistantAnswer['meetup']> }

// « Aide Dilchap » content (a sheet on a phone, a side panel on a computer):
// the one-time notice, the actions, and the answers the member uses
// themselves (copy a draft into the composer, prefill an offer or a
// meet-up proposal). Never sends anything.
export default function AssistantPanel({ conversationId, isBuyer, canOffer, onUse, onClose, asSheet }: {
  conversationId: string
  isBuyer: boolean
  canOffer: boolean
  onUse: (u: AssistantUse) => void
  onClose: () => void
  asSheet?: boolean
}) {
  const { data, refetch, loading } = useQuery<{ chatAssistant: ChatAssistantStatus }>(CHAT_ASSISTANT_QUERY, { variables: { conversationId }, fetchPolicy: 'cache-and-network' })
  const [accept, { loading: accepting }] = useMutation(ACCEPT_CHAT_ASSISTANT_NOTICE)
  const [ask] = useMutation<{ askChatAssistant: ChatAssistantAnswer }>(ASK_CHAT_ASSISTANT)
  const [answers, setAnswers] = useState<ChatAssistantAnswer[]>([])
  const [pending, setPending] = useState<ChatAssistantAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const s = data?.chatAssistant

  const run = (action: ChatAssistantAction) => {
    if (pending) return
    setPending(action); setError(null)
    void ask({ variables: { conversationId, action, hint: action === 'DRAFT_REPLY' && hint.trim() ? hint.trim() : null } })
      .then(({ data: d }) => { if (d?.askChatAssistant) setAnswers(a => [d.askChatAssistant, ...a].slice(0, 6)); setHint('') })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Aide Dilchap est indisponible pour le moment.'))
      .finally(() => { setPending(null); void refetch() })
  }

  return (
    <div className={`flex min-h-0 flex-col ${asSheet ? '' : 'h-full'}`}>
      {!asSheet && (
        <div className="flex items-center gap-2 border-0 border-b border-solid border-outline-variant px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"><Icon name="auto_awesome" size={17} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-label-lg text-on-surface">Aide Dilchap</div>
            <div className="text-[11px] text-on-surface-variant">Privé : seul vous voyez ces réponses</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer Aide Dilchap" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface-variant"><Icon name="close" size={18} /></button>
        </div>
      )}
      <div className={`flex min-h-0 flex-1 flex-col gap-3 ${asSheet ? '' : 'overflow-y-auto overscroll-contain p-4'}`} aria-live="polite">
        {asSheet && <p className="m-0 -mt-1 text-body-sm text-on-surface-variant">Privé : seul vous voyez ces réponses. Vous relisez toujours avant d’envoyer quoi que ce soit.</p>}
        {!s && loading && <div className="space-y-2"><div className="chat-skeleton h-16 rounded-2xl" /><div className="chat-skeleton h-24 rounded-2xl" /></div>}
        {s && !s.noticeAccepted && (
          <div className="rounded-2xl bg-surface-container-low p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-label-lg text-on-surface"><Icon name="info" size={18} className="text-primary" /> Avant de commencer</div>
            <p className="m-0 text-body-sm text-on-surface">Vos derniers messages de cette conversation sont analysés par l’IA pour vous aider ; les numéros et e-mails sont masqués.</p>
            <p className="m-0 mt-1.5 text-body-sm text-on-surface-variant">Aide Dilchap vous conseille en privé et n’envoie jamais rien à votre place. Ses réponses peuvent se tromper : gardez toujours les règles de sécurité Dilchap.</p>
            <button type="button" disabled={accepting} onClick={() => void accept().then(() => refetch())} className="mt-3 w-full cursor-pointer rounded-xl border-none bg-primary py-2.5 text-label-md text-white disabled:opacity-60">J’ai compris</button>
          </div>
        )}
        {s?.noticeAccepted && (
          <>
            {!s.available && s.reasonText && <p className="m-0 flex items-start gap-2 rounded-2xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant"><Icon name="schedule" size={18} className="mt-0.5 shrink-0" /> {s.reasonText}</p>}
            <div className={`grid grid-cols-1 gap-2 ${asSheet ? 'sm:grid-cols-2' : ''}`}>
              {s.actions.map(a => (
                <button key={a.id} type="button" disabled={!s.available || !!pending} onClick={() => run(a.id)}
                  className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-2xl border border-solid border-outline-variant bg-surface-lowest px-3 py-2.5 text-left text-label-md text-on-surface transition-colors hover:border-primary disabled:cursor-default disabled:opacity-55 ${a.id === 'SCAM_CHECK' && asSheet ? 'sm:col-span-2' : ''}`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed/70 text-primary">{pending === a.id ? <Icon name="progress_activity" size={17} className="animate-spin" /> : <Icon name={ACTION_ICON[a.id]} size={17} />}</span>
                  <span className="min-w-0">{a.label}</span>
                </button>
              ))}
            </div>
            <label className="block text-label-sm text-on-surface-variant">Précision pour « Rédiger une réponse » (facultatif)
              <input value={hint} maxLength={300} onChange={e => setHint(e.target.value)} placeholder="Ex : dire que je suis disponible samedi matin" className="mt-1 w-full rounded-xl border-none bg-surface-container-low px-3 py-2.5 text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary" />
            </label>
            <p className="m-0 text-[11px] text-on-surface-variant">
              {s.remainingInConversation} demande{s.remainingInConversation > 1 ? 's' : ''} restante{s.remainingInConversation > 1 ? 's' : ''} dans cette discussion, {s.remainingToday} aujourd’hui{s.priceCredits > 0 ? ` • ${s.priceCredits} crédit${s.priceCredits > 1 ? 's' : ''} par demande (remboursé sans réponse)` : ''}
            </p>
          </>
        )}
        {error && <p role="alert" className="m-0 rounded-xl bg-primary-fixed/60 px-3 py-2 text-body-sm text-primary">{error}</p>}
        {pending && <div className="chat-in rounded-2xl bg-surface-container-low p-3"><div className="flex items-center gap-2 text-body-sm text-on-surface-variant"><span className="typing-dots" aria-hidden><i /><i /><i /></span> Aide Dilchap réfléchit…</div></div>}
        {answers.map((a, i) => (
          <article key={answers.length - i} className="chat-in rounded-2xl bg-surface-lowest p-3.5 shadow-sm">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-label-sm text-primary"><Icon name={ACTION_ICON[a.action]} size={15} /> {s?.actions.find(x => x.id === a.action)?.label ?? ''}</span>
              {a.risk && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${RISK[a.risk].cls}`}>{RISK[a.risk].label}</span>}
            </div>
            <p className="selectable m-0 whitespace-pre-line text-body-sm text-on-surface">{a.message}</p>
            {a.items.length > 0 && (
              <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
                {a.items.map((it, j) => <li key={j} className="flex items-start gap-1.5 text-body-sm text-on-surface-variant"><Icon name="task_alt" size={15} className="mt-0.5 shrink-0 text-tertiary" /> <span className="selectable">{it}</span></li>)}
              </ul>
            )}
            {a.price && (
              <div className="mt-2.5 rounded-xl bg-surface-container-low p-3">
                <div className="flex items-baseline justify-between gap-2"><span className="text-body-sm text-on-surface-variant">Fourchette</span><span className="text-label-md text-on-surface"><Price amount={a.price.low} currency={a.price.currency} /> – <Price amount={a.price.high} currency={a.price.currency} /></span></div>
                <div className="mt-1 flex items-baseline justify-between gap-2"><span className="text-body-sm text-on-surface-variant">Prix suggéré</span><span className="text-headline-sm font-extrabold text-primary"><Price amount={a.price.suggested} currency={a.price.currency} /></span></div>
                {isBuyer && canOffer && <button type="button" onClick={() => onUse({ kind: 'price', amount: a.price!.suggested })} className="mt-2 w-full cursor-pointer rounded-lg border-none bg-primary py-2 text-label-md text-white">Préparer une offre à ce prix</button>}
              </div>
            )}
            {a.draft != null && (
              <div className="mt-2.5">
                <textarea value={drafts[i] ?? a.draft} onChange={e => setDrafts(d => ({ ...d, [i]: e.target.value }))} rows={4} aria-label="Brouillon de réponse" className="block w-full resize-y rounded-xl border-none bg-surface-container-low p-3 text-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary" />
                <button type="button" onClick={() => onUse({ kind: 'draft', text: drafts[i] ?? a.draft! })} className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-primary py-2 text-label-md text-white"><Icon name="edit" size={16} /> Mettre dans ma réponse</button>
              </div>
            )}
            {a.meetup && (
              <div className="mt-2.5 rounded-xl bg-surface-container-low p-3">
                <div className="text-label-md text-on-surface">{a.meetup.place}</div>
                {a.meetup.address && <div className="text-body-sm text-on-surface-variant">{a.meetup.address}</div>}
                {a.meetup.scheduledAt && <div className="text-body-sm capitalize text-on-surface">{new Date(a.meetup.scheduledAt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>}
                <button type="button" onClick={() => onUse({ kind: 'meetup', meetup: a.meetup! })} className="mt-2 w-full cursor-pointer rounded-lg border-none bg-primary py-2 text-label-md text-white">Préparer la proposition de rendez-vous</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
