import { getLocale } from './core'

// Sent with every API request (Apollo, uploads, beacons): the API answers in
// this language (translated categories, CMS, campaigns, errors…).
export function localeHeaders(): Record<string, string> {
  const locale = getLocale()
  return { 'x-dilchap-locale': locale, 'accept-language': locale === 'fr' ? 'fr' : `${locale}, fr;q=0.5` }
}
