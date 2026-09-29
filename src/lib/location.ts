import { isCountryCode } from '../data/markets'

const LOCATION_KEY = 'yupixi_location'

export type StoredLocation = {
  // null countryCode means "all countries" — an explicit user choice to
  // clear the filter, not "we don't know yet" (that's simply no stored
  // value at all, see getStoredLocation returning null).
  countryCode: string | null
  city: string | null
  source: 'ip' | 'manual'
}

export function getStoredLocation(): StoredLocation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredLocation
    // A country Dilchap doesn't serve (older choice): « Tous les pays ».
    return stored.countryCode && !isCountryCode(stored.countryCode) ? { countryCode: null, city: null, source: stored.source } : stored
  } catch {
    return null
  }
}

export function setStoredLocation(location: StoredLocation) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location))
  } catch {
    // Storage can be unavailable (private mode, quota) — losing the
    // preference just means detecting again next load, not a hard failure.
  }
}

// ipwho.is: free, HTTPS, no API key — good enough for a soft "default your
// feed to your market" prefill. Never persisted on failure so a transient
// outage just means we retry next session instead of caching "unknown"
// forever.
export async function detectLocationFromIP(): Promise<StoredLocation | null> {
  try {
    const res = await fetch('https://ipwho.is/')
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success) return null
    // Outside the UEMOA countries: no country (« Tous les pays »).
    if (!isCountryCode(data.country_code)) return { countryCode: null, city: null, source: 'ip' }
    return {
      countryCode: data.country_code,
      city: typeof data.city === 'string' ? data.city : null,
      source: 'ip',
    }
  } catch {
    return null
  }
}

// First visit only: the lookup starts as soon as the bundle runs rather than
// after React's first render, and Home waits for it briefly (see
// LOCATION_WAIT_MS in App) so the feed loads once, already scoped to the
// visitor's market, instead of loading twice and swapping under their eyes.
export const earlyLocationLookup: Promise<StoredLocation | null> | null =
  typeof window !== 'undefined' && !getStoredLocation() ? detectLocationFromIP() : null
