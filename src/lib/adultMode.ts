import { createContext, useContext, useLayoutEffect, useSyncExternalStore } from 'react'

// « Section Adultes (18+) » — a marketplace of its own, under /adultes:
// its home page (/adultes), its rayons (/adultes/<rayon>), its search
// (/adultes/recherche) and its listings (/adultes/annonce/…), with its own
// header, filters and dark theme, until « Quitter » or a link to the
// general marketplace.
//
// The space is carried by the address only (App's `space`, read from the
// URL and kept in each history entry) — never by a flag stored on the
// device: nothing of the section survives in the general marketplace, and
// nothing of the general marketplace leaks into the section. (A session
// flag used to keep the space « on » after leaving it: the home page then
// opened the section's page and every category its root — the « filters
// that no longer work » after a visit.)
//
// The theme is one switch for the whole site: <html data-mode="adult">,
// which redefines the colour tokens (index.css) — the components keep their
// usual classes. It is on in the space, and also where a page claims it
// (a conversation about an adult listing, useAdultMode). index.html applies
// it before the first paint for an /adultes address: no light flash.

const root = document.documentElement
// Browser bar colour in the mode: the theme's --bg (index.css).
export const ADULT_THEME_COLOR = '#141116'

/** Whether an address is the section's (/adultes, /adultes/…). */
export const isAdultPath = (pathname: string) => /^\/adultes(\/|$)/.test(pathname)

// Storage of the former, device-kept space (before /adultes): emptied so
// an old session can't put a visitor back in it.
try {
  window.sessionStorage.removeItem('dilchap_adult_space')
  window.sessionStorage.removeItem('dilchap_adult_ids')
  window.localStorage.removeItem('dilchap_adult_slugs')
  window.localStorage.removeItem('dilchap_adult_root')
} catch { /* storage blocked */ }

/** Whether the page is inside the section's space (App, from the address). */
export const AdultSpaceContext = createContext(false)
export const useAdultSpace = () => useContext(AdultSpaceContext)

// ---- The theme switch ---------------------------------------------------

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

let space = isAdultPath(window.location.pathname)
let current = root.dataset.mode === 'adult'
const claims = new Map<number, boolean>()
let seq = 0
const listeners = new Set<() => void>()

function apply() {
  const on = space || [...claims.values()].some(Boolean)
  if (on === current && (root.dataset.mode === 'adult') === on) return
  current = on
  if (on) root.dataset.mode = 'adult'
  else delete root.dataset.mode
  const m = themeMeta()
  if (m && normalThemeColor) m.content = on ? ADULT_THEME_COLOR : normalThemeColor
  listeners.forEach(l => l())
}
apply()

/** App: the address is (or isn't) the section's. */
export function setAdultSpaceTheme(on: boolean) {
  space = on
  apply()
}

/** A page outside the space that shows the section's content (a conversation about an adult listing): its theme while mounted. */
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

/** The section's categories: its own (adult) categories, and the adult subcategories of the others. */
export function spaceCategories<C extends { adult?: boolean; subcategories: S[] }, S extends { adult?: boolean }>(categories: C[], inSpace = true): C[] {
  if (!inSpace) return categories
  return categories.flatMap(c => {
    if (c.adult) return [c]
    const subs = c.subcategories.filter(s => s.adult)
    return subs.length ? [{ ...c, subcategories: subs }] : []
  })
}

/** Slugs of the section's rayons (categories and subcategories). */
export function sectionSlugs(categories: { slug: string; adult?: boolean; subcategories: { slug: string; adult?: boolean }[] }[]): Set<string> {
  const out = new Set<string>()
  for (const c of spaceCategories(categories)) {
    if (c.adult) out.add(c.slug)
    for (const s of c.subcategories) out.add(s.slug)
  }
  return out
}
