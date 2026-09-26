import { parsePhoneNumberFromString } from 'libphonenumber-js/mobile'
import type { PaymentProvider } from '../graphql/payments'

// Paytic only collects in Côte d'Ivoire; same rules as the server.
const COUNTRY = 'CI'

// Mobile prefixes of each network (10-digit plan). Wave works on any network.
export const NETWORK_PREFIX: Partial<Record<PaymentProvider, string>> = { orange: '07', mtn: '05', moov: '01' }

// Validates a Mobile Money number for the country and the chosen operator.
// Returns the error to show, or null when the number is usable.
export function momoNumberError(raw: string, provider: PaymentProvider, label: string): string | null {
  const phone = parsePhoneNumberFromString(raw, COUNTRY)
  if (!phone || phone.country !== COUNTRY || !phone.isValid()) return 'Numéro mobile ivoirien invalide (10 chiffres, ex : 07 00 00 00 00).'
  const prefix = NETWORK_PREFIX[provider]
  if (prefix && !phone.nationalNumber.startsWith(prefix)) return `Ce numéro n’est pas un numéro ${label} (il doit commencer par ${prefix}).`
  return null
}
