import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import { formatNumber } from '../../lib/format'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import { ANTI_FRAUD_RULES, DisputeStatusChip, DisputeTimeline, MediationCard, PhotoPicker, hoursLeft } from '../../components/DisputeParts'
import {
  DISPUTE_REASON_ICONS, DISPUTE_REASON_LABELS, MY_DISPUTE_STATS_QUERY, MY_SELLER_DISPUTES_QUERY, RESPOND_TO_DISPUTE_MUTATION, disputeIsOpen,
  type Dispute, type DisputeProposal, type DisputeReason, type DisputeStats, type DisputeStatus,
} from '../../graphql/sellerTools'
import { MY_SALES_ORDERS_QUERY, type SalesOrder } from '../../graphql/sellerHub'
import { CREATE_REPORT_MUTATION } from '../../graphql/reports'
import { PAYMENT_LABELS } from '../ListingDetail'
import type { AuthUser } from '../../graphql/auth'

type Props = { onNavigate: (p: any) => void; onSelectListing: (id: string) => void; focusDisputeId?: string; currentUser?: AuthUser | null; onLogout: () => void }

const TABS: { key: string; label: string; statuses?: DisputeStatus[]; dot?: string }[] = [
  { key: 'all', label: 'Tous les dossiers' },
  { key: 'mediation', label: 'En cours de médiation', statuses: ['AWAITING_SELLER', 'IN_MEDIATION'], dot: 'bg-primary' },
  { key: 'buyer', label: "En attente de l'acheteur", statuses: ['AWAITING_BUYER'], dot: 'bg-on-surface-variant' },
  { key: 'amicable', label: 'Clôturés en accord direct', statuses: ['RESOLVED_AMICABLY', 'CANCELLED'], dot: 'bg-tertiary' },
  { key: 'rejected', label: 'Rejetés / Faux signalements', statuses: ['REJECTED'] },
]
const PAGE = 5
const commune = (d: Dispute) => d.meetupPlace ?? d.listing?.city ?? '—'
const fmtDate = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function exportCsv(rows: Dispute[]) {
  const data = [
    ['Référence', 'Date', 'Article', 'Montant', 'Motif', 'Lieu', 'Statut'],
    ...rows.map(d => [d.reference, d.createdAt.slice(0, 16).replace('T', ' '), d.listing?.title ?? '', d.amount, DISPUTE_REASON_LABELS[d.reason], commune(d), d.verdict ?? d.status]),
  ]
  const csv = data.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = 'dilchap-registre-litiges.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

function ResponsePanel({ d, onDone }: { d: Dispute; onDone: () => void }) {
  const [proposal, setProposal] = useState<DisputeProposal>('COURTESY_DISCOUNT')
  const [discount, setDiscount] = useState(Math.max(500, Math.round((d.amount * 0.03) / 500) * 500))
  const [message, setMessage] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [respond, { loading, error }] = useMutation(RESPOND_TO_DISPUTE_MUTATION)

  if (d.status !== 'AWAITING_SELLER') {
    const texts: Partial<Record<DisputeStatus, [string, string]>> = {
      AWAITING_BUYER: ["En attente de l'acheteur", "Votre proposition a été transmise. L'acheteur peut l'accepter ou demander l'arbitrage Dilchap."],
      IN_MEDIATION: ['Arbitrage Dilchap en cours', 'Un modérateur examine le dossier et les justificatifs des deux parties.'],
    }
    const [title, text] = texts[d.status] ?? ['Dossier clôturé', d.verdict ?? '']
    return (
      <div className="rounded-2xl bg-surface-container-low p-5">
        <h3 className="m-0 text-headline-sm text-on-surface">{title}</h3>
        <p className="m-0 mt-2 text-body-md text-on-surface-variant">{text}</p>
      </div>
    )
  }

  const options: { key: DisputeProposal; title: React.ReactNode; sub: string }[] = [
    { key: 'COURTESY_DISCOUNT', title: <>Proposer une remise de courtoisie de <Price amount={discount} /></>, sub: `Vente finalisée immédiatement à ${formatNumber(Math.max(0, d.amount - discount))} F` },
    { key: 'CANCEL_RELIST', title: 'Annuler sans frais & Remettre en vente', sub: "L'article est réactivé en tête de liste" },
    { key: 'ARBITRATION', title: "Solliciter l'arbitrage d'un agent Dilchap", sub: 'Examen neutre par un modérateur' },
  ]
  const send = () => void respond({
    variables: { input: { disputeId: d.id, proposal, discountAmount: proposal === 'COURTESY_DISCOUNT' ? discount : undefined, message: message.trim() || undefined, photos } },
  }).then(onDone)

  return (
    <div className="rounded-2xl bg-surface-container-low p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="m-0 text-headline-sm text-on-surface">Espace de Réponse Vendeur</h3>
        <span className="rounded-md bg-surface-container-high px-2 py-1 text-label-sm text-on-surface-variant">Étape 2/3</span>
      </div>
      <div className="mt-4 text-label-sm uppercase text-on-surface-variant">Choisir une proposition rapide</div>
      <div className="mt-2 flex flex-col gap-2">
        {options.map(o => (
          <label key={o.key} className={`flex cursor-pointer gap-3 rounded-xl border bg-surface-lowest p-3 ${proposal === o.key ? 'border-primary' : 'border-outline-variant'}`}>
            <input type="radio" name={`proposal-${d.id}`} checked={proposal === o.key} onChange={() => setProposal(o.key)} className="mt-1 accent-[#BB0013]" />
            <span>
              <span className="block text-label-md text-on-surface">{o.title}</span>
              <span className="block text-body-sm text-on-surface-variant">{o.sub}</span>
              {o.key === 'COURTESY_DISCOUNT' && proposal === 'COURTESY_DISCOUNT' && (
                <span className="mt-2 flex items-center gap-2 text-body-sm text-on-surface-variant">
                  Montant :
                  <input type="number" min={0} step={500} value={discount} onChange={e => setDiscount(Math.max(0, Number(e.target.value) || 0))} className="w-28 rounded-lg border border-outline-variant bg-surface-lowest px-2 py-1 text-label-md text-on-surface" /> F
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4 text-label-sm uppercase text-on-surface-variant">Message explicatif à l'acheteur</div>
      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder={`Bonjour ${d.buyer.fullName.split(' ')[0]}, ...`} className="mt-2 w-full resize-none rounded-xl border border-outline-variant bg-surface-lowest p-3 text-body-md text-on-surface outline-none focus:border-primary" />
      <div className="mt-3"><PhotoPicker urls={photos} onChange={setPhotos} label="Ajouter des photos témoins avant remise" /></div>
      {error && <p className="m-0 mt-2 text-body-sm text-primary">{error.message}</p>}
      <button onClick={send} disabled={loading || (proposal === 'COURTESY_DISCOUNT' && discount <= 0)} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-4 py-3 text-label-md text-white hover:bg-primary-dark disabled:opacity-60">
        <Icon name="send" size={18} /> Envoyer ma réponse &amp; mes justificatifs
      </button>
      <p className="m-0 mt-2 text-center text-label-sm text-on-surface-variant">Garantie Dilchap : aucune pénalité tant que vous répondez dans les délais</p>
    </div>
  )
}

function FocusedDispute({ d, onSelectListing, onDone }: { d: Dispute; onSelectListing: (id: string) => void; onDone: () => void }) {
  const left = hoursLeft(d.deadlineAt)
  const open = disputeIsOpen(d.status)
  return (
    <section className="mt-5 overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
      <div className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3 ${open ? 'bg-primary-fixed/60' : 'bg-surface-container-low'}`}>
        <div className="flex items-center gap-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${open ? 'bg-primary' : 'bg-tertiary'}`}><Icon name={open ? 'priority_high' : 'task_alt'} size={18} /></span>
          <div>
            <div className={`text-label-sm uppercase ${open ? 'text-primary' : 'text-tertiary'}`}>{open ? (d.status === 'AWAITING_SELLER' ? 'Dossier prioritaire ouvert' : 'Dossier en cours') : 'Dossier clôturé'}</div>
            <div className="text-label-md text-on-surface">Litige #{d.reference} • Commande #{d.orderReference}</div>
          </div>
        </div>
        {d.status === 'AWAITING_SELLER' ? (
          <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-surface-lowest px-3 py-1 text-label-sm text-primary">
            <Icon name="schedule" size={14} /> Action requise avant le {new Date(d.deadlineAt).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })} ({left}h restantes)
          </span>
        ) : <DisputeStatusChip d={d} />}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          {d.listing && (
            <button onClick={() => onSelectListing(d.listing!.id)} className="flex w-full cursor-pointer gap-4 rounded-2xl border-none bg-surface-container-low p-4 text-left">
              <span className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-container">{d.listing.coverImageUrl && <img src={d.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-label-sm uppercase text-on-surface-variant">{d.listing.category.name}</span>
                  <span className="text-headline-sm font-extrabold text-primary"><Price amount={d.amount} currency={d.listing.currency} /></span>
                </span>
                <span className="block truncate text-headline-sm text-on-surface">{d.listing.title}</span>
                <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
                  {d.meetupPlace && <span className="flex items-center gap-1"><Icon name="pin_drop" size={15} /> Rdv : {d.meetupPlace}</span>}
                  {d.paymentMethod && <span className="flex items-center gap-1"><Icon name="account_balance_wallet" size={15} /> {PAYMENT_LABELS[d.paymentMethod] ?? d.paymentMethod}</span>}
                  <span className="flex items-center gap-1"><Icon name="calendar_today" size={15} /> {new Date(d.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </span>
              </span>
            </button>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-outline-variant p-3">
              <div className="text-label-sm uppercase text-on-surface-variant">{d.openedBy === 'BUYER' ? 'Acheteur réclamant' : 'Acheteur signalé'}</div>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">
                  {d.buyer.avatarUrl ? <img src={d.buyer.avatarUrl} alt="" className="h-full w-full object-cover" /> : d.buyer.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-label-md text-on-surface"><span className="truncate">{d.buyer.fullName}</span>{d.buyer.isVerified && <Icon name="check_circle" size={15} fill className="text-tertiary" />}</div>
                  <div className="text-body-sm text-on-surface-variant">{[d.buyer.city && `Résident ${d.buyer.city}`, d.buyer.buyerReviewsCount ? `★ ${d.buyer.buyerRating.toFixed(1)} · ${d.buyer.buyerReviewsCount} achat${d.buyer.buyerReviewsCount > 1 ? 's' : ''} noté${d.buyer.buyerReviewsCount > 1 ? 's' : ''}` : null].filter(Boolean).join(' • ') || 'Membre Dilchap'}</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-outline-variant p-3">
              <div className="text-label-sm uppercase text-on-surface-variant">Motif déclaré</div>
              <div className="mt-2 flex items-center gap-1 text-label-md text-primary"><Icon name={DISPUTE_REASON_ICONS[d.reason]} size={16} /> {DISPUTE_REASON_LABELS[d.reason]}</div>
              <p className="m-0 mt-1 line-clamp-3 text-body-sm italic text-on-surface-variant">« {d.description} »</p>
            </div>
          </div>

          <div className="mt-5 text-label-sm uppercase text-on-surface-variant">Chronologie de l'incident</div>
          <div className="mt-3"><DisputeTimeline d={d} perspective="SELLER" /></div>
        </div>

        <ResponsePanel key={d.id + d.status} d={d} onDone={onDone} />
      </div>
    </section>
  )
}

function ReportModal({ onClose }: { onClose: () => void }) {
  const { data } = useQuery<{ mySalesOrders: SalesOrder[] }>(MY_SALES_ORDERS_QUERY)
  const buyers = useMemo(() => {
    const seen = new Map<string, SalesOrder['buyer']>()
    ;(data?.mySalesOrders ?? []).forEach(o => seen.set(o.buyer.id, o.buyer))
    return [...seen.values()]
  }, [data])
  const [userId, setUserId] = useState('')
  const [reason, setReason] = useState<DisputeReason>('FAKE_PAYMENT')
  const [message, setMessage] = useState('')
  const [report, { loading, error, data: sent }] = useMutation(CREATE_REPORT_MUTATION)
  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-surface-lowest p-5 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-headline-sm text-on-surface">Signaler un comportement suspect</h3>
          <button onClick={onClose} className="flex cursor-pointer border-none bg-transparent p-1 text-on-surface-variant" aria-label="Fermer"><Icon name="close" size={22} /></button>
        </div>
        {sent ? (
          <p className="m-0 mt-4 text-body-md text-tertiary">Signalement transmis à la modération Dilchap. Merci de votre vigilance.</p>
        ) : (
          <>
            <label className="mt-4 block text-label-md text-on-surface">Acheteur concerné
              <select value={userId} onChange={e => setUserId(e.target.value)} className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-lowest px-3 py-2.5 text-body-md text-on-surface">
                <option value="">Choisir parmi vos acheteurs…</option>
                {buyers.map(b => <option key={b.id} value={b.id}>{b.fullName}{b.city ? ` — ${b.city}` : ''}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-label-md text-on-surface">Motif
              <select value={reason} onChange={e => setReason(e.target.value as DisputeReason)} className="mt-1 w-full rounded-xl border border-outline-variant bg-surface-lowest px-3 py-2.5 text-body-md text-on-surface">
                {(Object.keys(DISPUTE_REASON_LABELS) as DisputeReason[]).map(r => <option key={r} value={r}>{DISPUTE_REASON_LABELS[r]}</option>)}
              </select>
            </label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Décrivez ce qui s'est passé…" className="mt-3 w-full resize-none rounded-xl border border-outline-variant bg-surface-lowest p-3 text-body-md text-on-surface outline-none focus:border-primary" />
            {error && <p className="m-0 mt-1 text-body-sm text-primary">{error.message}</p>}
            <button disabled={!userId || loading} onClick={() => void report({ variables: { targetType: 'USER', targetUserId: userId, reason: DISPUTE_REASON_LABELS[reason], message: message.trim() || undefined } })} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-4 py-3 text-label-md text-white disabled:opacity-60">
              <Icon name="flag" size={18} /> Envoyer le signalement
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// "Gestion des Litiges & Signalements" (desktop + mobile "Dispute Detail
// Room"): the seller answers disputes opened on their hand-overs.
export default function Disputes({ onNavigate, onSelectListing, focusDisputeId, currentUser, onLogout }: Props) {
  const { data, refetch } = useQuery<{ mySellerDisputes: Dispute[] }>(MY_SELLER_DISPUTES_QUERY)
  const { data: statsData, refetch: refetchStats } = useQuery<{ myDisputeStats: DisputeStats }>(MY_DISPUTE_STATS_QUERY)
  const all = data?.mySellerDisputes ?? []
  const stats = statsData?.myDisputeStats
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')
  const [place, setPlace] = useState('')
  const [page, setPage] = useState(1)
  const [focusId, setFocusId] = useState<string | null>(focusDisputeId || null)
  const [reporting, setReporting] = useState(false)
  const rulesRef = useRef<HTMLDivElement>(null)
  const focusRef = useRef<HTMLDivElement>(null)

  const counts: Record<string, number> = {
    all: all.length,
    ...Object.fromEntries(TABS.filter(t => t.statuses).map(t => [t.key, all.filter(d => t.statuses!.includes(d.status)).length])),
  }
  const places = [...new Set(all.map(commune).filter(p => p !== '—'))]
  const filtered = all.filter(d => {
    const statuses = TABS.find(t => t.key === tab)?.statuses
    if (statuses && !statuses.includes(d.status)) return false
    if (reason && d.reason !== reason) return false
    if (place && commune(d) !== place) return false
    const q = search.trim().toLowerCase()
    return !q || [d.reference, d.orderReference, d.buyer.fullName, d.listing?.title ?? ''].some(x => x.toLowerCase().includes(q))
  })
  const focused = all.find(d => d.id === focusId)
    ?? all.find(d => d.status === 'AWAITING_SELLER')
    ?? all.find(d => disputeIsOpen(d.status))
  const history = filtered.filter(d => d.id !== focused?.id)
  const pages = Math.max(1, Math.ceil(history.length / PAGE))
  const shown = history.slice((page - 1) * PAGE, page * PAGE)
  const refresh = () => { void refetch(); void refetchStats() }
  const focus = (id: string) => { setFocusId(id); setTimeout(() => focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }

  return (
    <AccountLayout active="seller-disputes" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <nav className="hidden items-center gap-1 text-label-sm text-on-surface-variant md:flex">
            <span>Dilchap Seller</span><Icon name="chevron_right" size={14} />
            <button onClick={() => onNavigate('buyer-dashboard')} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-on-surface-variant hover:text-primary">Tableau de bord</button>
            <Icon name="chevron_right" size={14} /><span className="text-on-surface">Sécurité, Litiges &amp; Signalements</span>
          </nav>
          {currentUser?.isVerified && <span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-3 py-1 text-label-sm text-tertiary"><Icon name="shield_with_heart" size={15} /> Protocole P2P Dilchap vérifié</span>}
        </div>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl">
            <h1 className="m-0 flex flex-wrap items-center gap-2 text-headline-lg-mobile text-on-surface md:text-headline-lg">
              Gestion des Litiges &amp; Signalements
              {!!stats?.active && <span className="rounded-full bg-primary-fixed px-2.5 py-0.5 text-label-sm text-primary">{stats.active} En cours</span>}
            </h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">Consultez, gérez et résolvez en direct les signalements, annulations suspectes ou contestations d'acheteurs lors des remises en main propre.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => rulesRef.current?.scrollIntoView({ behavior: 'smooth' })} className="flex cursor-pointer items-center gap-2 rounded-xl border border-outline-variant bg-surface-lowest px-4 py-2.5 text-label-md text-on-surface hover:bg-surface-container-low"><Icon name="menu_book" size={18} /> Centre de Médiation &amp; Règles</button>
            <button onClick={() => setReporting(true)} className="flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white hover:bg-primary-dark"><Icon name="flag" size={18} /> Signaler un comportement suspect</button>
          </div>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <div className="flex items-start justify-between"><span className="text-label-sm uppercase text-on-surface-variant">Résolution amiable</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tertiary-soft text-tertiary"><Icon name="handshake" size={18} /></span></div>
            <div className="mt-2 text-headline-lg font-extrabold text-on-surface">{stats?.amicableRate != null ? `${formatNumber(stats.amicableRate)}%` : '—'}</div>
            <div className="flex flex-wrap justify-between gap-1 text-body-sm"><span className="flex items-center gap-1 text-tertiary"><Icon name="verified" size={14} fill /> {stats?.amicableRate == null || stats.amicableRate >= 95 ? 'Statut exemplaire' : 'À surveiller'}</span><span className="text-on-surface-variant">Objectif &gt; 95%</span></div>
          </div>
          <div className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <div className="flex items-start justify-between"><span className="text-label-sm uppercase text-on-surface-variant">Dossier en attente</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Icon name="timer" size={18} /></span></div>
            <div className="mt-2 text-headline-lg font-extrabold text-primary">{String(stats?.active ?? 0).padStart(2, '0')} <span className="text-body-sm font-normal text-on-surface-variant">dossier{(stats?.active ?? 0) > 1 ? 's' : ''} actif{(stats?.active ?? 0) > 1 ? 's' : ''}</span></div>
            {stats?.nextDeadline && <div className="mt-1 flex items-center gap-1 rounded-lg bg-primary-fixed/60 px-2 py-1 text-label-sm text-primary"><Icon name="priority_high" size={14} /> Délai d'action restant : {hoursLeft(stats.nextDeadline)}h</div>}
          </div>
          <div className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <div className="flex items-start justify-between"><span className="text-label-sm uppercase text-on-surface-variant">Clôturés avec succès</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface"><Icon name="task_alt" size={18} /></span></div>
            <div className="mt-2 text-headline-lg font-extrabold text-on-surface">{stats?.resolved ?? 0} <span className="text-body-sm font-normal text-on-surface-variant">résolus</span></div>
            <div className="text-body-sm text-on-surface-variant">{stats?.penalties ?? 0} pénalité{(stats?.penalties ?? 0) > 1 ? 's' : ''} appliquée{(stats?.penalties ?? 0) > 1 ? 's' : ''}</div>
          </div>
          <div className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <div className="flex items-start justify-between"><span className="text-label-sm uppercase text-on-surface-variant">Protection compte</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tertiary-soft text-tertiary"><Icon name="military_tech" size={18} /></span></div>
            <div className="mt-2 text-headline-sm text-on-surface">{currentUser?.isVerified ? 'Vendeur Vérifié' : 'Vendeur standard'}</div>
            <div className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-label-sm ${stats?.penalties ? 'bg-primary-fixed text-primary' : 'bg-tertiary-soft text-tertiary'}`}><Icon name="security" size={14} /> {stats?.penalties ? 'Surveillance renforcée' : 'Aucun blocage préventif'}</div>
          </div>
        </section>

        {/* Filters */}
        <section className="mt-5 rounded-2xl bg-surface-lowest p-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setPage(1) }} className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border-none px-3 py-2 text-label-md ${tab === t.key ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
                {t.dot && <span className={`h-2 w-2 rounded-full ${t.dot}`} />}{t.label}
                <span className={`rounded-full px-1.5 text-label-sm ${tab === t.key ? 'bg-white/20' : 'bg-surface-container-high'}`}>{counts[t.key] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-[1.4fr_1fr_1fr]">
            <label className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2">
              <Icon name="search" size={18} className="text-on-surface-variant" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Rechercher par référence (#LIT-xxxx), nom de l'acheteur..." className="w-full border-none bg-transparent text-body-md text-on-surface outline-none" />
            </label>
            <select value={reason} onChange={e => { setReason(e.target.value); setPage(1) }} className="rounded-xl border-none bg-surface-container-low px-3 py-2 text-body-md text-on-surface">
              <option value="">Tous les motifs de litige</option>
              {(Object.keys(DISPUTE_REASON_LABELS) as DisputeReason[]).map(r => <option key={r} value={r}>{DISPUTE_REASON_LABELS[r]}</option>)}
            </select>
            <select value={place} onChange={e => { setPlace(e.target.value); setPage(1) }} className="rounded-xl border-none bg-surface-container-low px-3 py-2 text-body-md text-on-surface">
              <option value="">Tous les lieux de remise</option>
              {places.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </section>

        <div ref={focusRef} className="scroll-mt-4">
          {focused ? <FocusedDispute d={focused} onSelectListing={onSelectListing} onDone={refresh} /> : (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-tertiary-soft p-5">
              <Icon name="verified_user" size={26} className="text-tertiary" />
              <div><div className="text-label-lg text-on-surface">Aucun litige en cours</div><div className="text-body-sm text-on-surface-variant">Vos remises se déroulent sans incident. Continuez à appliquer les règles d'or ci-dessous.</div></div>
            </div>
          )}
        </div>

        {/* History */}
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="m-0 text-headline-md text-on-surface">Historique des litiges &amp; signalements</h2>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Historique consolidé de vos contestations traitées avec l'équipe de modération Dilchap.</p>
            </div>
            <button onClick={() => exportCsv(filtered)} disabled={!filtered.length} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface hover:text-primary"><Icon name="download" size={17} /> Exporter le registre de conformité (.CSV)</button>
          </div>
          <div className="overflow-hidden rounded-2xl bg-surface-lowest shadow-sm">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low text-label-sm uppercase text-on-surface-variant">
                    {['Référence / Date', 'Article & Montant', "Motif de l'incident", 'Lieu', 'Statut & Verdict', 'Actions'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {shown.map(d => (
                    <tr key={d.id} className="border-0 border-b border-solid border-outline-variant/60 align-top">
                      <td className="px-4 py-3"><div className="text-label-md text-on-surface">#{d.reference}</div><div className="text-body-sm text-on-surface-variant">{fmtDate(d.createdAt)}</div></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-container">{d.listing?.coverImageUrl && <img src={d.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                          <div className="min-w-0"><div className="max-w-[200px] truncate text-label-md text-on-surface">{d.listing?.title ?? 'Annonce supprimée'}</div><div className="text-label-sm text-primary"><Price amount={d.amount} /></div></div>
                        </div>
                      </td>
                      <td className="max-w-[240px] px-4 py-3"><div className="flex items-center gap-1 text-label-sm text-primary"><Icon name={DISPUTE_REASON_ICONS[d.reason]} size={14} /> {DISPUTE_REASON_LABELS[d.reason]}</div><div className="truncate text-body-sm text-on-surface-variant">{d.description}</div></td>
                      <td className="px-4 py-3 text-body-sm text-on-surface"><span className="flex items-center gap-1"><Icon name="location_on" size={14} className="text-on-surface-variant" /> {commune(d)}</span></td>
                      <td className="px-4 py-3"><DisputeStatusChip d={d} /></td>
                      <td className="px-4 py-3"><button onClick={() => focus(d.id)} className="flex cursor-pointer border-none bg-transparent p-1 text-on-surface-variant hover:text-primary" aria-label="Voir le dossier"><Icon name="visibility" size={20} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col md:hidden">
              {shown.map(d => (
                <button key={d.id} onClick={() => focus(d.id)} className="flex cursor-pointer flex-col gap-2 border-0 border-b border-solid border-outline-variant/60 bg-transparent p-4 text-left">
                  <div className="flex items-center gap-3">
                    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container">{d.listing?.coverImageUrl && <img src={d.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1"><span className="truncate text-label-md text-on-surface">{d.listing?.title ?? 'Annonce supprimée'}</span><span className="shrink-0 text-label-sm text-on-surface-variant"><Price amount={d.amount} /></span></div>
                      <div className="text-body-sm text-on-surface-variant">Dossier #{d.reference} • {commune(d)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
                    <span className="truncate">{DISPUTE_REASON_LABELS[d.reason]}</span><DisputeStatusChip d={d} />
                  </div>
                </button>
              ))}
            </div>
            {shown.length === 0 && <p className="m-0 p-5 text-body-sm text-on-surface-variant">Aucun dossier ne correspond à ces filtres.</p>}
            <div className="flex items-center justify-between gap-2 px-4 py-3 text-label-sm text-on-surface-variant">
              <span>Affichage de {shown.length} sur {history.length} dossier{history.length > 1 ? 's' : ''}</span>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-label-sm text-on-surface disabled:opacity-40">Précédent</button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setPage(n)} className={`h-7 w-7 cursor-pointer rounded-md border-none text-label-sm ${n === page ? 'bg-primary text-white' : 'bg-transparent text-on-surface'}`}>{n}</button>
                ))}
                <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-label-sm text-on-surface disabled:opacity-40">Suivant</button>
              </div>
            </div>
          </div>
        </section>

        {/* Rules + mediation */}
        <section ref={rulesRef} className="mt-6 grid scroll-mt-4 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="shield" size={22} className="text-primary" /> Règles d'or anti-fraude Vendeur Dilchap</h2>
            <p className="m-0 mt-1 text-body-sm text-on-surface-variant">La remise en main propre sécurisée repose sur 3 principes stricts recommandés par notre charte de confiance :</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {ANTI_FRAUD_RULES.map((r, i) => (
                <div key={r.title} className="rounded-xl bg-surface-container-low p-3">
                  <div className={`flex items-center gap-1 text-label-md ${i === 2 ? 'text-tertiary' : 'text-primary'}`}><Icon name={r.icon} size={17} /> {r.title}</div>
                  <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
          <MediationCard whatsapp={stats?.mediationWhatsapp ?? null} />
        </section>
      </div>
      {reporting && <ReportModal onClose={() => setReporting(false)} />}
    </AccountLayout>
  )
}
