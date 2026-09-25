import { useState } from 'react'
import { Heart, MapPin, Eye, Tag, Handshake, MessageSquare, BadgeCheck, Star, Rocket, Car, Wrench, Gauge, Home as HomeIcon, Shirt, Briefcase, PawPrint, ArrowUp, type AppIcon } from './icons'
import Price from './Price'
import BoostMenu from './BoostMenu'
import type { RemoteListing } from '../graphql/listings'
import { formatRelativeDate } from '../lib/format'
import {
  getArchetype,
  archetypeHighlight,
  archetypePriceFallback,
  archetypePriceSuffix,
  ARCHETYPE_ACCENT,
  type ArchetypeKey,
} from '../lib/listingArchetype'

const ARCHETYPE_ICON: Record<ArchetypeKey, AppIcon> = {
  route: Car,
  rateService: Wrench,
  vehicle: Gauge,
  realEstate: HomeIcon,
  fashion: Shirt,
  job: Briefcase,
  animal: PawPrint,
  default: Tag,
}

function ArchetypeIcon({ archetype, size }: { archetype: ArchetypeKey, size: number }) {
  const Icon = ARCHETYPE_ICON[archetype]
  return <Icon size={size} />
}

// The small icon + colored line that makes a subcategory read differently
// at a glance (a covoiturage card vs. a cours-particuliers card, both under
// "Services"). Falls back to nothing when the seller left the relevant
// attributes empty — never invents data to fill the gap.
function ArchetypeLine({ listing }: { listing: RemoteListing }) {
  const highlight = archetypeHighlight(listing)
  if (!highlight) return null
  const archetype = getArchetype(listing)
  const color = ARCHETYPE_ACCENT[archetype]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color, fontSize: '0.8rem', fontWeight: 700 }}>
      <ArchetypeIcon archetype={archetype} size={13} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{highlight}</span>
    </div>
  )
}

export function listingLocation(listing: RemoteListing): string {
  return listing.locationLabel ? `${listing.locationLabel}, ${listing.city}` : listing.city
}

export function listingImage(listing: RemoteListing): string {
  return listing.coverImageUrl ?? listing.media[0]?.url ?? ''
}

// Sale price computed the same way FlashOffers does: an explicit salePrice
// wins over a discountPercent, both are optional on a CampaignListing entry.
export function discountedPrice(listing: RemoteListing): number | null {
  const discount = listing.activeCampaignDiscount
  if (!discount || listing.price == null) return null
  if (discount.salePrice != null) return discount.salePrice
  if (discount.discountPercent != null) return Math.round(listing.price * (1 - discount.discountPercent / 100))
  return null
}

function isActivelyBoosted(listing: RemoteListing): boolean {
  return !!listing.boostExpiresAt && new Date(listing.boostExpiresAt) > new Date()
}

// Shown on the seller's own card wherever it appears in a feed — the user
// asked to be invited to boost everywhere they see their own listing, not
// just from "Mes annonces". Self-contained (own open/done state) since a
// feed renders many of these side by side.
function OwnListingBoostCta({ listing }: { listing: RemoteListing }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  if (isActivelyBoosted(listing) || done) return null
  return (
    <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
      {open ? (
        // 'dropdown' would be clipped invisible here — the card root has
        // overflow: hidden (for the image's rounded corners), which cuts
        // off anything absolutely positioned past its bounds.
        <BoostMenu listingId={listing.id} variant="inline" onDone={() => { setOpen(false); setDone(true) }} />
      ) : (
        <button
          onClick={() => setOpen(true)}
          style={{ width: '100%', padding: '6px 8px', background: 'rgba(187, 0, 19,0.06)', border: '1px dashed var(--primary)', borderRadius: 8, color: 'var(--primary)', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}
        >
          <ArrowUp size={12} /> Boostez cette annonce
        </button>
      )}
    </div>
  )
}

function PromoBadge({ listing }: { listing: RemoteListing }) {
  const discount = listing.activeCampaignDiscount
  if (!discount) return null
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase text-white md:px-2 md:text-label-sm"
      style={{ background: discount.themeColor || 'var(--primary)' }}
      title={discount.campaignName}
    >
      <Tag size={11} />
      {discount.discountPercent != null ? `-${discount.discountPercent}%` : discount.campaignName}
    </span>
  )
}

function SellerChip({ listing }: { listing: RemoteListing }) {
  const name = listing.seller.fullName
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant">
        {listing.seller.avatarUrl ? <img src={listing.seller.avatarUrl} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
      </span>
      <span className="truncate">{name}</span>
      {listing.seller.isVerified && <BadgeCheck size={13} className="shrink-0 text-tertiary" aria-label="Vendeur certifié" />}
    </span>
  )
}

function isUrgent(listing: RemoteListing) {
  return !!listing.urgentUntil && new Date(listing.urgentUntil) > new Date()
}

export function ListingCard({ listing, onSelect, onToggleFav, isFav, currentUserId, onContact, cta = 'icon' }: {
  listing: RemoteListing, onSelect: () => void, onToggleFav: () => void, isFav: boolean, currentUserId?: string | null
  // 'icon': red chat square (catalogue); 'split': Détails + Discuter;
  // 'full': one full-width Discuter button (home feeds).
  cta?: 'icon' | 'split' | 'full'
  // Opens the chat with the seller straight from the card (mockup
  // "Contacter" / "Discuter"). Falls back to opening the listing.
  onContact?: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const salePrice = discountedPrice(listing)
  const priceSuffix = archetypePriceSuffix(listing)
  const isRoute = getArchetype(listing) === 'route'
  const isOwn = !!currentUserId && listing.seller.id === currentUserId
  const eyebrow = listing.brand || listing.subcategory?.name || listing.category.name
  // Campaign price wins; otherwise the seller's "prix neuf" is struck through.
  const struck = salePrice != null ? listing.price : (listing.originalPrice && listing.price != null && listing.originalPrice > listing.price ? listing.originalPrice : null)
  const rating = listing.seller.reviewsCount ? listing.seller.averageRating ?? 0 : null

  return (
    <div
      className="listing-card group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
      onClick={onSelect}
    >
      {/* Image — soft gray backdrop so second-hand photos read as
          "detoured" (design system: Cartes Produits). */}
      <div className="relative aspect-square overflow-hidden bg-surface-container-low">
        {!imgError && listingImage(listing) ? (
          <img
            src={listingImage(listing)}
            alt={listing.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-outline">
            <Tag size={40} />
          </div>
        )}

        <div className="absolute left-2 top-2 z-[2] flex flex-col items-start gap-1 md:left-3 md:top-3">
          {isActivelyBoosted(listing) && (
            <span className="flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-white md:px-2 md:text-label-sm"><Rocket size={13} /> Boosté</span>
          )}
          {listing.condition && listing.condition !== 'N/A' && (
            <span className="rounded-md bg-surface-lowest/95 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface md:px-2 md:text-label-sm">{listing.condition}</span>
          )}
          <PromoBadge listing={listing} />
          {isUrgent(listing) && (
            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-white md:px-2 md:text-label-sm">Urgent</span>
          )}
        </div>

        <button
          onClick={e => { e.stopPropagation(); onToggleFav() }}
          className="absolute right-2 top-2 z-[2] flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-surface-lowest/95 shadow-sm md:right-3 md:top-3 md:h-9 md:w-9"
          title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart size={17} fill={isFav ? 'var(--primary)' : 'none'} color={isFav ? 'var(--primary)' : 'var(--fg)'} />
        </button>

        {listing.negotiable && (
          <span className="absolute bottom-2 left-2 z-[2] flex items-center gap-1 rounded-full bg-tertiary px-2 py-0.5 text-[10px] font-bold text-white md:bottom-3 md:left-3 md:text-label-sm">
            <Handshake size={12} /> Négociable
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5 md:p-3.5">
        <div className="mb-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-[10px] font-bold uppercase tracking-wide text-on-surface-variant md:text-label-sm">{eyebrow}</span>
          {listing.size && <span className="shrink-0 rounded bg-surface-container-low px-1.5 text-[10px] font-semibold text-on-surface-variant md:text-[11px]">Taille {listing.size}</span>}
        </div>
        <h3 className="m-0 line-clamp-2 text-[13px] font-semibold leading-snug text-on-surface md:text-label-lg">
          {listing.title}
        </h3>

        <div className="mt-1.5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[16px] font-extrabold leading-tight tracking-tight text-primary md:text-headline-sm md:font-extrabold">
              <Price amount={salePrice ?? listing.price} currency={listing.currency} fallback={archetypePriceFallback(listing)} />
              {priceSuffix && <span className="text-[0.7em] font-semibold text-on-surface-variant"> {priceSuffix}</span>}
            </div>
            {struck != null && (
              <div className="text-body-sm text-outline line-through">
                <Price amount={struck} currency={listing.currency} />
              </div>
            )}
          </div>
          {!isOwn && cta === 'icon' && (
            <button
              onClick={e => { e.stopPropagation(); (onContact ?? onSelect)() }}
              className="hidden h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-primary text-white transition-colors hover:bg-primary-dark md:flex"
              title="Discuter avec le vendeur"
            >
              <MessageSquare size={17} />
            </button>
          )}
        </div>

        <div className="mt-1.5 flex flex-col gap-0.5 text-[11px] md:text-body-sm">
          <ArchetypeLine listing={listing} />
          {!isRoute && (
            <div className="flex min-w-0 items-center gap-1 text-tertiary">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{listingLocation(listing)}</span>
            </div>
          )}
        </div>

        <div className="min-h-2.5 flex-1" />
        <div className="flex items-center justify-between gap-2 border-0 border-t border-solid border-surface-container-low pt-2 text-[11px] text-on-surface-variant md:text-label-sm md:font-medium">
          <SellerChip listing={listing} />
          {rating != null ? (
            <span className="flex shrink-0 items-center gap-0.5 font-semibold text-on-surface">
              <Star size={12} fill="#F59E0B" color="#F59E0B" />{rating.toFixed(1)}
              <span className="font-normal text-on-surface-variant">({listing.seller.reviewsCount})</span>
            </span>
          ) : (
            <span className="shrink-0">{formatRelativeDate(listing.publishedAt ?? listing.createdAt)}</span>
          )}
        </div>

        {!isOwn && cta === 'split' && (
          <div className="mt-3 flex gap-2">
            <button onClick={e => { e.stopPropagation(); onSelect() }} className="flex-1 cursor-pointer rounded-xl border-none bg-surface-container-low py-2 text-label-md font-bold text-on-surface hover:bg-surface-container">Détails</button>
            <button onClick={e => { e.stopPropagation(); (onContact ?? onSelect)() }} className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl border-none bg-primary py-2 text-label-md font-bold text-white hover:bg-primary-container">
              <MessageSquare size={16} /> Discuter
            </button>
          </div>
        )}
        {!isOwn && cta !== 'split' && (
          <button
            onClick={e => { e.stopPropagation(); (onContact ?? onSelect)() }}
            className={`mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-surface-container-low py-1.5 text-label-md text-on-surface hover:bg-primary hover:text-white ${cta === 'full' ? 'md:mt-3 md:rounded-xl md:py-2.5 md:font-bold' : 'md:hidden'}`}
          >
            <MessageSquare size={cta === 'full' ? 18 : 14} /> {cta === 'full' ? 'Discuter' : 'Contacter'}
          </button>
        )}
        {isOwn && <OwnListingBoostCta listing={listing} />}
      </div>
    </div>
  )
}

export function ListingListCard({ listing, onSelect, onToggleFav, isFav, currentUserId }: {
  listing: RemoteListing, onSelect: () => void, onToggleFav: () => void, isFav: boolean, currentUserId?: string | null
}) {
  const [imgError, setImgError] = useState(false)
  const salePrice = discountedPrice(listing)
  const priceSuffix = archetypePriceSuffix(listing)
  const highlight = archetypeHighlight(listing)
  const isRoute = getArchetype(listing) === 'route'
  const accent = ARCHETYPE_ACCENT[getArchetype(listing)]
  const isOwn = !!currentUserId && listing.seller.id === currentUserId

  return (
    <div className="card card-hover listing-list-card" onClick={onSelect}>
      <div className="listing-list-thumb">
        {!imgError && listingImage(listing) ? (
          <img src={listingImage(listing)} alt={listing.title} onError={() => setImgError(true)} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)' }}>
            <Tag size={28} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            {(listing.activeCampaignDiscount || listing.negotiable) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                <PromoBadge listing={listing} />
                {listing.negotiable && (
                  <div className="listing-list-meta" style={{ marginTop: 0, color: 'var(--primary)' }}>
                    <span>Négociable</span>
                  </div>
                )}
              </div>
            )}
            <h3 className="listing-list-title">{listing.title}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
              <div className="price-tag">
                <Price amount={salePrice ?? listing.price} currency={listing.currency} fallback={archetypePriceFallback(listing)} />
                {priceSuffix && <span style={{ fontSize: '0.7em', fontWeight: 600, color: 'var(--fg-muted)' }}> {priceSuffix}</span>}
              </div>
              {salePrice != null && (
                <div style={{ fontSize: '0.78rem', color: 'var(--fg-subtle)', textDecoration: 'line-through' }}>
                  <Price amount={listing.price} currency={listing.currency} />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onToggleFav() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, color: isFav ? 'var(--primary)' : 'var(--fg-muted)' }}
            title="Ajouter aux favoris"
          >
            <Heart size={18} fill={isFav ? 'var(--primary)' : 'none'} color={isFav ? 'var(--primary)' : '#999'} />
          </button>
        </div>

        <p className="listing-list-desc">{listing.description}</p>

        <div className="listing-list-meta">
          {highlight && (
            <span style={{ color: accent, fontWeight: 700 }}>
              <ArchetypeIcon archetype={getArchetype(listing)} size={12} />
              {highlight}
            </span>
          )}
          {!isRoute && <span><MapPin size={12} />{listingLocation(listing)}</span>}
          <span>{formatRelativeDate(listing.publishedAt ?? listing.createdAt)}</span>
          <span><Eye size={12} />{listing.viewsCount}</span>
        </div>

        {isOwn && <OwnListingBoostCta listing={listing} />}
      </div>
    </div>
  )
}
