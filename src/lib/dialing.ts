import { COUNTRIES } from '../data/markets'

// Per-country phone helpers for forms (sign-up, sign-in, guest contact).
// Kept apart from lib/phone so these pages don't load libphonenumber.

type Dialing = { dialCode: string, localDigits: number }

// Digits already carrying a UEMOA dial code, at that country's full length.
const intlDigits = (d: string) => COUNTRIES.some(c => d.startsWith(c.dialCode) && d.length === c.dialCode.length + c.localDigits)

// International form of a number typed in a country's form: already
// international (+…, 00…, or a UEMOA dial code at full length) as is, else
// the country's dial code in front. The server normalizes it again.
export function toIntl(raw: string, country: Dialing): string | undefined {
  const t = raw.trim()
  const d = t.replace(/\D/g, '')
  if (!d) return undefined
  if (t.startsWith('+')) return `+${d}`
  if (t.startsWith('00')) return `+${d.slice(2)}`
  return intlDigits(d) ? `+${d}` : `+${country.dialCode}${d}`
}

// A national number must have the country's length (without dial code).
export function localNumberError(raw: string, country: Dialing & { phoneExample: string }): string | null {
  const t = raw.trim()
  if (!t || t.startsWith('+') || t.startsWith('00')) return null
  const d = t.replace(/\D/g, '')
  return d.length === country.localDigits || intlDigits(d) ? null : `Numéro invalide (${country.localDigits} chiffres, ex : ${country.phoneExample}).`
}
