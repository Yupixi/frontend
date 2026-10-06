import { useEffect } from 'react'

// Microsoft Clarity (session recordings, heatmaps), set in the Backoffice
// next to Google Analytics (« Mesure d'audience », Backend
// content/analytics-settings.ts): on or off per country, a project ID.
//
// Rules:
// - Loaded only with the visitor's consent (lib/analytics: the same
//   banner, one « Accepter » for both) and only while the setting of the
//   visitor's country is on. Then on the first interaction or when the
//   browser is idle, never in the way of the first paint (like gtag.js).
// - Never on surfaces that must not be recorded: the identity check (KYC),
//   payments (PaymentSheet / PaymentReturn hold it), the launch page
//   (LaunchGate holds it; the team preview is recorded: its key is never
//   in the page), and any address with parameters other than a few
//   harmless ones (?acces=, reset tokens, invitations…). /q/ and /v/ pages
//   and e-mail links render outside the app: Clarity never starts there.
//   Already running: it is stopped (clarity("stop") drops the recording;
//   « pause » would only defer it), and started again on leaving.
// - Strict masking: every input, textarea, select and contenteditable is
//   marked data-clarity-mask, plus whole containers (account pages, Auth,
//   messages, Support tab, payment sheets, phone numbers on shops). The
//   Clarity project itself should be set to Settings › Masking › Strict.
// - No identification: never clarity("identify"), no custom tags.

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] }
type ClarityWindow = Window & { clarity?: ClarityFn }

export const CLARITY_ID = /^[a-z0-9]{8,12}$/
// Pages Clarity never records.
const EXCLUDED_PAGES = new Set(['seller-kyc'])
// Address parameters that are never personal (anything else, e.g.
// ?acces=, ?token=, ?code=: Clarity stays off on that address).
const ALLOWED_PARAMS = new Set(['categorie', 'category', 'legal', 'campaign', 'q', 'shortcut'])
// A search that looks like an e-mail or a phone number.
const PERSONAL = /@|\+?\d[\d\s.-]{7,}\d/
const MASKED = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

const w = (typeof window !== 'undefined' ? window : undefined) as ClarityWindow | undefined

let projectId: string | null = null // on for this country + consent
let holds = 0 // surfaces on screen that must not be recorded
let pageOk = false // the current page / address may be recorded
let injected = false // tag requested
let ready = false // clarity.js ran (a stop is honoured from now on)
let running = false
let scheduled = false
let observer: MutationObserver | null = null

const allowed = () => !!projectId && holds === 0 && pageOk

/** May Clarity record this page? (App, on every page or address change) */
export function cleanForClarity(page: string, href: string): boolean {
  if (EXCLUDED_PAGES.has(page)) return false
  try {
    const u = new URL(href)
    if (u.hash && u.hash !== '#') return false
    for (const [k, v] of u.searchParams) {
      if (!ALLOWED_PARAMS.has(k)) return false
      if (v.length > 100 || PERSONAL.test(v)) return false
    }
    return true
  } catch {
    return false
  }
}

// ---- Masking --------------------------------------------------------------

function mark(root: ParentNode) {
  if (root instanceof Element && root.matches(MASKED)) root.setAttribute('data-clarity-mask', 'True')
  root.querySelectorAll(MASKED).forEach((el) => {
    if (el.getAttribute('data-clarity-mask') !== 'True') el.setAttribute('data-clarity-mask', 'True')
  })
}

// Created before the tag loads, so its records are handled before
// Clarity's own observer reads the new nodes.
function startMasking() {
  if (observer || !w || typeof MutationObserver === 'undefined') return
  mark(document)
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes') { if (r.target instanceof Element) mark(r.target); continue }
      r.addedNodes.forEach((n) => { if (n instanceof Element) mark(n) })
    }
  })
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['contenteditable'] })
}

// ---- Tag ------------------------------------------------------------------

function clarity(...args: unknown[]) {
  if (!w) return
  if (!w.clarity) {
    // Microsoft's queue: clarity.js runs these calls once it loads.
    const q: ClarityFn = function (...a: unknown[]) { (q.q = q.q ?? []).push(a) }
    w.clarity = q
  }
  w.clarity(...args)
}

const grant = () => clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' })

// clarity.js (added by the tag) has run: from now on « stop » sticks.
function watchReady(tag: HTMLScriptElement) {
  const done = () => { ready = true; sync() }
  tag.addEventListener('error', () => { injected = false; running = false }, { once: true })
  tag.addEventListener('load', () => {
    const lib = Array.from(document.scripts).find((s) => s !== tag && /\.clarity\.ms\/.+\/clarity\.js/.test(s.src))
    if (lib) lib.addEventListener('load', done, { once: true })
    else done()
  }, { once: true })
}

function inject(id: string) {
  if (injected || !w) return
  injected = true
  running = true
  startMasking()
  grant()
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.clarity.ms/tag/${encodeURIComponent(id)}`
  watchReady(s)
  document.head.appendChild(s)
}

function scheduleInject() {
  if (injected || scheduled || !w) return
  scheduled = true
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
  const go = () => {
    events.forEach((e) => w.removeEventListener(e, go))
    scheduled = false
    if (allowed() && projectId) inject(projectId)
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

let now = false
function sync() {
  if (!w) return
  if (allowed()) {
    if (!injected) {
      if (now) inject(projectId!)
      else scheduleInject()
    } else if (!running) {
      running = true
      startMasking()
      grant()
      clarity('start')
    }
  } else if (running && ready) {
    running = false
    clarity('stop')
  }
  now = false
}

// Clarity's first-party cookies of this site.
function eraseCookies() {
  try {
    const parts = w!.location.hostname.split('.')
    const domains = ['', ...parts.slice(0, -1).map((_, i) => '.' + parts.slice(i).join('.'))]
    for (const c of document.cookie.split(';')) {
      const name = c.split('=')[0].trim()
      if (name !== '_clck' && name !== '_clsk') continue
      for (const d of new Set(domains)) document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`
    }
  } catch { /* cookies blocked */ }
}

// ---- Public API -------------------------------------------------------------

/**
 * Consent given and Clarity on for the visitor's country: its project ID;
 * otherwise null (refused, off, unknown ID), which stops it and erases
 * its cookies. `immediate`: the visitor just accepted.
 */
export function setClarity(id: string | null, immediate = false) {
  const next = id && CLARITY_ID.test(id) ? id : null
  if (!next) {
    const had = injected
    projectId = null
    if (had) {
      // Erases Clarity's cookies and ends the session (Microsoft's API).
      clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' })
      clarity('consent', false)
      if (running) clarity('stop')
      running = false
    }
    observer?.disconnect()
    observer = null
    eraseCookies()
    return
  }
  // Another country with another project in the same visit: the tag is
  // already there for the first one; Clarity stays on that one until the
  // next page load (one project per page).
  if (projectId && projectId !== next && injected) return
  projectId = next
  now = immediate
  sync()
}

/** The page shown and its address (App). */
export function setClarityPage(page: string, href: string) {
  pageOk = cleanForClarity(page, href)
  sync()
}

/** A surface that must not be recorded is on screen: Clarity stops until it goes. */
export function holdClarity(): () => void {
  holds += 1
  sync()
  let released = false
  return () => {
    if (released) return
    released = true
    holds -= 1
    sync()
  }
}

/** holdClarity() while `active`. */
export function useClarityHold(active: boolean) {
  useEffect(() => (active ? holdClarity() : undefined), [active])
}
