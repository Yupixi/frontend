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
    return raw ? (JSON.parse(raw) as StoredLocation) : null
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
    return {
      countryCode: typeof data.country_code === 'string' ? data.country_code : null,
      city: typeof data.city === 'string' ? data.city : null,
      source: 'ip',
    }
  } catch {
    return null
  }
}
