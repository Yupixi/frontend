import { useCallback, useEffect, useRef, useState } from 'react'
import { useApolloClient, useQuery } from '@apollo/client/react'
import ReelFeedView, { type ReelActions } from '../components/reels/ReelFeedView'
import Icon from '../components/Icon'
import { REELS_FEED_QUERY, type Reel } from '../graphql/reels'
import { MY_LISTINGS_QUERY } from '../graphql/listings'
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
  // A member with a listing online: « Publier un Reel » (Mes Reels).
  onPublish?: () => void
}

// The invitation card shows once a day at most (per browser).
const INVITE_KEY = 'dilchap_reel_invite'
const today = () => new Date().toISOString().slice(0, 10)
function inviteSeenToday() {
  try { return localStorage.getItem(INVITE_KEY) === today() } catch { return false }
}
function markInviteSeen() {
  try { localStorage.setItem(INVITE_KEY, today()) } catch { /* no storage */ }
}

type Page = { reelsFeed: { items: Reel[]; nextCursor: string | null } }

// The feed survives a trip to a listing and back (same visit, same start):
// the Reels loaded, the cursor and the Reel that was on screen.
let kept: { key: string; items: Reel[]; cursor: string | null; index: number } | null = null

// « Reels »: the full-screen feed of the visitor's market (lib/reels,
// Backend reel-feed.service.ts for the order).
export default function ReelsPage({ startId, city, onClose, onPublish, ...actions }: Props) {
  const client = useApolloClient()
  // A seller (a listing online, outside the Section Adultes): invited to
  // show their articles in video.
  const { data: mine } = useQuery<{ myListings: { items: { status: string }[] } }>(MY_LISTINGS_QUERY, {
    variables: { page: 1, pageSize: 20 },
    skip: !actions.isLoggedIn || !onPublish,
    fetchPolicy: 'cache-first',
  })
  const isSeller = !!mine?.myListings.items.some(l => l.status === 'APPROVED')
  const [invite, setInvite] = useState(() => !inviteSeenToday())
  const publish = () => { markInviteSeen(); onPublish?.() }
  const dismiss = () => { markInviteSeen(); setInvite(false) }
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
        onPublish={isSeller && !adult ? publish : undefined}
      />
      {isSeller && !adult && invite && !error && (
        <div role="dialog" aria-label="Publier un Reel" className="fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[260] mx-auto max-w-sm rounded-2xl bg-white p-4 text-black shadow-lg md:bottom-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white"><Icon name="video_call" size={22} /></span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-label-lg">Montrez vos articles en vidéo</p>
              <p className="m-0 mt-0.5 text-body-sm text-[#5B5759]">Publiez un Reel de l’une de vos annonces : il apparaît ici, sur l’annonce et sur votre profil.</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={dismiss} className="h-10 flex-1 cursor-pointer rounded-xl border-none bg-[#F1EDEE] text-label-md text-black">Plus tard</button>
            <button onClick={publish} className="h-10 flex-[2] cursor-pointer rounded-xl border-none bg-primary text-label-md text-white">Publier un Reel</button>
          </div>
        </div>
      )}
      {error && items.length > 0 && (
        <div className="fixed inset-x-4 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[260] mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-white px-4 py-3 text-body-sm text-black shadow-lg md:bottom-6">
          <span className="flex-1">Connexion instable : les Reels suivants n’ont pas pu être chargés.</span>
          <button onClick={() => void load(cursor)} className="cursor-pointer rounded-lg border-none bg-primary px-3 py-2 text-label-md text-white">Réessayer</button>
        </div>
      )}
    </>
  )
}
