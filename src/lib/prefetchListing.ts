import { apolloClient } from './apollo'
import { LISTING_QUERY } from '../graphql/listings'

// Starts loading a listing's detail as soon as the user shows intent (hover
// that lingers, or a finger touching the card) — by the time the click
// lands, ListingDetail usually renders straight from the Apollo cache.
const started = new Set<string>()

export function prefetchListing(id: string) {
  if (started.has(id)) return
  started.add(id)
  apolloClient.query({ query: LISTING_QUERY, variables: { id } }).catch(() => started.delete(id))
}

// Hover must linger a moment: sweeping the mouse across a grid shouldn't
// fire a request per card.
export function prefetchOnIntent(id: string) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') timer = setTimeout(() => prefetchListing(id), 120)
    },
    onPointerLeave: () => clearTimeout(timer),
    onTouchStart: () => prefetchListing(id),
  }
}
