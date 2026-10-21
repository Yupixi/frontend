import { useQuery } from '@apollo/client/react'
import Icon from '../Icon'
import Price from '../Price'
import { REELS_FEED_QUERY, type Reel } from '../../graphql/reels'
import { interestCategories } from '../../lib/interests'
import { requestOpenReels } from '../../lib/navigation'
import { rotationSeed } from '../../lib/rotationSeed'
import { formatDuration, reelThumb, seenReels, useReelSettings } from '../../lib/reels'

// Home « Reels » rail: the head of the visitor's feed as posters (no video
// plays here — data); a tap opens the Reels tab on that Reel.
export default function ReelRail({ countryCode, city, signedIn, desktop }: { countryCode?: string | null; city?: string | null; signedIn: boolean; desktop?: boolean }) {
  const settings = useReelSettings(countryCode)
  const { data, loading } = useQuery<{ reelsFeed: { items: Reel[] } }>(REELS_FEED_QUERY, {
    skip: !settings.enabled,
    variables: {
      countryCode: countryCode ?? undefined,
      city: city ?? undefined,
      interestCategories: signedIn ? undefined : interestCategories(),
      seenIds: signedIn ? undefined : seenReels().slice(0, 100),
      limit: 10,
      rotationSeed: rotationSeed(),
    },
    fetchPolicy: 'cache-first',
  })
  const items = data?.reelsFeed.items ?? []
  if (!settings.enabled || (!loading && !items.length)) return null
  return (
    <section className={desktop ? 'mt-10' : 'mb-8'} aria-label="Reels">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`m-0 flex items-center gap-2 text-on-surface ${desktop ? 'text-headline-lg' : 'text-headline-sm'}`}>
            <Icon name="smart_display" size={desktop ? 26 : 22} className="text-primary" /> Reels
          </h3>
          <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">Les vendeurs montrent leurs articles en vidéo</p>
        </div>
        <button onClick={() => requestOpenReels()} className="flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md font-semibold text-primary hover:underline">
          Tout voir <Icon name="chevron_right" size={18} />
        </button>
      </div>
      <div className={`flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${desktop ? '' : '-mx-4 px-4 md:-mx-8 md:px-8'}`}>
        {loading && !items.length
          ? Array.from({ length: desktop ? 6 : 3 }, (_, i) => <div key={i} className={`shrink-0 animate-pulse rounded-2xl bg-surface-container ${desktop ? 'h-[300px] w-[169px]' : 'h-[224px] w-[126px]'}`} />)
          : items.map(r => (
            <button
              key={r.id}
              onClick={() => requestOpenReels(r.id)}
              aria-label={`Regarder le Reel : ${r.listing?.title ?? 'vidéo'}`}
              className={`relative shrink-0 cursor-pointer overflow-hidden rounded-2xl border-none bg-neutral-900 p-0 text-left text-white ${desktop ? 'h-[300px] w-[169px]' : 'h-[224px] w-[126px]'}`}
            >
              {r.posterUrl && <img src={reelThumb(r.posterUrl) ?? undefined} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />}
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold"><Icon name="play_arrow" size={13} fill /> {formatDuration(r.durationSec)}</span>
              {r.promoted && <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase">Sponsorisé</span>}
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2.5 pb-2.5 pt-8">
                <span className="line-clamp-2 text-label-md leading-snug">{r.listing?.title}</span>
                {r.listing && <span className="mt-0.5 block text-label-lg font-bold"><Price amount={r.listing.price} currency={r.listing.currency} /></span>}
              </span>
            </button>
          ))}
      </div>
    </section>
  )
}
