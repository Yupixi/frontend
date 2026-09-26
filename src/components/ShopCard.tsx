import Icon from './Icon'
import Price from './Price'
import { openNow, type Shop } from '../graphql/shops'
import { formatNumber } from '../lib/format'

export function ShopLogo({ shop, size = 'md' }: { shop: Pick<Shop, 'name' | 'logoUrl'>, size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-24 w-24 rounded-2xl text-headline-lg md:h-28 md:w-28' : size === 'md' ? 'h-14 w-14 rounded-xl text-headline-sm' : 'h-10 w-10 rounded-lg text-label-lg'
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden border-2 border-solid border-surface-lowest bg-surface-container-high font-bold text-primary ${cls}`}>
      {shop.logoUrl ? <img src={shop.logoUrl} alt={shop.name} className="h-full w-full object-cover" /> : shop.name.charAt(0).toUpperCase()}
    </span>
  )
}

// Directory / home card ("Voir la boutique").
export function ShopCard({ shop, onOpen, onFollow, compact }: { shop: Shop, onOpen: () => void, onFollow?: () => void, compact?: boolean }) {
  const now = openNow(shop.openingHours)
  return (
    <div onClick={onOpen} className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface-lowest shadow-sm transition-shadow hover:shadow-card-hover">
      <div className="relative h-24 bg-surface-container md:h-28">
        {shop.bannerUrl ? <img src={shop.bannerUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-primary-fixed to-surface-container" />}
        {shop.openingHours.length > 0 && (
          <span className="absolute right-2 top-2 flex items-center gap-1 whitespace-nowrap rounded-full bg-surface-lowest/95 px-2 py-0.5 text-label-sm text-on-surface">
            <span className={`h-1.5 w-1.5 rounded-full ${now.open ? 'bg-tertiary' : 'bg-outline'}`} /> {now.open ? 'Ouvert' : 'Fermé'}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <div className="-mt-9 flex items-end justify-between gap-2">
          <div className="relative"><ShopLogo shop={shop} /><span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-solid border-surface-lowest bg-tertiary text-white"><Icon name="verified" size={12} fill /></span></div>
          <span className="whitespace-nowrap rounded-full bg-tertiary-soft px-2 py-0.5 text-[11px] font-semibold text-tertiary">{shop.legalIdType} vérifié</span>
        </div>
        <h3 className="m-0 mt-2 truncate text-headline-sm text-on-surface">{shop.name}</h3>
        {shop.category && <p className="m-0 truncate text-body-sm text-on-surface-variant">{shop.category.name}</p>}
        <p className="m-0 mt-0.5 flex min-w-0 items-center gap-1 text-body-sm text-on-surface-variant"><Icon name="location_on" size={14} className="shrink-0" /><span className="truncate">{[shop.commune, shop.city].filter(Boolean).join(', ')}</span></p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-sm text-on-surface-variant">
          {shop.reviewsCount > 0 && <span className="flex items-center gap-0.5 whitespace-nowrap"><Icon name="star" size={14} fill className="text-[#F59E0B]" /> {shop.averageRating.toFixed(1)} ({shop.reviewsCount})</span>}
          <span className="whitespace-nowrap"><b className="text-on-surface">{formatNumber(shop.listingsCount)}</b> articles</span>
          <span className="whitespace-nowrap"><b className="text-on-surface">{formatNumber(shop.followersCount)}</b> abonnés</span>
        </div>
        {!compact && shop.highlights.length > 0 && (
          <>
            <p className="m-0 mt-3 text-label-sm uppercase text-on-surface-variant">Articles vedettes</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {shop.highlights.map(h => (
                <div key={h.id} className="min-w-0">
                  <div className="aspect-square overflow-hidden rounded-lg bg-surface-container">{h.coverUrl && <img src={h.coverUrl} alt={h.title} loading="lazy" className="h-full w-full object-cover" />}</div>
                  <p className="m-0 mt-0.5 truncate text-[11px] font-bold text-on-surface"><Price amount={h.price} /></p>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="mt-auto flex gap-2 pt-3">
          {onFollow && (
            <button onClick={e => { e.stopPropagation(); onFollow() }} className={`flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border-none px-3 text-label-md ${shop.isFollowedByMe ? 'bg-tertiary-soft text-tertiary' : 'bg-surface-container text-on-surface'}`}>
              <Icon name={shop.isFollowedByMe ? 'how_to_reg' : 'person_add'} size={17} /> {shop.isFollowedByMe ? 'Suivie' : 'Suivre'}
            </button>
          )}
          <button className="flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border-none bg-primary px-3 text-label-md text-white group-hover:bg-primary-dark">
            Voir la boutique <Icon name="chevron_right" size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
