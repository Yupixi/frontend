import { useEffect, useRef } from 'react'
import ReelFeedView, { type ReelActions } from './ReelFeedView'
import type { Reel } from '../../graphql/reels'

// A listing's or a seller's Reels over the page (gallery, profile, shop):
// the same pager as the « Reels » tab, on the list given. Back (browser or
// phone) closes it.
export default function ReelViewer({ items, start, title, hasMore = false, loading, onLoadMore, onClose, ...actions }: ReelActions & {
  items: Reel[]
  start: number
  title: string
  hasMore?: boolean
  loading?: boolean
  onLoadMore?: () => void
  onClose: () => void
}) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const alive = useRef(false)
  const closedByBack = useRef(false)
  useEffect(() => {
    alive.current = true
    // Same history step as the photo viewer (ImageLightbox): Back closes
    // it; the page keeps its scroll position.
    if (!window.history.state?.__yupixiSheetMarker) {
      window.history.replaceState({ ...window.history.state, scrollY: window.scrollY }, '')
      window.history.pushState({ __yupixiSheetMarker: true }, '')
    }
    // A sheet of a Reel (offer, report) closed by Back: still on our step.
    const onPop = () => { if (window.history.state?.__yupixiSheetMarker) return; closedByBack.current = true; closeRef.current() }
    window.addEventListener('popstate', onPop)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('popstate', onPop)
      document.body.style.overflow = prev
      alive.current = false
      window.setTimeout(() => {
        if (!alive.current && !closedByBack.current && window.history.state?.__yupixiSheetMarker) window.history.back()
      }, 0)
    }
  }, [])
  return (
    <ReelFeedView
      {...actions}
      overlay
      items={items}
      startIndex={start}
      title={title}
      hasMore={hasMore}
      loading={loading}
      onLoadMore={onLoadMore ?? (() => undefined)}
      onClose={onClose}
    />
  )
}
