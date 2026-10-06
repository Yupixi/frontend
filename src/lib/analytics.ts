import { useSyncExternalStore } from 'react'
import { CLARITY_ID, setClarity } from './clarity'

// « Mesure d'audience » (Google Analytics 4), set in the Backoffice per
// country (Backend content/analytics-settings.ts, query analyticsConfig).
//
// Rules:
// - Nothing reaches Google before the visitor accepts the banner: no
//   script, no request. The tag (gtag.js) is injected only once the
//   setting of the visitor's country is on AND the visitor said yes, then
//   on the first interaction or when the browser is idle (never in the way
//   of the first paint).
// - Consent Mode v2: everything denied by default, analytics_storage
//   granted on « Accepter »; advertising (ad_storage, ad_user_data,
//   ad_personalization) always denied, Google signals off.
// - No personal data: no user id, e-mail or phone; page_location without
//   query string or fragment (reset links, tokens, invitations, search
//   terms…) except a few harmless parameters; page_title is the kind of
//   page, never a listing title (sellers write anything in it); events only
//   carry listing ids, categories, countries, counts and amounts.
// - SPA: send_page_view false, one page_view per route change (App).
// - Microsoft Clarity (lib/clarity) shares the banner: one « Accepter »
//   covers what is on for the visitor's country. The choice remembers what
//   it covered: a tool turned on later asks again (a refusal stays valid).

export type AnalyticsBanner = { title: string; text: string; accept: string; refuse: string; policyLabel: string; manage: string }
export type ClarityConfig = { enabled: boolean; projectId: string | null }
export type AnalyticsConfig = { enabled: boolean; measurementId: string | null; consentMonths: number; policyPath: string; banner: AnalyticsBanner; clarity?: ClarityConfig }
type Choice = 'granted' | 'denied'
type Tool = 'ga' | 'clarity'

const STORAGE_KEY = 'dilchap_analytics_consent'
const MONTH_MS = 30.44 * 24 * 3600 * 1000
// Parameters kept in page_location (never personal).
const ALLOWED_PARAMS = ['categorie', 'category', 'legal', 'campaign']
// GA cookies live 13 months at most (CNIL), not GA's default 2 years.
const COOKIE_EXPIRES_S = 13 * 31 * 24 * 3600

type Gtag = (...args: unknown[]) => void
type GaWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag } & Record<string, unknown>
const w = (typeof window !== 'undefined' ? window : undefined) as GaWindow | undefined

// ---- Stored choice ------------------------------------------------------

function readChoice(months: number, needed: Tool[]): Choice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as { choice?: unknown; at?: unknown; tools?: unknown }
    if ((v.choice !== 'granted' && v.choice !== 'denied') || typeof v.at !== 'number') return null
    // Asked again once the choice is older than the BO's duration.
    if (Date.now() - v.at > months * MONTH_MS || v.at > Date.now() + 60_000) return null
    // A yes covers the tools named when it was given (before Clarity: GA).
    const tools = Array.isArray(v.tools) ? v.tools : ['ga']
    if (v.choice === 'granted' && !needed.every((t) => tools.includes(t))) return null
    return v.choice
  } catch {
    return null
  }
}

function storeChoice(choice: Choice, tools: Tool[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: Date.now(), tools })) } catch { /* storage blocked: asked again next visit */ }
}

// ---- State (external store: the banner and the footer link read it) ----

type State = { config: AnalyticsConfig | null; choice: Choice | null; reopened: boolean }
let state: State = { config: null, choice: null, reopened: false }
const listeners = new Set<() => void>()
const emit = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

/** The setting of the visitor's country and their choice. */
export const useAnalyticsState = () => useSyncExternalStore(subscribe, () => state, () => state)

const isOn = (c: AnalyticsConfig | null): c is AnalyticsConfig & { measurementId: string } =>
  !!c && c.enabled && !!c.measurementId && /^G-[A-Z0-9]{4,15}$/.test(c.measurementId)
const clarityId = (c: AnalyticsConfig | null): string | null =>
  c?.clarity?.enabled && c.clarity.projectId && CLARITY_ID.test(c.clarity.projectId) ? c.clarity.projectId : null
const toolsOf = (c: AnalyticsConfig | null): Tool[] => [...(isOn(c) ? ['ga' as const] : []), ...(clarityId(c) ? ['clarity' as const] : [])]
/** Something on for this country needs the visitor's consent (banner, « Gérer les cookies »). */
export const needsConsent = (c: AnalyticsConfig | null): c is AnalyticsConfig => toolsOf(c).length > 0
const active = () => isOn(state.config) && state.choice === 'granted'

// ---- Clean page data ----------------------------------------------------

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// A listing keeps its id only (the words of its title, written by the
// seller, go); a member's profile (/vendeur/<id>, /@pseudo) is not named.
function cleanPath(path: string): string {
  const listing = /^\/annonce\/(.+)$/.exec(path)
  if (listing) { const id = UUID.exec(listing[1])?.[0]; return id ? `/annonce/${id}` : '/annonce' }
  if (/^\/vendeur\/./.test(path) || /^\/(@|%40)[^/]+\/?$/i.test(path)) return '/vendeur'
  return path
}

/** The address without query string nor fragment (except ALLOWED_PARAMS). */
export function cleanLocation(href: string): string {
  try {
    const u = new URL(href, w?.location.origin)
    const out = new URL(u.origin + cleanPath(u.pathname))
    for (const k of ALLOWED_PARAMS) {
      const v = u.searchParams.get(k)
      if (v && /^[\w-]{1,60}$/.test(v)) out.searchParams.set(k, v)
    }
    return out.toString()
  } catch {
    return w ? w.location.origin + '/' : ''
  }
}

// Same-site referrer cleaned the same way; another site: its origin only.
function cleanReferrer(): string {
  const r = typeof document !== 'undefined' ? document.referrer : ''
  if (!r) return ''
  try {
    const u = new URL(r)
    return u.origin === w?.location.origin ? cleanLocation(r) : `${u.origin}/`
  } catch {
    return ''
  }
}

// ---- gtag ---------------------------------------------------------------

let queued = false // dataLayer set up (no network)
let injected = false // gtag.js requested
let scheduled = false
let lastPage: { location: string; title: string } | null = null
let configuredId: string | null = null
let stopped = false

// gtag.js reads `arguments` objects from the dataLayer (Google's snippet).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const gtag: Gtag = function (..._args: unknown[]) {
  if (!w) return
  // eslint-disable-next-line prefer-rest-params
  ;(w.dataLayer = w.dataLayer ?? []).push(arguments)
}

// Commands queued in the dataLayer; gtag.js runs them once it loads.
function setUpQueue(id: string) {
  if (!w) return
  w[`ga-disable-${id}`] = false
  if (queued && configuredId === id) {
    // Accepted again after a refusal (or the country's setting back on) in
    // the same visit; otherwise already running.
    if (stopped) {
      stopped = false
      gtag('consent', 'update', { analytics_storage: 'granted' })
      if (lastPage) sendPageView(lastPage)
    }
    return
  }
  if (!queued) {
    w.gtag = gtag
    gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    gtag('set', 'ads_data_redaction', true)
    gtag('js', new Date())
  } else if (configuredId) {
    // Another country with its own measurement ID: the previous one stops.
    w[`ga-disable-${configuredId}`] = true
  }
  gtag('consent', 'update', { analytics_storage: 'granted' })
  gtag('config', id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: COOKIE_EXPIRES_S,
    cookie_flags: w.location.protocol === 'https:' ? 'SameSite=Lax;Secure' : 'SameSite=Lax',
    page_location: lastPage?.location ?? cleanLocation(w.location.href),
    page_referrer: cleanReferrer(),
  })
  queued = true
  stopped = false
  configuredId = id
  if (lastPage) sendPageView(lastPage)
}

function inject(id: string) {
  if (injected || !w) return
  injected = true
  // One gtag.js serves every measurement ID configured later.
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(s)
}

// After the first interaction or when the browser is idle, never during
// the first paint (one-shot listeners, no React state).
function scheduleInject(id: string) {
  if (injected || scheduled || !w) return
  scheduled = true
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
  const go = () => {
    events.forEach((e) => w.removeEventListener(e, go))
    if (active()) inject(id)
    else scheduled = false
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

function start(now: boolean) {
  const c = state.config
  if (!isOn(c) || state.choice !== 'granted') return
  setUpQueue(c.measurementId)
  if (now) inject(c.measurementId)
  else scheduleInject(c.measurementId)
}

// Stops sending and removes GA's cookies of this site (_ga, _ga_<id>).
function stop() {
  if (!w) return
  if (configuredId) {
    stopped = true
    w[`ga-disable-${configuredId}`] = true
    if (queued) gtag('consent', 'update', { analytics_storage: 'denied' })
  }
  try {
    // GA writes them on the widest domain it can (« .dilchap.com »).
    const parts = w.location.hostname.split('.')
    const domains = ['', ...parts.slice(0, -1).map((_, i) => '.' + parts.slice(i).join('.'))]
    for (const c of document.cookie.split(';')) {
      const name = c.split('=')[0].trim()
      if (name !== '_ga' && !name.startsWith('_ga_') && name !== '_gid' && name !== '_gat') continue
      for (const d of new Set(domains)) document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`
    }
  } catch { /* cookies blocked */ }
}

// ---- Public API ---------------------------------------------------------

/** The setting of the visitor's country (re-applied when the country changes). */
export function setAnalyticsConfig(config: AnalyticsConfig | null) {
  const choice = config ? readChoice(config.consentMonths, toolsOf(config)) : null
  emit({ config, choice })
  if (isOn(config) && choice === 'granted') start(false)
  else if (configuredId) stop()
  setClarity(choice === 'granted' ? clarityId(config) : null)
}

export function acceptAnalytics() {
  storeChoice('granted', toolsOf(state.config))
  emit({ choice: 'granted', reopened: false })
  start(true)
  setClarity(clarityId(state.config), true)
}

export function refuseAnalytics() {
  storeChoice('denied', toolsOf(state.config))
  emit({ choice: 'denied', reopened: false })
  stop()
  setClarity(null)
}

/** « Gérer les cookies »: shows the banner again. */
export const reopenConsent = () => emit({ reopened: true })

/** One page_view per route change, with a clean address and title. */
export function trackPageView(href: string, title: string) {
  const page = { location: cleanLocation(href), title: `${title} — Dilchap` }
  if (lastPage && lastPage.location === page.location && lastPage.title === page.title) return
  lastPage = page
  if (active() && queued) sendPageView(page)
}

function sendPageView(page: { location: string; title: string }) {
  // Later events (view_item, search…) carry this address too.
  gtag('set', { page_location: page.location, page_title: page.title, page_referrer: cleanReferrer() })
  gtag('event', 'page_view', { page_location: page.location, page_title: page.title })
}

type Value = string | number | boolean | undefined | null
type Item = { item_id?: string; item_name?: string; item_category?: string; quantity?: number; price?: number }
// Only short codes, ids and numbers: anything that looks like an e-mail or
// a phone number is dropped.
const PERSONAL = /@|\+?\d[\d\s.-]{7,}\d/
const safe = (v: Value) => (typeof v === 'string' ? (v.length <= 100 && !PERSONAL.test(v) ? v : undefined) : v ?? undefined)

type Params = { [key: string]: Value | Item[] }
let lastEvent = { key: '', at: 0 }

/** A product event (no-op without consent or when the country's setting is off). */
export function track(name: 'view_item' | 'search' | 'sign_up' | 'login' | 'publish_listing' | 'contact_seller' | 'purchase', params: Params = {}) {
  if (!active()) return
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) out[k] = v.map((i) => Object.fromEntries(Object.entries(i).map(([a, b]) => [a, safe(b as Value)]).filter(([, b]) => b !== undefined)))
    else { const s = safe(v); if (s !== undefined) out[k] = s }
  }
  // The same event twice in a row within a second (React's double effects
  // in development, a double tap) counts once.
  const key = name + JSON.stringify(out)
  if (key === lastEvent.key && Date.now() - lastEvent.at < 1000) return
  lastEvent = { key, at: Date.now() }
  // The page it happened on, clean (else gtag.js may use the first one).
  if (lastPage) { out.page_location = lastPage.location; out.page_title = lastPage.title }
  if (!queued && isOn(state.config)) setUpQueue(state.config.measurementId)
  gtag('event', name, out)
}

// page_title of each page: its kind, never its content (a listing's or a
// shop's name is written by members).
const PAGE_TITLES: Record<string, string> = {
  home: 'Accueil', search: 'Recherche', 'flash-offers': 'Bonnes affaires', 'listing-detail': 'Annonce', 'seller-profile': 'Profil vendeur',
  categories: 'Catégories', auth: 'Connexion', legal: 'Page légale', shop: 'Boutique', shops: 'Boutiques', help: 'Centre d’aide',
  'buyer-dashboard': 'Compte — Tableau de bord', 'buyer-favorites': 'Compte — Favoris', 'buyer-messages': 'Compte — Messages',
  'buyer-notifications': 'Compte — Notifications', 'buyer-history': 'Compte — Historique', 'buyer-settings': 'Compte — Paramètres',
  'buyer-purchases': 'Compte — Achats', 'buyer-receipts': 'Compte — Reçus', 'buyer-receipt': 'Compte — Reçu', 'buyer-handover': 'Compte — Remise',
  'buyer-dispute-new': 'Compte — Nouveau litige', 'buyer-disputes': 'Compte — Litiges',
  'seller-dashboard': 'Compte — Vendeur', 'seller-post': 'Compte — Publier une annonce', 'seller-edit': 'Compte — Modifier une annonce',
  'seller-listings': 'Compte — Mes annonces', 'seller-stats': 'Compte — Statistiques', 'seller-premium': 'Compte — Booster',
  'seller-orders': 'Compte — Ventes', 'seller-wallet': 'Compte — Crédits', 'seller-reviews': 'Compte — Avis', 'seller-disputes': 'Compte — Litiges',
  'seller-handover': 'Compte — Remise', 'seller-kyc': 'Compte — Vérification', 'seller-shop': 'Compte — Ma boutique',
  'seller-shop-stats': 'Compte — Statistiques boutique', 'seller-shop-promos': 'Compte — Promotions boutique', 'seller-badge': 'Compte — Badge',
  'seller-campaigns': 'Compte — Campagnes', support: 'Compte — Support',
}
export const pageTitle = (page: string, category?: string) =>
  page === 'search' && category ? `Catégorie ${category}` : (PAGE_TITLES[page] ?? 'Compte')

// Credit purchases already counted (ids stay on this device, never sent).
const PURCHASES_KEY = 'dilchap_analytics_purchases'
/** A Mobile Money credit purchase that succeeded: amount and currency only. */
export function trackCreditPurchase(p: { id: string; kind: string; status: string; amount: number; credits?: number | null; currency: string }) {
  if (p.status !== 'SUCCESS' || (p.kind !== 'CREDIT_PACK' && p.kind !== 'WALLET_TOPUP') || !active()) return
  let seen: string[] = []
  try { seen = JSON.parse(sessionStorage.getItem(PURCHASES_KEY) ?? '[]') as string[] } catch { /* ignore */ }
  if (seen.includes(p.id)) return
  try { sessionStorage.setItem(PURCHASES_KEY, JSON.stringify([...seen.slice(-19), p.id])) } catch { /* ignore */ }
  track('purchase', {
    currency: p.currency, value: p.amount,
    items: [{ item_id: p.kind === 'CREDIT_PACK' ? 'pack_credits' : 'credits', item_name: 'Crédits Dilchap', quantity: p.credits ?? undefined, price: p.amount }],
  })
}
