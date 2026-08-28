export const MARKETS = [
  { countryCode: 'CI', country: "Côte d'Ivoire", currency: 'XOF', locale: 'fr-CI' },
  { countryCode: 'SN', country: 'Sénégal', currency: 'XOF', locale: 'fr-SN' },
  { countryCode: 'BJ', country: 'Bénin', currency: 'XOF', locale: 'fr-BJ' },
  { countryCode: 'TG', country: 'Togo', currency: 'XOF', locale: 'fr-TG' },
  { countryCode: 'BF', country: 'Burkina Faso', currency: 'XOF', locale: 'fr-BF' },
  { countryCode: 'ML', country: 'Mali', currency: 'XOF', locale: 'fr-ML' },
  { countryCode: 'GN', country: 'Guinée', currency: 'GNF', locale: 'fr-GN' },
  { countryCode: 'CM', country: 'Cameroun', currency: 'XAF', locale: 'fr-CM' },
  { countryCode: 'GH', country: 'Ghana', currency: 'GHS', locale: 'en-GH' },
  { countryCode: 'NG', country: 'Nigeria', currency: 'NGN', locale: 'en-NG' },
] as const

export const CURRENCIES = ['XOF', 'XAF', 'GNF', 'GHS', 'NGN', 'EUR', 'USD'] as const

export function marketForCountry(countryCode: string) {
  return MARKETS.find(market => market.countryCode === countryCode)
}

export function localeForCurrency(currency: string) {
  return MARKETS.find(market => market.currency === currency)?.locale ?? 'fr-FR'
}
