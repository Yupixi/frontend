import AnimatedIcon from './AnimatedIcon'
import { useState } from 'react'
import { MapPin, Eye, Tag, Car, Wrench, Gauge, Home as HomeIcon, Shirt, Briefcase, PawPrint, type AppIcon } from './icons'
import Icon from './Icon'
import Price from './Price'
import BoostSheet from './BoostSheet'
import BottomSheet from './BottomSheet'
import type { RemoteListing } from '../graphql/listings'
import { formatRelativeDate, plainText } from '../lib/format'
import { prefetchOnIntent } from '../lib/prefetchListing'
import { thumbnailUrl } from '../lib/media'
import { getAccessToken } from '../lib/auth'
import { setAuthReason } from '../lib/authReason'
import {
  getArchetype,
  archetypeHighlight,
  archetypePriceFallback,
  archetypePriceSuffix,
  ARCHETYPE_ACCENT,
  type ArchetypeKey,
} from '../lib/listingArchetype'

// Visitors are sent to the login screen by the favourite toggle; tell it why.
const favWithReason = (toggle: () => void) => { if (!getAccessToken()) setAuthReason('favorite'); toggle() }

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
    <div className="flex items-center gap-1 text-label-sm" style={{ color }}>
      <ArchetypeIcon archetype={archetype} size={13} />
      <span className="truncate">{highlight}</span>
    </div>
  )
}

export function listingLocation(listing: RemoteListing): string {
  return listing.locationLabel ? `${listing.locationLabel}, ${listing.city}` : listing.city
}

export function listingImage(listing: RemoteListing): string {
  return listing.coverImageUrl ?? listing.media[0]?.url ?? ''
}

// Cards show the 480 px thumbnail; if it's missing, fall back to the full
// image once before giving up on the picture.
function useCardImage(listing: RemoteListing) {
  const [stage, setStage] = useState<'thumb' | 'full' | 'none'>('thumb')
  const full = listingImage(listing)
  const src = stage === 'none' || !full ? '' : stage === 'thumb' ? thumbnailUrl(full) : full
  const onError = () => setStage(s => (s === 'thumb' && thumbnailUrl(full) !== full ? 'full' : 'none'))
  return { src, onError }
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
  if (isActivelyBoosted(listing) || (done && !open)) return null
  return (
    <div className="mt-2" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(true)} className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-primary px-2 py-2 text-label-md text-white hover:bg-primary-dark">
        <Icon name="rocket_launch" size={16} /> <span className="whitespace-nowrap">Booster<span className="hidden md:inline"> cette annonce</span></span>
      </button>
      <BoostSheet open={open} onClose={() => setOpen(false)} listing={listing} onBumped={() => setDone(true)} />
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

function isUrgent(listing: RemoteListing) {
  return !!listing.urgentUntil && new Date(listing.urgentUntil) > new Date()
}

// Product card from the Stitch mockups. Phones get the compact "Dilchap
// Mobile – Accueil" card (price first, one Contacter button); from md up
// it's the desktop "Pépites à la Une" card (category + trust signal, title,
// location, price, Détails / Discuter).
export function ListingCard({ listing, onSelect, onToggleFav, isFav, currentUserId, onContact, featured }: {
  listing: RemoteListing, onSelect: () => void, onToggleFav: () => void, isFav: boolean, currentUserId?: string | null
  // Opens the chat with the seller straight from the card. Falls back to
  // opening the listing.
  onContact?: () => void
  // "Pépites à la Une" rail: prominent red "Discuter" button on phones.
  featured?: boolean
}) {
  const image = useCardImage(listing)
  const salePrice = discountedPrice(listing)
  const priceSuffix = archetypePriceSuffix(listing)
  const isRoute = getArchetype(listing) === 'route'
  const isOwn = !!currentUserId && listing.seller.id === currentUserId
  const category = listing.subcategory?.name || listing.category.name
  // Campaign price wins; otherwise the seller's "prix neuf" is struck through.
  const struck = salePrice != null ? listing.price : (listing.originalPrice && listing.price != null && listing.originalPrice > listing.price ? listing.originalPrice : null)
  const rating = listing.seller.reviewsCount ? listing.seller.averageRating ?? 0 : null
  const condition = listing.condition && listing.condition !== 'N/A' ? listing.condition : null
  const contact = (e: React.MouseEvent) => { e.stopPropagation(); (onContact ?? onSelect)() }
  // Phone button of the mockup card. Sellers' numbers aren't public: the
  // number is shared in the conversation, so the button says so and leads
  // there instead of faking a call.
  const [callInfo, setCallInfo] = useState(false)
  const price = (
    <>
      <Price amount={salePrice ?? listing.price} currency={listing.currency} fallback={archetypePriceFallback(listing)} />
      {priceSuffix && <span className="text-[0.65em] font-semibold text-on-surface-variant"> {priceSuffix}</span>}
    </>
  )
  const verified = !!listing.seller.isVerified
  const place = isRoute
    ? <ArchetypeLine listing={listing} />
    : (
      <p className="m-0 flex min-w-0 items-center gap-0.5 text-[11px] text-on-surface-variant md:mt-1 md:gap-1 md:text-body-sm">
        {/* Phones: a verified seller swaps the pin for the check (mockup). */}
        {verified && <span className="flex shrink-0 md:hidden"><Icon name="verified" size={14} className="text-tertiary" /></span>}
        <span className={`shrink-0 ${verified ? 'hidden md:flex' : 'flex'}`}><Icon name="location_on" size={14} className="text-tertiary" /></span>
        <span className="truncate">{listingLocation(listing)}</span>
      </p>
    )
  // Phone photo tag: rail cards lead with the condition, feed cards with the size.
  const phoneTag = featured
    ? condition ?? (listing.size ? `Taille ${listing.size}` : category)
    : listing.size ? `Taille ${listing.size}` : condition ?? category

  return (
    <div
      className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl bg-surface-lowest shadow-sm transition-[transform,box-shadow] duration-300 active:scale-[0.98] hover:shadow-card-hover md:rounded-2xl md:active:scale-100"
      onClick={onSelect}
      {...prefetchOnIntent(listing.id)}
    >
      <div>
        <div className={`relative w-full overflow-hidden bg-surface-container-low ${featured ? 'aspect-[260/192] md:aspect-square' : 'aspect-square'}`}>
          {image.src ? (
            <img
              src={image.src}
              alt={listing.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={image.onError}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-outline"><Tag size={40} /></div>
          )}

          <div className="absolute left-2 right-10 top-2 flex flex-col items-start gap-1 md:left-3 md:right-12 md:top-3">
            {isActivelyBoosted(listing) && (
              <span className="flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-white md:rounded-md md:px-2.5 md:py-1 md:text-label-sm">
                <Icon name="rocket_launch" size={14}/> Boosté
              </span>
            )}
            <PromoBadge listing={listing} />
            {isUrgent(listing) && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-white md:rounded-md md:px-2 md:text-label-sm">Urgent</span>}
            {/* Phone: size or category tag. Desktop: the condition. */}
            <span className="max-w-full truncate rounded bg-surface-lowest/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-on-surface md:hidden">{phoneTag}</span>
            {condition && <span className="hidden rounded bg-surface-lowest/90 px-2 py-0.5 text-label-sm font-semibold text-on-surface md:inline">{condition}</span>}
          </div>

          {featured && verified && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-tertiary px-1.5 py-0.5 text-[10px] font-bold text-white md:hidden">
              <Icon name="verified_user" size={12} /> Vendeur vérifié
            </span>
          )}

          <button
            onClick={e => { e.stopPropagation(); favWithReason(onToggleFav) }}
            className={`absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-surface-lowest/90 transition-colors hover:text-primary md:right-3 md:top-3 md:h-8 md:w-8 ${isFav ? 'text-primary' : 'text-on-surface'}`}
            aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <AnimatedIcon name="heart" fallback="favorite" size={17} fill={isFav} trigger={isFav} />
          </button>
        </div>

        {/* Phone body */}
        <div className="flex flex-col gap-0.5 p-2.5 md:hidden">
          <div className="flex min-w-0 items-baseline justify-between gap-1.5">
            <span className="shrink-0 text-headline-sm font-bold text-primary">{price}</span>
            {struck != null && <span className={`min-w-0 truncate text-on-surface-variant line-through ${featured ? 'text-body-sm' : 'text-[11px]'}`}><Price amount={struck} currency={listing.currency} /></span>}
          </div>
          <h4 className={`m-0 truncate text-on-surface ${featured ? 'text-label-lg font-bold' : 'text-label-md font-semibold'}`}>{listing.title}</h4>
          {place}
        </div>

        {/* Desktop body */}
        <div className="hidden p-4 md:block">
          <div className="mb-1 flex items-center justify-between gap-2 text-body-sm text-on-surface-variant">
            <span className="truncate">{category}{listing.size && ` • T. ${listing.size}`}</span>
            {listing.seller.isVerified ? (
              <span className="flex shrink-0 items-center gap-1 text-label-sm font-semibold text-tertiary"><Icon name="verified" size={14} /> Vérifié</span>
            ) : rating != null && (
              <span className="flex shrink-0 items-center gap-1 text-label-sm font-semibold text-primary">★ {rating.toFixed(1)} ({listing.seller.reviewsCount})</span>
            )}
          </div>
          <h4 className="m-0 line-clamp-1 text-headline-sm font-bold text-on-surface">{listing.title}</h4>
          {place}
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className={`text-headline-md font-extrabold ${struck != null ? 'text-primary' : 'text-on-surface'}`}>{price}</span>
            {struck != null && <span className="text-body-sm text-outline line-through"><Price amount={struck} currency={listing.currency} /></span>}
          </div>
        </div>
      </div>

      {isOwn ? (
        <div className="px-2.5 pb-2.5 md:px-4 md:pb-4"><OwnListingBoostCta listing={listing} /></div>
      ) : (
        <>
          <div className="px-2.5 pb-2.5 md:hidden">
            {featured ? (
              <div className="flex gap-2">
                <button onClick={contact} className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-primary shadow-sm text-label-md font-bold text-white transition-colors hover:bg-primary-dark">
                  <Icon name="chat" size={16} /> Discuter
                </button>
                <button onClick={e => { e.stopPropagation(); setCallInfo(true) }} aria-label="Appeler le vendeur" className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-surface-container text-on-surface">
                  <Icon name="call" size={18} />
                </button>
                <div onClick={e => e.stopPropagation()}>
                  <BottomSheet open={callInfo} onClose={() => setCallInfo(false)} title={`Appeler ${listing.seller.fullName.split(' ')[0]}`}>
                    <p className="m-0 text-body-md text-on-surface-variant">Pour votre sécurité, le numéro du vendeur est partagé dans la discussion, une fois le rendez-vous convenu.</p>
                    <button onClick={e => { setCallInfo(false); contact(e) }} className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-primary text-label-lg text-white">
                      <Icon name="chat" size={18} /> Discuter avec le vendeur
                    </button>
                  </BottomSheet>
                </div>
              </div>
            ) : (
              <button onClick={contact} className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border-none bg-surface-container py-1.5 text-label-sm font-bold text-on-surface transition-colors hover:bg-primary hover:text-white">
                <Icon name="chat_bubble" size={14} /> Contacter
              </button>
            )}
          </div>
          <div className="hidden gap-2 px-4 pb-4 md:flex">
            <button onClick={e => { e.stopPropagation(); onSelect() }} className="flex-1 cursor-pointer rounded-xl border-none bg-surface-container-low py-2 text-label-md font-bold text-on-surface transition-colors hover:bg-surface-container">Détails</button>
            <button onClick={contact} className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl border-none bg-primary py-2 text-label-md font-bold text-white transition-colors hover:bg-primary-dark">
              <Icon name="chat" size={16} /> Discuter
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function ListingListCard({ listing, onSelect, onToggleFav, isFav, currentUserId }: {
  listing: RemoteListing, onSelect: () => void, onToggleFav: () => void, isFav: boolean, currentUserId?: string | null
}) {
  const image = useCardImage(listing)
  const salePrice = discountedPrice(listing)
  const priceSuffix = archetypePriceSuffix(listing)
  const highlight = archetypeHighlight(listing)
  const isRoute = getArchetype(listing) === 'route'
  const accent = ARCHETYPE_ACCENT[getArchetype(listing)]
  const isOwn = !!currentUserId && listing.seller.id === currentUserId

  return (
    <div onClick={onSelect} {...prefetchOnIntent(listing.id)} className="flex cursor-pointer gap-4 overflow-hidden rounded-2xl bg-surface-lowest p-3 shadow-sm transition-shadow hover:shadow-card-hover">
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-surface-container md:h-32 md:w-40">
        {image.src
          ? <img loading="lazy" decoding="async" src={image.src} alt={listing.title} onError={image.onError} className="h-full w-full object-cover" />
          : <span className="flex h-full items-center justify-center text-on-surface-variant"><Tag size={28} /></span>}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {(listing.activeCampaignDiscount || listing.negotiable) && (
              <div className="mb-1 flex flex-wrap gap-1.5">
                <PromoBadge listing={listing} />
                {listing.negotiable && <span className="rounded bg-primary-fixed/60 px-1.5 text-label-sm text-primary">Négociable</span>}
              </div>
            )}
            <h3 className="m-0 truncate text-label-lg text-on-surface">{listing.title}</h3>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-headline-sm font-extrabold text-primary">
                <Price amount={salePrice ?? listing.price} currency={listing.currency} fallback={archetypePriceFallback(listing)} />
                {priceSuffix && <span className="text-label-sm font-semibold text-on-surface-variant"> {priceSuffix}</span>}
              </span>
              {salePrice != null && <span className="text-body-sm text-on-surface-variant line-through"><Price amount={listing.price} currency={listing.currency} /></span>}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); favWithReason(onToggleFav) }}
            title="Ajouter aux favoris"
            aria-label="Ajouter aux favoris"
            className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container-low ${isFav ? 'text-primary' : 'text-on-surface-variant'}`}
          >
            <AnimatedIcon name="heart" fallback="favorite" size={18} fill={isFav} trigger={isFav} />
          </button>
        </div>

        <p className="m-0 mt-1 line-clamp-2 text-body-sm text-on-surface-variant">{plainText(listing.description)}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-on-surface-variant">
          {highlight && <span className="flex items-center gap-1" style={{ color: accent }}><ArchetypeIcon archetype={getArchetype(listing)} size={13} />{highlight}</span>}
          {!isRoute && <span className="flex items-center gap-1"><MapPin size={13} />{listingLocation(listing)}</span>}
          <span>{formatRelativeDate(listing.publishedAt ?? listing.createdAt)}</span>
          <span className="flex items-center gap-1"><Eye size={13} />{listing.viewsCount}</span>
        </div>

        {isOwn && <OwnListingBoostCta listing={listing} />}
      </div>
    </div>
  )
}
