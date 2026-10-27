import EmptyState from '../../components/EmptyState'
import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { CheckCircle2, MessageSquare, MapPin, Calendar, ShieldCheck, ArrowRight, Wallet, Star, Clock, TrendingUp, CircleX } from '../../components/icons'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import ConfirmSheet from '../../components/ConfirmSheet'
import { AccountLayout } from '../account/AccountLayout'
import { PAYMENT_LABELS } from '../ListingDetail'
import { SET_CONVERSATION_DEAL_STATUS_MUTATION } from '../../graphql/messaging'
import { MY_SALES_ORDERS_QUERY, MY_SALES_ORDERS_STATS_QUERY, type SalesOrder, type SalesStage, type SalesStats } from '../../graphql/sellerHub'
import type { AuthUser } from '../../graphql/auth'
import SellerBadge from '../../components/SellerBadge'
import { Claim, useNoCommissionClaims } from '../../lib/site'
import { useT, fmtDate, fmtNumber, fmtCfa, cfaUnit } from '../../i18n'
import ordersNs from '../../i18n/ns/orders'
import common from '../../i18n/ns/common'

type Props = {
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
  onOpenConversation: (sellerOrBuyerId: string, listingId?: string) => void
  onOpenHandover: (orderId: string) => void
  onOpenDispute: (disputeId: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

// `short` labels keep every tab readable on a phone (mockup wording).
const TABS: { stage: SalesStage | 'OPEN', label: string, short: string }[] = [
  { stage: 'OPEN', get label() { return ordersNs.t('tab.open') }, get short() { return ordersNs.t('tab.openShort') } },
  { stage: 'PENDING', get label() { return ordersNs.t('tab.pending') }, get short() { return ordersNs.t('tab.pendingShort') } },
  { stage: 'DONE', get label() { return ordersNs.t('tab.done') }, get short() { return ordersNs.t('tab.doneShort') } },
  { stage: 'CANCELLED', get label() { return ordersNs.t('tab.cancelled') }, get short() { return ordersNs.t('tab.cancelledShort') } },
]
const compact = (n: number) => n >= 1e6 ? `${fmtNumber(n / 1e6, 1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : fmtNumber(n).replace(/\s/g, ' ')

const when = (iso: string) => fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

// « Mes ventes » (was the "Commandes & Envois" mockup): every direct deal from agreement in chat to
// hand-over. Stages come from real offers, meet-ups and deal status.
export default function Orders({ onNavigate, onSelectListing, onOpenConversation, onOpenHandover, onOpenDispute, currentUser, onLogout }: Props) {
  const t = useT(ordersNs)
  const noCommission = useNoCommissionClaims()
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

  const [cancelFor, setCancelFor] = useState<SalesOrder | null>(null)
  const cancel = (o: SalesOrder) => {
    void setDealStatus({ variables: { conversationId: o.id, status: 'NOT_CONCLUDED' } })
      .then(() => { void refetch(); void refetchStats() })
      .finally(() => setCancelFor(null))
  }

  return (
    <AccountLayout active="seller-orders" title={t('layoutTitle')} onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1120px] pb-6">
        <div className="mb-1 hidden items-center gap-1 text-label-sm uppercase text-primary lg:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {t('eyebrow')}<Claim>{t('eyebrowZero')}</Claim></div>
        <div className="mb-5 hidden flex-wrap items-end justify-between gap-3 lg:flex">
          <div>
            <h1 className="m-0 text-headline-lg-mobile text-on-surface md:text-headline-lg">{t('title')}</h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('intro')}</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-2 text-label-md text-on-surface"><CheckCircle2 size={16} className="text-tertiary" /> {t('p2p')}</span>
        </div>

        {/* Mobile: three mini KPIs in one row */}
        <section className={`grid gap-2 md:hidden ${noCommission ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="min-w-0 rounded-xl border border-outline-variant bg-surface-lowest p-2.5">
            <div className="truncate text-label-sm text-on-surface-variant">{t('kpi.activeMeetups')}</div>
            <div className="mt-0.5 text-headline-sm font-extrabold text-on-surface">{stats?.activeMeetups ?? 0}</div>
          </div>
          <div className="min-w-0 rounded-xl border border-outline-variant bg-surface-lowest p-2.5">
            <div className="truncate text-label-sm text-on-surface-variant">{t('kpi.inProgress')}</div>
            <div className="mt-0.5 whitespace-nowrap text-headline-sm font-extrabold text-on-surface">{compact(stats?.volumeInProgress ?? 0)}<span className="price-unit">{cfaUnit()}</span></div>
          </div>
          <Claim><div className="min-w-0 rounded-xl bg-tertiary-soft p-2.5">
            <div className="truncate text-label-sm text-tertiary">{t('kpi.commission')}</div>
            <div className="mt-0.5 whitespace-nowrap text-headline-sm font-extrabold text-tertiary">{fmtCfa(0)}</div>
          </div></Claim>
        </section>

        {/* KPIs */}
        <section className={`hidden grid-cols-2 gap-3 md:grid ${noCommission ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {[
            { label: t('kpi.activeMeetups'), value: stats?.activeMeetups ?? 0, sub: t('kpi.confirmedMeetups'), icon: 'handshake', box: 'bg-primary-fixed text-primary' },
            { label: t('kpi.volume'), value: <Price amount={stats?.volumeInProgress ?? 0} />, sub: t('kpi.volumeSub'), icon: 'account_balance_wallet', box: 'bg-tertiary-soft text-tertiary' },
            { label: t('kpi.rate'), value: stats?.conversionRate != null ? `${stats.conversionRate}%` : '—', sub: <span className="flex items-center gap-1 text-tertiary"><TrendingUp size={13} /> {t('kpi.rateSub')}</span>, icon: 'verified', box: 'bg-surface-container text-on-surface' },
            ...(noCommission ? [{ label: t('kpi.commissionTaken'), value: <span className="text-primary">{t('kpi.zeroCfa')}</span>, sub: <span className="text-tertiary">{t('kpi.saving')}</span>, icon: 'sell', box: 'bg-primary text-white' }] : []),
          ].map(k => (
            <div key={k.icon} className="flex items-start justify-between gap-2 rounded-xl border border-outline-variant bg-surface-lowest p-4">
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
        <div className="mt-4 flex gap-2 overflow-x-auto rounded-xl bg-surface-lowest p-2 [scrollbar-width:none] md:mt-5">
          {TABS.map(tb => (
            <button key={tb.stage} onClick={() => setTab(tb.stage)} className={`flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border-none px-3 py-2 text-label-md ${tab === tb.stage ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
              <span className="md:hidden">{tb.short}</span><span className="hidden md:inline">{tb.label}</span> <span className={`rounded-full px-1.5 text-label-sm ${tab === tb.stage ? 'bg-white/20' : 'bg-surface-container-high'}`}>{counts[tb.stage]}</span>
            </button>
          ))}
        </div>

        {/* Orders */}
        <div className="mt-4 flex flex-col gap-4">
          {shown.length === 0 && (
            <EmptyState icon="empty-box" fallback="inventory_2" title={t('empty.title')} text={t('empty.text')} />
          )}
          {shown.map(o => {
            const m = o.meetup
            const step2 = m?.status === 'CONFIRMED' ? 'done' : m ? 'current' : o.acceptedOffer ? 'current' : 'todo'
            const final = o.stage === 'DONE' || o.stage === 'CANCELLED'
            const statusChip = o.stage === 'DONE' ? { t: t('chip.done'), c: 'bg-tertiary-soft text-tertiary' }
              : o.stage === 'CANCELLED' ? { t: t('chip.cancelled'), c: 'bg-surface-container-high text-on-surface-variant' }
                : m?.status === 'CONFIRMED' ? { t: t('chip.confirmed'), c: 'bg-tertiary-soft text-tertiary' }
                  : m ? { t: t('chip.proposed'), c: 'bg-amber-100 text-amber-800' } : { t: t('chip.toArrange'), c: 'bg-surface-container-high text-on-surface-variant' }
            return (
              <article key={o.id} className={`overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest ${o.stage === 'IN_PROGRESS' ? 'border-t-4 border-t-primary' : ''}`}>
                <div className="p-4 md:p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-headline-sm font-extrabold text-on-surface">#{o.reference}</span>
                    <span className="rounded bg-surface-container-high px-2 py-0.5 text-label-sm uppercase text-on-surface-variant">{o.acceptedOffer ? t('agreementFinal') : t('listedPrice')}</span>
                    <span className={`rounded-full px-2 py-0.5 text-label-sm ${statusChip.c}`}>● {statusChip.t}</span>
                    <span className="flex items-center gap-1 text-body-sm text-on-surface-variant md:ml-auto"><Calendar size={14} /> {t('agreedOn', { date: fmtDate(o.agreedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}</span>
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
                          {o.listing.size && <span className="rounded bg-surface-container px-1.5">{common.t('size', { size: o.listing.size })}</span>}
                          {o.acceptedOffer && o.listing.price && o.acceptedOffer.amount !== o.listing.price && <span>{t.rich('insteadOf', { price: <Price amount={o.listing.price} currency={o.listing.currency} /> })}</span>}
                        </span>
                      </span>
                    </button>

                    <div className="rounded-xl bg-surface-container-low p-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high font-bold text-on-surface-variant">
                          {o.buyer.avatarUrl ? <img src={o.buyer.avatarUrl} alt="" className="h-full w-full object-cover" /> : o.buyer.fullName.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-label-lg text-on-surface"><span className="truncate">{o.buyer.fullName}</span><SellerBadge tier={o.buyer.badge} size={15} /></div>
                          <div className="flex items-center gap-1 text-body-sm text-on-surface-variant">
                            {o.buyer.city && <span className="truncate">{o.buyer.city}</span>}
                            {!!o.buyer.buyerReviewsCount && <><Star size={12} fill="#F59E0B" color="#F59E0B" /> {t('buyerRating', { rating: o.buyer.buyerRating.toFixed(1), count: o.buyer.buyerReviewsCount })}</>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => onOpenConversation(o.buyer.id, o.listing.id)} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-surface-lowest py-2 text-label-md text-on-surface hover:bg-surface-container"><MessageSquare size={15} /> {t('openChat')}</button>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tertiary-soft text-tertiary"><MapPin size={17} /></span>
                        <div className="text-body-sm">
                          <div className="text-label-sm uppercase text-on-surface-variant">{t('place')}</div>
                          {m ? <><div className="font-semibold text-on-surface">{m.place}</div><div className="text-primary first-letter:uppercase">{when(m.scheduledAt)}</div></>
                            : <div className="text-on-surface-variant">{o.listing.meetupSpot ? t('suggested', { spot: o.listing.meetupSpot }) : t('toArrangeInChat')}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Wallet size={17} /></span>
                        <div className="text-body-sm">
                          <div className="text-label-sm uppercase text-on-surface-variant">{t('payment')}</div>
                          <div className="font-semibold text-on-surface">{o.listing.paymentMethods.length ? o.listing.paymentMethods.map(p => PAYMENT_LABELS[p] ?? p).join(', ') : t('atHandover')}</div>
                          <div className="text-on-surface-variant">{t.rich('exactAmount', { price: <Price amount={o.agreedPrice} currency={o.listing.currency} /> })}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stepper */}
                  {/* Mobile: compact 3-column frieze (short labels); desktop adds the detail line. */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-surface-container-low p-3 md:gap-3">
                    {[
                      { title: t('step1.title'), short: t('step1.short'), sub: o.acceptedOffer ? t('step1.offer') : t('step1.price'), state: 'done' },
                      { title: t('step2.title'), short: m?.status === 'CONFIRMED' ? t('step2.shortAgreed') : t('step2.short'), sub: m ? `${m.place} — ${fmtDate(m.scheduledAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : t('step2.toPropose'), state: final ? 'done' : step2 },
                      { title: t('step3.title'), short: o.stage === 'CANCELLED' ? t('step3.cancelled') : t('step3.short'), sub: o.stage === 'DONE' ? t('step3.done') : o.stage === 'CANCELLED' ? t('step3.saleCancelled') : t('step3.todo'), state: o.stage === 'DONE' ? 'done' : o.stage === 'CANCELLED' ? 'cancel' : 'todo' },
                    ].map((s, i) => (
                      <div key={s.title} className="flex min-w-0 flex-col items-center gap-1 text-center md:flex-row md:gap-2 md:text-left">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-label-md ${s.state === 'done' ? 'bg-tertiary text-white' : s.state === 'current' ? 'bg-primary text-white' : s.state === 'cancel' ? 'bg-surface-container-high text-on-surface-variant' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          {s.state === 'done' ? <CheckCircle2 size={16} /> : s.state === 'current' ? <Clock size={16} /> : s.state === 'cancel' ? <CircleX size={16} /> : i + 1}
                        </span>
                        <div className="min-w-0 max-w-full text-body-sm">
                          <div className={`whitespace-nowrap text-label-sm md:hidden ${s.state === 'current' ? 'text-primary' : 'text-on-surface'}`}>{s.short}</div>
                          <div className={`hidden font-semibold md:block ${s.state === 'current' ? 'text-primary' : 'text-on-surface'}`}>{s.title}</div>
                          <div className="hidden truncate text-on-surface-variant md:block">{s.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {o.disputeId && (
                    <button onClick={() => onOpenDispute(o.disputeId!)} className="mt-3 flex w-full cursor-pointer items-center gap-2 rounded-xl border-none bg-primary-fixed/60 px-3 py-2 text-left text-label-md text-primary">
                      <Icon name="gavel" size={17} /> <span className="flex-1"><span className="max-[380px]:hidden">{t('dispute')}</span><span className="min-[380px]:hidden">{t('disputeShort')}</span></span> <ArrowRight size={15} />
                    </button>
                  )}
                  {!final && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button onClick={() => onOpenConversation(o.buyer.id, o.listing.id)} className="flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-surface-container-high px-3 text-label-md text-on-surface max-md:flex-1 md:h-auto md:py-2"><Calendar size={15} /> {m ? t('editMeetup') : t('proposeMeetup')}</button>
                      <button onClick={() => setCancelFor(o)} disabled={closing} className="flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-surface-container-high px-3 text-label-md text-on-surface max-md:flex-1 md:h-auto md:py-2"><CircleX size={15} /> {t('cancel')}</button>
                      <button
                        onClick={() => onOpenHandover(o.id)}
                        disabled={m?.status !== 'CONFIRMED'}
                        title={m?.status !== 'CONFIRMED' ? t('codeAfterConfirm') : undefined}
                        className="flex h-11 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-none bg-primary px-4 text-label-md text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50 max-md:order-first max-md:w-full md:ml-auto md:h-auto md:py-2"
                      ><Icon name="done_all" size={17} /> {t('confirmHandover')}</button>
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
            <div className="flex items-center gap-2 text-headline-sm text-on-surface">{t('rules.title')} <span className="rounded bg-tertiary-soft px-1.5 text-label-sm text-tertiary">{t('rules.badge')}</span></div>
            <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('rules.text')}</p>
          </div>
        </section>
        <ConfirmSheet
          open={!!cancelFor}
          title={t('cancelSheet.title')}
          confirmLabel={t('cancelSheet.confirm')}
          tone="danger"
          loading={closing}
          onConfirm={() => cancelFor && cancel(cancelFor)}
          onClose={() => setCancelFor(null)}
        >
          {cancelFor && t('cancelSheet.text', { title: cancelFor.listing.title, name: cancelFor.buyer.fullName })}
        </ConfirmSheet>
      </div>
    </AccountLayout>
  )
}
