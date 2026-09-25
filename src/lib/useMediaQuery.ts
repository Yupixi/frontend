import { useSyncExternalStore } from 'react'

// Renders only the layout that matches the screen — a subtree hidden with
// `hidden lg:block` still mounts, fetches its images and renders every card.
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    onChange => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

// Tailwind's `lg` breakpoint.
export const DESKTOP_QUERY = '(min-width: 1024px)'
