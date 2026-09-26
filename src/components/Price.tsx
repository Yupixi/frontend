import { localeForCurrency } from '../data/markets'
import { numberFormat } from '../lib/intl'

// The CFA francs read as a plain "F" locally ("45 000 F").
const CURRENCY_SYMBOL: Record<string, string> = { XOF: 'F', XAF: 'F', EUR: '€' }

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
      {numberFormat(localeForCurrency(normalizedCurrency), {
        style: 'currency',
        currency: normalizedCurrency,
        currencyDisplay: 'code',
        maximumFractionDigits: 2,
      }).formatToParts(amount).filter(part => part.type !== 'currency')
        // fr-FR groups with U+202F, which Plus Jakarta Sans has no glyph for.
        .map(part => part.type === 'group' ? ' ' : part.value).join('').trim()}
      <span className="price-unit">{CURRENCY_SYMBOL[normalizedCurrency] ?? normalizedCurrency}</span>
    </>
  )
}
