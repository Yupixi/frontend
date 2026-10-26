import { dateFormat, numberFormat } from '../lib/intl'
import { getLocale, groupNumber, type Locale } from './core'

// Dates and numbers in the current language (Intl, cached formatters).
// French keeps exactly what the site always printed (fr-FR); English uses
// en-GB (« 26 October », day before month as in West Africa).

export const intlLocale = (locale: Locale = getLocale()) => (locale === 'en' ? 'en-GB' : 'fr-FR')

// fr-FR groups with U+202F, which Plus Jakarta Sans has no glyph for.
const fixSpaces = (s: string) => s.replace(/ /g, ' ')

type DateInput = string | number | Date
const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d))

/** `toLocaleString` / `toLocaleDateString` replacement (pass the options you need). */
export const fmtDate = (d: DateInput, options: Intl.DateTimeFormatOptions = {}) =>
  fixSpaces(dateFormat(intlLocale(), options).format(toDate(d)))

/** « 14:05 » (both languages print a 24-hour clock, as the site always did). */
export const fmtTime = (d: DateInput) => fmtDate(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** « 1 815 » / « 1,815 »; decimals with Intl (« 22,8 » / « 22.8 »). */
export function fmtNumber(n: number, maximumFractionDigits = 1): string {
  if (Number.isInteger(n)) return groupNumber(n)
  return fixSpaces(numberFormat(intlLocale(), { maximumFractionDigits }).format(n))
}

/** Unit printed after a CFA amount: « 45 000 F » in French, « 45,000 CFA F » in English. */
export const cfaUnit = (locale: Locale = getLocale()) => (locale === 'en' ? 'CFA F' : 'F')

/** « 45 000 F » / « 45,000 CFA F » as plain text (toasts, labels, aria). */
export const fmtCfa = (amount: number) => `${groupNumber(Math.round(amount))} ${cfaUnit()}`
