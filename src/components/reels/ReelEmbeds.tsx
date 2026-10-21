import { lazy, Suspense, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from '../Icon'
import { LISTING_REELS_QUERY, SELLER_REELS_QUERY, type Reel } from '../../graphql/reels'
import { formatDuration, reelThumb, useReelSettings } from '../../lib/reels'
import type { ReelActions } from './ReelFeedView'

// The pager is its own chunk: only loaded when a Reel is opened.
const ReelViewer = lazy(() => import('./ReelViewer'))

/** A listing's Reels on its gallery: « ▶ Vidéo », opens them over the page. */
export function ListingReelsButton({ listingId, countryCode, className = '', ...actions }: ReelActions & { listingId: string; countryCode?: string | null; className?: string }) {
  const settings = useReelSettings(countryCode)
  const { data } = useQuery<{ listingReels: Reel[] }>(LISTING_REELS_QUERY, { variables: { listingId }, skip: !settings.enabled })
  const items = data?.listingReels ?? []
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  const first = items[0]
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={items.length > 1 ? `Regarder les ${items.length} vidéos de l’annonce` : 'Regarder la vidéo de l’annonce'}
        className={`flex cursor-pointer items-center gap-2 overflow-hidden rounded-full border-none bg-black/70 py-1 pl-1 pr-3 text-label-md text-white shadow-lg ${className}`}
      >
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-800">
          {first.posterUrl && <img src={reelThumb(first.posterUrl) ?? undefined} alt="" className="h-full w-full object-cover" loading="lazy" />}
          <span className="absolute inset-0 flex items-center justify-center bg-black/30"><Icon name="play_arrow" size={18} fill /></span>
        </span>
        {items.length > 1 ? `${items.length} vidéos` : `Vidéo · ${formatDuration(first.durationSec)}`}
      </button>
      {open && (
        <Suspense fallback={null}>
          <ReelViewer {...actions} onOpenListing={id => (id === listingId ? setOpen(false) : actions.onOpenListing(id))} items={items} start={0} title="Vidéos de l’annonce" onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

type SellerPage = { sellerReels: { items: Reel[]; nextCursor: string | null } }

/** How many Reels a seller shows (profile / shop tab), first page cached. */
export function useSellerReels(sellerId: string | null | undefined, countryCode?: string | null) {
  const settings = useReelSettings(countryCode)
  const q = useQuery<SellerPage>(SELLER_REELS_QUERY, { variables: { sellerId, limit: 12 }, skip: !sellerId || !settings.enabled })
  return { items: q.data?.sellerReels.items ?? [], nextCursor: q.data?.sellerReels.nextCursor ?? null, fetchMore: q.fetchMore, loading: q.loading }
}

/** « Reels » tab of a profile or a shop: posters, a tap opens them. */
export function SellerReelsGrid({ sellerId, countryCode, ...actions }: ReelActions & { sellerId: string; countryCode?: string | null }) {
  const { items, nextCursor, fetchMore, loading } = useSellerReels(sellerId, countryCode)
  const [open, setOpen] = useState<number | null>(null)
  const [more, setMore] = useState(false)
  const loadMore = () => {
    if (!nextCursor || more) return
    setMore(true)
    void fetchMore({
      variables: { cursor: nextCursor },
      updateQuery: (prev, { fetchMoreResult }) => fetchMoreResult ? {
        sellerReels: { ...fetchMoreResult.sellerReels, items: [...prev.sellerReels.items, ...fetchMoreResult.sellerReels.items.filter(r => !prev.sellerReels.items.some(p => p.id === r.id))] },
      } : prev,
    }).finally(() => setMore(false))
  }
  if (loading && !items.length) return <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-surface-container" />)}</div>
  if (!items.length) return <p className="m-0 rounded-xl bg-surface-lowest p-4 text-body-md text-on-surface-variant">Aucun Reel pour le moment.</p>
  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((r, i) => (
          <button key={r.id} onClick={() => setOpen(i)} aria-label={`Regarder : ${r.listing?.title ?? 'vidéo'}`} className="relative aspect-[9/16] cursor-pointer overflow-hidden rounded-xl border-none bg-neutral-900 p-0 text-left text-white">
            {r.posterUrl && <img src={reelThumb(r.posterUrl) ?? undefined} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
            <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/75 to-transparent px-1.5 pb-1.5 pt-6 text-[11px] font-semibold">
              <Icon name="play_arrow" size={13} fill /> {r.viewsCount > 0 ? `${r.viewsCount} vue${r.viewsCount > 1 ? 's' : ''}` : formatDuration(r.durationSec)}
            </span>
          </button>
        ))}
      </div>
      {nextCursor && (
        <button onClick={loadMore} disabled={more} className="mx-auto mt-4 flex h-10 cursor-pointer items-center gap-1 rounded-full border-none bg-surface-lowest px-5 text-label-md text-on-surface shadow-sm disabled:opacity-60">
          {more ? 'Chargement…' : 'Voir plus de Reels'}
        </button>
      )}
      {open !== null && (
        <Suspense fallback={null}>
          <ReelViewer {...actions} items={items} start={open} title="Reels" hasMore={!!nextCursor} loading={more} onLoadMore={loadMore} onClose={() => setOpen(null)} />
        </Suspense>
      )}
    </>
  )
}
