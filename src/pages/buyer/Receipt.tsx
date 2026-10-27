import ListingThumb from '../../components/ListingThumb'
import AnimatedIcon from '../../components/AnimatedIcon'
import SupportAboutButton from '../../components/SupportAboutButton'
import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import Icon from '../../components/Icon'
import Price from '../../components/Price'
import SafeImg from '../../components/SafeImg'
import { handoverByCode, handoverHeadline, handoverProof } from '../../lib/format'
import PrintableReceipt from '../../components/PrintableReceipt'
import { ListingCard } from '../../components/ListingCard'
import { AccountLayout } from '../account/AccountLayout'
import { BuyerTabs, TrustFooter } from './BuyerShared'
import { PAYMENT_LABELS } from '../ListingDetail'
import { SALES_ORDER_QUERY, type HandoverOrder } from '../../graphql/sellerTools'
import { SIMILAR_LISTINGS_QUERY, type RemoteListing } from '../../graphql/listings'
import { ImpressionScope } from '../../lib/impressions'
import { CREATE_REVIEW_MUTATION, SELLER_PROFILE_QUERY } from '../../graphql/reviews'
import type { AuthUser } from '../../graphql/auth'
import SellerBadge from '../../components/SellerBadge'
import { useNoCommissionClaims } from '../../lib/site'
import { fmtCfa, fmtDate, getLocale, useT } from '../../i18n'
import common from '../../i18n/ns/common'
import receipts from '../../i18n/ns/receipts'

type Props = {
  orderId: string
  onNavigate: (p: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  currentUser?: AuthUser | null
  onLogout: () => void
}

// `value` is what the API stores (French, as before); `label` is shown.
const TAGS = [
  { value: 'Article 100% conforme', label: 'review.tag.conform' }, // i18n-ignore
  { value: 'Ponctuel au rendez-vous', label: 'review.tag.punctual' }, // i18n-ignore
  { value: 'Vendeur très courtois', label: 'review.tag.courteous' }, // i18n-ignore
  { value: 'Produit soigné', label: 'review.tag.careful' }, // i18n-ignore
] as const
const RATING_LABEL = ['', 'review.rating.1', 'review.rating.2', 'review.rating.3', 'review.rating.4', 'review.rating.5'] as const

// "Remise validée par code sécurisé" / "Reçu de remise réussie": receipt
// of a concluded hand-over + review of the seller + similar items. The
// code is only mentioned when it was really used (handoverByCode).
export default function Receipt({ orderId, onNavigate, onSelectListing, favorites, onToggleFavorite, currentUser, onLogout }: Props) {
  const noCommission = useNoCommissionClaims()
  const t = useT(receipts)
  const tc = useT(common)
  const { data, loading } = useQuery<{ salesOrder: HandoverOrder }>(SALES_ORDER_QUERY, { variables: { id: orderId }, skip: !orderId })
  const o = data?.salesOrder
  const { data: profileData, refetch: refetchProfile } = useQuery<{ sellerProfile: { hasReviewed: boolean; canReview: boolean } }>(SELLER_PROFILE_QUERY, { variables: { sellerId: o?.seller.id }, skip: !o })
  const { data: similarData } = useQuery<{ similarListings: RemoteListing[] }>(SIMILAR_LISTINGS_QUERY, { variables: { listingId: o?.listing.id, limit: 4 }, skip: !o })
  const [rating, setRating] = useState(5)
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [createReview, { loading: sending, error, data: sent }] = useMutation(CREATE_REVIEW_MUTATION)
  const reviewed = !!sent || !!profileData?.sellerProfile.hasReviewed
  const amount = o?.agreedPrice ?? o?.listing.price ?? 0
  const closedAt = o?.meetup?.handedOverAt ?? o?.dealClosedAt
  const share = () => {
    const text = receipts.t('share.text', { ref: String(o?.reference), title: o?.listing.title, price: fmtCfa(amount) })
    if (navigator.share) void navigator.share({ title: receipts.t('share.title'), text }).catch(() => undefined)
    else void navigator.clipboard?.writeText(text)
  }
  // The buyer may also sell in the same category: never recommend (and offer
  // to boost) their own listings on a purchase receipt.
  const similar = (similarData?.similarListings ?? []).filter(l => l.seller.id !== currentUser?.id)
  const payment = o?.paymentMethod && PAYMENT_LABELS[o.paymentMethod] ? PAYMENT_LABELS[o.paymentMethod] : t('directPayment')
  // The PDF gets a meaningful file name (browsers use the page title).
  const printReceipt = () => {
    const title = document.title
    document.title = receipts.t('pdfTitle', { ref: String(o?.reference ?? '') })
    window.addEventListener('afterprint', () => { document.title = title }, { once: true })
    window.print()
  }
  const send = () => o && void createReview({ variables: { input: { sellerId: o.seller.id, rating, comment: comment.trim() || undefined, tags } } }).then(() => refetchProfile())

  return (
    <AccountLayout active="buyer-receipt" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div className="mx-auto max-w-[1180px] pb-8">
        <div className="print:hidden"><BuyerTabs active="buyer-receipt" onNavigate={onNavigate} /></div>
        {loading && !o && <p className="text-body-md text-on-surface-variant">{tc('loading')}</p>}
        {!loading && !o && <p className="text-body-md text-on-surface-variant">{t('notFound')}</p>}
        {o && o.stage !== 'DONE' && (
          <div className="rounded-2xl bg-surface-container-low p-6 text-center">
            <p className="m-0 text-headline-sm text-on-surface">{t('notClosed')}</p>
            <button onClick={() => onNavigate('buyer-handover')} className="mt-3 cursor-pointer rounded-xl border-none bg-primary px-4 py-2.5 text-label-md text-white">{t('seeCode')}</button>
          </div>
        )}

        {o && o.stage === 'DONE' && (
          <>
            <PrintableReceipt order={o} amount={amount} payment={payment} closedAt={closedAt} />
            {/* Mobile hero */}
            <div className="mb-4 text-center md:hidden">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-tertiary text-white ring-8 ring-tertiary-soft"><AnimatedIcon name="check" fallback="check_circle" size={40} playOnMount /></span>
              <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-tertiary-soft px-3 py-1 text-label-sm uppercase text-tertiary"><Icon name="verified_user" size={14} /> {handoverByCode(o.meetup) ? t('hero.sealedByCode') : t('hero.concluded')}</span>
              <h1 className="m-0 mt-2 text-headline-md text-on-surface">{t('hero.title')}</h1>
              <p className="m-0 text-body-md text-on-surface-variant">{handoverByCode(o.meetup) ? t('hero.sealedText') : t('hero.concludedText')}</p>
            </div>
            {/* Desktop header */}
            <div className="mb-5 hidden flex-wrap items-center justify-between gap-3 md:flex print:flex">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tertiary-soft text-tertiary"><Icon name="check_circle" size={24} /></span>
                <div>
                  <span className="rounded-full bg-tertiary-soft px-2.5 py-0.5 text-label-sm uppercase text-tertiary">{t('header.closed')}</span>
                  <h1 className="m-0 mt-1 text-headline-lg text-on-surface">{handoverHeadline(o.meetup)}</h1>
                </div>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => onNavigate('buyer-dashboard')} className="flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-surface-container-high px-3 py-2 text-label-md text-on-surface"><Icon name="dashboard" size={17} /> {t('header.dashboard')}</button>
                <button onClick={() => onNavigate('buyer-receipts')} className="flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-surface-container-high px-3 py-2 text-label-md text-on-surface"><Icon name="receipt_long" size={17} /> {t('header.history')}</button>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <section className="overflow-hidden rounded-2xl bg-surface-lowest shadow-sm max-md:border-0 max-md:border-t-[6px] max-md:border-solid max-md:border-tertiary">
                <div className="hidden flex-wrap items-center justify-between gap-2 bg-tertiary px-5 py-4 text-white md:flex print:flex">
                  <div className="flex items-center gap-3">
                    <Icon name="verified" size={26} />
                    <div><div className="text-label-sm uppercase text-white/80">{handoverByCode(o.meetup) ? t('card.codeValidated') : handoverHeadline(o.meetup)}</div><div className="text-headline-sm">{t('card.success')}</div></div>
                  </div>
                  <span className="rounded-full bg-white/15 px-2.5 py-1 text-label-sm uppercase">{t('card.local')}</span>
                </div>
                <div className="p-5">
                  {/* Mobile: ticket layout of the Stitch mobile receipt */}
                  <div className="md:hidden print:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0"><div className="text-label-sm uppercase text-on-surface-variant">{t('mobile.reference')}</div><div className="truncate text-label-lg text-on-surface">#{o.reference}-CI</div></div>{/* i18n-ignore */}
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-tertiary-soft px-2.5 py-1 text-label-sm text-tertiary"><span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> {t('mobile.paidDelivered')}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
                      <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-container"><ListingThumb listing={o.listing} src={o.listing.coverImageUrl} icon="shopping_bag" /></span>
                      <div className="min-w-0"><div className="truncate text-label-lg text-on-surface">{o.listing.title}</div><div className="truncate text-body-sm text-on-surface-variant">{[o.listing.condition && o.listing.condition !== 'N/A' ? o.listing.condition : null, o.listing.city].filter(Boolean).join(' • ')}</div></div>
                    </div>
                    <dl className="m-0 mt-3 flex flex-col gap-2 text-body-sm">
                      {[
                        [t('mobile.dateTime'), closedAt ? (s => getLocale() === 'fr' ? s.replace(':', 'h') : s)(fmtDate(closedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })) : '—', 'schedule'],
                        [t('mobile.payment'), payment, 'account_balance_wallet'],
                        [t('meetupPlace'), o.meetup?.place ?? '—', 'location_on'],
                        [t('mobile.seller'), o.seller.fullName, o.seller.badge ? 'verified' : ''],
                      ].map(([label, value, icon]) => (
                        <div key={label} className="flex items-start justify-between gap-3">
                          <dt className="shrink-0 text-on-surface-variant">{label}</dt>
                          <dd className="m-0 flex min-w-0 items-center gap-1 text-right text-on-surface">{icon && icon !== 'verified' && <Icon name={icon} size={15} className="shrink-0 text-primary" />}<span className="min-w-0">{value}</span>{icon === 'verified' && <SellerBadge tier={o.seller.badge} size={15} />}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="-mx-5 my-4 border-0 border-t-2 border-dashed border-outline-variant" />
                    <div className="flex items-center justify-between gap-2 text-body-sm"><span className="text-on-surface-variant">{t('mobile.fees')}</span><span className="text-tertiary">{t('mobile.feesValue')}</span></div>
                    <div className="mt-1 flex items-baseline justify-between gap-2"><span className="text-label-lg text-on-surface">{t('mobile.total')}</span><span className="text-headline-md font-extrabold text-primary"><Price amount={amount} currency={o.listing.currency} /></span></div>
                  </div>
                  <div className="hidden md:block print:block">
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-surface-container-low p-4">
                    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container"><ListingThumb listing={o.listing} src={o.listing.coverImageUrl} icon="shopping_bag" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-label-sm text-on-surface-variant">{t('desktop.ref', { ref: String(o.reference) })}</div>
                      <div className="truncate text-label-lg text-on-surface">{o.listing.title}</div>
                      <div className="text-body-sm text-on-surface-variant">{t('desktop.soldBy', { name: o.seller.fullName })}</div>
                    </div>
                    <div className="flex w-full items-baseline justify-between gap-2 border-0 border-t border-dashed border-outline-variant pt-3 sm:block sm:w-auto sm:border-none sm:pt-0 sm:text-right">
                      <div className="text-label-sm uppercase text-on-surface-variant">{t('desktop.amountPaid')}</div>
                      <div className="text-headline-md font-extrabold text-primary"><Price amount={amount} currency={o.listing.currency} /></div>
                    </div>
                  </div>
                  <dl className="m-0 mt-4 grid gap-4 sm:grid-cols-2">
                    {[
                      ['location_on', t('meetupPlace'), o.meetup?.place ?? '—', t('desktop.agreedSpot')],
                      ['schedule', t('desktop.timestamp'), closedAt ? fmtDate(closedAt, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—', handoverProof(o.meetup)],
                      ['account_balance_wallet', t('desktop.paymentMethod'), payment, t('desktop.paidDirectly')],
                      ...(noCommission ? [['sell', t('desktop.commission'), t('desktop.commissionValue'), t('desktop.noBuyerFees')]] : []),
                    ].map(([icon, label, value, sub]) => (
                      <div key={label}>
                        <dt className="text-label-sm uppercase text-on-surface-variant">{label}</dt>
                        <dd className="m-0 mt-1 flex items-center gap-1.5 text-label-md text-on-surface"><Icon name={icon} size={17} className="text-primary" /> {value}</dd>
                        <dd className="m-0 text-body-sm text-on-surface-variant">{sub}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
                    <span className="flex items-center gap-1"><Icon name="lock" size={15} /> {t('desktop.sealed')}</span>
                    <span className="font-mono text-label-sm text-on-surface">#{o.reference}-CI</span>{/* i18n-ignore */}
                  </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
                    <button onClick={printReceipt} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container-high py-3 text-label-md text-on-surface"><Icon name="download" size={18} /> {t('pdf')}</button>
                    <button onClick={share} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-inverse-surface py-3 text-label-md text-white"><Icon name="share" size={18} /> {tc('share')}</button>
                  </div>
                  <SupportAboutButton about={{ kind: o.dealStatus === 'CONCLUDED' ? 'DEAL' : 'CONVERSATION', id: o.id }} what={t('supportWhat')} className="mt-2" />
                </div>
              </section>

              <aside className="flex flex-col gap-4 print:hidden">
                <section className="rounded-2xl bg-surface-lowest p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-fixed text-label-md text-primary">{o.seller.avatarUrl ? <SafeImg src={o.seller.avatarUrl} icon="person" fallbackClassName="flex h-full w-full items-center justify-center" /> : o.seller.fullName.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
                    <div><div className="flex items-center gap-1 text-label-lg text-on-surface">{o.seller.fullName}<SellerBadge tier={o.seller.badge} /></div><div className="text-body-sm text-on-surface-variant">{t('review.how')}</div></div>
                  </div>
                  {reviewed ? (
                    <div className="mt-4 rounded-xl bg-tertiary-soft p-4 text-center">
                      <Icon name="task_alt" size={28} className="text-tertiary" />
                      <p className="m-0 mt-1 text-label-md text-on-surface">{t('review.thanks')}</p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 rounded-xl bg-surface-container-low p-4 text-center">
                        <div className="text-label-sm uppercase text-on-surface-variant">{t('review.overall')}</div>
                        <div className="mt-2 flex justify-center gap-2">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} onClick={() => setRating(n)} className="cursor-pointer border-none bg-transparent p-0" aria-label={t('review.stars', { count: n })}><Icon name="star" size={32} fill={n <= rating} className="text-primary" /></button>
                          ))}
                        </div>
                        <div className="mt-1 text-label-md text-tertiary">{rating}.0 – {t(RATING_LABEL[rating] || 'review.rating.5')}</div>
                      </div>
                      <div className="mt-3 text-label-sm uppercase text-on-surface-variant">{t('review.highlights')}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {TAGS.map(tag => {
                          const on = tags.includes(tag.value)
                          return <button key={tag.value} onClick={() => setTags(prev => on ? prev.filter(x => x !== tag.value) : [...prev, tag.value])} className={`cursor-pointer rounded-full border-none px-3 py-1.5 text-label-sm ${on ? 'bg-inverse-surface text-white' : 'bg-surface-container text-on-surface'}`}>{t(tag.label)}</button>
                        })}
                      </div>
                      <label className="mt-3 block text-label-md text-on-surface">{t('review.testimony')} <span className="text-label-sm text-on-surface-variant">{t('review.optional')}</span>
                        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={1000} placeholder={t('review.placeholder')} className="mt-1 w-full resize-none rounded-xl border border-outline-variant bg-surface-container-low p-3 text-body-md text-on-surface outline-none focus:border-primary" />
                      </label>
                      {error && <p className="m-0 mt-1 text-body-sm text-primary">{error.message}</p>}
                      <button onClick={send} disabled={sending} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary py-3 text-label-md text-white disabled:opacity-60"><Icon name="send" size={18} /> {t('review.send')}</button>
                    </>
                  )}
                </section>
                <section className="hidden items-center gap-3 rounded-2xl bg-surface-container-low p-4 md:flex">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="handshake" size={21} /></span>
                  <div><div className="text-label-lg text-on-surface">{t('local.title')}</div><div className="text-body-sm text-on-surface-variant">{t('local.text')}</div></div>
                </section>
              </aside>
            </div>

            {similar.length > 0 && (
              <section className="mt-8 hidden md:block print:hidden">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <span className="rounded bg-primary-fixed px-2 py-0.5 text-label-sm uppercase text-primary">{t('similar.kicker')}</span>
                    <h2 className="m-0 mt-2 text-headline-md text-on-surface">{t('similar.title')}</h2>
                  </div>
                  <button onClick={() => onNavigate('search')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-primary">{t('similar.explore')} <Icon name="arrow_forward" size={16} /></button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {similar.map(l => (
                    <ImpressionScope key={l.id} placement="SIMILAR"><ListingCard listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} currentUserId={currentUser?.id} /></ImpressionScope>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-6 flex flex-col items-center gap-3 md:hidden print:hidden">
              <button onClick={() => onNavigate('search')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-headline-sm text-primary">{t('similar.explore')} <Icon name="arrow_forward" size={20} /></button>
              <button onClick={() => onNavigate('buyer-purchases')} className="cursor-pointer border-none bg-transparent p-0 text-body-sm text-on-surface-variant">{t('backToPurchases')}</button>
            </div>
            <section className="mt-6 hidden flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-4 md:flex print:hidden">
              <div className="flex items-center gap-3"><Icon name="help" size={22} className="text-primary" /><div><div className="text-label-md text-on-surface">{t('help.title')}</div><div className="text-body-sm text-on-surface-variant">{t('help.text')}</div></div></div>
              <button onClick={() => onNavigate('buyer-receipts')} className="cursor-pointer rounded-xl border-none bg-inverse-surface px-4 py-2 text-label-md text-white">{t('help.back')}</button>
            </section>
          </>
        )}
        <div className="print:hidden"><TrustFooter /></div>
      </div>
    </AccountLayout>
  )
}
