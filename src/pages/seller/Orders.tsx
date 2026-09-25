import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { CheckCircle2, BadgeCheck, MessageSquare, MapPin, Calendar, ShieldCheck, ArrowRight, Wallet, Star, Clock, TrendingUp, CircleX } from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import { PAYMENT_LABELS } from '../ListingDetail'
import { SET_CONVERSATION_DEAL_STATUS_MUTATION } from '../../graphql/messaging'
import { MY_SALES_ORDERS_QUERY, MY_SALES_ORDERS_STATS_QUERY, type SalesOrder, type SalesStage, type SalesStats } from '../../graphql/sellerHub'
import type { AuthUser } from '../../graphql/auth'

type Props = {
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
  onOpenConversation: (sellerOrBuyerId: string, listingId?: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

const TABS: { stage: SalesStage | 'OPEN', label: string }[] = [
  { stage: 'OPEN', label: 'En cours / RDV planifiés' },
  { stage: 'PENDING', label: 'En attente de confirmation' },
  { stage: 'DONE', label: 'Terminées & remises' },
  { stage: 'CANCELLED', label: 'Annulées' },
]

const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

// "Commandes & Envois" mockup: every direct deal from agreement in chat to
// hand-over. Stages come from real offers, meet-ups and deal status.
export default function Orders({ onNavigate, onSelectListing, onOpenConversation, currentUser, onLogout }: Props) {
  const { data, refetch } = useQuery<{ mySalesOrders: SalesOrder[] }>(MY_SALES_ORDERS_QUERY)
  const { data: statsData, refetch: refetchStats } = useQuery<{ mySalesOrdersStats: SalesStats }>(MY_SALES_ORDERS_STATS_QUERY)
  const orders = data?.mySalesOrders ?? []
  const stats = statsData?.mySalesOrdersStats
  const [tab, setTab] = useState<SalesStage | 'OPEN'>('OPEN')
  const [setDealStatus, { loading: closing }] = useMutation(SET_CONVERSATION_DEAL_STATUS_MUTATION)

  const counts: Record<string, number> = {
    OPEN: orders.filter(o => o.stage === 'IN_PROGRESS' || o.stage === 'PENDING').length,
    PENDING: stats?.pending ?? 0, DONE: stats?.done ?? 0, CANCELLED: stats?.cancelled ?? 0,
  }
  const shown = orders.filter(o => tab === 'OPEN' ? o.stage === 'IN_PROGRESS' || o.stage === 'PENDING' : o.stage === tab)

  const close = (o: SalesOrder, status: 'CONCLUDED' | 'NOT_CONCLUDED') => {
    const text = status === 'CONCLUDED'
      ? `Confirmer la remise de « ${o.listing.title} » ? L'annonce sera marquée comme vendue.`
      : `Annuler la vente de « ${o.listing.title} » à ${o.buyer.fullName} ?`
    if (!window.confirm(text)) return
    void setDealStatus({ variables: { conversationId: o.id, status } }).then(() => { void refetch(); void refetchStats() })
  }

  return (
    <AccountLayout active="seller-orders" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1120px] pb-6">
        <div className="mb-1 flex items-center gap-1 text-label-sm uppercase text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Espace vendeur direct • Zéro commission</div>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">Commandes &amp; Envois</h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">Suivi de vos transactions directes, remises en main propre et livraisons convenues.</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-2 text-label-md text-on-surface"><CheckCircle2 size={16} className="text-tertiary" /> Transactions 100% P2P</span>
        </div>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'RDV actifs', value: stats?.activeMeetups ?? 0, sub: 'Rendez-vous confirmés', icon: 'handshake', box: 'bg-primary-fixed text-primary' },
            { label: 'Volume en cours', value: <Price amount={stats?.volumeInProgress ?? 0} />, sub: 'Paiements directs à la remise', icon: 'account_balance_wallet', box: 'bg-tertiary-soft text-tertiary' },
            { label: 'Taux de concrétisation', value: stats?.conversionRate != null ? `${stats.conversionRate}%` : '—', sub: <span className="flex items-center gap-1 text-tertiary"><TrendingUp size={13} /> ventes conclues / clôturées</span>, icon: 'verified', box: 'bg-surface-container text-on-surface' },
            { label: 'Commission prélevée', value: <span className="text-primary">0 F CFA</span>, sub: <span className="text-tertiary">Économie directe : 100%</span>, icon: 'sell', box: 'bg-primary text-white' },
          ].map(k => (
            <div key={k.label} className="flex items-start justify-between gap-2 rounded-xl border border-outline-variant bg-surface-lowest p-4">
              <div>
                <div className="text-label-sm uppercase text-on-surface-variant">{k.label}</div>
                <div className="mt-1 text-headline-md font-extrabold text-on-surface">{k.value}</div>
                <div className="text-body-sm text-on-surface-variant">{k.sub}</div>
              </div>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${k.box}`}><Icon name={k.icon} size={22} /></span>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <div className="mt-5 flex gap-2 overflow-x-auto rounded-xl bg-surface-lowest p-2">
          {TABS.map(t => (
            <button key={t.stage} onClick={() => setTab(t.stage)} className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border-none px-3 py-2 text-label-md ${tab === t.stage ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
              {t.label} <span className={`rounded-full px-1.5 text-label-sm ${tab === t.stage ? 'bg-white/20' : 'bg-surface-container-high'}`}>{counts[t.stage]}</span>
            </button>
          ))}
        </div>

        {/* Orders */}
        <div className="mt-4 flex flex-col gap-4">
          {shown.length === 0 && (
            <div className="rounded-2xl bg-surface-container-low p-10 text-center">
              <p className="m-0 text-headline-sm text-on-surface">Aucune commande ici</p>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Une vente apparaît dès qu'une offre est acceptée ou qu'un rendez-vous est proposé dans le chat.</p>
            </div>
          )}
          {shown.map(o => {
            const m = o.meetup
            const step2 = m?.status === 'CONFIRMED' ? 'done' : m ? 'current' : o.acceptedOffer ? 'current' : 'todo'
            const final = o.stage === 'DONE' || o.stage === 'CANCELLED'
            const statusChip = o.stage === 'DONE' ? { t: 'Remise effectuée', c: 'bg-tertiary-soft text-tertiary' }
              : o.stage === 'CANCELLED' ? { t: 'Annulée', c: 'bg-surface-container-high text-on-surface-variant' }
                : m?.status === 'CONFIRMED' ? { t: 'RDV confirmé', c: 'bg-tertiary-soft text-tertiary' }
                  : m ? { t: 'RDV proposé', c: 'bg-amber-100 text-amber-800' } : { t: 'RDV à convenir', c: 'bg-surface-container-high text-on-surface-variant' }
            return (
              <article key={o.id} className={`overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest ${o.stage === 'IN_PROGRESS' ? 'border-t-4 border-t-primary' : ''}`}>
                <div className="p-4 md:p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-headline-sm font-extrabold text-on-surface">#{o.reference}</span>
                    <span className="rounded bg-surface-container-high px-2 py-0.5 text-label-sm uppercase text-on-surface-variant">{o.acceptedOffer ? 'Accord finalisé' : 'Prix affiché'}</span>
                    <span className={`rounded-full px-2 py-0.5 text-label-sm ${statusChip.c}`}>● {statusChip.t}</span>
                    <span className="ml-auto flex items-center gap-1 text-body-sm text-on-surface-variant"><Calendar size={14} /> Accord le {new Date(o.agreedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1.1fr]">
                    <button onClick={() => onSelectListing(o.listing.id)} className="flex min-w-0 cursor-pointer gap-3 border-none bg-transparent p-0 text-left">
                      <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container-low">{o.listing.coverImageUrl && <img src={o.listing.coverImageUrl} alt="" className="h-full w-full object-cover" />}</span>
                      <span className="min-w-0">
                        <span className="block text-label-sm uppercase text-primary">{o.listing.category.name}</span>
                        <span className="block truncate text-headline-sm text-on-surface">{o.listing.title}</span>
                        <span className="block text-headline-sm font-extrabold text-primary"><Price amount={o.agreedPrice} currency={o.listing.currency} /></span>
                        <span className="mt-1 flex flex-wrap gap-1.5 text-body-sm text-on-surface-variant">
                          {o.listing.condition && o.listing.condition !== 'N/A' && <span className="rounded bg-surface-container px-1.5">{o.listing.condition}</span>}
                          {o.listing.size && <span className="rounded bg-surface-container px-1.5">Taille {o.listing.size}</span>}
                          {o.acceptedOffer && o.listing.price && o.acceptedOffer.amount !== o.listing.price && <span>au lieu de <Price amount={o.listing.price} currency={o.listing.currency} /></span>}
                        </span>
                      </span>
                    </button>

                    <div className="rounded-xl bg-surface-container-low p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high font-bold text-on-surface-variant">
                          {o.buyer.avatarUrl ? <img src={o.buyer.avatarUrl} alt="" className="h-full w-full object-cover" /> : o.buyer.fullName.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-label-lg text-on-surface"><span className="truncate">{o.buyer.fullName}</span>{o.buyer.isVerified && <BadgeCheck size={15} className="text-tertiary" />}</div>
                          <div className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                            {o.buyer.city && <span className="truncate">{o.buyer.city}</span>}
                            {!!o.buyer.reviewsCount && <><Star size={12} fill="#F59E0B" color="#F59E0B" /> {o.buyer.averageRating.toFixed(1)}</>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => onOpenConversation(o.buyer.id, o.listing.id)} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-surface-lowest py-2 text-label-md text-on-surface hover:bg-surface-container"><MessageSquare size={15} /> Ouvrir le chat direct Dilchap</button>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tertiary-soft text-tertiary"><MapPin size={17} /></span>
                        <div className="text-body-sm">
                          <div className="text-label-sm uppercase text-on-surface-variant">Lieu de remise convenu</div>
                          {m ? <><div className="font-semibold text-on-surface">{m.place}</div><div className="capitalize text-primary">{when(m.scheduledAt)}</div></>
                            : <div className="text-on-surface-variant">{o.listing.meetupSpot ? `Suggéré : ${o.listing.meetupSpot}` : 'À convenir dans le chat'}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Wallet size={17} /></span>
                        <div className="text-body-sm">
                          <div className="text-label-sm uppercase text-on-surface-variant">Paiement direct convenu</div>
                          <div className="font-semibold text-on-surface">{o.listing.paymentMethods.length ? o.listing.paymentMethods.map(p => PAYMENT_LABELS[p] ?? p).join(', ') : 'À la remise'}</div>
                          <div className="text-on-surface-variant">Montant exact : <Price amount={o.agreedPrice} currency={o.listing.currency} /></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stepper */}
                  <div className="mt-4 grid gap-3 rounded-xl bg-surface-container-low p-3 md:grid-cols-3">
                    {[
                      { title: '1. Accord & Chat', sub: o.acceptedOffer ? 'Offre acceptée • Validé' : 'Prix fixé • Validé', state: 'done' },
                      { title: '2. Rendez-vous convenu', sub: m ? `${m.place} — ${new Date(m.scheduledAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'À proposer dans le chat', state: final ? 'done' : step2 },
                      { title: '3. Remise & Règlement', sub: o.stage === 'DONE' ? 'Objet remis et payé' : o.stage === 'CANCELLED' ? 'Vente annulée' : 'Objet testé puis payé', state: o.stage === 'DONE' ? 'done' : o.stage === 'CANCELLED' ? 'cancel' : 'todo' },
                    ].map((s, i) => (
                      <div key={s.title} className="flex items-center gap-2">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-md ${s.state === 'done' ? 'bg-tertiary text-white' : s.state === 'current' ? 'bg-primary text-white' : s.state === 'cancel' ? 'bg-surface-container-high text-on-surface-variant' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          {s.state === 'done' ? <CheckCircle2 size={16} /> : s.state === 'current' ? <Clock size={16} /> : s.state === 'cancel' ? <CircleX size={16} /> : i + 1}
                        </span>
                        <div className="min-w-0 text-body-sm">
                          <div className={`font-semibold ${s.state === 'current' ? 'text-primary' : 'text-on-surface'}`}>{s.title}</div>
                          <div className="truncate text-on-surface-variant">{s.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!final && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button onClick={() => onOpenConversation(o.buyer.id, o.listing.id)} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-container-high px-3 py-2 text-label-md text-on-surface"><Calendar size={15} /> {m ? 'Modifier le RDV' : 'Proposer un RDV'}</button>
                      <button onClick={() => close(o, 'NOT_CONCLUDED')} disabled={closing} className="flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-surface-container-high px-3 py-2 text-label-md text-on-surface"><CircleX size={15} /> Annuler</button>
                      <button onClick={() => close(o, 'CONCLUDED')} disabled={closing} className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-primary px-4 py-2 text-label-md text-white hover:bg-primary-dark"><CheckCircle2 size={16} /> Confirmer la remise effectuée</button>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <section className="mt-6 flex flex-col gap-3 rounded-2xl border-l-4 border-solid border-l-primary bg-surface-container-low p-5 md:flex-row md:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><ShieldCheck size={22} /></span>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-headline-sm text-on-surface">Règles d'or pour vos remises en main propre <span className="rounded bg-tertiary-soft px-1.5 text-label-sm text-tertiary">Sécurité Dilchap</span></div>
            <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Ne donnez jamais l'objet avant d'avoir vérifié la réception des fonds sur votre compte Wave ou Orange Money (ne vous fiez jamais à un SMS transféré). Privilégiez les espaces publics et lumineux.</p>
          </div>
          <button onClick={() => onNavigate('seller-listings')} className="flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary hover:underline">Mes annonces <ArrowRight size={15} /></button>
        </section>
      </div>
    </AccountLayout>
  )
}
