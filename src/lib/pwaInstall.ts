import { GRAPHQL_URL } from './apollo'
import { getAccessToken } from './auth'
import { track } from './analytics'
import { getMarketCode } from './countries'
import { localeHeaders } from '../i18n/headers'

// « Application installée » (Backend modules/app-installs, BO Surveillance
// and member page): is Dilchap installed as an app, opened from its icon,
// and how the « Installer » banner does. No React state: a few events per
// device and day are queued here and sent in one batch a few seconds later
// (or when the page is hidden or left), never one request per page.
//
// - the browser's `appinstalled` event (Android, Chrome, Edge; iPhone has
//   none: its first opening from the home screen counts);
// - an opening in app mode (display-mode standalone / fullscreen /
//   minimal-ui, or navigator.standalone on iPhone), at most once per day and
//   device, and a browser opening the same way (share app vs browser);
// - the banner: shown (once a day), « Installer », « Plus tard », the
//   browser's answer (userChoice), the manual guide.
//
// The device id is random (localStorage, else this tab only): no
// fingerprint, nothing personal. A signed-in member's token goes with the
// batch so the device is attached to the account. Robots are left out.
// GA4 gets pwa_install_prompt / pwa_install_accepted / pwa_installed /
// pwa_open (with the audience consent only, lib/analytics), never an id.

export type PwaEvent =
  | 'OPEN_APP' | 'OPEN_BROWSER' | 'INSTALLED'
  | 'BANNER_SHOWN' | 'BANNER_INSTALL' | 'BANNER_LATER'
  | 'PROMPT_ACCEPTED' | 'PROMPT_DISMISSED' | 'GUIDE_SHOWN'

const MUTATION = 'mutation RecordAppEvents($input: AppEventsInput!) { recordAppEvents(input: $input) }'
const DEVICE_KEY = 'dilchap_app_device'
const DAY_KEY = 'dilchap_app_days'
const FLUSH_MS = 4000
const ROBOT = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit/i
// Sent at most once per day and device.
const DAILY = new Set<PwaEvent>(['OPEN_APP', 'OPEN_BROWSER', 'BANNER_SHOWN', 'GUIDE_SHOWN'])

const enabled = typeof window !== 'undefined' && typeof navigator !== 'undefined'
  && !ROBOT.test(navigator.userAgent) && !(navigator as Navigator & { webdriver?: boolean }).webdriver

let memoryId: string | null = null
let queue: PwaEvent[] = []
let timer = 0
let listening = false

const storage = {
  get(k: string) { try { return localStorage.getItem(k) } catch { return null } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); return true } catch { return false } },
}

function randomId(): string {
  try { if (crypto.randomUUID) return crypto.randomUUID() } catch { /* older browsers */ }
  const b = new Uint8Array(16)
  try { crypto.getRandomValues(b) } catch { for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256) }
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5')
}

/** The device's random id (kept in localStorage; this tab only without it). */
export function appDeviceId(): string {
  const stored = storage.get(DEVICE_KEY)
  if (stored && /^[A-Za-z0-9-]{16,64}$/.test(stored)) return stored
  memoryId = memoryId ?? randomId()
  storage.set(DEVICE_KEY, memoryId)
  return memoryId
}

/** Opened as an installed app (home-screen icon, app window)? */
export function isAppMode(): boolean {
  if (typeof window === 'undefined') return false
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return true
  try {
    return ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some((m) => window.matchMedia(`(display-mode: ${m})`).matches)
  } catch { return false }
}

export function appPlatform(): 'ANDROID' | 'IOS' | 'DESKTOP' | 'OTHER' {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'IOS'
  if (/android/i.test(ua)) return 'ANDROID'
  if (/windows|macintosh|linux|cros/i.test(ua)) return 'DESKTOP'
  return 'OTHER'
}

function appBrowser(): string {
  const ua = navigator.userAgent
  if (/edg(e|a|ios)?\//i.test(ua)) return 'EDGE'
  if (/samsungbrowser/i.test(ua)) return 'SAMSUNG'
  if (/opr\/|opera/i.test(ua)) return 'OPERA'
  if (/firefox|fxios/i.test(ua)) return 'FIREFOX'
  if (/chrome|crios|chromium/i.test(ua)) return 'CHROME'
  if (/safari/i.test(ua)) return 'SAFARI'
  return 'OTHER'
}

const today = () => new Date().toISOString().slice(0, 10)

// Daily events already sent today (one small localStorage entry, written
// once the API took them: an event lost on the way is sent again at the
// next visit). Without storage, once per tab.
const inTab = new Set<string>()
function readDays(): Record<string, string> {
  try { return JSON.parse(storage.get(DAY_KEY) ?? '{}') as Record<string, string> } catch { return {} }
}
function due(kind: PwaEvent): boolean {
  const day = today()
  if (readDays()[kind] === day || inTab.has(`${day}|${kind}`)) return false
  inTab.add(`${day}|${kind}`)
  return true
}
function settle(events: PwaEvent[], ok: boolean) {
  const day = today()
  const daily = events.filter((k) => DAILY.has(k))
  if (!daily.length) return
  if (!ok) { for (const k of daily) inTab.delete(`${day}|${k}`); return }
  const seen = readDays()
  for (const k of daily) seen[k] = day
  storage.set(DAY_KEY, JSON.stringify(seen))
}

function send(events: PwaEvent[], leaving: boolean) {
  if (!events.length) return
  const token = getAccessToken()
  const market = getMarketCode()
  const input = { deviceId: appDeviceId(), platform: appPlatform(), browser: appBrowser(), ...(market ? { country: market } : {}), events: events.map((kind) => ({ kind })) }
  try {
    void fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...localeHeaders(), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ query: MUTATION, variables: { input } }),
      credentials: 'omit',
      keepalive: leaving,
    }).then((r) => settle(events, r.ok), () => settle(events, false))
  } catch { settle(events, false) }
}

export function flushAppEvents(leaving = false) {
  if (timer) { window.clearTimeout(timer); timer = 0 }
  const batch = [...new Set(queue)]
  queue = []
  send(batch, leaving)
}

function listen() {
  if (listening) return
  listening = true
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAppEvents(true) })
  window.addEventListener('pagehide', () => flushAppEvents(true))
}

const GA: Partial<Record<PwaEvent, Parameters<typeof track>[0]>> = {
  BANNER_SHOWN: 'pwa_install_prompt',
  PROMPT_ACCEPTED: 'pwa_install_accepted',
  INSTALLED: 'pwa_installed',
  OPEN_APP: 'pwa_open',
}

/** Something happened to the app on this device (queued, sent in a batch). */
export function pwaEvent(kind: PwaEvent) {
  if (!enabled) return
  if (DAILY.has(kind) && !due(kind)) return
  const ga = GA[kind]
  if (ga) track(ga, { platform: appPlatform().toLowerCase() }, { defer: true })
  queue.push(kind)
  listen()
  if (!timer) timer = window.setTimeout(() => { timer = 0; flushAppEvents() }, FLUSH_MS)
}

let started = false
/** Once per page load (App): the opening, and the browser's install event. */
export function startPwaTracking() {
  if (!enabled || started) return
  started = true
  pwaEvent(isAppMode() ? 'OPEN_APP' : 'OPEN_BROWSER')
  window.addEventListener('appinstalled', () => pwaEvent('INSTALLED'))
}
