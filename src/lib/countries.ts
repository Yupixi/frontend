import { useMemo, useSyncExternalStore } from 'react'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { getStoredLocation } from './location'
import { COUNTRIES, DEFAULT_COUNTRY, isCountryCode, marketForCountry, type Country, type PaymentMethodCode } from '../data/markets'

// Active UEMOA countries with what each offers (Backend « Pays »). The
// static list (data/markets) fills the gaps and stands in while loading.
export const COUNTRIES_QUERY = gql`
  query Countries { countries }
`

export function useCountries(): Country[] {
  const { data } = useQuery<{ countries: Partial<Country>[] }>(COUNTRIES_QUERY, { fetchPolicy: 'cache-first' })
  return useMemo(() => {
    const live = data?.countries?.filter(c => isCountryCode(c.code) && c.enabled !== false)
    if (!live?.length) return COUNTRIES
    return live.map(c => ({ ...marketForCountry(c.code)!, ...c }) as Country)
  }, [data])
}

// An active country; `any` also returns an inactive one (static facts).
export function useCountry(code: string | null | undefined, any = false): Country | undefined {
  const countries = useCountries()
  return countries.find(c => c.code === code) ?? (any ? marketForCountry(code) : undefined)
}

// Current market (country picker, else the member's country, see App) and
// the signed-in member's own country, shared without prop drilling.
type MarketState = { market: string | null, account: string | null }
let state: MarketState = { market: getStoredLocation()?.countryCode ?? null, account: null }
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }

export function setMarketState(next: MarketState) {
  if (next.market === state.market && next.account === state.account) return
  state = next
  listeners.forEach(fn => fn())
}

export const useMarketCode = () => useSyncExternalStore(subscribe, () => state.market)
export const useAccountCountryCode = () => useSyncExternalStore(subscribe, () => state.account)

// The visitor's country, undefined for « Tous les pays ».
export function useMarket(): Country | undefined {
  return useCountry(useMarketCode())
}

// Country for forms that need one (default city, phone prefix…): the
// member's, else the visitor's market, else Côte d'Ivoire.
export function useHomeCountry(): Country {
  const countries = useCountries()
  const account = useAccountCountryCode()
  const market = useMarketCode()
  return countries.find(c => c.code === account) ?? countries.find(c => c.code === market)
    ?? countries.find(c => c.code === DEFAULT_COUNTRY) ?? countries[0] ?? COUNTRIES[0]
}

// Back-office texts may contain {{ville}} and {{pays}}.
export function fillPlaces(text: string, country: Country | undefined): string
export function fillPlaces(text: string | null | undefined, country: Country | undefined): string | null | undefined
export function fillPlaces(text: string | null | undefined, country: Country | undefined) {
  if (!text) return text
  return text
    .replace(/\{\{\s*ville\s*\}\}/gi, country?.mainCity ?? 'votre ville')
    .replace(/\{\{\s*pays\s*\}\}/gi, country?.inName ?? 'en Afrique de l’Ouest')
}

// Every text of a config object (home page…).
export function fillPlacesDeep<T>(value: T, country: Country | undefined): T {
  if (typeof value === 'string') return fillPlaces(value, country) as T
  if (Array.isArray(value)) return value.map(v => fillPlacesDeep(v, country)) as T
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillPlacesDeep(v, country)])) as T
  return value
}

// Payments between members.
export const METHOD_LABELS: Record<PaymentMethodCode, string> = {
  WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', MTN_MOMO: 'MTN MoMo', MOOV_MONEY: 'Moov Money (Flooz)',
  FREE_MONEY: 'Free Money', T_MONEY: 'T-Money', AIRTEL_MONEY: 'Airtel Money', CASH: 'Espèces',
}
export const ALL_METHODS = Object.keys(METHOD_LABELS) as PaymentMethodCode[]

// Methods offered for a country (all of them for « Tous les pays »).
export function useMethods(code?: string | null): PaymentMethodCode[] {
  const market = useMarket()
  const country = useCountry(code, true)
  return (code === undefined ? market : country)?.methods ?? ALL_METHODS
}

// Mobile Money wording of a country: « Wave, Orange Money ou espèces ».
export function methodsSentence(methods: string[]) {
  const names = methods.map(m => (m === 'CASH' ? 'espèces' : METHOD_LABELS[m as PaymentMethodCode] ?? m))
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} ou ${names[names.length - 1]}` : names[0] ?? ''
}

export type { Country, PaymentMethodCode }
