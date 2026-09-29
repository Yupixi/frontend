import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Select from '../../components/Select'
import SellerBadge from '../../components/SellerBadge'
import { AccountLayout } from './AccountLayout'
import { BADGE_LABEL } from '../../graphql/badges'
import {
  CATEGORY_LABEL, CLOSE_SUPPORT_TICKET_MUTATION, CREATE_SUPPORT_TICKET_MUTATION, MY_SUPPORT_TICKETS_QUERY, REPLY_SUPPORT_TICKET_MUTATION,
  SUPPORT_CATEGORIES, type SupportCategory, type SupportTicket,
} from '../../graphql/support'
import type { AuthUser } from '../../graphql/auth'
import { delayText, useRules } from '../../lib/rules'

type Props = { onNavigate: (p: any) => void; focusTicketId?: string | null; currentUser?: AuthUser | null; onLogout: () => void }

const card = 'rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5'
const inputCls = 'h-11 w-full min-w-0 rounded-xl border-none bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary'
const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const STATUS: Record<SupportTicket['status'], [string, string]> = {
  OPEN: ['bg-amber-100 text-amber-800', 'En attente de réponse'],
  ANSWERED: ['bg-verified-soft text-verified', 'Répondu'],
  RESOLVED: ['bg-tertiary-soft text-tertiary', 'Résolu'],
}

function Ticket({ t, focus, onChanged }: { t: SupportTicket, focus?: boolean, onChanged: () => void }) {
  const [open, setOpen] = useState(focus || t.status !== 'RESOLVED')
  // Opened from a notification: bring this ticket into view.
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { if (focus) ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, [focus])
  const [text, setText] = useState('')
  const [reply, { loading }] = useMutation(REPLY_SUPPORT_TICKET_MUTATION)
  const [close] = useMutation(CLOSE_SUPPORT_TICKET_MUTATION)
  const [cls, label] = STATUS[t.status]
  return (
    <section ref={ref} className={`${card} scroll-mt-4 ${focus ? 'ring-2 ring-primary' : ''}`}>
      <button onClick={() => setOpen(o => !o)} className="flex w-full cursor-pointer items-start gap-3 border-none bg-transparent p-0 text-left">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-label-sm ${cls}`}>{label}</span><span className="whitespace-nowrap text-label-sm text-on-surface-variant">{t.reference} • {CATEGORY_LABEL[t.category]}</span></span>
          <span className="mt-1 block truncate text-label-lg text-on-surface">{t.subject}</span>
          <span className="block text-body-sm text-on-surface-variant">{t.status === 'OPEN' && !t.firstResponseAt ? `Réponse attendue avant ${when(t.dueAt)}` : `Mise à jour ${when(t.updatedAt)}`}</span>
        </span>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={22} className="shrink-0 text-on-surface-variant" />
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {t.messages.map(m => (
            <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-body-sm ${m.adminId ? 'self-start bg-surface-container-low text-on-surface' : 'self-end bg-primary-fixed/50 text-on-surface'}`}>
              <div className="mb-0.5 text-label-sm text-on-surface-variant">{m.adminId ? `${m.admin?.fullName ?? 'Équipe'} • Support Dilchap` : 'Vous'} • {when(m.createdAt)}</div>
              <p className="m-0 whitespace-pre-line break-words">{m.body}</p>
            </div>
          ))}
          <textarea value={text} onChange={e => setText(e.target.value.slice(0, 3000))} rows={3} placeholder={t.status === 'RESOLVED' ? 'Répondre rouvre la demande…' : 'Votre message…'} className="mt-1 w-full resize-y rounded-xl border-none bg-surface-container-low p-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary" />
          <div className="flex flex-wrap justify-end gap-2">
            {t.status !== 'RESOLVED' && <button onClick={() => void close({ variables: { id: t.id } }).then(onChanged)} className="flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="task_alt" size={17} /> Problème résolu</button>}
            <button disabled={!text.trim() || loading} onClick={() => void reply({ variables: { id: t.id, message: text.trim() } }).then(() => { setText(''); onChanged() })} className="flex h-10 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-md text-white disabled:opacity-45"><Icon name="send" size={17} /> Envoyer</button>
          </div>
        </div>
      )}
    </section>
  )
}

// "Aide & support": requests to the Dilchap team, answered in the BO. The
// response target depends on the paid badge.
export default function Support({ onNavigate, focusTicketId, currentUser, onLogout }: Props) {
  const { data, refetch } = useQuery<{ mySupportTickets: SupportTicket[] }>(MY_SUPPORT_TICKETS_QUERY, { fetchPolicy: 'cache-and-network' })
  const [category, setCategory] = useState<SupportCategory>('PAYMENT')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')
  const [create, { loading }] = useMutation(CREATE_SUPPORT_TICKET_MUTATION)
  const badge = currentUser?.badge ?? null
  // Response target from « Règles de la marketplace ».
  const rules = useRules()
  const hours = badge === 'CERTIFIED' ? rules.SUPPORT_SLA_URGENT_HOURS : badge ? rules.SUPPORT_SLA_HIGH_HOURS : rules.SUPPORT_SLA_NORMAL_HOURS
  const tickets = data?.mySupportTickets ?? []
  const submit = () => {
    setError('')
    void create({ variables: { input: { category, subject: subject.trim(), message: message.trim() } } })
      .then(r => { const t = (r.data as { createSupportTicket: SupportTicket }).createSupportTicket; setSent(`Demande ${t.reference} envoyée : réponse attendue avant ${when(t.dueAt)}.`); setSubject(''); setMessage(''); void refetch() })
      .catch((e: Error) => setError(e.message))
  }
  return (
    <AccountLayout active="support" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout} title="Aide & support">
      <h1 className="m-0 text-headline-lg text-on-surface">Aide & support</h1>
      <p className="m-0 mt-1 text-body-md text-on-surface-variant">Écrivez à l’équipe Dilchap : vous suivez la réponse ici et recevez une notification.</p>

      <section className={`${card} mt-4 flex flex-col gap-3 sm:flex-row sm:items-center`}>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${badge === 'CERTIFIED' ? 'bg-tertiary-soft text-tertiary' : badge ? 'bg-verified-soft text-verified' : 'bg-surface-container text-on-surface-variant'}`}><Icon name="support_agent" size={26} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-label-lg text-on-surface">Délai de réponse : {delayText(hours)} {badge && <SellerBadge tier={badge} variant="pill" short />}</div>
          <div className="text-body-sm text-on-surface-variant">{badge === 'CERTIFIED' ? 'Support ultra-prioritaire inclus dans votre badge Vendeur certifié.' : badge ? `Support prioritaire inclus dans votre badge ${BADGE_LABEL[badge]}.` : `Avec un badge : réponse en ${delayText(rules.SUPPORT_SLA_HIGH_HOURS)} (Compte vérifié) ou ${delayText(rules.SUPPORT_SLA_URGENT_HOURS)} (Vendeur certifié).`}</div>
        </div>
        {!badge && <button onClick={() => onNavigate('seller-badge')} className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-surface-container px-3 text-label-md text-on-surface"><Icon name="verified" size={17} fill className="text-verified" /> Voir les badges</button>}
      </section>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className={card}>
          <h2 className="m-0 text-headline-sm text-on-surface">Nouvelle demande</h2>
          <label className="mt-3 block"><span className="mb-1.5 block text-label-md text-on-surface">Sujet</span>
            <Select value={category} onChange={e => setCategory(e.target.value as SupportCategory)} className={`${inputCls} cursor-pointer`} aria-label="Catégorie">
              {SUPPORT_CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </label>
          <label className="mt-3 block"><span className="mb-1.5 block text-label-md text-on-surface">Titre</span><input value={subject} onChange={e => setSubject(e.target.value.slice(0, 120))} placeholder="Ex : paiement Wave non pris en compte" className={inputCls} /></label>
          <label className="mt-3 block"><span className="mb-1.5 flex justify-between text-label-md text-on-surface">Message <span className="text-label-sm font-normal text-on-surface-variant">{message.length} / 3000</span></span><textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 3000))} rows={5} placeholder="Décrivez la situation (référence de paiement, annonce concernée…)" className="w-full resize-y rounded-xl border-none bg-surface-container-low p-3 text-body-md text-on-surface outline-none focus:outline focus:outline-2 focus:outline-primary" /></label>
          {error && <p className="m-0 mt-2 text-body-sm text-primary">{error}</p>}
          {sent && <p className="m-0 mt-2 flex items-start gap-1.5 rounded-xl bg-tertiary-soft px-3 py-2 text-body-sm text-tertiary"><Icon name="check_circle" size={17} className="mt-0.5 shrink-0" /> {sent}</p>}
          <button disabled={loading || subject.trim().length < 3 || message.trim().length < 10} onClick={submit} className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white disabled:opacity-45"><Icon name="send" size={19} /> Envoyer la demande</button>
        </section>
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="m-0 text-headline-sm text-on-surface">Mes demandes ({tickets.length})</h2>
          {tickets.length === 0 ? <p className="m-0 rounded-2xl bg-surface-lowest p-6 text-center text-body-md text-on-surface-variant shadow-sm">Aucune demande pour l’instant.</p> : tickets.map(t => <Ticket key={t.id} t={t} focus={t.id === focusTicketId} onChanged={() => void refetch()} />)}
        </div>
      </div>
    </AccountLayout>
  )
}
