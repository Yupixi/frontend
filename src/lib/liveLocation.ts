// Live position on meet-up day (« Partager ma position en direct »):
// throttling, distances and wording, plus a tiny store so that only the
// pieces of UI that show positions re-render on each GPS fix (never the
// whole Messages page).
//
// `shouldSend` mirrors the backend's tested helper
// (Backend src/modules/messaging/chat-ai/live-location.ts); its constants
// come from the server (`liveLocation.throttle`).

export type LatLng = { lat: number; lng: number }

export type LiveThrottle = {
  SEND_MIN_INTERVAL_S: number
  SEND_MIN_MOVE_M: number
  SEND_MAX_SILENCE_S: number
  STALE_AFTER_S: number
}

// Defaults (overridden by the server's values).
export const DEFAULT_THROTTLE: LiveThrottle = {
  SEND_MIN_INTERVAL_S: 15,
  SEND_MIN_MOVE_M: 20,
  SEND_MAX_SILENCE_S: 60,
  STALE_AFTER_S: 120,
}

export type LiveShare = {
  userId: string
  name?: string
  lat: number | null
  lng: number | null
  accuracy: number | null
  positionAt: string | null
  startedAt: string
  expiresAt: string
}

export type LiveUnavailable = 'OFF' | 'NOT_CONFIRMED' | 'NO_POINT' | 'HANDED_OVER' | 'CLOSED' | 'REPLACED' | 'TOO_EARLY' | 'ENDED'

export type LiveState = {
  meetupId: string
  available: boolean
  reason: LiveUnavailable | null
  window: { from: string; to: string }
  durations: number[]
  maxMinutes: number
  throttle: LiveThrottle
  mine: LiveShare | null
  other: LiveShare | null
  otherId: string
}

// Great-circle distance in metres.
export function distanceM(a: LatLng, b: LatLng) {
  const rad = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

// Should this GPS fix be sent, given the last one sent? (`at` in ms)
export function shouldSend(last: (LatLng & { at: number }) | null, next: LatLng & { at: number }, c: LiveThrottle = DEFAULT_THROTTLE) {
  if (!last) return true
  const seconds = (next.at - last.at) / 1000
  if (seconds < c.SEND_MIN_INTERVAL_S) return false
  if (seconds >= c.SEND_MAX_SILENCE_S) return true
  return distanceM(last, next) > c.SEND_MIN_MOVE_M
}

export const hasPos = (s: { lat: number | null; lng: number | null } | null | undefined): s is LatLng & LiveShare =>
  !!s && typeof s.lat === 'number' && typeof s.lng === 'number'

// « à environ 350 m du point », « à environ 1,2 km du point ».
export function distanceLabel(m: number) {
  if (m < 40) return 'au point de rendez-vous'
  if (m < 1000) return `à environ ${Math.round(m / 50) * 50 || 50} m du point`
  return `à environ ${(m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km du point`
}

// « il y a 20 s », « il y a 3 min » (computed at render time: refreshed by
// the next position received or sent, never by a timer).
export function agoLabel(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (s < 10) return 'à l’instant'
  if (s < 60) return `il y a ${s} s`
  return `il y a ${Math.round(s / 60)} min`
}

export const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

// ms until a position becomes stale (negative: already stale). Used as a
// CSS animation delay, so the greying needs no timer.
export const staleIn = (positionAt: string | null, throttle: LiveThrottle, now = Date.now()) =>
  positionAt ? Date.parse(positionAt) + throttle.STALE_AFTER_S * 1000 - now : -1

// ---- Store ------------------------------------------------------------------

export type LiveSnapshot = {
  conversationId: string | null
  state: LiveState | null
  // My last GPS fix (shown on my pin; not necessarily sent yet).
  myFix: (LatLng & { accuracy: number | null; at: number }) | null
  // Sharing being started / a geolocation problem to show.
  busy: boolean
  error: string | null
}

const EMPTY: LiveSnapshot = { conversationId: null, state: null, myFix: null, busy: false, error: null }
let snap: LiveSnapshot = EMPTY
const listeners = new Set<() => void>()

export const liveStore = {
  get: () => snap,
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  },
  set(patch: Partial<LiveSnapshot>) {
    snap = { ...snap, ...patch }
    for (const l of listeners) l()
  },
  reset(conversationId: string | null = null) {
    snap = { ...EMPTY, conversationId }
    for (const l of listeners) l()
  },
}

// Whether a sharing of mine is running (and until when): what the header
// pill needs, without re-rendering on each fix.
export const mySharingUntil = (s: LiveSnapshot) => {
  const m = s.state?.mine
  return m && Date.parse(m.expiresAt) > Date.now() ? m.expiresAt : null
}
