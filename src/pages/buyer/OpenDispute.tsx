import ListingThumb from '../../components/ListingThumb'
import EmptyState from '../../components/EmptyState'
import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import { AccountLayout } from '../account/AccountLayout'
import { PhotoPicker } from '../../components/DisputeParts'
import { BuyerTabs, Breadcrumb, TrustFooter } from './BuyerShared'
import {
  MY_DISPUTE_STATS_QUERY, MY_PURCHASE_ORDERS_QUERY, OPEN_DISPUTE_MUTATION, SALES_ORDER_QUERY,
  type Dispute, type DisputeReason, type DisputeStats, type HandoverOrder, type PurchaseOrder,
} from '../../graphql/sellerTools'
import type { AuthUser } from '../../graphql/auth'
import SellerBadge from '../../components/SellerBadge'
import { useMemberLists } from '../../lib/lists'
import { useRules } from '../../lib/rules'
import { useMemberCountryCode } from '../../lib/countries'
import { useT } from '../../i18n'
import common from '../../i18n/ns/common'
import disputes from '../../i18n/ns/disputes'

type Props = {
  orderId: string
  onNavigate: (p: any) => void
  onSelectOrder: (orderId: string) => void
  onOpened: (disputeId: string) => void
  onOpenConversation: (sellerId: string, listingId?: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

// Buyer-side reasons; wording from « Listes de référence ».
const REASONS: { value: DisputeReason; icon: string }[] = [
  { value: 'NOT_AS_DESCRIBED', icon: 'broken_image' },
  { value: 'NO_SHOW', icon: 'person_off' },
  { value: 'PAYMENT_PRESSURE', icon: 'warning' },
  { value: 'COUNTERFEIT', icon: 'new_releases' },
  { value: 'OTHER', icon: 'help' },
]
// Answer delay from « Règles de la marketplace ».
// Called during render (translated in the current language).
const steps = (h: number) => [
  { id: 'amicable', title: disputes.t('open.step1.title', { h }), text: disputes.t('open.step1.text') },
  { id: 'dilchap', title: disputes.t('open.step2.title'), text: disputes.t('open.step2.text', { h }) },
  { id: 'decision', title: disputes.t('open.step3.title'), text: disputes.t('open.step3.text') },
]

// "Déclarer un litige sur votre achat" (desktop + mobile mockups).
export default function OpenDispute({ orderId, onNavigate, onSelectOrder, onOpened, onOpenConversation, currentUser, onLogout }: Props) {
  const t = useT(disputes)
  const tc = useT(common)
  const answerHours = useRules(useMemberCountryCode()).DISPUTE_ANSWER_HOURS
  const { disputeReasons } = useMemberLists()
  const { data: purchasesData } = useQuery<{ myPurchaseOrders: PurchaseOrder[] }>(MY_PURCHASE_ORDERS_QUERY, { skip: !!orderId })
  const { data, loading } = useQuery<{ salesOrder: HandoverOrder }>(SALES_ORDER_QUERY, { variables: { id: orderId }, skip: !orderId })
  const { data: statsData } = useQuery<{ myDisputeStats: DisputeStats }>(MY_DISPUTE_STATS_QUERY)
  const o = data?.salesOrder
  const [reason, setReason] = useState<DisputeReason>('NOT_AS_DESCRIBED')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [open, { loading: sending, error }] = useMutation<{ openDispute: Dispute }>(OPEN_DISPUTE_MUTATION)
  const amount = o?.agreedPrice ?? o?.listing.price ?? 0
  const whatsapp = statsData?.myDisputeStats.mediationWhatsapp
  const submit = () => o && void open({ variables: { input: { conversationId: o.id, reason, description: description.trim(), photos } } })
    .then(r => r.data && onOpened(r.data.openDispute.id))

  const candidates = (purchasesData?.myPurchaseOrders ?? []).filter(p => p.stage !== 'CANCELLED')

  return (
    <AccountLayout active="buyer-dispute-new" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <BuyerTabs active="buyer-dispute-new" onNavigate={onNavigate} />

        {!orderId ? (
          <section className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
            <h1 className="m-0 text-headline-md text-on-surface">{t('open.pick.title')}</h1>
            <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('open.pick.text')}</p>
            <div className="mt-4 flex flex-col gap-2">
              {candidates.length === 0 && (
                <EmptyState icon="cart" fallback="shopping_bag" title={t('open.pick.emptyTitle')} text={t('open.pick.emptyText')} action={{ label: t('open.pick.emptyAction'), onClick: () => onNavigate('buyer-purchases') }} />
              )}
              {candidates.map(p => (
                <button key={p.id} onClick={() => onSelectOrder(p.id)} className="flex cursor-pointer items-center gap-3 rounded-xl border border-outline-variant bg-surface-lowest p-3 text-left hover:border-primary">
                  <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container"><ListingThumb listing={p.listing} src={p.listing.coverImageUrl} icon="shopping_bag" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-label-md text-on-surface">{p.listing.title}</span><span className="block text-body-sm text-on-surface-variant">#{p.reference} • {p.seller.fullName}</span></span>
                  <Icon name="chevron_right" size={20} className="text-on-surface-variant" />
                </button>
              ))}
            </div>
          </section>
        ) : loading && !o ? <p className="text-body-md text-on-surface-variant">{tc('loading')}</p> : !o ? <p className="text-body-md text-on-surface-variant">{t('open.notFound')}</p> : o.disputeId ? (
          <section className="rounded-2xl bg-surface-container-low p-6 text-center">
            <p className="m-0 text-headline-sm text-on-surface">{t('open.exists')}</p>
            <button onClick={() => onOpened(o.disputeId!)} className="mt-3 cursor-pointer rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white">{t('open.track')}</button>
          </section>
        ) : (
          <>
            <Breadcrumb onNavigate={onNavigate} items={[{ label: t('open.crumb.purchases'), page: 'buyer-purchases' }, { label: t('open.crumb.order', { ref: String(o.reference) }), page: 'buyer-handover' }, { label: t('open.crumb.opening') }]} />
            <section className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-surface-container-low p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="gavel" size={21} /></span>
              <div className="min-w-[12rem] flex-1"><div className="text-headline-sm text-on-surface">{t('open.guarantee.title')}</div><div className="text-body-sm text-on-surface-variant">{t('open.guarantee.text')}</div></div>
              <span className="flex items-center gap-1 rounded-full bg-surface-lowest px-3 py-1 text-label-sm uppercase text-on-surface"><span className="h-2 w-2 rounded-full bg-primary" /> {t('open.secureProcedure')}</span>
            </section>

            {/* Mobile: the order under dispute comes first (Stitch mobile) */}
            <section className="mb-4 rounded-2xl bg-surface-lowest p-3 shadow-sm lg:hidden">
              <div className="flex gap-3">
                <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container"><ListingThumb listing={o.listing} src={o.listing.coverImageUrl} icon="shopping_bag" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2"><span className="text-label-sm text-on-surface-variant">#{o.reference}</span><span className="text-label-lg font-extrabold text-primary"><Price amount={amount} currency={o.listing.currency} /></span></div>
                  <div className="truncate text-label-lg text-on-surface">{o.listing.title}</div>
                  <div className="flex items-center gap-1 truncate text-body-sm text-on-surface-variant"><Icon name="storefront" size={14} /> {o.seller.fullName}<SellerBadge tier={o.seller.badge} size={14} /></div>
                </div>
              </div>
              {o.meetup && <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-2 text-body-sm text-on-surface-variant"><Icon name="location_on" size={16} className="shrink-0 text-primary" /> <span className="truncate">{t.rich('open.plannedMeetupRich', { place: o.meetup.place, b: c => <b className="text-on-surface">{c}</b> })}</span></div>}
            </section>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <section className="rounded-2xl bg-surface-lowest p-4 shadow-sm md:p-5">
                <div className="flex items-center gap-1 text-label-sm uppercase text-primary"><Icon name="shield" size={15} /> {t('open.kicker')}</div>
                <h1 className="m-0 mt-1 text-headline-md text-on-surface md:text-headline-lg">{t('open.title')}</h1>
                <p className="m-0 mt-1 text-body-md text-on-surface-variant">{t('open.subtitle')}</p>

                <h2 className="m-0 mt-5 flex items-center gap-2 text-label-lg text-on-surface"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-label-sm text-white">1</span> {t('open.section.reason')}</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {REASONS.map(r => {
                    const on = reason === r.value
                    return (
                      <label key={r.value} className={`relative flex cursor-pointer gap-3 rounded-xl p-3 ${on ? 'bg-primary-fixed/70' : 'bg-surface-container-low'}`}>
                        <input type="radio" name="reason" checked={on} onChange={() => setReason(r.value)} className="sr-only" />
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-primary text-white' : 'bg-surface-lowest text-on-surface-variant'}`}><Icon name={r.icon} size={19} /></span>
                        <span className="min-w-0 flex-1"><span className="block text-label-lg text-on-surface md:text-label-md">{disputeReasons[r.value].label}</span><span className="block text-body-sm text-on-surface-variant">{disputeReasons[r.value].hint}</span></span>
                        <Icon name={on ? 'check_circle' : 'radio_button_unchecked'} size={20} fill={on} className={on ? 'text-primary' : 'text-outline-variant'} />
                      </label>
                    )
                  })}
                </div>

                <div className="mt-5 flex items-center justify-between gap-2">
                  <h2 className="m-0 flex items-center gap-2 text-label-lg text-on-surface"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-label-sm text-white">2</span> {t('open.section.details')}</h2>
                  <span className="shrink-0 whitespace-nowrap text-label-sm text-on-surface-variant">{t.rich('open.charCount', { n: String(description.length), wide: c => <span className="max-md:hidden">{c}</span> })}</span>
                </div>
                <p className="m-0 mt-2 flex gap-1 rounded-xl bg-surface-container-low p-2.5 text-body-sm text-on-surface-variant"><Icon name="lightbulb" size={16} className="shrink-0 text-primary" /> <span>{t.rich('open.tip', { b: c => <b className="text-on-surface">{c}</b> })}</span></p>
                <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 1500))} rows={5} placeholder={t('open.placeholder')} className="mt-2 w-full resize-y rounded-xl border border-outline-variant bg-surface-lowest p-3 text-body-md text-on-surface outline-none focus:border-primary" />
                {description.trim().length > 0 && description.trim().length < 20 && <p className="m-0 text-label-sm text-primary">{t('open.minChars')}</p>}

                <div className="mt-5 flex items-center justify-between gap-2">
                  <h2 className="m-0 flex items-center gap-2 text-label-lg text-on-surface"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-label-sm text-white">3</span> {t('open.section.photos')}</h2>
                  {photos.length > 0 && <span className="flex items-center gap-1 text-label-sm text-tertiary"><Icon name="check_circle" size={14} /> {t('open.photosCount', { count: photos.length })}</span>}
                </div>
                <p className="m-0 mt-1 text-body-sm text-on-surface-variant">{t('open.photosHint')}</p>
                <div className="mt-2"><PhotoPicker urls={photos} onChange={setPhotos} label={t('open.addPhotos')} max={6} /></div>

                <div className="mt-5 flex gap-3 rounded-xl bg-tertiary-soft p-3">
                  <Icon name="lock" size={22} className="shrink-0 text-tertiary" />
                  <p className="m-0 text-body-sm text-on-surface">{t.rich('open.immunity', { b: c => <b className="text-tertiary">{c}</b>, br: () => <br /> })}</p>
                </div>
                {error && <p className="m-0 mt-2 text-body-sm text-primary">{error.message}</p>}
                {description.trim().length < 20 && <p className="m-0 mt-4 text-center text-body-sm text-on-surface-variant sm:text-right">{t('open.describeToSend')}</p>}
                <div className="mt-3 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
                  <button onClick={() => onNavigate('buyer-handover')} className="cursor-pointer border-none bg-transparent p-0 text-label-md text-on-surface">{t('open.cancel')}</button>
                  <button onClick={submit} disabled={sending || description.trim().length < 20} className="flex w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border-none bg-primary px-5 py-3 text-label-md text-white disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-on-surface-variant sm:w-auto">
                    <Icon name="report" size={19} /> {t('open.submit')}
                  </button>
                </div>
              </section>

              <aside className="flex flex-col gap-4">
                <section className="hidden rounded-2xl bg-surface-lowest p-4 shadow-sm lg:block">
                  <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                    <div><div className="text-label-sm uppercase text-on-surface-variant">{t('open.saleNo')}</div><div className="text-label-lg text-on-surface">{o.reference}</div></div>
                    <span className="rounded bg-primary-fixed px-2 py-0.5 text-label-sm text-primary">{t('open.imminent')}</span>
                  </div>
                  <div className="mt-3 flex gap-3">
                    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container"><ListingThumb listing={o.listing} src={o.listing.coverImageUrl} icon="shopping_bag" /></span>
                    <div className="min-w-0"><div className="text-label-sm uppercase text-on-surface-variant">{o.listing.category.name}</div><div className="truncate text-label-lg text-on-surface">{o.listing.title}</div>{o.listing.condition && <div className="text-body-sm text-on-surface-variant">{t('open.declaredCondition', { condition: o.listing.condition })}</div>}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                    <span className="flex items-center gap-1.5 text-label-md text-on-surface"><Icon name="account_balance_wallet" size={17} /> {t('open.amountAtStake')}</span>
                    <span className="text-headline-sm font-extrabold text-primary"><Price amount={amount} currency={o.listing.currency} /></span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-label-md text-white">{o.seller.avatarUrl ? <img src={o.seller.avatarUrl} alt="" className="h-full w-full object-cover" /> : o.seller.fullName.charAt(0)}</span>
                    <div className="min-w-0 flex-1"><div className="text-label-md text-on-surface">{o.seller.fullName}</div><div className="text-body-sm text-on-surface-variant">{o.seller.reviewsCount ? t('open.sellerRating', { rating: o.seller.averageRating.toFixed(1), count: o.seller.reviewsCount }) : t('open.newSeller')}</div></div>
                    <button onClick={() => onOpenConversation(o.seller.id, o.listing.id)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container text-on-surface" aria-label={t('open.chatAria')}><Icon name="chat" size={18} /></button>
                  </div>
                  {o.meetup && <div className="mt-3 flex items-center gap-1.5 text-body-sm text-on-surface-variant"><Icon name="location_on" size={16} className="text-primary" /> {t('open.plannedMeetup', { place: o.meetup.place })}</div>}
                </section>

                <section className="hidden rounded-2xl bg-surface-lowest p-4 shadow-sm md:block">
                  <h3 className="m-0 flex items-center gap-2 text-headline-sm text-on-surface"><Icon name="balance" size={22} className="text-tertiary" /> {t('open.howTitle')}</h3>
                  <ol className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
                    {steps(answerHours).map((s, i) => (
                      <li key={s.id} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-outline-variant text-label-sm text-primary">{i + 1}</span>
                        <div><div className="text-label-md text-on-surface">{s.title}</div><div className="text-body-sm text-on-surface-variant">{s.text}</div></div>
                      </li>
                    ))}
                  </ol>
                </section>

                {whatsapp && (
                  <section className="hidden rounded-2xl bg-surface-container-low p-4 md:block">
                    <div className="flex items-center gap-2"><Icon name="support_agent" size={22} className="text-primary" /><div><div className="text-label-md text-on-surface">{t('open.urgent.title')}</div><div className="text-body-sm text-on-surface-variant">{t('open.urgent.text')}</div></div></div>
                    <a href={`https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-between rounded-xl bg-surface-lowest px-3 py-2 no-underline">
                      <span className="text-headline-sm text-on-surface">{whatsapp}</span><span className="rounded bg-tertiary-soft px-1.5 text-label-sm text-tertiary">{t('open.urgent.hours')}</span>
                    </a>
                  </section>
                )}
              </aside>
            </div>
          </>
        )}
        <TrustFooter />
      </div>
    </AccountLayout>
  )
}
