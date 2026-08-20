import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { ArrowRight, Star, Zap, MapPin, Heart, Eye, Tag, ChevronRight, Award, Sparkles, Store, ShieldCheck, CreditCard } from 'lucide-react'
import ViewToggle from '../components/ViewToggle'
import Price from '../components/Price'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'
import { LISTINGS_QUERY, type RemoteListing } from '../graphql/listings'
import { HOME_BANNERS_QUERY, type RemoteBanner } from '../graphql/content'
import { formatRelativeDate } from '../lib/format'
import { getStoredViewMode, setStoredViewMode } from '../lib/viewMode'
import { followBannerCta } from '../lib/bannerCta'

type HomeProps = {
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onCategorySelect?: (categoryId: string) => void
}

function listingLocation(listing: RemoteListing): string {
  return listing.locationLabel ? `${listing.locationLabel}, ${listing.city}` : listing.city
}

// Deterministic per-(seed, id) pseudo-random in [0, 1) — used to vary which
// popular listings a session sees in "À la une" without reshuffling on every
// re-render (the seed is generated once per session, not per render).
function seededRandom(seed: number, id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return Math.abs(Math.sin(seed + hash))
}

function listingImage(listing: RemoteListing): string {
  return listing.coverImageUrl ?? listing.media[0]?.url ?? ''
}

function ListingCard({ listing, onSelect, onToggleFav, isFav }: {
  listing: RemoteListing, onSelect: () => void, onToggleFav: () => void, isFav: boolean
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="card card-hover listing-card" style={{ overflow: 'hidden', cursor: 'pointer', position: 'relative', background: 'var(--bg-card)' }} onClick={onSelect}>

      {/* Badges Overlay */}
      {listing.negotiable && (
        <div className="listing-card-badges" style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="badge badge-red" style={{ background: '#FE0000', color: '#FFF' }}>
            Négociable
          </span>
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
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="price-tag"><Price amount={listing.price} /></div>
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

        <div className="listing-card-location" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
          <MapPin size={13} style={{ color: 'var(--primary)' }} />
          <span>{listingLocation(listing)}</span>
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

function ListingListCard({ listing, onSelect, onToggleFav, isFav }: {
  listing: RemoteListing, onSelect: () => void, onToggleFav: () => void, isFav: boolean
}) {
  const [imgError, setImgError] = useState(false)

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
            {listing.negotiable && (
              <div className="listing-list-meta" style={{ marginTop: 0, color: 'var(--primary)' }}>
                <span>Négociable</span>
              </div>
            )}
            <h3 className="listing-list-title">{listing.title}</h3>
            <div className="price-tag"><Price amount={listing.price} /></div>
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
          <span><MapPin size={12} />{listingLocation(listing)}</span>
          <span>{formatRelativeDate(listing.publishedAt ?? listing.createdAt)}</span>
          <span><Eye size={12} />{listing.viewsCount}</span>
        </div>
      </div>
    </div>
  )
}

function HeroMosaicCard({ card, isMain, isFav, animationDelay, onSelect, onToggleFav }: {
  card: RemoteListing, isMain: boolean, isFav: boolean, animationDelay: string, onSelect: () => void, onToggleFav: () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      className={`hero-mosaic-card${isMain ? ' hero-mosaic-card-main' : ''}`}
      style={{ animationDelay }}
      onClick={onSelect}
    >
      <div className="hero-mosaic-img-wrap">
        {!imgError && listingImage(card) ? (
          <img src={listingImage(card)} alt={card.title} className="hero-mosaic-img" onError={() => setImgError(true)} />
        ) : (
          <div className="hero-mosaic-img-fallback">
            <Tag size={isMain ? 36 : 24} />
          </div>
        )}
        {/* Gradient overlay at bottom */}
        <div className="hero-mosaic-overlay" />

        {/* Category badge */}
        <div className="hero-mosaic-category">
          {card.category.name}
        </div>

        {/* Price */}
        <div className={`hero-mosaic-price${isMain ? ' hero-mosaic-price-lg' : ''}`}>
          <Price amount={card.price} />
        </div>
      </div>

      {/* Card body (title + location) */}
      <div className="hero-mosaic-body">
        <h3 className="hero-mosaic-title">{card.title}</h3>
        <div className="hero-mosaic-location">
          <MapPin size={13} />
          {listingLocation(card)}
        </div>
      </div>

      {/* Heart icon */}
      <button
        className="hero-mosaic-fav"
        onClick={e => { e.stopPropagation(); onToggleFav() }}
        style={{ color: isFav ? 'var(--primary)' : 'var(--fg-subtle)' }}
      >
        <Heart size={isMain ? 16 : 12} fill={isFav ? 'var(--primary)' : 'none'} />
      </button>
    </div>
  )
}

export default function Home({ onNavigate, onSelectListing, favorites, onToggleFavorite, onCategorySelect }: HomeProps) {
  // A cramped 2-column grid reads as cluttered on small screens — default to
  // the single-column list view there; desktop keeps the grid. An explicit
  // choice is remembered (shared with Search) and wins over that default.
  const [homeViewMode, setHomeViewModeState] = useState<'grid' | 'list'>(() =>
    getStoredViewMode() ?? (typeof window !== 'undefined' && window.innerWidth <= 640 ? 'list' : 'grid'),
  )
  const setHomeViewMode = (mode: 'grid' | 'list') => {
    setHomeViewModeState(mode)
    setStoredViewMode(mode)
  }
  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  // Highlight a curated subset (staff-ordered via sortOrder) on the homepage —
  // the header nav already covers full category browsing, so this section is
  // meant as a shortcut to the busiest categories, not a duplicate full list.
  const popularCategories = (categoriesData?.categories ?? []).slice(0, 8)

  const { data: listingsData } = useQuery<{ listings: { items: RemoteListing[] } }>(LISTINGS_QUERY, {
    variables: { sort: 'RECENT', page: 1, pageSize: 12 },
  })
  const recent = listingsData?.listings.items ?? []

  // BO-authored content (hero copy, trust bar, partners banner, seller CTA)
  // — each falls back to the default copy below when the slot is empty, so
  // the homepage never renders a blank section before the BO configures one.
  const { data: bannersData } = useQuery<{
    hero: RemoteBanner[]
    trustBar: RemoteBanner[]
    partners: RemoteBanner[]
    sellerCta: RemoteBanner[]
    featuredToggle: RemoteBanner | null
  }>(HOME_BANNERS_QUERY)
  const heroBanner = bannersData?.hero[0]
  const trustBarBanners = bannersData?.trustBar ?? []
  const partnersBanner = bannersData?.partners[0]
  const sellerCtaBanner = bannersData?.sellerCta[0]
  // No row for this slot = section on by default; a row lets the BO turn
  // it off (isActive) and/or override its heading — distinct from
  // activeBanners' filtering, which can't tell "unconfigured" from "off".
  const featuredEnabled = bannersData?.featuredToggle ? bannersData.featuredToggle.isActive : true
  const featuredHeading = bannersData?.featuredToggle?.isActive ? bannersData.featuredToggle : undefined

  // Generated once per session (not per render) so "À la une" doesn't
  // reshuffle every time something re-renders the page.
  const [sessionSeed] = useState(() => Math.random() * 1000)

  // "À la une" — an honest stand-in for paid Boost placements (Sprint 2+,
  // see PromotionsModule): the anchor card is the genuinely most-favorited
  // listing, but the other slots draw from a pool of popular listings and
  // are (a) biased toward categories the visitor has already favorited on
  // Yupixi, and (b) varied per session via a stable shuffle — so it isn't
  // the exact same four listings for every visitor on every visit.
  const highlighted = useMemo(() => {
    if (recent.length === 0) return []
    const pool = [...recent].sort((a, b) => b.favoritesCount - a.favoritesCount).slice(0, 8)
    const interestSlugs = new Set(
      recent.filter(l => favorites.includes(l.id)).map(l => l.category.slug),
    )
    const [anchor, ...rest] = pool
    const ranked = rest
      .map(listing => ({ listing, rand: seededRandom(sessionSeed, listing.id) }))
      .sort((a, b) => {
        const aMatches = interestSlugs.has(a.listing.category.slug)
        const bMatches = interestSlugs.has(b.listing.category.slug)
        if (aMatches !== bMatches) return aMatches ? -1 : 1
        return a.rand - b.rand
      })
      .map(entry => entry.listing)
    return anchor ? [anchor, ...ranked].slice(0, 4) : ranked.slice(0, 4)
  }, [recent, favorites, sessionSeed])

  const loopCount = highlighted.length
  const mosaicSlides = loopCount > 1 ? [...highlighted, highlighted[0]] : highlighted

  const mosaicRef = useRef<HTMLDivElement>(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const activeSlideRef = useRef(0)
  const resumeAutoplayAtRef = useRef(0)
  const scrollRafRef = useRef<number | null>(null)
  const scrollEndTimerRef = useRef<number | null>(null)

  const setActiveSlideSynced = (index: number) => {
    activeSlideRef.current = index
    setActiveSlide(index)
  }

  const scrollMosaicTo = (index: number, smooth = true) => {
    const container = mosaicRef.current
    const target = container?.children[index] as HTMLElement | undefined
    if (!container || !target) return
    container.scrollTo({ left: target.offsetLeft - container.offsetLeft, behavior: smooth ? 'smooth' : 'auto' })
  }

  const pauseAutoplay = () => {
    resumeAutoplayAtRef.current = Date.now() + 5000
  }

  const closestSlideIndex = (container: HTMLDivElement) => {
    const cards = Array.from(container.children) as HTMLElement[]
    let closest = 0
    let minDist = Infinity
    cards.forEach((el, i) => {
      const dist = Math.abs(el.offsetLeft - container.offsetLeft - container.scrollLeft)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    return closest
  }

  const handleMosaicScroll = () => {
    if (scrollRafRef.current != null) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      const container = mosaicRef.current
      if (!container) return
      setActiveSlideSynced(closestSlideIndex(container) % Math.max(loopCount, 1))
    })

    // Debounced "scroll has settled" check: if it settled on the trailing
    // clone, jump back to the real first card without animating.
    if (scrollEndTimerRef.current != null) window.clearTimeout(scrollEndTimerRef.current)
    scrollEndTimerRef.current = window.setTimeout(() => {
      const container = mosaicRef.current
      if (!container) return
      if (loopCount > 1 && closestSlideIndex(container) === loopCount) {
        scrollMosaicTo(0, false)
        setActiveSlideSynced(0)
      }
    }, 150)
  }

  // Set up the autoplay timer once per loopCount (not per slide change) —
  // it reads the current index from a ref so it never needs to re-arm and
  // drift/restart every time a scroll event nudges the displayed dot.
  useEffect(() => {
    if (loopCount <= 1) return
    const interval = setInterval(() => {
      if (window.innerWidth > 640) return
      if (Date.now() < resumeAutoplayAtRef.current) return
      scrollMosaicTo(activeSlideRef.current + 1)
    }, 4000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopCount])

  const renderListings = (items: RemoteListing[]) =>
    homeViewMode === 'grid'
      ? items.map(l => (
        <ListingCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} />
      ))
      : items.map(l => (
        <ListingListCard key={l.id} listing={l} onSelect={() => onSelectListing(l.id)} onToggleFav={() => onToggleFavorite(l.id)} isFav={favorites.includes(l.id)} />
      ))

  const renderListingsContainer = (items: RemoteListing[]) =>
    homeViewMode === 'grid'
      ? <div className="listing-grid">{renderListings(items)}</div>
      : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{renderListings(items)}</div>



  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div>

      {/* Hero — either a BO-supplied creative (image/GIF, shown as-is like
          the big marketplaces do) or the default generated text hero when
          no creative is configured for this slot. */}
      <section className="hero-premium" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="hero-premium-glow" />

        <div className="hero-premium-inner">
          {heroBanner?.imageUrl ? (
            <div className="hero-creative">
              <div className="hero-creative-media">
                <button
                  type="button"
                  className="hero-creative-link"
                  onClick={() =>
                    heroBanner.ctaUrl ? followBannerCta(heroBanner.ctaUrl, onNavigate) : onNavigate('search')
                  }
                >
                  <img src={heroBanner.imageUrl} alt={heroBanner.title} className="hero-creative-img" />
                </button>

                {(heroBanner.ctaLabel || heroBanner.secondaryCtaLabel) && (
                  <>
                    <div className="hero-creative-scrim" />
                    <div className="hero-creative-actions">
                      {heroBanner.ctaLabel && (
                        <button
                          className="hero-btn hero-btn-primary"
                          onClick={() =>
                            heroBanner.ctaUrl ? followBannerCta(heroBanner.ctaUrl, onNavigate) : onNavigate('search')
                          }
                        >
                          {heroBanner.ctaLabel} <ArrowRight size={18} />
                        </button>
                      )}
                      {heroBanner.secondaryCtaLabel && (
                        <button
                          className="hero-btn hero-btn-outline"
                          onClick={() =>
                            heroBanner.secondaryCtaUrl
                              ? followBannerCta(heroBanner.secondaryCtaUrl, onNavigate)
                              : onNavigate('seller-post')
                          }
                        >
                          {heroBanner.secondaryCtaLabel}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="hero-stats hero-stats-standalone">
                {(heroBanner.stats?.length ? heroBanner.stats : [
                  { value: '85 000+', label: 'Annonces Actives' },
                  { value: '42 000+', label: 'Vendeurs Vérifiés' },
                  { value: '24/7', label: 'Support Client' },
                ]).map(s => (
                  <div key={s.label} className="hero-stat-item">
                    <div className="hero-stat-value">{s.value}</div>
                    <div className="hero-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="hero-left hero-left-solo">
              <div className="hero-badge">
                <Sparkles size={14} />
                {heroBanner?.body || 'La marketplace nouvelle génération'}
              </div>

              <h1 className="hero-title">
                {heroBanner ? heroBanner.title : (
                  <>Trouvez, <span className="hero-title-accent">Achetez</span> & Vendez<br />en Côte d'Ivoire</>
                )}
              </h1>

              <p className="hero-subtitle">
                {heroBanner?.subtitle ||
                  "La plus grande plateforme de petites annonces certifiées en Côte d'Ivoire. Parcourez des milliers d'offres et échangez directement avec les vendeurs en toute confiance."}
              </p>

              <div className="hero-buttons">
                <button
                  className="hero-btn hero-btn-primary"
                  onClick={() =>
                    heroBanner?.ctaUrl ? followBannerCta(heroBanner.ctaUrl, onNavigate) : onNavigate('search')
                  }
                >
                  {heroBanner?.ctaLabel || 'Explorer les annonces'} <ArrowRight size={18} />
                </button>
                <button
                  className="hero-btn hero-btn-outline"
                  onClick={() =>
                    heroBanner?.secondaryCtaUrl
                      ? followBannerCta(heroBanner.secondaryCtaUrl, onNavigate)
                      : onNavigate('seller-post')
                  }
                >
                  {heroBanner?.secondaryCtaLabel || '+ Publier une annonce'}
                </button>
              </div>

              <div className="hero-stats hero-stats-standalone hero-stats-hide-mobile">
                {(heroBanner?.stats?.length ? heroBanner.stats : [
                  { value: '85 000+', label: 'Annonces Actives' },
                  { value: '42 000+', label: 'Vendeurs Vérifiés' },
                  { value: '24/7', label: 'Support Client' },
                ]).map(s => (
                  <div key={s.label} className="hero-stat-item">
                    <div className="hero-stat-value">{s.value}</div>
                    <div className="hero-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* "À la une" — its own section so it stays clearly visible no matter
          what's in the hero above; the BO can turn it off entirely (or
          retitle it) via the HOME_FEATURED slot. */}
      {featuredEnabled && highlighted.length > 0 && (
        <section className="featured-strip">
          <div className="featured-strip-inner">
            <div className="hero-boost-header">
              <span className="hero-boost-pill">
                <Zap size={13} fill="#0F172A" /> {featuredHeading?.title || 'À la une'}
              </span>
              <span className="hero-boost-note">{featuredHeading?.subtitle || 'Les annonces les plus populaires du moment'}</span>
              <span className="hero-boost-hint">Glissez pour voir plus <ChevronRight size={12} /></span>
            </div>

            <div
              className="hero-mosaic"
              ref={mosaicRef}
              onScroll={handleMosaicScroll}
              onTouchStart={pauseAutoplay}
            >
              {mosaicSlides.map((card, i) => (
                <HeroMosaicCard
                  key={i < loopCount ? card.id : `${card.id}-loop`}
                  card={card}
                  isMain={i === 0}
                  isFav={favorites.includes(card.id)}
                  animationDelay="0s"
                  onSelect={() => onSelectListing(card.id)}
                  onToggleFav={() => onToggleFavorite(card.id)}
                />
              ))}
            </div>

            {highlighted.length > 1 && (
              <div className="hero-mosaic-dots">
                {highlighted.map((card, i) => (
                  <button
                    key={card.id}
                    className={`hero-mosaic-dot${i === activeSlide ? ' active' : ''}`}
                    onClick={() => { pauseAutoplay(); scrollMosaicTo(i) }}
                    aria-label={`Aller à l'annonce ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Content Container */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '3rem 1rem 0' }}>

        {/* Recent Listings */}
        <section style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>Récemment Publiées</h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>Les dernières opportunités ajoutées à Abidjan & villes de Côte d'Ivoire</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <ViewToggle viewMode={homeViewMode} onChange={setHomeViewMode} />
              <button
                onClick={() => onNavigate('search')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.9rem' }}
              >
                Voir toutes les annonces <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {renderListingsContainer(recent)}
        </section>

        {/* Popular Categories Grid — placed after the recent listings on
            purpose: a visitor who scrolls this far hasn't found what they
            want yet, so offer category browsing as the next way to narrow
            it down rather than leading with it. */}
        <section style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>Catégories Populaires</h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>Les catégories les plus recherchées sur Yüpixi</p>
            </div>
            <button
              onClick={() => onNavigate('categories')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.9rem' }}
            >
              Voir tout le catalogue <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {popularCategories.map(cat => {
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategorySelect?.(cat.slug)}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    borderRadius: 'var(--radius)',
                    background: 'transparent',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    background: cat.color + '12',
                    padding: '1rem 0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = cat.color + '20' }}
                    onMouseLeave={e => { e.currentTarget.style.background = cat.color + '12' }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: cat.color + '20',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem',
                    }}>
                      {cat.icon}
                    </div>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.78rem', color: 'var(--fg)', textAlign: 'center', lineHeight: 1.15 }}>{cat.name}</span>
                    <span style={{ fontSize: '0.65rem', color: cat.color, fontWeight: 700 }}>{cat.subcategories.length} sous-catégories</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Trusted Partners Section — a BO-supplied creative replaces the
            whole card (it's typically a self-contained graphic with its
            own heading/icons/badges already baked in, same reasoning as
            the hero); otherwise the generated dark card below, still
            BO-editable via text fields. */}
        <section style={{ marginBottom: '3.5rem' }} className="desktop-only">
          {partnersBanner?.imageUrl ? (
            partnersBanner.ctaUrl ? (
              <button
                type="button"
                onClick={() => followBannerCta(partnersBanner.ctaUrl!, onNavigate)}
                style={{ display: 'block', width: '100%', border: 'none', padding: 0, cursor: 'pointer', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}
              >
                <img src={partnersBanner.imageUrl} alt={partnersBanner.title} style={{ width: '100%', display: 'block' }} />
              </button>
            ) : (
              <div style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                <img src={partnersBanner.imageUrl} alt={partnersBanner.title} style={{ width: '100%', display: 'block' }} />
              </div>
            )
          ) : (
            <div className="card" style={{
              background: 'linear-gradient(135deg, #090D16 0%, #121826 100%)',
              border: '2px solid #FE0000',
              borderRadius: 'var(--radius-xl)',
              padding: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '2.5rem',
              flexWrap: 'wrap',
              color: '#FFFFFF'
            }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'inline-flex', gap: 6, background: '#FFDD21', color: '#0F172A', padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 900, fontFamily: 'Outfit, sans-serif', marginBottom: '1rem' }}>
                  {partnersBanner?.subtitle || 'TRANSACTIONS DIRECTES ENTRE PARTICULIERS'}
                </div>
                <h3 style={{ color: '#FFFFFF', margin: '0 0 0.75rem', fontSize: '1.8rem', fontFamily: 'Outfit, sans-serif', fontWeight: 900 }}>
                  {partnersBanner?.title || 'Achetez et Vendez en Toute Confiance'}
                </h3>
                <p style={{ color: '#94A3B8', margin: '0 0 1.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {partnersBanner?.body ||
                    "Sur Yüpixi, vous échangez directement avec l'autre partie. Convenez ensemble des modalités et finalisez votre transaction en toute sérénité."}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 240, background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {[
                  { icon: ShieldCheck, text: 'Vendeurs Vérifiés avec Pièce d\'Identité' },
                  { icon: Zap, text: 'Confirmation SMS & Notification Instantanée' },
                  { icon: Tag, text: '0% de Commission sur vos 3 Premières Ventes' },
                ].map(item => (
                  <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
                    <div style={{ width: 34, height: 34, background: '#FE0000', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <item.icon size={18} color="#FFFFFF" />
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

      </div>

      {/* Trust Bar — desktop/tablet only (hidden below 768px in index.css);
          the certified-badge row crowds a small screen without adding much,
          and on desktop it reads better as reassurance right before the
          seller CTA than as the very first thing under the hero. */}
      <section className="trust-bar desktop-only">
        <div className="trust-bar-inner">
          {(trustBarBanners.length > 0
            ? trustBarBanners.map((b) => ({ key: b.id, icon: Award, text: b.title, desc: b.subtitle || '', image: b.imageUrl }))
            : [
                { key: 'verified', icon: ShieldCheck, text: 'Vendeurs Vérifiés avec Pièce ID', desc: 'Identité certifiée' },
                { key: 'direct', icon: CreditCard, text: 'Échanges Directs Entre Membres', desc: 'Vous gérez la transaction ensemble' },
                { key: 'reviews', icon: Star, text: 'Avis Clients Certifiés', desc: 'Recommandations vérifiées' },
                { key: 'support', icon: Award, text: "Support 7j/7 en Côte d'Ivoire", desc: 'Assistance dédiée' },
              ]
          ).map((item) => (
            <div key={item.key} className="trust-bar-item">
              <div className="trust-bar-icon">
                {'image' in item && item.image ? (
                  <img src={item.image} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                ) : (
                  <item.icon size={20} />
                )}
              </div>
              <div>
                <div className="trust-bar-text">{item.text}</div>
                <div className="trust-bar-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '3rem 1rem' }}>
        {/* CTA Seller Banner */}
        <section>
          <div
            className={sellerCtaBanner?.imageUrl ? undefined : 'pattern-yupixi'}
            style={{
              borderRadius: 'var(--radius-xl)',
              padding: '3rem 2rem',
              textAlign: 'center',
              position: 'relative',
              backgroundColor: sellerCtaBanner?.backgroundColor || undefined,
              backgroundImage: sellerCtaBanner?.imageUrl
                ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${sellerCtaBanner.imageUrl})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
              <div style={{ display: 'inline-flex', padding: 12, background: '#FFFFFF', borderRadius: 16, color: '#FE0000', marginBottom: '1rem' }}>
                <Store size={36} />
              </div>
              <h2 style={{ color: sellerCtaBanner?.textColor || '#FFFFFF', margin: '0 0 0.75rem', fontSize: '2rem', fontFamily: 'Outfit, sans-serif', fontWeight: 900 }}>
                {sellerCtaBanner?.title || 'Devenez Vendeur Certifié Yüpixi'}
              </h2>
              <p style={{ color: sellerCtaBanner?.textColor ? `${sellerCtaBanner.textColor}EB` : 'rgba(255,255,255,0.92)', margin: '0 0 1.75rem', fontSize: '1.05rem', lineHeight: 1.6 }}>
                {sellerCtaBanner?.subtitle || "Publiez gratuitement vos annonces et touchez plus de 1.2M d'acheteurs en Côte d'Ivoire."}
              </p>
              <button
                className="btn-secondary"
                style={{ fontSize: '1.05rem', padding: '0.85rem 2.25rem' }}
                onClick={() =>
                  sellerCtaBanner?.ctaUrl ? followBannerCta(sellerCtaBanner.ctaUrl, onNavigate) : onNavigate('seller-post')
                }
              >
                {sellerCtaBanner?.ctaLabel || 'Créer ma boutique gratuitement'} →
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
