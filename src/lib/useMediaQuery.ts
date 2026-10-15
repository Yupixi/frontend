import { useSyncExternalStore } from 'react'

// One MediaQueryList per query, kept: its `matches` is kept current by the
// browser and cheap to read, while matchMedia() evaluates the query again
// (style and viewport up to date) — and useSyncExternalStore reads the
// snapshot on every render of every component using it.
const lists = new Map<string, MediaQueryList>()
const listFor = (query: string) => {
  let mql = lists.get(query)
  if (!mql) lists.set(query, (mql = window.matchMedia(query)))
  return mql
}

// Renders only the layout that matches the screen — a subtree hidden with
// `hidden lg:block` still mounts, fetches its images and renders every card.
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    onChange => {
      const mql = listFor(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => listFor(query).matches,
  )
}

// Tailwind's `lg` breakpoint.
export const DESKTOP_QUERY = '(min-width: 1024px)'
