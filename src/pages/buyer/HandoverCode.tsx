import ListingThumb from '../../components/ListingThumb'
import { useEffect, useState } from 'react'
import SupportAboutButton from '../../components/SupportAboutButton'
import { useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import SafeImg from '../../components/SafeImg'
import { AccountLayout } from '../account/AccountLayout'
import { BuyerTabs, Breadcrumb, TrustFooter } from './BuyerShared'
import { PAYMENT_LABELS } from '../ListingDetail'
import { SALES_ORDER_QUERY, disputeIsOpen, type HandoverOrder } from '../../graphql/sellerTools'
import type { AuthUser } from '../../graphql/auth'
import PaymentLogo from '../../components/PaymentLogo'
import HelpLink from '../../components/HelpLink'
import SellerBadge from '../../components/SellerBadge'
import { BADGE_LABEL } from '../../graphql/badges'
import { Claim } from '../../lib/site'
import { fmtDate, useT } from '../../i18n'
import common from '../../i18n/ns/common'
import handover from '../../i18n/ns/handover'

type Props = {
  orderId: string
  onNavigate: (p: any) => void
  onOpenOrder: (orderId: string, page: 'buyer-receipt' | 'buyer-dispute-new') => void
  onOpenDispute: (id: string) => void
  onOpenConversation: (sellerId: string, listingId?: string) => void
  // Fallback page for old links: the code now lives in the conversation's
  // « Remise » card, opened as soon as the purchase is found.
  onOpenRemise?: (conversationId: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

const CHECKS = [
  { title: 'code.check.power.title', text: 'code.check.power.text', icon: 'power_settings_new' },
  { title: 'code.check.photos.title', text: 'code.check.photos.text', icon: 'photo_camera' },
  { title: 'code.check.accessories.title', text: 'code.check.accessories.text', icon: 'inventory_2' },
] as const
type MethodSub = 'code.method.instant' | 'code.method.noFees' | 'code.method.mobileMoney' | 'code.method.exactChange'
const METHOD_BADGE: Record<string, { letter: string; cls: string; sub: MethodSub }> = {
  WAVE: { letter: 'W', cls: 'bg-sky-100 text-sky-600', sub: 'code.method.instant' },
  ORANGE_MONEY: { letter: 'OM', cls: 'bg-orange-100 text-orange-600', sub: 'code.method.noFees' },
  MTN_MOMO: { letter: 'M', cls: 'bg-yellow-100 text-yellow-700', sub: 'code.method.mobileMoney' },
  MOOV_MONEY: { letter: 'M', cls: 'bg-blue-100 text-blue-700', sub: 'code.method.mobileMoney' },
  FREE_MONEY: { letter: 'FM', cls: 'bg-surface-container text-on-surface', sub: 'code.method.mobileMoney' },
  T_MONEY: { letter: 'T', cls: 'bg-surface-container text-on-surface', sub: 'code.method.mobileMoney' },
  AIRTEL_MONEY: { letter: 'AM', cls: 'bg-surface-container text-on-surface', sub: 'code.method.mobileMoney' },
  CASH: { letter: 'F', cls: 'bg-surface-container text-on-surface', sub: 'code.method.exactChange' },
}

// "Mon code de remise" (desktop + mobile mockups): the buyer's 4-digit
// code, to give only after checking the item, plus the meet-up details.
export default function HandoverCode({ orderId, onNavigate, onOpenOrder, onOpenDispute, onOpenConversation, onOpenRemise, currentUser, onLogout }: Props) {
  const t = useT(handover)
  const tc = useT(common)
  const { data, loading } = useQuery<{ salesOrder: HandoverOrder }>(SALES_ORDER_QUERY, { variables: { id: orderId }, skip: !orderId, pollInterval: 15_000 })
  const o = data?.salesOrder
  const [checks, setChecks] = useState(CHECKS.map(() => false))
  const [copied, setCopied] = useState(false)
  const frozen = !!o?.disputeStatus && disputeIsOpen(o.disputeStatus)
  const code = o?.meetup?.handoverCode
  const confirmed = o?.meetup?.status === 'CONFIRMED'
  const done = o?.stage === 'DONE'
  const amount = o?.agreedPrice ?? o?.listing.price ?? 0
  useEffect(() => { if (o && onOpenRemise) onOpenRemise(o.id) }, [o?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const copy = () => { if (code) void navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }) }

  return (
    <AccountLayout active="buyer-handover" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <BuyerTabs active="buyer-handover" onNavigate={onNavigate} />
        {o && <Breadcrumb onNavigate={onNavigate} items={[{ label: t('code.crumb.purchases'), page: 'buyer-purchases' }, { label: t('code.crumb.order', { ref: String(o.reference) }) }, { label: t('code.crumb.handover') }]} />}
        {loading && !o && <p className="text-body-md text-on-surface-variant">{tc('loading')}</p>}
        {!loading && !o && <p className="text-body-md text-on-surface-variant">{t('code.notFound')}</p>}

        {o && (
          // Mobile follows the mockup order — meet-up place, article, seller,
          // then the code — by flattening both columns (contents) and
          // pulling the three context cards up with negative order.
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
            <div className="flex min-w-0 flex-col gap-4 max-lg:contents">
              {/* The frozen / not-yet-issued states carry their own explanation card below */}
              {!frozen && (code || done) && <section className={`flex items-center gap-3 rounded-2xl p-4 ${confirmed ? 'bg-tertiary-soft' : 'bg-surface-container-low'}`}>
                <Icon name={confirmed ? 'verified_user' : 'hourglass_top'} size={26} className={confirmed ? 'text-tertiary' : 'text-on-surface-variant'} />
                <div className="min-w-0 flex-1">
                  <div className={`text-headline-sm ${confirmed ? 'text-tertiary' : 'text-on-surface'}`}>{done ? t('code.state.done') : frozen ? t('code.state.frozen') : confirmed ? t('code.state.confirmed') : o.meetup ? t('code.state.toConfirm') : t('code.state.toPlan')}</div>
                  <div className="text-body-sm text-on-surface-variant">{done ? t('code.state.doneText') : frozen ? t('code.state.frozenText') : confirmed ? t('code.state.confirmedText') : t('code.state.toPlanText')}</div>
                </div>
                {confirmed && !done && <span className="hidden items-center gap-1 rounded-full bg-surface-lowest px-3 py-1 text-label-sm text-tertiary sm:flex"><span className="h-2 w-2 rounded-full bg-tertiary" /> {frozen ? t('code.frozenPill') : t('code.activePill')}</span>}
              </section>}

              {/* Code — three unambiguous states: frozen by a dispute, not issued
                  yet (no confirmed meet-up), or the live code. */}
              {frozen ? (
                <section className="rounded-2xl bg-surface-lowest p-5 text-center shadow-sm">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed/60 text-primary"><Icon name="lock" size={28} /></span>
                  <h2 className="m-0 mt-3 text-headline-sm text-on-surface">{t('code.frozen.title')}</h2>
                  <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('code.frozen.text')}</p>
                  {o.disputeId && <button onClick={() => onOpenDispute(o.disputeId!)} className="mx-auto mt-4 flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white"><Icon name="gavel" size={18} /> {t('code.trackDispute')}</button>}
                </section>
              ) : !code && !done ? (
                <section className="rounded-2xl bg-surface-lowest p-5 text-center shadow-sm">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant"><Icon name={o.meetup ? 'hourglass_top' : 'event'} size={28} /></span>
                  <h2 className="m-0 mt-3 text-headline-sm text-on-surface">{o.meetup ? t('code.pending.toConfirm') : t('code.pending.toPlan')}</h2>
                  <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('code.pending.text')}</p>
                  <button onClick={() => onOpenConversation(o.seller.id, o.listing.id)} className="mx-auto mt-4 flex cursor-pointer items-center gap-2 rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white"><Icon name="forum" size={18} /> {o.meetup ? t('code.pending.seeProposal') : t('code.pending.setMeetup')}</button>
                </section>
              ) : (
              <section className={`rounded-2xl p-5 shadow-sm ${done ? 'bg-surface-lowest' : 'bg-primary text-white md:bg-surface-lowest md:text-on-surface'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className={`text-label-sm uppercase ${done ? 'text-primary' : 'text-white/80 md:text-primary'}`}>{t('code.live.kicker')}</div>
                    <h2 className="m-0 text-headline-md">{t('code.live.title')}</h2>
                    <p className={`m-0 text-body-sm ${done ? 'text-on-surface-variant' : 'text-white/80 md:text-on-surface-variant'}`}>{t('code.live.text')}</p>
                  </div>
                  {o.meetup && <span className={`flex items-center gap-1 rounded-lg px-2 py-1 text-label-sm ${done ? 'bg-surface-container text-on-surface' : 'bg-white/15 md:bg-surface-container'}`}><Icon name="schedule" size={15} /> {t('code.live.meetupAt', { date: fmtDate(o.meetup.scheduledAt, { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) })}</span>}
                </div>
                <div className="mt-4 flex justify-center gap-3">
                  {[0, 1, 2, 3].map(i => (
                    <span key={i} className="flex h-16 w-14 items-center justify-center rounded-xl bg-surface-lowest text-headline-lg font-extrabold text-on-surface shadow-sm md:bg-surface-container-low">
                      {code?.[i] ?? '•'}
                    </span>
                  ))}
                </div>
                {code && !done && (
                  <button onClick={copy} className="mx-auto mt-3 flex cursor-pointer items-center gap-2 rounded-xl border-none bg-white px-4 py-2 text-label-md text-primary md:bg-surface-container-low md:text-on-surface">
                    <Icon name={copied ? 'check' : 'content_copy'} size={17} /> {copied ? t('code.copied') : t('code.copy')}
                  </button>
                )}
                {!done && (
                  <div className="mt-4 flex gap-3 rounded-xl bg-white/10 p-3 md:bg-primary-fixed/50">
                    <Icon name="gpp_maybe" size={22} className="shrink-0 md:text-primary" />
                    <p className="m-0 text-body-sm">{t.rich('code.goldenRule', { b: c => <b>{c}</b>, u: c => <u>{c}</u> })}</p>
                  </div>
                )}
                {done && <button onClick={() => onOpenOrder(o.id, 'buyer-receipt')} className="mx-auto mt-4 flex cursor-pointer items-center gap-2 rounded-xl border-none bg-inverse-surface px-4 py-2.5 text-label-md text-white"><Icon name="receipt_long" size={18} /> {t('code.viewReceipt')}</button>}
              </section>
              )}

              {!done && !frozen && (
                <section className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="checklist" size={22} className="text-tertiary" /> {t('code.checklist.title')}</h2>
                    <span className="rounded-full bg-surface-container px-2.5 py-1 text-label-sm text-on-surface">{t('code.checklist.count', { done: checks.filter(Boolean).length, total: CHECKS.length })}</span>
                  </div>
                  <HelpLink article="rendez-vous-et-code-de-remise" className="mt-1" />
                  <div className="mt-3 flex flex-col gap-2">
                    {CHECKS.map((c, i) => (
                      <label key={c.icon} className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-container-low p-3">
                        <input type="checkbox" checked={checks[i]} onChange={e => setChecks(prev => prev.map((x, j) => (j === i ? e.target.checked : x)))} className="mt-0.5 h-5 w-5 accent-[#006947]" />
                        <span className="min-w-0 flex-1"><span className="block text-label-md text-on-surface">{t(c.title)}</span><span className="block text-body-sm text-on-surface-variant">{t(c.text)}</span></span>
                        <Icon name={c.icon} size={19} className="text-on-surface-variant" />
                      </label>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="m-0 text-headline-sm text-on-surface">{t('code.payment.title')}</h2>
                    <p className="m-0 text-body-sm text-on-surface-variant">{t('code.payment.text')}</p>
                  </div>
                  <Claim><span className="flex items-center gap-1 rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary"><Icon name="verified" size={14} /> {t('code.payment.noCommission')}</span></Claim>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {(o.listing.paymentMethods.length ? o.listing.paymentMethods : ['CASH']).map(m => (
                    <div key={m} className="flex items-center gap-2 rounded-xl bg-surface-container-low p-3 md:flex-col md:text-center">
                      <PaymentLogo method={m} size={36} />
                      <span><span className="block text-label-md text-on-surface">{PAYMENT_LABELS[m] ?? m}</span><span className="block text-label-sm text-tertiary">{METHOD_BADGE[m] ? t(METHOD_BADGE[m].sub) : null}</span></span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="flex gap-3 rounded-2xl bg-primary-fixed/40 p-4">
                <Icon name="storefront" size={22} className="shrink-0 text-primary" />
                <div>
                  <div className="text-label-md text-primary">{t('code.safety.title')}</div>
                  <p className="m-0 text-body-sm text-on-surface">{t.rich('code.safety.text', { b: c => <b>{c}</b> })}</p>
                </div>
              </section>
            </div>

            {/* Aside */}
            <aside className="flex flex-col gap-4 max-lg:contents">
              <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-lg:-order-2">
                <div className="text-label-sm uppercase text-on-surface-variant">{t('code.reservedItem')}</div>
                <div className="mt-2 flex gap-3">
                  <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container"><ListingThumb listing={o.listing} src={o.listing.coverImageUrl} icon="shopping_bag" /></span>
                  <div className="min-w-0">
                    {o.listing.condition && o.listing.condition !== 'N/A' && <span className="rounded bg-tertiary-soft px-1.5 py-0.5 text-label-sm uppercase text-tertiary">{o.listing.condition}</span>}
                    <div className="mt-1 truncate text-headline-sm text-on-surface">{o.listing.title}</div>
                    <div className="text-headline-sm font-extrabold text-primary"><Price amount={amount} currency={o.listing.currency} /></div>
                  </div>
                </div>
              </section>

              {o.meetup && (
                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-lg:-order-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="m-0 text-headline-sm text-on-surface">{t('code.meetupPlace')}</h3>
                    <span className="flex items-center gap-1 text-label-sm text-primary"><Icon name="schedule" size={14} /> {fmtDate(o.meetup.scheduledAt, { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name="location_on" size={21} /></span>
                    <div className="min-w-0 flex-1"><div className="text-label-md text-on-surface">{o.meetup.place}</div><div className="text-body-sm text-on-surface-variant">{o.listing.city}</div></div>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.meetup.place} ${o.listing.city}`)}`} target="_blank" rel="noreferrer" className="rounded-lg bg-surface-lowest px-2.5 py-1.5 text-label-sm text-on-surface no-underline shadow-sm">{t('code.directions')}</a>
                  </div>
                </section>
              )}

              <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm max-lg:-order-1">
                <div className="text-label-sm uppercase text-on-surface-variant">{t('code.seller')}</div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">{o.seller.avatarUrl ? <SafeImg src={o.seller.avatarUrl} icon="person" fallbackClassName="flex h-full w-full items-center justify-center" /> : o.seller.fullName.charAt(0)}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-label-lg text-on-surface">{o.seller.fullName}<SellerBadge tier={o.seller.badge} /></div>
                    <div className="text-body-sm text-on-surface-variant">{o.seller.reviewsCount ? t('code.sellerRating', { rating: o.seller.averageRating.toFixed(1), count: o.seller.reviewsCount }) : t('code.newSeller')}{o.seller.badge ? ` • ${BADGE_LABEL[o.seller.badge]}` : ''}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => onOpenConversation(o.seller.id, o.listing.id)} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container-high py-2.5 text-label-md text-on-surface"><Icon name="chat" size={17} /> {t('code.chat')}</button>
                  {o.sellerPhone
                    ? <a href={`tel:${o.sellerPhone.replace(/\s/g, '')}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-label-md text-white no-underline"><Icon name="call" size={17} /> {t('code.call')}</a>
                    : <span className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-container py-2.5 text-label-sm text-on-surface-variant">{t('code.phoneAfterMeetup')}</span>}
                </div>
              </section>

              <SupportAboutButton about={{ kind: o.dealStatus === 'CONCLUDED' ? 'DEAL' : 'CONVERSATION', id: o.id }} what={t('code.supportWhat')} />
              {!done && (
                <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm">
                  <div className="flex gap-2"><Icon name="report_problem" size={20} className="text-primary" /><div><div className="text-label-lg text-on-surface">{t('code.incident.title')}</div><p className="m-0 text-body-sm text-on-surface-variant">{t('code.incident.text')}</p></div></div>
                  {o.disputeId
                    ? <button onClick={() => onOpenDispute(o.disputeId!)} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary-fixed/60 py-2.5 text-label-md text-primary"><Icon name="gavel" size={17} /> {t('code.trackDispute')}</button>
                    : <button onClick={() => onOpenOrder(o.id, 'buyer-dispute-new')} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-primary-fixed/60 py-2.5 text-label-md text-primary"><Icon name="flag" size={17} /> {t('code.incident.open')}</button>}
                </section>
              )}
            </aside>
          </div>
        )}
        <TrustFooter />
      </div>
    </AccountLayout>
  )
}
