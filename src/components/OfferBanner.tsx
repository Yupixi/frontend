import { useState } from 'react'
import Icon from './Icon'
import { usePriceOffers, type LiveOffer } from '../lib/priceOffers'

const DISMISSED_KEY = 'yupixi_offer_dismissed'

const OPERATION_LABELS: Record<string, string> = {
  BUMP: 'les remontées',
  BOOST: 'les boosts',
  CAMPAIGN: 'les campagnes',
  BADGE: 'les badges',
  SHOP: 'l’abonnement boutique',
  AI_ASSIST: 'l’assistant IA',
}

const until = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

// What the offer gives, when the back-office wrote no message for it.
function summary(o: LiveOffer) {
  const what = o.percent >= 100 ? 'Gratuit' : `−${o.percent} %`
  const on = o.operations.length ? o.operations.map(op => OPERATION_LABELS[op] ?? op).join(', ') : 'toutes les options payantes'
  return `${what} sur ${on}`
}

// « Offres & gratuités »: the best live offer for this visitor, on every page
// (site and account), until they close it.
export default function OfferBanner() {
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
        <span className="font-medium opacity-80"> · jusqu’au {until(offer.endsAt)}</span>
      </span>
      <button onClick={close} aria-label="Masquer l’offre" className="flex shrink-0 cursor-pointer border-none bg-transparent p-0.5 text-tertiary">
        <Icon name="close" size={17} />
      </button>
    </div>
  )
}
