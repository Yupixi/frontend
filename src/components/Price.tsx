import { localeForCurrency } from '../data/markets'

type PriceProps = {
  amount: number | null | undefined
  currency?: string
  fallback?: string
}

// Renders an amount with the FCFA unit visually de-emphasized (smaller,
// lighter) via .price-unit — sized in em so it stays proportional no matter
// what font-size the surrounding price-tag/heading uses.
export default function Price({ amount, currency = 'XOF', fallback = 'Prix sur demande' }: PriceProps) {
  if (amount == null) return <>{fallback}</>
  const normalizedCurrency = currency.toUpperCase()
  return (
    <>
      {new Intl.NumberFormat(localeForCurrency(normalizedCurrency), {
        style: 'currency',
        currency: normalizedCurrency,
        currencyDisplay: 'code',
        maximumFractionDigits: 2,
      }).formatToParts(amount).filter(part => part.type !== 'currency').map(part => part.value).join('').trim()}
      <span className="price-unit">{normalizedCurrency}</span>
    </>
  )
}
