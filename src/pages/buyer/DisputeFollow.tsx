import ListingThumb from '../../components/ListingThumb'
import EmptyState from '../../components/EmptyState'
import SupportAboutButton from '../../components/SupportAboutButton'
import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import SafeImg from '../../components/SafeImg'
import { AccountLayout } from '../account/AccountLayout'
import { DisputeStatusChip, DisputeTimeline, MediationCard, hoursLeft } from '../../components/DisputeParts'
import { BuyerTabs, Breadcrumb, TrustFooter } from './BuyerShared'
import {
  ANSWER_DISPUTE_PROPOSAL_MUTATION, MY_BUYER_DISPUTES_QUERY, MY_DISPUTE_STATS_QUERY, disputeIsOpen,
  type Dispute, type DisputeStats,
} from '../../graphql/sellerTools'
import type { AuthUser } from '../../graphql/auth'
import SellerBadge from '../../components/SellerBadge'
import { useDisputeLabel } from '../../lib/lists'
import { fmtDate, useT } from '../../i18n'
import common from '../../i18n/ns/common'
import disputes from '../../i18n/ns/disputes'

type Props = {
  focusDisputeId?: string
  onNavigate: (p: any) => void
  onSelectDispute: (id: string) => void
  onOpenConversation: (sellerId: string, listingId?: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

function Banner({ d }: { d: Dispute }) {
  const t = useT(disputes)
  const first = d.seller.fullName
  const map: Record<string, { title: string; tone: string; chip: string }> = {
    AWAITING_BUYER: { title: t('follow.banner.awaitingBuyer', { name: first }), tone: 'border-l-primary', chip: t('follow.banner.actionRequired') },
    AWAITING_SELLER: { title: t('follow.banner.awaitingSeller', { name: first }), tone: 'border-l-outline-variant', chip: t('follow.banner.mediationActive') },
    IN_MEDIATION: { title: t('follow.banner.inMediation'), tone: 'border-l-primary', chip: t('follow.banner.arbitration') },
  }
  const m = map[d.status]
  const open = disputeIsOpen(d.status)
  return (
    <section className={`flex flex-wrap items-center gap-4 rounded-2xl border-0 border-l-4 border-solid bg-surface-lowest p-4 shadow-sm ${m?.tone ?? 'border-l-tertiary'}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${open ? 'bg-primary-fixed text-primary' : 'bg-tertiary-soft text-tertiary'}`}><Icon name={open ? 'gavel' : 'task_alt'} size={22} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {m ? <span className="rounded-full bg-primary px-2 py-0.5 text-label-sm uppercase text-white">{m.chip}</span> : <DisputeStatusChip d={d} />}
          {(d.status === 'AWAITING_BUYER' || d.status === 'AWAITING_SELLER') && <span className="text-label-sm text-on-surface-variant">{t('follow.hoursLeft', { h: hoursLeft(d.deadlineAt) })}</span>}
        </div>
        <div className="mt-1 text-headline-sm text-on-surface">{m?.title ?? t('follow.closedVerdict', { verdict: d.verdict ?? '' })}</div>
      </div>
      {/* Mobile shows the amount on the transaction card instead */}
      <div className="hidden sm:block sm:w-auto sm:text-right">
        <div className="text-label-sm text-on-surface-variant">{t('follow.purchaseAmount')}</div>
        <div className="text-headline-sm font-extrabold text-tertiary"><Price amount={d.amount} currency={d.listing?.currency} /> {open && <Icon name="lock" size={16} />}</div>
      </div>
    </section>
  )
}

function Decision({ d, onDone }: { d: Dispute; onDone: () => void }) {
  const t = useT(disputes)
  const [answer, { loading, error }] = useMutation(ANSWER_DISPUTE_PROPOSAL_MUTATION)
  const [message, setMessage] = useState('')
  const sellerEvent = [...d.events].reverse().find(e => e.actor === 'SELLER')
  const netAmount = d.proposal === 'COURTESY_DISCOUNT' ? Math.max(0, d.amount - (d.discountAmount ?? 0)) : d.amount
  const decide = (decision: 'ACCEPT' | 'CANCEL' | 'ARBITRATION') => {
    const confirmText = { ACCEPT: t('follow.confirm.accept'), CANCEL: t('follow.confirm.cancel'), ARBITRATION: t('follow.confirm.arbitration') }[decision]
    if (!window.confirm(confirmText)) return
    void answer({ variables: { input: { disputeId: d.id, decision, message: message.trim() || undefined } } }).then(onDone)
  }

  if (!d.proposal) return null
  return (
    <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-lg:order-2 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-label-sm uppercase text-on-surface-variant">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> {t('follow.lastOffer')}</span>
        {sellerEvent && <span>{t('follow.receivedOn', { date: fmtDate(sellerEvent.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl bg-surface-container-low p-4">
        <div className="min-w-0 flex-1">
          <div className="text-label-sm uppercase text-tertiary">{t('follow.proposedSolution')}</div>
          <div className="text-headline-sm text-on-surface">
            {d.proposal === 'COURTESY_DISCOUNT' ? t.rich('follow.proposal.discount', { price: <Price amount={d.discountAmount} /> }) : d.proposal === 'CANCEL_RELIST' ? t('follow.proposal.cancel') : t('follow.proposal.arbitration')}
          </div>
        </div>
        {d.proposal === 'COURTESY_DISCOUNT' && (
          <div className="rounded-xl bg-surface-lowest px-4 py-2 text-right shadow-sm">
            <div className="text-label-sm text-on-surface-variant line-through">{t.rich('follow.initialPrice', { price: <Price amount={d.amount} /> })}</div>
            <div className="text-headline-md font-extrabold text-primary"><Price amount={netAmount} /></div>
            <div className="text-label-sm text-tertiary">{t.rich('follow.offPrice', { price: <Price amount={d.discountAmount} /> })}</div>
          </div>
        )}
      </div>
      {sellerEvent?.body && (
        <div className="mt-3 rounded-xl bg-surface-container-low p-4">
          <div className="flex items-center gap-2 text-label-md text-on-surface">{d.seller.fullName}<SellerBadge tier={d.seller.badge} size={15} /></div>
          <p className="m-0 mt-1 text-body-md italic text-on-surface-variant">« {sellerEvent.body} »</p>
        </div>
      )}
      {(sellerEvent?.photos.length || d.photos.length) ? (
        <>
          <div className="mt-4 flex items-center gap-2 text-label-md text-on-surface"><Icon name="compare" size={18} className="text-primary" /> {t('follow.compare')}</div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[{ label: t('follow.sellerPhotos'), urls: sellerEvent?.photos ?? [], cls: 'bg-inverse-surface' }, { label: t('follow.yourFindings'), urls: d.photos, cls: 'bg-primary' }].map(g => (
              <div key={g.label} className="overflow-hidden rounded-xl bg-surface-container-low">
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-container">
                  {g.urls[0] ? <a href={g.urls[0]} target="_blank" rel="noreferrer" className="block h-full"><img src={g.urls[0]} alt="" className="h-full w-full object-cover" /></a> : <span className="flex h-full items-center justify-center text-body-sm text-on-surface-variant">{t('follow.noPhoto')}</span>}
                  <span className={`absolute left-2 top-2 rounded px-2 py-0.5 text-label-sm text-white ${g.cls}`}>{g.label}</span>
                </div>
                {g.urls.length > 1 && <div className="px-2 py-1 text-label-sm text-on-surface-variant">{t('follow.morePhotos', { count: g.urls.length - 1 })}</div>}
              </div>
            ))}
          </div>
        </>
      ) : null}

      {d.status === 'AWAITING_BUYER' && (
        <>
          <div className="mt-5 text-label-sm uppercase text-on-surface-variant">{t('follow.yourDecision')}</div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder={t('follow.messagePlaceholder')} className="mt-2 w-full resize-none rounded-xl border border-outline-variant bg-surface-lowest p-3 text-body-md text-on-surface outline-none focus:border-primary" />
          <button onClick={() => decide('ACCEPT')} disabled={loading} className="mt-2 flex w-full cursor-pointer items-center gap-3 rounded-xl border-none bg-tertiary px-4 py-3 text-left text-white disabled:opacity-60">
            <Icon name="check_circle" size={22} />
            <span className="flex-1"><span className="block text-label-lg">{d.proposal === 'COURTESY_DISCOUNT' ? t('follow.accept.discount') : d.proposal === 'CANCEL_RELIST' ? t('follow.accept.cancel') : t('follow.accept.plain')}</span>
              {d.proposal === 'COURTESY_DISCOUNT' && <span className="block text-body-sm text-white/85">{t.rich('follow.accept.youPay', { price: <Price amount={netAmount} /> })}</span>}</span>
            <Icon name="arrow_forward" size={20} />
          </button>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {d.proposal !== 'CANCEL_RELIST' && <button onClick={() => decide('CANCEL')} disabled={loading} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-lowest px-3 py-3 text-label-md text-on-surface"><Icon name="cancel" size={18} /> {t('follow.refuse')}</button>}
            <button onClick={() => decide('ARBITRATION')} disabled={loading} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary px-3 py-3 text-label-md text-white ${d.proposal === 'CANCEL_RELIST' ? 'sm:col-span-2' : ''}`}><Icon name="support_agent" size={18} /> {t('follow.officialArbitration')}</button>
          </div>
          {error && <p className="m-0 mt-2 text-body-sm text-primary">{error.message}</p>}
          <p className="m-0 mt-2 flex items-center justify-center gap-1 text-label-sm text-on-surface-variant"><Icon name="verified_user" size={14} className="text-tertiary" /> {t('follow.noPaymentUntil')}</p>
        </>
      )}
    </section>
  )
}

// "Suivi & médiation de litige" (desktop) / "Suivi des litiges" (mobile).
export default function DisputeFollow({ focusDisputeId, onNavigate, onSelectDispute, onOpenConversation, currentUser, onLogout }: Props) {
  const reasonLabel = useDisputeLabel()
  const t = useT(disputes)
  const tc = useT(common)
  const { data, loading, refetch } = useQuery<{ myBuyerDisputes: Dispute[] }>(MY_BUYER_DISPUTES_QUERY, { fetchPolicy: 'cache-and-network', pollInterval: 30_000 })
  const { data: statsData } = useQuery<{ myDisputeStats: DisputeStats }>(MY_DISPUTE_STATS_QUERY)
  const all = data?.myBuyerDisputes ?? []
  const d = all.find(x => x.id === focusDisputeId) ?? all.find(x => disputeIsOpen(x.status)) ?? all[0]

  return (
    <AccountLayout active="buyer-disputes" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <BuyerTabs active="buyer-disputes" onNavigate={onNavigate} />
        {loading && !data && <p className="text-body-md text-on-surface-variant">{tc('loading')}</p>}
        {!loading && all.length === 0 && (
          <EmptyState icon="empty-shield" fallback="verified_user" tone="tertiary" title={t('follow.empty.title')} text={t('follow.empty.text')} />
        )}

        {all.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {all.map(x => (
              <button key={x.id} onClick={() => onSelectDispute(x.id)} className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border-none px-3 py-2 text-label-md ${x.id === d?.id ? 'bg-inverse-surface text-white' : 'bg-surface-container-low text-on-surface'}`}>
                #{x.reference} {disputeIsOpen(x.status) && <span className="h-2 w-2 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        )}

        {d && (
          <>
            {/* Mobile: dossier reference + status (Stitch mobile "Suivi de mon litige") */}
            <div className="mb-3 flex items-start justify-between gap-3 md:hidden">
              <div className="min-w-0"><div className="truncate text-headline-sm text-on-surface">#{d.reference}</div><div className="text-body-sm text-on-surface-variant">{t('follow.openedOn', { date: fmtDate(d.createdAt, { day: 'numeric', month: 'short' }) })}</div></div>
              <span className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-label-sm ${disputeIsOpen(d.status) ? 'bg-primary-fixed/60 text-primary' : 'bg-tertiary-soft text-tertiary'}`}><span className={`h-1.5 w-1.5 rounded-full ${disputeIsOpen(d.status) ? 'bg-primary' : 'bg-tertiary'}`} /> {disputeIsOpen(d.status) ? t('follow.mediationOngoing') : t('follow.closed')}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Breadcrumb onNavigate={onNavigate} items={[{ label: t('follow.crumb.purchases'), page: 'buyer-purchases' }, { label: t('follow.crumb.dispute', { ref: String(d.reference) }) }, { label: t('follow.crumb.tracking') }]} />
              <span className="mb-3 hidden text-label-sm uppercase text-on-surface-variant md:block">{t('follow.openedOnSale', { date: fmtDate(d.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }), ref: String(d.orderReference) })}</span>
            </div>
            <Banner d={d} />

            {/* Below lg both columns flatten (contents) and `order` gives the
                mobile sequence: transaction, decision, history, seller, help. */}
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 md:mt-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-5">
              <div className="flex min-w-0 flex-col gap-4 max-lg:contents">
                <Decision key={d.id + d.status} d={d} onDone={() => void refetch()} />
                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-lg:order-3 md:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0"><h2 className="m-0 text-headline-sm text-on-surface"><span className="md:hidden">{t('follow.history')}</span><span className="max-md:hidden">{t('follow.journal')}</span></h2><p className="m-0 text-body-sm text-on-surface-variant">{t('follow.reason', { reason: reasonLabel(d.reason) })}</p></div>
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface">{t('follow.entries', { count: d.events.length })}</span>
                  </div>
                  <div className="mt-4"><DisputeTimeline d={d} perspective="BUYER" /></div>
                </section>
              </div>

              <aside className="flex flex-col gap-4 max-lg:contents">
                {d.listing && (
                  <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-lg:order-1">
                    <div className="flex items-center justify-between gap-2 text-label-sm uppercase text-on-surface-variant">
                      <span><span className="md:hidden">{t('follow.transaction')}</span><span className="max-md:hidden">{t('follow.item')}</span></span>
                      {disputeIsOpen(d.status)
                        ? <span className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-tertiary-soft px-2 py-0.5 normal-case text-tertiary md:hidden"><Icon name="gavel" size={13} /> {t('follow.disputeOngoing')}</span>
                        : null}
                      <span className={`rounded bg-surface-container px-1.5 normal-case ${disputeIsOpen(d.status) ? 'max-md:hidden' : ''}`}>{d.listing.category.name}</span>
                    </div>
                    <div className="mt-2 flex gap-3">
                      <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container"><ListingThumb listing={d.listing} src={d.listing.coverImageUrl} icon="shopping_bag" /></span>
                      <div className="min-w-0"><div className="truncate text-label-lg text-on-surface">{d.listing.title}</div><div className="text-headline-sm font-extrabold text-primary"><Price amount={d.amount} currency={d.listing.currency} /></div></div>
                    </div>
                    <dl className="m-0 mt-3 flex flex-col gap-1.5 text-body-sm">
                      <div className="flex justify-between"><dt className="text-on-surface-variant">{t('follow.handoverMode')}</dt><dd className="m-0 text-on-surface">{t('follow.handoverModeValue')}</dd></div>
                      {d.meetupPlace && <div className="flex justify-between gap-2"><dt className="text-on-surface-variant">{t('follow.meetupPlace')}</dt><dd className="m-0 truncate text-on-surface">{d.meetupPlace}</dd></div>}
                    </dl>
                  </section>
                )}
                {disputeIsOpen(d.status) && (
                  <section className="hidden rounded-2xl bg-surface-container-low p-4 md:block max-lg:order-4">
                    <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-fixed text-primary"><Icon name="lock" size={19} /></span><div><div className="text-label-md text-on-surface">{t('follow.codeFrozen')}</div><div className="text-body-sm text-on-surface-variant">{t('follow.saleNo', { ref: String(d.orderReference) })}</div></div></div>
                    <div className="mt-3 rounded-xl bg-surface-lowest p-3 text-center">
                      <div className="text-label-sm uppercase text-on-surface-variant">{t('follow.codeLocked')}</div>
                      <div className="mt-2 flex justify-center gap-2">{[0, 1, 2, 3].map(i => <span key={i} className="h-3 w-3 rounded-full bg-on-surface-variant" />)}</div>
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-label-sm text-white"><Icon name="block" size={13} /> {t('follow.paymentBlocked')}</span>
                    </div>
                    <p className="m-0 mt-2 text-body-sm text-on-surface-variant">{t('follow.noSaleWithoutConsent')}</p>
                  </section>
                )}
                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-lg:order-4">
                  <div className="text-label-sm uppercase text-on-surface-variant">{t('follow.seller')}</div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">{d.seller.avatarUrl ? <SafeImg src={d.seller.avatarUrl} icon="person" fallbackClassName="flex h-full w-full items-center justify-center" /> : d.seller.fullName.charAt(0)}</span>
                    <div className="min-w-0 flex-1"><div className="flex items-center gap-1 text-label-md text-on-surface">{d.seller.fullName}<SellerBadge tier={d.seller.badge} size={15} /></div><div className="text-body-sm text-on-surface-variant">{d.seller.reviewsCount ? t('follow.sellerRating', { rating: d.seller.averageRating.toFixed(1), count: d.seller.reviewsCount }) : t('follow.newSeller')}</div></div>
                    {d.listing && <button onClick={() => onOpenConversation(d.seller.id, d.listing!.id)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface" aria-label={t('open.chatAria')}><Icon name="chat" size={18} /></button>}
                  </div>
                </section>
                <SupportAboutButton about={{ kind: 'DISPUTE', id: d.id }} what={t('follow.supportWhat')} className="max-lg:order-5" />
                <div className="max-md:hidden max-lg:order-5"><MediationCard whatsapp={statsData?.myDisputeStats.mediationWhatsapp ?? null} compact /></div>
                {statsData?.myDisputeStats.mediationWhatsapp && (
                  <a href={`https://wa.me/${statsData.myDisputeStats.mediationWhatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="order-5 flex items-center gap-3 rounded-2xl bg-surface-container-low p-3 no-underline md:hidden">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary text-white"><Icon name="support_agent" size={20} /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-label-md text-on-surface">{t('follow.mediators')}</span><span className="block truncate text-body-sm text-on-surface-variant">{t('open.urgent.hours')}</span></span>
                    <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-tertiary px-3 py-2 text-label-md text-white"><Icon name="chat" size={16} /> WhatsApp</span>{/* i18n-ignore */}
                  </a>
                )}
                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-md:hidden max-lg:order-6">
                  <div className="text-label-sm uppercase text-on-surface-variant">{t('follow.rules.title')}</div>
                  <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0 text-body-sm text-on-surface-variant">
                    {[t('follow.rules.1'), t('follow.rules.2'), t('follow.rules.3')].map(r => (
                      <li key={r} className="flex gap-1.5"><Icon name="check_circle" size={16} className="shrink-0 text-tertiary" /> {r}</li>
                    ))}
                  </ul>
                </section>
              </aside>
            </div>
          </>
        )}
        <TrustFooter />
      </div>
    </AccountLayout>
  )
}
