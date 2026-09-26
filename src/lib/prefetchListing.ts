import { apolloClient } from './apollo'
import { LISTING_QUERY } from '../graphql/listings'

// Starts loading a listing's detail as soon as the user shows intent — by
// the time ListingDetail renders, its query is usually already answered.
const started = new Set<string>()

export function prefetchListing(id: string) {
  if (started.has(id)) return
  started.add(id)
  apolloClient.query({ query: LISTING_QUERY, variables: { id } }).catch(() => started.delete(id))
}

// Module-level so a card re-rendering between enter and leave can't lose
// its pending timer.
const hoverTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function prefetchOnIntent(id: string) {
  return {
    // Mouse: hover must linger a moment — sweeping across a grid shouldn't
    // fire a request per card.
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      clearTimeout(hoverTimers.get(id))
      hoverTimers.set(id, setTimeout(() => { hoverTimers.delete(id); prefetchListing(id) }, 120))
    },
    onPointerLeave: () => {
      clearTimeout(hoverTimers.get(id))
      hoverTimers.delete(id)
    },
    // Touch: only a completed tap. A finger that starts a scroll gets a
    // pointercancel instead of a pointerup — prefetching on touchstart fired
    // a request (and a cache write re-rendering the feed) mid-scroll. The tap
    // still gives the request a head start over the lazy page's own render.
    onPointerUp: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') prefetchListing(id)
    },
  }
}
