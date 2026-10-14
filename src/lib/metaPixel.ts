import { cleanForClarity } from './clarity'
import { landingFbclid } from './campaignParams'

// Meta Pixel (ads on Facebook / Instagram: measurement and retargeting),
// set in the Backoffice next to Google Analytics and Microsoft Clarity
// (« Mesure d'audience », Backend content/analytics-settings.ts): on or off
// per country, a pixel ID.
//
// Rules:
// - Loaded only with the visitor's consent (lib/analytics: the same banner,
//   which names Meta) and only while the setting of the visitor's country
//   is on; then on the first interaction or when the browser is idle.
//   Never in the Backoffice (storefront only).
// - Nothing is sent where Microsoft Clarity stops (cleanForClarity and its
//   holds: identity check, payments, launch page, live location, any
//   address with parameters other than harmless ones such as ?acces= or
//   tokens). /q/ and /v/ pages and e-mail links are outside the app. A
//   credit purchase confirmed during a payment sheet waits until it closes.
// - No personal data: no advanced matching (never fbq('init', id, {em…})),
//   automatic configuration off (no button clicks, no page metadata), no
//   automatic page views on history changes (one PageView per page, sent
//   here). Events carry listing ids (the « id » of the catalog feed),
//   categories, amounts and the search words when they look like neither
//   an e-mail nor a phone number.
// - Every event has its own event_id: a server-side Conversions API can be
//   added later and send the same events with the same ids, which Meta
//   then counts once (see `dispatch`).

export const META_PIXEL_ID = /^\d{15,16}$/

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue?: unknown[]
  push?: unknown
  loaded?: boolean
  version?: string
  disablePushState?: boolean
}
type PixelWindow = Window & { fbq?: Fbq; _fbq?: Fbq }

const w = (typeof window !== 'undefined' ? window : undefined) as PixelWindow | undefined

let pixelId: string | null = null // on for this country + consent
let initedId: string | null = null
let injected = false
let scheduled = false
let holds = 0
let page = ''
// Events that must not be lost while a payment sheet holds the pixel.
let pending: { name: MetaEvent; params: Params; at: number }[] = []

// fbq('…') before fbevents.js is there: Meta's own queue (its snippet).
function fbq(...args: unknown[]) {
  if (!w) return
  if (!w.fbq) {
    const n: Fbq = (...a: unknown[]) => {
      if (n.callMethod) n.callMethod(...a)
      else (n.queue = n.queue ?? []).push(a)
    }
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    w.fbq = n
    if (!w._fbq) w._fbq = n
  }
  w.fbq(...args)
}

const allowed = () => !!pixelId && holds === 0 && !!w && cleanForClarity(page, w.location.href)

// ---- Cookies ----------------------------------------------------------------

function siteDomains() {
  const parts = w!.location.hostname.split('.')
  return ['', ...parts.slice(0, -1).map((_, i) => '.' + parts.slice(i).join('.'))]
}

// The ad click the visitor came from (?fbclid=, taken off the address at
// start, lib/campaignParams), as Meta's own cookie, once consented.
function storeClickId() {
  const fbclid = landingFbclid()
  if (!fbclid || !w || /(?:^|;\s*)_fbc=/.test(document.cookie)) return
  const secure = w.location.protocol === 'https:' ? '; Secure' : ''
  try { document.cookie = `_fbc=fb.1.${Date.now()}.${encodeURIComponent(fbclid)}; Max-Age=${90 * 86400}; path=/; SameSite=Lax${secure}` } catch { /* cookies blocked */ }
}

function eraseCookies() {
  if (!w) return
  try {
    for (const c of document.cookie.split(';')) {
      const name = c.split('=')[0].trim()
      if (name !== '_fbp' && name !== '_fbc') continue
      for (const d of new Set(siteDomains())) document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`
    }
  } catch { /* cookies blocked */ }
}

// ---- Tag ----------------------------------------------------------------------

function init(id: string) {
  if (initedId === id) return
  if (initedId) return // another country's pixel this visit: kept until reload (one pixel per page)
  fbq('set', 'autoConfig', false, id)
  w!.fbq!.disablePushState = true
  fbq('consent', 'grant')
  fbq('init', id)
  initedId = id
  storeClickId()
}

function inject() {
  if (injected || !w) return
  injected = true
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://connect.facebook.net/en_US/fbevents.js'
  s.addEventListener('error', () => { injected = false }, { once: true })
  document.head.appendChild(s)
}

function scheduleInject() {
  if (injected || scheduled || !w) return
  scheduled = true
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
  const go = () => {
    events.forEach((e) => w.removeEventListener(e, go))
    scheduled = false
    if (pixelId) inject()
  }
  events.forEach((e) => w.addEventListener(e, go, { once: true, passive: true }))
  const idle = () => {
    const ric = (w as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    if (ric) ric(go, { timeout: 5000 })
    else w.setTimeout(go, 3000)
  }
  if (document.readyState === 'complete') idle()
  else w.addEventListener('load', idle, { once: true })
}

// ---- Events -----------------------------------------------------------------------

export type MetaEvent =
  | 'PageView' | 'ViewContent' | 'Search' | 'ViewCategory' | 'AddToWishlist' | 'Lead'
  | 'CompleteRegistration' | 'PublishListing' | 'Purchase'
// Not in Meta's standard list: sent with trackCustom.
const CUSTOM = new Set<MetaEvent>(['ViewCategory', 'PublishListing'])

type Params = {
  content_ids?: string[]
  content_type?: 'product'
  content_category?: string
  content_name?: string
  value?: number
  currency?: string
  search_string?: string
  num_items?: number
  status?: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PERSONAL = /@|\+?\d[\d\s.-]{7,}\d/
const SHORT = /^[\w\- àâäçéèêëîïôöùûüÿœæ'’.]{1,60}$/i

// Only listing ids, short codes, numbers, and search words that hold no
// e-mail or phone number.
function clean(p: Params): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (p.content_ids) {
    const ids = p.content_ids.filter((id) => UUID.test(id)).slice(0, 10)
    if (ids.length) { out.content_ids = ids; out.content_type = 'product' }
  }
  if (p.content_category && SHORT.test(p.content_category)) out.content_category = p.content_category
  if (p.content_name && SHORT.test(p.content_name)) out.content_name = p.content_name
  if (typeof p.value === 'number' && Number.isFinite(p.value) && p.value >= 0) {
    out.value = Math.round(p.value)
    out.currency = p.currency && /^[A-Z]{3}$/.test(p.currency) ? p.currency : 'XOF'
  }
  if (p.search_string) {
    const s = p.search_string.trim().replace(/\s+/g, ' ')
    if (s && s.length <= 100 && !PERSONAL.test(s)) out.search_string = s
  }
  if (typeof p.num_items === 'number' && Number.isInteger(p.num_items) && p.num_items >= 0) out.num_items = p.num_items
  if (p.status && SHORT.test(p.status)) out.status = p.status
  return out
}

const eventId = () => {
  try { if (crypto.randomUUID) return crypto.randomUUID() } catch { /* older browsers */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

let last = { key: '', at: 0 }

// The one place events leave: the browser pixel now; a Conversions API call
// (backend, same event_id) would go next to it.
function dispatch(name: MetaEvent, params: Record<string, unknown>) {
  const key = name + JSON.stringify(params)
  // The same event twice within a second (React's double effects in
  // development, a double tap) counts once.
  if (key === last.key && Date.now() - last.at < 1000) return
  last = { key, at: Date.now() }
  if (pixelId) init(pixelId)
  const options = { eventID: eventId() }
  if (CUSTOM.has(name)) fbq('trackCustom', name, params, options)
  else fbq('track', name, params, options)
}

function flush() {
  if (!allowed() || !pending.length) return
  const fresh = pending.filter((e) => Date.now() - e.at < 30 * 60_000)
  pending = []
  for (const e of fresh) dispatch(e.name, clean(e.params))
}

/** A Meta event (no-op without consent, when off for the country, or on an excluded page). */
export function metaTrack(name: MetaEvent, params: Params = {}) {
  if (!pixelId) return
  if (!allowed()) {
    // A confirmed purchase is never lost to a payment sheet on screen.
    if (name === 'Purchase' && pending.length < 5) pending.push({ name, params, at: Date.now() })
    return
  }
  dispatch(name, clean(params))
}

let lastPageView = ''
/** One PageView per page (App, after the address bar is set). */
export function metaPageView(pageName: string) {
  page = pageName
  if (!allowed() || !w) return
  const here = w.location.pathname + w.location.search
  if (here === lastPageView) return
  lastPageView = here
  dispatch('PageView', {})
  scheduleInject()
}

/** The page shown (App), for the exclusions. */
export function setMetaPixelPage(pageName: string) {
  page = pageName
  flush()
}

/** Is the pixel on for this visitor (consent + country)? */
export const metaPixelOn = () => !!pixelId

/**
 * Consent given and the pixel on for the visitor's country: its ID;
 * otherwise null (refused, off, unknown ID), which revokes the consent in
 * the pixel and erases its cookies. `immediate`: the visitor just accepted.
 */
export function setMetaPixel(id: string | null, immediate = false) {
  const next = id && META_PIXEL_ID.test(id) ? id : null
  if (!next) {
    if (pixelId && initedId) fbq('consent', 'revoke')
    pixelId = null
    pending = []
    lastPageView = ''
    eraseCookies()
    return
  }
  const was = pixelId
  pixelId = next
  if (initedId && !was) fbq('consent', 'grant')
  if (!allowed()) return
  init(next)
  if (immediate) inject()
  // Accepted on this page: it counts as viewed.
  if (!was && w) {
    lastPageView = w.location.pathname + w.location.search
    dispatch('PageView', {})
  }
  scheduleInject()
  flush()
}

/** A surface that must not be measured is on screen (lib/clarity's holds). */
export function holdMetaPixel(): () => void {
  holds += 1
  let released = false
  return () => {
    if (released) return
    released = true
    holds -= 1
    flush()
  }
}
