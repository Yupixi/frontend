import { useState } from 'react'
import Icon from './Icon'
import { usePriceOffers, type LiveOffer } from '../lib/priceOffers'
import { fmtDate, useT } from '../i18n'
import offersNs from '../i18n/ns/offers'

const DISMISSED_KEY = 'yupixi_offer_dismissed'

const OPERATION_LABELS: Record<string, () => string> = {
  BUMP: () => offersNs.t('banner.op.BUMP'),
  BOOST: () => offersNs.t('banner.op.BOOST'),
  CAMPAIGN: () => offersNs.t('banner.op.CAMPAIGN'),
  BADGE: () => offersNs.t('banner.op.BADGE'),
  SHOP: () => offersNs.t('banner.op.SHOP'),
  AI_ASSIST: () => offersNs.t('banner.op.AI_ASSIST'),
}

const until = (iso: string) => fmtDate(iso, { day: 'numeric', month: 'long' })

// What the offer gives, when the back-office wrote no message for it.
function summary(o: LiveOffer) {
  const what = o.percent >= 100 ? offersNs.t('banner.free') : offersNs.t('banner.percent', { n: o.percent })
  const on = o.operations.length ? o.operations.map(op => OPERATION_LABELS[op]?.() ?? op).join(', ') : offersNs.t('banner.allOptions')
  return offersNs.t('banner.summary', { what, on })
}

// « Offres & gratuités »: the best live offer for this visitor, on every page
// (site and account), until they close it.
export default function OfferBanner() {
  const t = useT(offersNs)
  const offers = usePriceOffers()
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]') as string[] } catch { return [] }
  })
  const offer = offers.filter(o => !dismissed.includes(o.id)).sort((a, b) => b.percent - a.percent)[0]
  if (!offer) return null
  const close = () => {
    const next = [...dismissed, offer.id].slice(-20)
    setDismissed(next)
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)) } catch { /* private mode */ }
  }
  return (
    <div role="status" className="flex w-full items-center gap-2 bg-tertiary-soft px-4 py-2 text-label-md text-tertiary">
      <Icon name="redeem" size={17} className="shrink-0" />
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap sm:text-center">
        <b>{offer.name}</b>
        <span className="font-medium"> — {offer.message || summary(offer)}</span>
        <span className="font-medium opacity-80"> · {t('banner.until', { date: until(offer.endsAt) })}</span>
      </span>
      <button onClick={close} aria-label={t('banner.hide')} className="flex shrink-0 cursor-pointer border-none bg-transparent p-0.5 text-tertiary">
        <Icon name="close" size={17} />
      </button>
    </div>
  )
}
