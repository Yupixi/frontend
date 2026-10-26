import { useSyncExternalStore } from 'react'
import { useQuery } from '@apollo/client/react'
import { GRAPHQL_URL } from './apollo'
import { getAccessToken } from './auth'
import { useMarketCode } from './countries'
import { rotationSeed } from './rotationSeed'
import { RECORD_REEL_EVENTS_MUTATION, REEL_SETTINGS_QUERY, type Reel, type ReelSettings } from '../graphql/reels'
import { localeHeaders } from '../i18n/headers'

// Reels on the storefront: settings of the market, the data-saving choice,
// the sound choice, the « déjà vu » list of a visitor and the statistics
// beacon. Everything here lives outside React state that re-renders pages.

export const DEFAULT_REEL_SETTINGS: ReelSettings = {
  enabled: true, mode: 'FREE_BOOST', publishPrice: 0, boostEnabled: true, boostPrice: 15, boostHours: 72, boostViewsGoal: 500,
  verifiedSellersOnly: false, maxDurationSec: 45, maxSizeMb: 60, perListing: 3, perSeller: 30, perDay: 5, adultAllowed: false,
  viewSeconds: 3, chunkBytes: 1024 * 1024,
}

/** Reels settings of a country (the visitor's market by default). */
export function useReelSettings(country?: string | null): ReelSettings & { loaded: boolean } {
  const market = useMarketCode()
  const code = country ?? market
  const { data } = useQuery<{ reelSettings: ReelSettings }>(REEL_SETTINGS_QUERY, {
    variables: code ? { countryCode: code } : {},
    fetchPolicy: 'cache-first',
  })
  return { ...(data?.reelSettings ?? DEFAULT_REEL_SETTINGS), loaded: !!data }
}

// ── Économie de données ─────────────────────────────────────────────────
// On: the small video (≈ 360 p), no preloading of the next Reel. Defaults
// to the phone's own « économiseur de données » and to slow connections;
// the visitor's choice (Reels menu) is kept on this device.
const SAVER_KEY = 'dilchap_reels_saver'
type Conn = { saveData?: boolean; effectiveType?: string; addEventListener?: (t: string, f: () => void) => void }
const conn = (): Conn | undefined => (navigator as Navigator & { connection?: Conn }).connection
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(f => f())
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }

function storedSaver(): boolean | null {
  try {
    const v = localStorage.getItem(SAVER_KEY)
    return v === '1' ? true : v === '0' ? false : null
  } catch { return null }
}
export function networkIsSlow() {
  const c = conn()
  return !!c?.saveData || /(^|-)2g$|^3g$/.test(c?.effectiveType ?? '')
}
let saver = storedSaver() ?? (typeof navigator !== 'undefined' && networkIsSlow())
conn()?.addEventListener?.('change', () => { if (storedSaver() === null) { saver = networkIsSlow(); emit() } })

export const useDataSaver = () => useSyncExternalStore(subscribe, () => saver)
export const dataSaverOn = () => saver
export function setDataSaver(on: boolean) {
  saver = on
  try { localStorage.setItem(SAVER_KEY, on ? '1' : '0') } catch { /* private mode */ }
  emit()
}

/** The rendition to play: the small one in data-saving mode. */
export const reelSource = (r: Pick<Reel, 'videoUrl' | 'videoLowUrl'>, low = saver) => (low ? r.videoLowUrl ?? r.videoUrl : r.videoUrl ?? r.videoLowUrl)

// ── Son ─────────────────────────────────────────────────────────────────
// Muted until the visitor turns the sound on; then kept for the visit.
let muted = true
const soundListeners = new Set<() => void>()
export const useReelsMuted = () => useSyncExternalStore(f => { soundListeners.add(f); return () => { soundListeners.delete(f) } }, () => muted)
export const reelsMuted = () => muted
export function setReelsMuted(m: boolean) { muted = m; soundListeners.forEach(f => f()) }

// ── Déjà vu (visitors) ──────────────────────────────────────────────────
// The last Reels watched on this device (ids only), so the feed shows new
// ones first. Members: the server remembers.
const SEEN_KEY = 'dilchap_reels_seen'
const SEEN_MAX = 200
export function seenReels(): string[] {
  try { return (JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]).slice(0, SEEN_MAX) } catch { return [] }
}
function noteSeen(id: string) {
  try {
    const list = [id, ...seenReels().filter(x => x !== id)].slice(0, SEEN_MAX)
    localStorage.setItem(SEEN_KEY, JSON.stringify(list))
  } catch { /* storage blocked */ }
}

// ── Statistiques ────────────────────────────────────────────────────────
// VIEW after REELS_VIEW_SECONDS of playback, COMPLETE at the end, CLICK on
// the listing, CONTACT for a message / offer started from the Reel, SHARE.
// Once per Reel and kind in this visit; sent in batches (the server counts
// each visitor once a day and never the seller's own plays).
export type ReelEventKind = 'VIEW' | 'COMPLETE' | 'CLICK' | 'CONTACT' | 'SHARE'
const ROBOT = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit/i
const sent = new Set<string>()
let queue: { reelId: string; kind: ReelEventKind }[] = []
let timer = 0

function flush(leaving = false) {
  if (timer) { window.clearTimeout(timer); timer = 0 }
  if (!queue.length) return
  const events = queue.splice(0, 50)
  const token = getAccessToken()
  try {
    void fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...localeHeaders(), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ query: RECORD_REEL_EVENTS_MUTATION, variables: { events, sessionId: rotationSeed() } }),
      credentials: 'omit',
      keepalive: leaving,
    }).catch(() => undefined)
  } catch { /* best-effort */ }
  if (queue.length) flush(leaving)
}

let wired = false
export function reelEvent(reelId: string, kind: ReelEventKind) {
  if (typeof window === 'undefined' || ROBOT.test(navigator.userAgent)) return
  const key = `${reelId}|${kind}`
  if (sent.has(key)) return
  sent.add(key)
  if (kind === 'VIEW') noteSeen(reelId)
  queue.push({ reelId, kind })
  if (!wired) {
    wired = true
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(true) })
    window.addEventListener('pagehide', () => flush(true))
  }
  if (!timer) timer = window.setTimeout(() => flush(), 6000)
}

/** /reel/<id>: the shareable page of one Reel. */
export const reelPath = (id: string) => `/reel/${id}`

export const formatDuration = (sec: number) => {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Poster of a card: the 480 px thumbnail next to the WebP. */
export const reelThumb = (url: string | null) => (url && url.endsWith('.webp') ? url.replace(/\.webp$/, '-w480.webp') : url)

// « Publier un Reel » from the Reels tab: Mes Reels opens on the listing
// picker (read once).
const NEW_REEL_KEY = 'dilchap_new_reel'
export function requestNewReel() { try { sessionStorage.setItem(NEW_REEL_KEY, '1') } catch { /* no storage */ } }
export function takeNewReelRequest() {
  try { const v = sessionStorage.getItem(NEW_REEL_KEY); sessionStorage.removeItem(NEW_REEL_KEY); return v === '1' } catch { return false }
}

// « Gérer » on one's own Reel (feed, players): Mes Reels opens on it (read
// once).
const MANAGE_REEL_KEY = 'dilchap_manage_reel'
export function requestManageReel(id: string) { try { sessionStorage.setItem(MANAGE_REEL_KEY, id) } catch { /* no storage */ } }
export function takeManagedReel() {
  try { const v = sessionStorage.getItem(MANAGE_REEL_KEY); sessionStorage.removeItem(MANAGE_REEL_KEY); return v } catch { return null }
}

// ── Défilement automatique ─────────────────────────────────────────────
// At the end of a Reel, the next one comes up (on by default; the visitor
// can turn it off in the Reels menu, kept on this device).
const AUTO_KEY = 'dilchap_reels_autonext'
function storedAuto(): boolean {
  try { return localStorage.getItem(AUTO_KEY) !== '0' } catch { return true }
}
let autoNext = storedAuto()
const autoListeners = new Set<() => void>()
export const useReelsAutoNext = () => useSyncExternalStore(f => { autoListeners.add(f); return () => { autoListeners.delete(f) } }, () => autoNext)
export function setReelsAutoNext(on: boolean) {
  autoNext = on
  try { localStorage.setItem(AUTO_KEY, on ? '1' : '0') } catch { /* private mode */ }
  autoListeners.forEach(f => f())
}
