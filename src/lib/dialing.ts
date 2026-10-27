import { COUNTRIES } from '../data/markets'
import authPhone from '../i18n/ns/authPhone'

// Per-country phone helpers for forms (sign-up, sign-in, guest contact).
// Kept apart from lib/phone so these pages don't load libphonenumber.

type Dialing = { dialCode: string, localDigits: number }

// Digits already carrying a UEMOA dial code, at that country's full length.
const intlDigits = (d: string) => COUNTRIES.some(c => d.startsWith(c.dialCode) && d.length === c.dialCode.length + c.localDigits)

// International form of a number typed in a country's form: already
// international (+…, 00…, or a UEMOA dial code at full length) as is, else
// the country's dial code in front. The server normalizes it again.
// A national number typed with a trunk « 0 » in a country whose numbers
// have none (« 077 123 45 67 » in Senegal) is read without it, like the
// server does (Backend common/phone.ts).
const dropTrunk = (d: string, c: Dialing) => (d.length === c.localDigits + 1 && d.startsWith('0') ? d.slice(1) : d)

export function toIntl(raw: string, country: Dialing): string | undefined {
  const t = raw.trim()
  const d = t.replace(/\D/g, '')
  if (!d) return undefined
  if (t.startsWith('+')) return `+${d}`
  if (t.startsWith('00')) return `+${d.slice(2)}`
  return intlDigits(d) ? `+${d}` : `+${country.dialCode}${dropTrunk(d, country)}`
}

// A national number must have the country's length (without dial code).
export function localNumberError(raw: string, country: Dialing & { phoneExample: string }): string | null {
  const t = raw.trim()
  if (!t || t.startsWith('+') || t.startsWith('00')) return null
  const d = t.replace(/\D/g, '')
  return dropTrunk(d, country).length === country.localDigits || intlDigits(d) ? null : authPhone.t('phone.incomplete', { digits: country.localDigits, example: country.phoneExample, dial: country.dialCode })
}

// UEMOA country of an international number (+225…), by its dial code.
export function countryOfIntl(intl: string | undefined): string | undefined {
  const d = (intl ?? '').replace(/\D/g, '')
  return COUNTRIES.find(c => d.startsWith(c.dialCode))?.code
}

// An international number as people read it: « +225 07 00 00 00 00 »,
// « +221 77 123 45 67 » (UEMOA dial code, then the national number in
// groups). Anything else is returned as is.
export function formatIntl(intl: string | null | undefined): string {
  const d = (intl ?? '').replace(/\D/g, '')
  const c = COUNTRIES.find(x => d.startsWith(x.dialCode) && d.length === x.dialCode.length + x.localDigits)
  if (!c) return intl ?? ''
  const local = d.slice(c.dialCode.length)
  const groups = local.length % 2 === 0
    ? local.match(/\d{2}/g) ?? [local]
    : [local.slice(0, 2), local.slice(2, 5), ...(local.slice(5).match(/\d{2}/g) ?? [])]
  return `+${c.dialCode} ${groups.join(' ')}`
}
