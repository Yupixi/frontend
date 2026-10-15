import { useLayoutEffect, useSyncExternalStore } from 'react'

// « Section Adultes (18+) » space: once a confirmed member is inside the
// section (its pages, an adult listing), the site becomes a space of its
// own until « Quitter » — a dedicated dark theme, navigation, categories and
// search limited to the section. Kept for the session (a reload stays in
// it); left on « Quitter », on logout, or as soon as the member's access is
// no longer OK (App).
//
// The theme is one switch for the whole site: <html data-mode="adult">,
// which redefines the colour tokens (index.css) — the components keep their
// usual classes. It is on in the space, and also on the section's own pages
// before entering it (the age gate) or a conversation about an adult
// listing:
// - index.html applies it before the first paint for a direct visit (the
//   space of this session, the storefront server's title for the section's
//   pages, else what this device already knows: the section's slugs, adult
//   listings seen in this session) — no light flash;
// - App sets a guess per route (same knowledge) while a page loads;
// - the pages that know (Search, ListingDetail, Messages) claim it with
//   useAdultMode(): a defined claim wins over the guess.

const root = document.documentElement
const SLUGS_KEY = 'dilchap_adult_slugs'
const ROOT_KEY = 'dilchap_adult_root'
const IDS_KEY = 'dilchap_adult_ids'
const SPACE_KEY = 'dilchap_adult_space'
// The section's category (Backend seed); its subcategories are learnt from
// the categories query.
const DEFAULT_SLUGS = ['adultes']
// Browser bar colour in the mode: the theme's --bg (index.css).
export const ADULT_THEME_COLOR = '#141116'

function readList(storage: () => Storage, key: string): string[] {
  try {
    const v = JSON.parse(storage().getItem(key) ?? '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}
function writeList(storage: () => Storage, key: string, list: string[]) {
  try { storage().setItem(key, JSON.stringify(list)) } catch { /* private mode: this visit only */ }
}
const local = () => window.localStorage
// Adult listings seen: this session only (nothing kept on a shared device).
const session = () => window.sessionStorage

const slugs = new Set([...DEFAULT_SLUGS, ...readList(local, SLUGS_KEY)])
const listingIds = new Set(readList(session, IDS_KEY))

let rootSlug = (() => { try { return window.localStorage.getItem(ROOT_KEY) || DEFAULT_SLUGS[0] } catch { return DEFAULT_SLUGS[0] } })()
/** The section's own category (its home page in the space). */
export const adultSectionSlug = () => rootSlug

/** The section's category and subcategory slugs of the market (replaces the known ones), and its category. */
export function rememberAdultSlugs(list: string[], root?: string) {
  if (root && root !== rootSlug) {
    rootSlug = root
    try { window.localStorage.setItem(ROOT_KEY, root) } catch { /* private mode */ }
  }
  const next = [...new Set(list.map(s => s.toLowerCase()))].sort()
  if (next.join() === readList(local, SLUGS_KEY).join()) return
  slugs.clear()
  for (const s of [...DEFAULT_SLUGS, rootSlug, ...next]) slugs.add(s)
  writeList(local, SLUGS_KEY, next)
  notify()
}
export const isKnownAdultSlug = (slug: string | null | undefined) => !!slug && slugs.has(slug.toLowerCase())

/** An adult listing met in this session (card, detail page). */
export function rememberAdultListing(id: string) {
  const key = id.toLowerCase()
  if (listingIds.has(key)) return
  listingIds.add(key)
  writeList(session, IDS_KEY, [...listingIds].slice(-300))
}
export const isKnownAdultListing = (id: string | null | undefined) => !!id && listingIds.has(id.toLowerCase())

// ---- The switch ---------------------------------------------------------

const themeMeta = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
// The site's own colour (index.html keeps it in data-normal when it starts
// in the mode).
const normalThemeColor = (() => {
  const m = themeMeta()
  if (!m) return null
  const c = m.dataset.normal || m.content
  m.dataset.normal = c
  return c
})()

let space = (() => { try { return window.sessionStorage.getItem(SPACE_KEY) === '1' } catch { return false } })()
let guess = root.dataset.mode === 'adult'
let current = guess
const claims = new Map<number, boolean>()
let seq = 0
const listeners = new Set<() => void>()
// Bumped on every change (space, theme, known slugs): what the hooks watch.
let version = 0
function notify() {
  version++
  listeners.forEach(l => l())
}

// Puts the theme where it belongs; true when it changed (watchers told).
function apply(): boolean {
  const values = [...claims.values()]
  const on = space || (values.length ? values.some(Boolean) : guess)
  if (on === current && (root.dataset.mode === 'adult') === on) return false
  current = on
  if (on) root.dataset.mode = 'adult'
  else delete root.dataset.mode
  const m = themeMeta()
  if (m && normalThemeColor) m.content = on ? ADULT_THEME_COLOR : normalThemeColor
  notify()
  return true
}

function setSpace(on: boolean) {
  if (space === on) return
  space = on
  try {
    if (on) window.sessionStorage.setItem(SPACE_KEY, '1')
    else window.sessionStorage.removeItem(SPACE_KEY)
  } catch { /* private mode: this page only */ }
  if (!apply()) notify()
}
/** A confirmed member is inside the section (only then). */
export const enterAdultSpace = () => setSpace(true)
/** « Quitter », logout, access lost. */
export const leaveAdultSpace = () => setSpace(false)
export const isInAdultSpace = () => space
// A session already in the space whose first paint didn't apply it.
apply()

/** App: what the current address suggests while its page loads. */
export function setAdultRouteGuess(on: boolean) {
  guess = on
  apply()
}

/** A page that knows: true / false while mounted; undefined = not known yet (the route's guess). */
export function useAdultMode(on: boolean | undefined) {
  useLayoutEffect(() => {
    if (on === undefined) return
    const key = ++seq
    claims.set(key, on)
    apply()
    return () => {
      claims.delete(key)
      apply()
    }
  }, [on])
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}
/** Whether the site shows the section's theme now. */
export const useAdultModeOn = () => useSyncExternalStore(subscribe, () => current)
/** Whether the visitor is in the section's space (navigation limited to it). */
export function useAdultSpace() {
  useSyncExternalStore(subscribe, () => version)
  return space
}

/** In the space: only the section's categories (and, elsewhere, its adult subcategories). */
export function spaceCategories<C extends { adult?: boolean; subcategories: S[] }, S extends { adult?: boolean }>(categories: C[], inSpace: boolean): C[] {
  if (!inSpace) return categories
  return categories.flatMap(c => {
    if (c.adult) return [c]
    const subs = c.subcategories.filter(s => s.adult)
    return subs.length ? [{ ...c, subcategories: subs }] : []
  })
}
