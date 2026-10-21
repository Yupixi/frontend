import { useCallback, useEffect, useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import ReelFeedView, { type ReelActions } from '../components/reels/ReelFeedView'
import { REELS_FEED_QUERY, type Reel } from '../graphql/reels'
import { useMarketCode } from '../lib/countries'
import { interestCategories } from '../lib/interests'
import { rotationSeed } from '../lib/rotationSeed'
import { useAdultSpace } from '../lib/adultMode'
import { seenReels } from '../lib/reels'

type Props = Omit<ReelActions, 'onRequireAuth'> & {
  // A Reel to open first (/reel/<id>, a tap in a rail).
  startId?: string | null
  city?: string | null
  onClose: () => void
  onRequireAuth: () => void
}

type Page = { reelsFeed: { items: Reel[]; nextCursor: string | null } }

// The feed survives a trip to a listing and back (same visit, same start):
// the Reels loaded, the cursor and the Reel that was on screen.
let kept: { key: string; items: Reel[]; cursor: string | null; index: number } | null = null

// « Reels »: the full-screen feed of the visitor's market (lib/reels,
// Backend reel-feed.service.ts for the order).
export default function ReelsPage({ startId, city, onClose, ...actions }: Props) {
  const client = useApolloClient()
  const market = useMarketCode()
  const adult = useAdultSpace()
  const key = [market ?? '', startId ?? '', adult ? 'a' : '', actions.currentUserId ?? ''].join('|')
  const restored = kept?.key === key ? kept : null
  const [items, setItems] = useState<Reel[]>(restored?.items ?? [])
  const [cursor, setCursor] = useState<string | null>(restored?.cursor ?? null)
  const [done, setDone] = useState(restored ? !restored.cursor : false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const index = useRef(restored?.index ?? 0)
  const busy = useRef(false)

  const load = useCallback(async (from: string | null) => {
    if (busy.current) return
    busy.current = true
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.query<Page>({
        query: REELS_FEED_QUERY,
        fetchPolicy: 'network-only',
        variables: {
          countryCode: market ?? undefined,
          city: city || undefined,
          interestCategories: actions.isLoggedIn ? undefined : interestCategories(),
          cursor: from,
          limit: 6,
          startId: from ? undefined : startId ?? undefined,
          seenIds: actions.isLoggedIn ? undefined : seenReels().slice(0, 150),
          adultSection: adult || undefined,
          rotationSeed: rotationSeed(),
        },
      })
      const page = data?.reelsFeed
      setItems(prev => {
        const have = new Set(prev.map(r => r.id))
        return from ? [...prev, ...(page?.items ?? []).filter(r => !have.has(r.id))] : (page?.items ?? [])
      })
      setCursor(page?.nextCursor ?? null)
      setDone(!page?.nextCursor)
    } catch (e) {
      setError((e as Error).message || 'Les Reels n’ont pas pu être chargés.')
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [client, market, city, startId, adult, actions.isLoggedIn])

  useEffect(() => {
    if (!restored) void load(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    kept = { key, items, cursor, index: index.current }
  }, [key, items, cursor])
  const onIndexChange = useCallback((i: number) => {
    index.current = i
    if (kept) kept.index = i
  }, [])

  return (
    <>
      <ReelFeedView
        {...actions}
        items={items}
        hasMore={!done}
        loading={loading}
        onLoadMore={() => { if (cursor) void load(cursor) }}
        onClose={onClose}
        startIndex={restored?.index ?? 0}
        onIndexChange={onIndexChange}
        emptyText={error ?? undefined}
      />
      {error && items.length > 0 && (
        <div className="fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[260] mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-white px-4 py-3 text-body-sm text-black shadow-lg md:bottom-6">
          <span className="flex-1">Connexion instable : les Reels suivants n’ont pas pu être chargés.</span>
          <button onClick={() => void load(cursor)} className="cursor-pointer rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white">Réessayer</button>
        </div>
      )}
    </>
  )
}
