import { localeForCurrency } from '../data/markets'
import { numberFormat } from '../lib/intl'
import { getLocale, groupNumber, useT } from '../i18n/core'
import { cfaUnit, intlLocale } from '../i18n/format'
import common from '../i18n/ns/common'

// The CFA francs read as a plain "F" locally ("45 000 F"), « CFA F » in
// English ("45,000 CFA F").
const CURRENCY_SYMBOL: Record<string, string> = { EUR: '€' }

// CFA francs have no minor unit and every card shows one: whole amounts are
// grouped by hand ("45 000", identical to the Intl output) so the first
// render doesn't pay for loading ICU locale data just to print prices.
const CFA = new Set(['XOF', 'XAF'])

type PriceProps = {
  amount: number | null | undefined
  currency?: string
  fallback?: string
}

// Renders an amount with the FCFA unit visually de-emphasized (smaller,
// lighter) via .price-unit — sized in em so it stays proportional no matter
// what font-size the surrounding price-tag/heading uses.
export default function Price({ amount, currency = 'XOF', fallback }: PriceProps) {
  const t = useT(common)
  if (amount == null) return <>{fallback ?? t('priceOnRequest')}</>
  return (
    <>
      {amountText(amount, currency)}
      <span className="price-unit">{currencySymbol(currency)}</span>
    </>
  )
}

// The figure without its unit ("45 000"), exactly as Price prints it \u2014 for
// code that writes the number itself (the home hero's counting prices).
export function amountText(amount: number, currency = 'XOF') {
  const normalizedCurrency = currency.toUpperCase()
  if (CFA.has(normalizedCurrency) && Number.isInteger(amount)) return groupNumber(amount)
  return numberFormat(getLocale() === 'fr' ? localeForCurrency(normalizedCurrency) : intlLocale(), {
    style: 'currency',
    currency: normalizedCurrency,
    currencyDisplay: 'code',
    maximumFractionDigits: 2,
  }).formatToParts(amount).filter(part => part.type !== 'currency')
    // fr-FR groups with U+202F, which Plus Jakarta Sans has no glyph for.
    .map(part => part.type === 'group' ? '\u00a0' : part.value).join('').trim()
}

export const currencySymbol = (currency = 'XOF') => (CFA.has(currency.toUpperCase()) ? cfaUnit() : CURRENCY_SYMBOL[currency.toUpperCase()] ?? currency.toUpperCase())
