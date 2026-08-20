import { useState } from 'react'
import { Heart, MapPin, Eye, Tag, Car, Wrench, Gauge, Home as HomeIcon, Shirt, Briefcase, PawPrint, type LucideIcon } from 'lucide-react'
import Price from './Price'
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

const ARCHETYPE_ICON: Record<ArchetypeKey, LucideIcon> = {
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

function PromoBadge({ listing }: { listing: RemoteListing }) {
  const discount = listing.activeCampaignDiscount
  if (!discount) return null
  return (
    <span
      className="badge"
      style={{
        background: discount.themeColor || '#FE0000',
        color: '#FFF',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontWeight: 800,
      }}
      title={discount.campaignName}
    >
      <Tag size={11} />
      {discount.discountPercent != null ? `-${discount.discountPercent}%` : discount.campaignName}
    </span>
  )
}

export function ListingCard({ listing, onSelect, onToggleFav, isFav }: {
  listing: RemoteListing, onSelect: () => void, onToggleFav: () => void, isFav: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const salePrice = discountedPrice(listing)
  const priceSuffix = archetypePriceSuffix(listing)
  const isRoute = getArchetype(listing) === 'route'

  return (
    <div className="card card-hover listing-card" style={{ overflow: 'hidden', cursor: 'pointer', position: 'relative', background: 'var(--bg-card)' }} onClick={onSelect}>

      {/* Badges Overlay */}
      {(listing.activeCampaignDiscount || listing.negotiable) && (
        <div className="listing-card-badges" style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
          <PromoBadge listing={listing} />
          {listing.negotiable && (
            <span className="badge badge-red" style={{ background: '#FE0000', color: '#FFF' }}>
              Négociable
            </span>
          )}
        </div>
      )}

      {/* Heart Favorite Button */}
      <button
        className="listing-card-fav"
        onClick={e => { e.stopPropagation(); onToggleFav() }}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 2,
          background: 'rgba(255,255,255,0.95)', border: '1px solid var(--border)', borderRadius: '50%',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
        title="Ajouter aux favoris"
      >
        <Heart size={18} fill={isFav ? '#FE0000' : 'none'} color={isFav ? '#FE0000' : '#64748B'} />
      </button>

      {/* Image Preview Container */}
      <div className="listing-card-img" style={{ height: 190, background: 'var(--border-subtle)', overflow: 'hidden', position: 'relative' }}>
        {!imgError && listingImage(listing) ? (
          <img
            src={listingImage(listing)}
            alt={listing.title}
            className="listing-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)' }}>
            <Tag size={40} />
          </div>
        )}
      </div>

      {/* Card Content Details */}
      <div className="listing-card-body" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <div className="price-tag">
            <Price amount={salePrice ?? listing.price} fallback={archetypePriceFallback(listing)} />
            {priceSuffix && <span style={{ fontSize: '0.7em', fontWeight: 600, color: 'var(--fg-muted)' }}> {priceSuffix}</span>}
          </div>
          {salePrice != null && (
            <div style={{ fontSize: '0.78rem', color: 'var(--fg-subtle)', textDecoration: 'line-through' }}>
              <Price amount={listing.price} />
            </div>
          )}
        </div>

        <h3 style={{
          margin: '4px 0 8px',
          fontSize: '0.95rem',
          fontWeight: 800,
          fontFamily: "'Outfit', sans-serif",
          color: 'var(--fg)',
          lineHeight: 1.3,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {listing.title}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <ArchetypeLine listing={listing} />
          {!isRoute && (
            <div className="listing-card-location" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              <MapPin size={13} style={{ color: 'var(--primary)' }} />
              <span>{listingLocation(listing)}</span>
            </div>
          )}
        </div>

        {/* Card Footer Info */}
        <div className="listing-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)' }}>
            {formatRelativeDate(listing.publishedAt ?? listing.createdAt)}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem', color: 'var(--fg-subtle)', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Eye size={13} />{listing.viewsCount}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Heart size={13} />{listing.favoritesCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ListingListCard({ listing, onSelect, onToggleFav, isFav }: {
  listing: RemoteListing, onSelect: () => void, onToggleFav: () => void, isFav: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const salePrice = discountedPrice(listing)
  const priceSuffix = archetypePriceSuffix(listing)
  const highlight = archetypeHighlight(listing)
  const isRoute = getArchetype(listing) === 'route'
  const accent = ARCHETYPE_ACCENT[getArchetype(listing)]

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
                <Price amount={salePrice ?? listing.price} fallback={archetypePriceFallback(listing)} />
                {priceSuffix && <span style={{ fontSize: '0.7em', fontWeight: 600, color: 'var(--fg-muted)' }}> {priceSuffix}</span>}
              </div>
              {salePrice != null && (
                <div style={{ fontSize: '0.78rem', color: 'var(--fg-subtle)', textDecoration: 'line-through' }}>
                  <Price amount={listing.price} />
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
      </div>
    </div>
  )
}
