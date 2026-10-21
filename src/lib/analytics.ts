import { useSyncExternalStore } from 'react'
import { CLARITY_ID, cleanForClarity, setClarity } from './clarity'
import { META_PIXEL_ID, metaPixelOn, metaTrack, onAdultCategory, setMetaPixel } from './metaPixel'
import { takeGaCampaign } from './campaignParams'

// « Mesure d'audience » (Google Analytics 4), set in the Backoffice per
// country (Backend content/analytics-settings.ts, query analyticsConfig).
//
// Rules:
// - Nothing reaches Google before the visitor accepts the banner: no
//   script, no request. The tag (gtag.js) is injected only once the
//   setting of the visitor's country is on AND the visitor said yes, then
//   on the first interaction or when the browser is idle (never in the way
//   of the first paint).
// - Consent Mode v2: everything denied by default (the first command of the
//   queue), then one update per change of the visitor's choice:
//   analytics_storage follows « Mesure d'audience », and ad_storage,
//   ad_user_data, ad_personalization follow « Publicité » — granted only
//   when the « Publicité Google » of the visitor's country is on AND the
//   visitor accepted it. Google signals and ad personalization signals
//   follow the same choice, and are off on pages that must not feed
//   retargeting (account, sign-in, support, the « Section Adultes », an
//   adult listing, addresses with keys or tokens).
// - No personal data: no user id, e-mail or phone, no enhanced conversions;
//   page_location without query string or fragment (reset links, tokens,
//   invitations, search terms…) except a few harmless parameters;
//   page_title is the kind of page, never a listing title (sellers write
//   anything in it); events only carry listing ids, categories, countries,
//   counts and amounts.
// - SPA: send_page_view false, one page_view per route change (App). Every
//   hit names its destination (send_to): GA4 gets the measurement, the
//   Google Ads tag (when an AW- ID is set) only page views and listing
//   views on pages open to retargeting.
// - Two purposes, one switch each in the consent window (« Gérer les
//   cookies »): « Mesure d'audience » = Google Analytics + Microsoft Clarity
//   (lib/clarity), « Publicité » = Meta Pixel (lib/metaPixel) + Google Ads.
//   The banner (BO « Mode du bandeau ») offers « Accepter » / « Refuser »
//   (+ « Personnaliser »), or « OK » alone (+ « Paramétrer »): « Accepter »
//   and « OK » grant every tool on for the country, « Refuser » none.
// - Asked once. The stored choice keeps the tools asked about, the tools
//   accepted and the answer per purpose, for `consentMonths` (13 by
//   default). A tool turned on later is covered by the answer already given
//   to its purpose (accepted → on, refused → off): the banner only comes
//   back for a purpose never asked about — or for any new tool when the BO
//   « Redemander l'accord quand un outil est ajouté » is on (the tools
//   already answered keep their answer meanwhile). A refusal of everything
//   stays valid until it expires. Stored in localStorage AND in a
//   first-party cookie on the root domain (in-app browsers of WhatsApp /
//   Facebook / Instagram, Safari ITP, storage cleared or blocked); the
//   newest copy wins. A signed-in member's choice is also kept on the
//   account (lib/consentAccount): no new question on another device.
// - Visitors coming from an ad: the campaign of the landing address
//   (utm_*, gclid; lib/campaignParams) is added to the first page_view.

export type AnalyticsBanner = {
  title: string; text: string; accept: string; refuse: string; policyLabel: string; manage: string
  // Older API answers may lack these (defaults below).
  customize?: string; analyticsLabel?: string; analyticsText?: string; adsLabel?: string; adsText?: string; save?: string
  ok?: string; settings?: string
}
export type ClarityConfig = { enabled: boolean; projectId: string | null }
export type MetaPixelConfig = { enabled: boolean; pixelId: string | null }
export type GoogleAdsConfig = { enabled: boolean; adsId: string | null }
export type BannerMode = 'choice' | 'ok'
export type AnalyticsConfig = {
  enabled: boolean; measurementId: string | null; consentMonths: number; policyPath: string; banner: AnalyticsBanner
  clarity?: ClarityConfig; metaPixel?: MetaPixelConfig; googleAds?: GoogleAdsConfig
  // Older API answers lack these: « Accepter / Refuser », no re-ask.
  bannerMode?: BannerMode; reaskOnNewTool?: boolean
}
export type Tool = 'ga' | 'clarity' | 'meta' | 'gads'
export type Purpose = 'analytics' | 'ads'
export const PURPOSE_OF: Record<Tool, Purpose> = { ga: 'analytics', clarity: 'analytics', meta: 'ads', gads: 'ads' }
export const TOOL_NAMES: Record<Tool, string> = { ga: 'Google Analytics', clarity: 'Microsoft Clarity', meta: 'Pixel Meta', gads: 'Google Ads' }
const ALL_TOOLS: Tool[] = ['ga', 'clarity', 'meta', 'gads']
const isTool = (t: unknown): t is Tool => typeof t === 'string' && (ALL_TOOLS as string[]).includes(t)

/** Texts of the consent window, with their defaults. */
export const bannerTexts = (b: AnalyticsBanner) => ({
  customize: b.customize || 'Personnaliser',
  analyticsLabel: b.analyticsLabel || 'Mesure d’audience',
  analyticsText: b.analyticsText || 'Savoir quelles pages sont consultées et comment le site est utilisé, pour l’améliorer.',
  adsLabel: b.adsLabel || 'Publicité personnalisée',
  adsText: b.adsText || 'Mesurer l’efficacité des publicités Dilchap et vous en montrer sur d’autres sites et applications selon les pages consultées (reciblage).',
  save: b.save || 'Enregistrer mes choix',
  ok: b.ok || 'OK',
  settings: b.settings || 'Paramétrer',
})

const STORAGE_KEY = 'dilchap_analytics_consent'
const MONTH_MS = 30.44 * 24 * 3600 * 1000
// Parameters kept in page_location (never personal), ad campaigns included.
const ALLOWED_PARAMS = ['categorie', 'category', 'legal', 'campaign', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid']
const PARAM_VALUE = /^[\w.\-~ %+:|/]{1,100}$/
// GA cookies live 13 months at most (CNIL), not GA's default 2 years.
const COOKIE_EXPIRES_S = 13 * 31 * 24 * 3600
export const GOOGLE_ADS_ID = /^AW-\d{6,12}$/
// Public pages that may feed retargeting (never the account, sign-in,
// support, legal or help pages).
const AD_PAGES = new Set(['home', 'search', 'flash-offers', 'listing-detail', 'seller-profile', 'categories', 'shop', 'shops'])

type Gtag = (...args: unknown[]) => void
type GaWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag } & Record<string, unknown>
const w = (typeof window !== 'undefined' ? window : undefined) as GaWindow | undefined

// ---- Stored choice ------------------------------------------------------

// What the visitor answered: the tools they were asked about, those they
// accepted, the answer per purpose (covers the tools added later), when,
// how (banner « Accepter / Refuser », banner « OK », consent window), and
// whether it was made or loaded while signed in (`account`: never pushed
// to another member's account signing in on the same device).
export type ConsentMode = 'choice' | 'ok' | 'window'
export type Consent = { asked: Tool[]; granted: Tool[]; purposes: Partial<Record<Purpose, boolean>>; at: number; mode: ConsentMode; account?: boolean }
export const CONSENT_VERSION = 3
const MAX_MONTHS = 13
const COOKIE_NAME = 'dilchap_consent'
const PURPOSES: Purpose[] = ['analytics', 'ads']
const MODES: ConsentMode[] = ['choice', 'ok', 'window']

// Purposes answered by a list of tools asked about / accepted (choices
// stored before the purposes: the banner answered every tool at once).
function purposesFrom(asked: Tool[], granted: Tool[]): Consent['purposes'] {
  const out: Consent['purposes'] = {}
  for (const p of PURPOSES) {
    const tools = asked.filter((t) => PURPOSE_OF[t] === p)
    if (tools.length) out[p] = tools.some((t) => granted.includes(t))
  }
  return out
}

/** A stored choice (any version), or null when unreadable. Not checked for expiry. */
export function parseConsent(raw: unknown): Consent | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as { v?: unknown; version?: unknown; at?: unknown; asked?: unknown; granted?: unknown; purposes?: unknown; mode?: unknown; account?: unknown; choice?: unknown; tools?: unknown }
  if (typeof v.at !== 'number' || !Number.isFinite(v.at)) return null
  const version = v.v ?? v.version
  if (version === 3 || version === 2) {
    if (!Array.isArray(v.asked) || !Array.isArray(v.granted)) return null
    const asked = [...new Set(v.asked.filter(isTool))]
    const granted = [...new Set(v.granted.filter(isTool))].filter((t) => asked.includes(t))
    let purposes = purposesFrom(asked, granted)
    if (version === 3 && v.purposes && typeof v.purposes === 'object') {
      const p = v.purposes as Record<string, unknown>
      purposes = {}
      for (const k of PURPOSES) if (typeof p[k] === 'boolean') purposes[k] = p[k] as boolean
    }
    const mode = MODES.includes(v.mode as ConsentMode) ? (v.mode as ConsentMode) : 'choice'
    return { asked, granted, purposes, at: v.at, mode, ...(v.account === true ? { account: true } : {}) }
  }
  // Before the purposes: one choice for the tools named (GA only before
  // Clarity). A refusal covered everything.
  if (v.choice !== 'granted' && v.choice !== 'denied') return null
  const tools = Array.isArray(v.tools) ? v.tools.filter(isTool) : ['ga' as const]
  const c = v.choice === 'granted' ? { asked: tools, granted: tools } : { asked: [...ALL_TOOLS], granted: [] as Tool[] }
  return { ...c, purposes: purposesFrom(c.asked, c.granted), at: v.at, mode: 'choice' }
}

// Asked again once the choice is older than the BO's duration (or dated in
// the future: a wrong clock).
const fresh = (c: Consent | null, months: number): Consent | null =>
  c && Date.now() - c.at <= Math.min(months, MAX_MONTHS) * MONTH_MS && c.at <= Date.now() + 5 * 60_000 ? c : null

// ---- Cookie copy: « 3.<at>.<asked>.<granted>.<purposes>.<mode>[.a] » ------
// One letter per tool, one character per purpose (1 yes, 0 no, - not asked).
const TOOL_CODE: Record<Tool, string> = { ga: 'g', clarity: 'c', meta: 'm', gads: 'a' }
const CODE_TOOL = Object.fromEntries(Object.entries(TOOL_CODE).map(([t, c]) => [c, t])) as Record<string, Tool>
const MODE_CODE: Record<ConsentMode, string> = { choice: 'c', ok: 'o', window: 'w' }
const tc = (ts: Tool[]) => ts.map((t) => TOOL_CODE[t]).join('')
const ct = (s: string) => [...s].map((c) => CODE_TOOL[c]).filter(isTool)

export function encodeConsentCookie(c: Consent): string {
  const p = PURPOSES.map((k) => (c.purposes[k] === undefined ? '-' : c.purposes[k] ? '1' : '0')).join('')
  return [CONSENT_VERSION, c.at, tc(c.asked), tc(c.granted), p, MODE_CODE[c.mode], ...(c.account ? ['a'] : [])].join('.')
}

export function decodeConsentCookie(value: string): Consent | null {
  const m = /^3\.(\d{10,15})\.([gcma]{0,4})\.([gcma]{0,4})\.([-01]{2})\.([cow])(\.a)?$/.exec(value)
  if (!m) return null
  const purposes: Consent['purposes'] = {}
  PURPOSES.forEach((k, i) => { if (m[4][i] !== '-') purposes[k] = m[4][i] === '1' })
  const mode = (Object.entries(MODE_CODE).find(([, c]) => c === m[5])?.[0] ?? 'choice') as ConsentMode
  return parseConsent({ v: 3, at: Number(m[1]), asked: ct(m[2]), granted: ct(m[3]), purposes, mode, account: !!m[6] })
}

function readCookie(): Consent | null {
  try {
    const hit = document.cookie.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE_NAME}=`))
    return hit ? decodeConsentCookie(decodeURIComponent(hit.slice(COOKIE_NAME.length + 1))) : null
  } catch {
    return null
  }
}

// On the widest domain the browser accepts (« dilchap.com » covers www and
// the apex; a public suffix is refused by the browser, the next one is
// tried), never on an IP or localhost (host only).
function writeCookie(value: string, maxAgeS: number) {
  if (!w) return
  try {
    const host = w.location.hostname
    const secure = w.location.protocol === 'https:' ? '; Secure' : ''
    const base = `${COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${Math.max(0, Math.round(maxAgeS))}; path=/; SameSite=Lax${secure}`
    const parts = host.split('.')
    const isIp = /^[\d.]+$/.test(host) || host.includes(':')
    if (!isIp && parts.length > 1) {
      for (let i = parts.length - 2; i >= 0; i--) {
        const domain = parts.slice(i).join('.')
        document.cookie = `${base}; domain=${domain}`
        if (readCookie() && document.cookie.includes(`${COOKIE_NAME}=${encodeURIComponent(value)}`)) {
          // A host-only copy left by an older write would shadow it.
          if (i > 0) document.cookie = `${COOKIE_NAME}=; Max-Age=0; path=/`
          return
        }
      }
    }
    document.cookie = base
  } catch { /* cookies blocked */ }
}

function readLocal(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? parseConsent(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

// The newest valid copy of localStorage and of the cookie; the other one is
// brought up to date (cleared storage, in-app browser…).
function readConsent(months: number): Consent | null {
  const local = fresh(readLocal(), months)
  const cookie = fresh(readCookie(), months)
  const best = !local ? cookie : !cookie ? local : cookie.at > local.at ? cookie : local
  if (best && (!local || !cookie || local.at !== cookie.at)) storeConsent(best, months)
  return best
}

function storeConsent(c: Consent, months = state.config?.consentMonths ?? MAX_MONTHS) {
  const payload = { v: CONSENT_VERSION, at: c.at, asked: c.asked, granted: c.granted, purposes: c.purposes, mode: c.mode, ...(c.account ? { account: true } : {}) }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)) } catch { /* storage blocked: the cookie remains */ }
  // Lives as long as the choice is valid.
  writeCookie(encodeConsentCookie(c), (Math.min(months, MAX_MONTHS) * MONTH_MS - (Date.now() - c.at)) / 1000)
}

// ---- State (external store: the banner and the footer link read it) ----

type State = {
  config: AnalyticsConfig | null
  consent: Consent | null
  // Some tool on for this country still waits for an answer: the banner.
  pending: boolean
  // The consent window (« Gérer les cookies ») is open.
  managing: boolean
  // A signed-in member's choice is being read from the account: the banner
  // waits (no flash of a question already answered elsewhere).
  hold: boolean
}
let state: State = { config: null, consent: null, pending: false, managing: false, hold: false }
const listeners = new Set<() => void>()
const emit = (patch: Partial<State>) => {
  const next = { ...state, ...patch }
  next.pending = !next.hold && isPending(next.config, next.consent)
  state = next
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

/** The setting of the visitor's country and their choice. */
export const useAnalyticsState = () => useSyncExternalStore(subscribe, () => state, () => state)

const isOn = (c: AnalyticsConfig | null): c is AnalyticsConfig & { measurementId: string } =>
  !!c && c.enabled && !!c.measurementId && /^G-[A-Z0-9]{4,15}$/.test(c.measurementId)
const clarityId = (c: AnalyticsConfig | null): string | null =>
  c?.clarity?.enabled && c.clarity.projectId && CLARITY_ID.test(c.clarity.projectId) ? c.clarity.projectId : null
const pixelIdOf = (c: AnalyticsConfig | null): string | null =>
  c?.metaPixel?.enabled && c.metaPixel.pixelId && META_PIXEL_ID.test(c.metaPixel.pixelId) ? c.metaPixel.pixelId : null
// Google Ads tag ID ('' = through the GA4 audiences only).
const awIdOf = (c: AnalyticsConfig | null): string =>
  c?.googleAds?.adsId && GOOGLE_ADS_ID.test(c.googleAds.adsId) ? c.googleAds.adsId : ''
// Retargeting needs GA4 (its audiences) or a Google Ads tag.
const googleAdsOn = (c: AnalyticsConfig | null) => !!c?.googleAds?.enabled && (isOn(c) || !!awIdOf(c))
export const toolsOf = (c: AnalyticsConfig | null): Tool[] => [
  ...(isOn(c) ? ['ga' as const] : []),
  ...(clarityId(c) ? ['clarity' as const] : []),
  ...(pixelIdOf(c) ? ['meta' as const] : []),
  ...(googleAdsOn(c) ? ['gads' as const] : []),
]
/** Something on for this country needs the visitor's consent (banner, « Gérer les cookies »). */
export const needsConsent = (c: AnalyticsConfig | null): c is AnalyticsConfig => toolsOf(c).length > 0
/** The purposes on for this country, with their tools. */
export const purposesOf = (c: AnalyticsConfig | null): { purpose: Purpose; tools: Tool[] }[] =>
  (['analytics', 'ads'] as const)
    .map((purpose) => ({ purpose, tools: toolsOf(c).filter((t) => PURPOSE_OF[t] === purpose) }))
    .filter((p) => p.tools.length > 0)

// Something on for the country that the visitor hasn't answered about: a
// purpose never asked about, or (BO « Redemander l'accord quand un outil
// est ajouté ») a tool never asked about. A refusal of everything is not
// asked again before it expires.
export function isPending(c: AnalyticsConfig | null, consent: Consent | null) {
  const needed = toolsOf(c)
  if (!needed.length) return false
  if (!consent) return true
  const refusedAll = !consent.granted.length && !Object.values(consent.purposes).some(Boolean)
  if (refusedAll) return false
  if (c?.reaskOnNewTool) return needed.some((t) => !consent.asked.includes(t))
  return needed.some((t) => consent.purposes[PURPOSE_OF[t]] === undefined)
}

/** Does this choice allow this tool? A tool asked about keeps its answer; a newer one follows its purpose (unless the BO re-asks). */
export function consentGrants(consent: Consent | null, t: Tool, reask = false): boolean {
  if (!consent) return false
  if (consent.asked.includes(t)) return consent.granted.includes(t)
  return !reask && consent.purposes[PURPOSE_OF[t]] === true
}
const granted = (t: Tool) => toolsOf(state.config).includes(t) && consentGrants(state.consent, t, !!state.config?.reaskOnNewTool)
const active = () => granted('ga')

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
      if (v && (k.startsWith('utm_') || k === 'gclid' ? PARAM_VALUE.test(v) && !PERSONAL.test(v) : /^[\w-]{1,60}$/.test(v))) out.searchParams.set(k, v)
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
let configuredId: string | null = null // GA4 measurement ID configured
let stopped = false // GA4 stopped (refused or withdrawn) after being configured
let awConfigured: string | null = null // Google Ads tag configured
let adsGranted = false // the Google Ads choice the queue was last told
let pushedConsent = '' // last consent update pushed
let pushedSignals: boolean | null = null // last ad signals set
// Retargeting on the page shown: its kind, and the last listing whose page
// said whether it is an adult one (its effect may run before App's).
let adPage = ''
let seenListing: { id: string; ok: boolean } | null = null
let adsPageViewSent = ''

// gtag.js reads `arguments` objects from the dataLayer (Google's snippet).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const gtag: Gtag = function (..._args: unknown[]) {
  if (!w) return
  // eslint-disable-next-line prefer-rest-params
  ;(w.dataLayer = w.dataLayer ?? []).push(arguments)
}

// May this page feed retargeting (with the visitor's consent)?
function adsHere(): boolean {
  if (!adsGranted || !w || !AD_PAGES.has(adPage)) return false
  if (adPage === 'listing-detail') {
    // Only once the listing is known not to be an adult one.
    let path = ''
    try { path = lastPage ? new URL(lastPage.location).pathname : '' } catch { /* ignore */ }
    if (!seenListing?.ok || path !== `/annonce/${seenListing.id}`) return false
  }
  if (onAdultCategory()) return false
  return cleanForClarity(adPage, w.location.href)
}

// Ad signals of the next hits (Google signals, ad personalization): on only
// with the « Publicité » consent and on a page open to retargeting.
function syncSignals() {
  if (!queued) return
  const on = adsHere()
  if (on === pushedSignals) return
  pushedSignals = on
  gtag('set', { allow_google_signals: on, allow_ad_personalization_signals: on })
}

function pushConsent(analytics: boolean, ads: boolean) {
  const v = ads ? 'granted' : 'denied'
  const update = { analytics_storage: analytics ? 'granted' : 'denied', ad_storage: v, ad_user_data: v, ad_personalization: v }
  const key = JSON.stringify(update)
  if (key === pushedConsent) return
  pushedConsent = key
  gtag('consent', 'update', update)
}

// The queue's first commands: everything denied, ads data redacted, no
// signals (gtag.js runs them in order once it loads).
function setUpQueue() {
  if (queued || !w) return
  w.gtag = gtag
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
  gtag('set', 'ads_data_redaction', true)
  gtag('set', { allow_google_signals: false, allow_ad_personalization_signals: false })
  pushedSignals = false
  gtag('js', new Date())
  queued = true
}

function configureGa(id: string) {
  if (!w) return
  w[`ga-disable-${id}`] = false
  if (configuredId === id) {
    // Accepted again after a refusal (or the country's setting back on) in
    // the same visit; otherwise already running.
    if (stopped) {
      stopped = false
      if (lastPage) sendPageView(lastPage)
    }
    return
  }
  // Another country with its own measurement ID: the previous one stops.
  if (configuredId) w[`ga-disable-${configuredId}`] = true
  gtag('config', id, {
    send_page_view: false,
    cookie_expires: COOKIE_EXPIRES_S,
    cookie_flags: w.location.protocol === 'https:' ? 'SameSite=Lax;Secure' : 'SameSite=Lax',
    page_location: lastPage?.location ?? cleanLocation(w.location.href),
    page_referrer: cleanReferrer(),
  })
  stopped = false
  configuredId = id
  if (lastPage) sendPageView(lastPage)
}

/**
 * Applies the visitor's choice to Google's tags: `gaId` (GA4, consent to
 * the measurement) and `ads` (consent to Google Ads; its tag ID or '' for
 * the GA4 audiences only). `now`: the visitor just chose (no waiting).
 */
function setGoogle(gaId: string | null, ads: { awId: string } | null, now: boolean) {
  if (!w) return
  const awId = ads?.awId || null
  // Nothing to load for Google (GA4 audiences need GA4).
  const wanted = !!gaId || !!awId
  if (!gaId) eraseCookies(GA_COOKIE)
  if (!ads || !wanted) eraseCookies(ADS_COOKIE)
  if (!queued && !wanted) return
  adsGranted = !!ads && wanted
  if (wanted) setUpQueue()
  pushConsent(!!gaId, adsGranted)
  syncSignals()
  if (gaId) configureGa(gaId)
  else if (configuredId && !stopped) {
    stopped = true
    w[`ga-disable-${configuredId}`] = true
  }
  if (adsGranted && awId && awConfigured !== awId) {
    // Retargeting only: no automatic page view, no enhanced conversions.
    gtag('config', awId, { send_page_view: false, allow_enhanced_conversions: false })
    awConfigured = awId
    adsPageViewSent = ''
  }
  if (adsGranted) sendAdsPageView()
  if (!wanted) return
  const first = gaId ?? awId!
  if (now) inject(first)
  else scheduleInject()
}

const GA_COOKIE = (name: string) => name === '_ga' || name.startsWith('_ga_') || name === '_gid' || name === '_gat'
// Google Ads (conversion linker, remarketing): _gcl_au, _gcl_aw…
const ADS_COOKIE = (name: string) => name.startsWith('_gcl_')

// Removes cookies of this site (GA writes them on the widest domain it
// can, « .dilchap.com »).
function eraseCookies(match: (name: string) => boolean) {
  if (!w) return
  try {
    const parts = w.location.hostname.split('.')
    const domains = ['', ...parts.slice(0, -1).map((_, i) => '.' + parts.slice(i).join('.'))]
    for (const c of document.cookie.split(';')) {
      const name = c.split('=')[0].trim()
      if (!name || !match(name)) continue
      for (const d of new Set(domains)) document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`
    }
  } catch { /* cookies blocked */ }
}

function inject(id: string) {
  if (injected || !w) return
  injected = true
  // One gtag.js serves every ID configured later.
  const s = document.createElement('script')
  s.async = true
  // CORS-enabled (Google answers with the page's origin): an error inside
  // gtag.js reaches window.onerror with its message, not « Script error. ».
  s.crossOrigin = 'anonymous'
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  // Blocked (ad blocker, network): tried again on the next consent.
  s.addEventListener('error', () => { injected = false }, { once: true })
  document.head.appendChild(s)
}

// After the first interaction or when the browser is idle, never during
// the first paint (one-shot listeners, no React state).
function scheduleInject() {
  if (injected || scheduled || !w) return
  scheduled = true
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
  const go = () => {
    events.forEach((e) => w.removeEventListener(e, go))
    scheduled = false
    if (configuredId && !stopped) inject(configuredId)
    else if (awConfigured && adsGranted) inject(awConfigured)
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

// The Google Ads tag's page view (remarketing), once per page open to it.
function sendAdsPageView() {
  if (!awConfigured || !lastPage || !adsHere()) return
  if (adsPageViewSent === lastPage.location) return
  adsPageViewSent = lastPage.location
  syncSignals()
  gtag('event', 'page_view', { send_to: awConfigured, page_location: lastPage.location, page_title: lastPage.title })
}

// ---- Public API ---------------------------------------------------------

// Every tool follows the stored choice and the country's setting.
function apply(now: boolean) {
  const c = state.config
  setGoogle(granted('ga') && isOn(c) ? c.measurementId : null, granted('gads') ? { awId: awIdOf(c) } : null, now)
  setClarity(granted('clarity') ? clarityId(c) : null, now)
  setMetaPixel(granted('meta') ? pixelIdOf(c) : null, now)
}

// Who is told about a choice the visitor just made (lib/consentAccount
// saves it on the signed-in member's account).
const answerListeners = new Set<(c: Consent) => void>()
export const onConsentAnswer = (l: (c: Consent) => void) => { answerListeners.add(l); return () => { answerListeners.delete(l) } }
// A member is signed in: choices made now belong to the account.
let signedIn = false
export const setConsentSignedIn = (on: boolean) => { signedIn = on }
let holdTimer: ReturnType<typeof setTimeout> | undefined
/** The banner waits for the account's choice (at most 4 s: the network may fail). */
export function holdConsentBanner(on: boolean) {
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = on ? setTimeout(() => holdConsentBanner(false), 4000) : undefined
  if (state.hold !== on) emit({ hold: on })
}

/** The choice in force on this device (null: none, or expired). */
export const currentConsent = () => state.consent

/** The newer choice of the member's account: it applies on this device too. */
export function adoptConsent(c: Consent) {
  const months = state.config?.consentMonths ?? MAX_MONTHS
  if (!fresh(c, months)) return
  if (state.consent && state.consent.at >= c.at) return
  const consent = { ...c, account: true }
  storeConsent(consent, months)
  emit({ consent })
  apply(false)
}

function answer(grant: Tool[], mode: ConsentMode) {
  const needed = toolsOf(state.config)
  const prev = state.consent
  // The purposes shown get their answer; the others (off in this country)
  // keep theirs, and so do the tools of other countries.
  const purposes = { ...(prev?.purposes ?? {}) }
  for (const { purpose, tools } of purposesOf(state.config)) purposes[purpose] = tools.every((t) => grant.includes(t))
  const consent: Consent = {
    asked: [...new Set([...(prev?.asked ?? []), ...needed])],
    granted: [...new Set([...(prev?.granted ?? []).filter((t) => !needed.includes(t)), ...needed.filter((t) => grant.includes(t))])],
    purposes,
    at: Date.now(),
    mode,
    ...(signedIn ? { account: true } : {}),
  }
  storeConsent(consent)
  emit({ consent, managing: false })
  apply(true)
  answerListeners.forEach((l) => { try { l(consent) } catch { /* ignore */ } })
}

/** The setting of the visitor's country (re-applied when the country changes). */
export function setAnalyticsConfig(config: AnalyticsConfig | null) {
  emit({ config, consent: config ? readConsent(config.consentMonths) : state.consent })
  apply(false)
}

/** « Accepter » (or « OK »): every tool on for the country. */
export const acceptAnalytics = (mode: ConsentMode = 'choice') => answer(toolsOf(state.config), mode)
/** « Refuser »: none. */
export const refuseAnalytics = (mode: ConsentMode = 'choice') => answer([], mode)
/** The consent window's choice, purpose by purpose. */
export const saveConsent = (purposes: Record<Purpose, boolean>) => answer(toolsOf(state.config).filter((t) => purposes[PURPOSE_OF[t]]), 'window')

/** Is this purpose accepted (all its tools on for the country)? */
export function purposeGranted(p: Purpose): boolean {
  const tools = toolsOf(state.config).filter((t) => PURPOSE_OF[t] === p)
  return tools.length > 0 && tools.every((t) => granted(t))
}

/** « Gérer les cookies »: opens the consent window. */
export const reopenConsent = () => emit({ managing: true })
export const closeConsentWindow = () => emit({ managing: false })

/** One page_view per route change, with a clean address and title. */
export function trackPageView(href: string, title: string, page = '') {
  adPage = page
  const pageView = { location: cleanLocation(href), title: `${title} — Dilchap` }
  if (lastPage && lastPage.location === pageView.location && lastPage.title === pageView.title) return
  lastPage = pageView
  if (active() && configuredId && !stopped) sendPageView(pageView)
  sendAdsPageView()
}

/** A listing page knows what it shows: retargeting only for a non-adult one. */
export function adsListingSeen(listing: { id: string; isAdult?: boolean | null } | null) {
  seenListing = listing ? { id: listing.id, ok: !listing.isAdult } : null
  syncSignals()
  sendAdsPageView()
}

function sendPageView(page: { location: string; title: string }) {
  if (!configuredId) return
  // The first one of the visit carries the ad campaign it came from.
  const campaign = takeGaCampaign()
  if (campaign.length) {
    const u = new URL(page.location)
    for (const [k, v] of campaign) if (!u.searchParams.has(k)) u.searchParams.set(k, v)
    page = { ...page, location: u.toString() }
  }
  syncSignals()
  // Later events (view_item, search…) carry this address too.
  gtag('set', { page_location: page.location, page_title: page.title, page_referrer: cleanReferrer() })
  gtag('event', 'page_view', { send_to: configuredId, page_location: page.location, page_title: page.title })
  if (deferred.length) sendDeferred()
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
// Steps of the sign-in / sign-up funnel (lib/authFunnel), counted like the
// others: method, country, reason — never who.
export type FunnelEvent = 'login_start' | 'login_failure' | 'login_code_sent' | 'sign_up_start' | 'sign_up_code_sent' | 'sign_up_failure' | 'sign_up_password_set' | 'sign_up_password_later' | 'social_start'
// The installed app (lib/pwaInstall): banner shown, install accepted,
// installed, opened from the app — with the platform only.
export type PwaGaEvent = 'pwa_install_prompt' | 'pwa_install_accepted' | 'pwa_installed' | 'pwa_open'
type EventName = 'view_item' | 'search' | 'sign_up' | 'login' | 'publish_listing' | 'contact_seller' | 'purchase' | FunnelEvent | PwaGaEvent
// Events that happen before GA4 runs (the opening of the app, at load):
// kept for this visit and sent after the first page_view once the audience
// consent is given — dropped otherwise.
let deferred: { name: EventName; params: Params }[] = []
function sendDeferred() {
  const list = deferred
  deferred = []
  for (const e of list) track(e.name, e.params)
}
export function track(name: EventName, params: Params = {}, opts: { defer?: boolean } = {}) {
  const toGa = active() && !!configuredId && !stopped
  // The Google Ads tag only gets listing views, on pages open to retargeting.
  const toAds = name === 'view_item' && !!awConfigured && adsHere()
  if (!toGa && !toAds) {
    if (opts.defer && deferred.length < 10) deferred.push({ name, params })
    return
  }
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
  syncSignals()
  if (toGa) gtag('event', name, { ...out, send_to: configuredId })
  if (toAds) {
    const ids = (Array.isArray(out.items) ? (out.items as { item_id?: string }[]) : []).map((i) => i.item_id).filter(Boolean)
    gtag('event', 'view_item', { send_to: awConfigured, items: ids.map((id) => ({ id })) })
  }
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
  if (p.status !== 'SUCCESS' || (p.kind !== 'CREDIT_PACK' && p.kind !== 'WALLET_TOPUP') || (!active() && !metaPixelOn())) return
  let seen: string[] = []
  try { seen = JSON.parse(sessionStorage.getItem(PURCHASES_KEY) ?? '[]') as string[] } catch { /* ignore */ }
  if (seen.includes(p.id)) return
  try { sessionStorage.setItem(PURCHASES_KEY, JSON.stringify([...seen.slice(-19), p.id])) } catch { /* ignore */ }
  track('purchase', {
    currency: p.currency, value: p.amount,
    items: [{ item_id: p.kind === 'CREDIT_PACK' ? 'pack_credits' : 'credits', item_name: 'Crédits Dilchap', quantity: p.credits ?? undefined, price: p.amount }],
  })
  // Meta: credits are not catalogue items, so no content_ids.
  metaTrack('Purchase', { value: p.amount, currency: p.currency, content_name: 'Crédits Dilchap', content_category: p.kind === 'CREDIT_PACK' ? 'pack_credits' : 'credits', num_items: p.credits ?? undefined })
}
