import { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client/react'
import { Search as SearchIcon, SlidersHorizontal, MapPin, Heart, Eye, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatPrice, cities } from '../data/mockData'
import BottomSheet from '../components/BottomSheet'
import ViewToggle from '../components/ViewToggle'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'
import { LISTINGS_QUERY, type RemoteListing, type ListingSort } from '../graphql/listings'
import { formatRelativeDate } from '../lib/format'

const PAGE_SIZE = 20

type SearchProps = {
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  categoryFilter?: string
  onClearCategoryFilter?: () => void
  searchTerm?: string
  onSearchTermChange?: (term: string) => void
  selectedCity?: string
  onCityChange?: (city: string) => void
}

function listingLocation(listing: RemoteListing): string {
  return listing.locationLabel ? `${listing.locationLabel}, ${listing.city}` : listing.city
}

function listingImage(listing: RemoteListing): string {
  return listing.coverImageUrl ?? listing.media[0]?.url ?? ''
}

export default function SearchPage({ onSelectListing, favorites, onToggleFavorite, categoryFilter, onClearCategoryFilter, searchTerm: externalSearchTerm, onSearchTermChange, selectedCity: externalCity }: SearchProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc'>('recent')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [selectedCity, setSelectedCity] = useState(externalCity || '')
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter || '')
  const [condition, setCondition] = useState('')
  const [negotiable, setNegotiable] = useState(false)
  const [delivery, setDelivery] = useState(false)
  const [hasPhotos, setHasPhotos] = useState(false)
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState(externalSearchTerm || '')

  useEffect(() => { setSelectedCity(externalCity || '') }, [externalCity])
  useEffect(() => { setSelectedCategory(categoryFilter || '') }, [categoryFilter])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(externalSearchTerm || ''), 300)
    return () => clearTimeout(t)
  }, [externalSearchTerm])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, selectedCategory, selectedCity, condition, priceMin, priceMax, sortBy])

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const clearFilter = (key: string) => {
    if (key === 'category') { setSelectedCategory(''); onClearCategoryFilter?.() }
    if (key === 'city') setSelectedCity('')
    if (key === 'condition') setCondition('')
    if (key === 'price') { setPriceMin(''); setPriceMax('') }
    if (key === 'negotiable') setNegotiable(false)
    if (key === 'delivery') setDelivery(false)
    if (key === 'photos') setHasPhotos(false)
  }

  const resetAll = () => {
    setSelectedCity(''); setSelectedCategory(''); setCondition('')
    setPriceMin(''); setPriceMax('')
    setNegotiable(false); setDelivery(false); setHasPhotos(false)
    onClearCategoryFilter?.()
  }

  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const categories = categoriesData?.categories ?? []

  const sortMap: Record<typeof sortBy, ListingSort> = {
    recent: 'RECENT', 'price-asc': 'PRICE_ASC', 'price-desc': 'PRICE_DESC',
  }

  const filter = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(selectedCategory ? { categorySlug: selectedCategory } : {}),
    ...(selectedCity ? { city: selectedCity } : {}),
    ...(condition ? { condition } : {}),
    ...(priceMin ? { minPrice: Number(priceMin) } : {}),
    ...(priceMax ? { maxPrice: Number(priceMax) } : {}),
  }

  const { data, loading } = useQuery<{
    listings: { items: RemoteListing[]; totalCount: number; page: number; totalPages: number }
  }>(LISTINGS_QUERY, {
    variables: { filter, sort: sortMap[sortBy], page, pageSize: PAGE_SIZE },
  })

  const items = data?.listings.items ?? []
  const sorted = items.filter(l => {
    if (negotiable && !l.negotiable) return false
    if (delivery && !l.deliveryAvailable) return false
    if (hasPhotos && l.media.length === 0) return false
    return true
  })

  const activeCategoryName = categories.find(c => c.slug === (selectedCategory || categoryFilter))?.name
  const activeFilters = [
    { key: 'category', label: activeCategoryName || '' },
    { key: 'city', label: selectedCity },
    { key: 'condition', label: condition },
    { key: 'price', label: (priceMin || priceMax) ? `${priceMin || '0'} – ${priceMax || '∞'} FCFA` : '' },
    { key: 'negotiable', label: negotiable ? 'Négociable' : '' },
    { key: 'delivery', label: delivery ? 'Livraison possible' : '' },
    { key: 'photos', label: hasPhotos ? 'Avec photos' : '' },
  ].filter(f => f.label) as { key: string; label: string }[]

  const headerTitle = (selectedCategory || categoryFilter)
    ? activeCategoryName || 'Annonces'
    : 'Toutes les annonces'

  const filterFields = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Prix */}
      <div>
        <p className="filter-label">Prix (FCFA)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="input" type="number" min={0} step={500} placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
          <input className="input" type="number" min={0} step={500} placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
        </div>
      </div>

      {/* Catégorie + Ville */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <p className="filter-label">Catégorie</p>
          <select className="input" value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); if (e.target.value !== categoryFilter) onClearCategoryFilter?.() }}>
            <option value="">Toutes</option>
            {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <p className="filter-label">Ville</p>
          <select className="input" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
            <option value="">Toutes</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* État */}
      <div>
        <p className="filter-label">État</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['Neuf', 'Comme neuf', 'Très bon état', 'Bon état', 'Passable'].map(c => (
            <button key={c} className={`filter-chip${condition === c ? ' active' : ''}`} onClick={() => setCondition(condition === c ? '' : c)}>{c}</button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div>
        <p className="filter-label">Options</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className={`filter-chip${negotiable ? ' active' : ''}`} onClick={() => setNegotiable(!negotiable)}>Négociable</button>
          <button className={`filter-chip${delivery ? ' active' : ''}`} onClick={() => setDelivery(!delivery)}>Livraison possible</button>
          <button className={`filter-chip${hasPhotos ? ' active' : ''}`} onClick={() => setHasPhotos(!hasPhotos)}>Avec photos</button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
        <button className="btn-outline" style={{ flex: 1, fontSize: '0.9rem', padding: '0.7rem' }} onClick={resetAll}>
          Réinitialiser
        </button>
        <button className="btn-primary" style={{ flex: 1.4, fontSize: '0.9rem', padding: '0.7rem' }} onClick={() => setFiltersOpen(false)}>
          Voir les résultats
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Search input */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <SearchIcon size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
          <input
            className="input"
            style={{ paddingLeft: 42, width: '100%' }}
            placeholder="Rechercher dans les annonces..."
            value={externalSearchTerm || ''}
            onChange={e => onSearchTermChange?.(e.target.value)}
          />
        </div>
      </div>

      {/* Results header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>
            {headerTitle}
          </h1>
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', margin: '4px 0 0' }}>
            {loading ? 'Recherche...' : `${data?.listings.totalCount ?? 0} résultat${(data?.listings.totalCount ?? 0) > 1 ? 's' : ''} trouvé${(data?.listings.totalCount ?? 0) > 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sort */}
          <div style={{ position: 'relative' }}>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="input"
              style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="recent">Plus récentes</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)', pointerEvents: 'none' }} />
          </div>

          {/* Filter button */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}
          >
            <SlidersHorizontal size={16} />
            Filtres
            {activeFilters.length > 0 && (
              <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>
                {activeFilters.length}
              </span>
            )}
          </button>

          {/* View mode */}
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
          {activeFilters.map(f => (
            <span key={f.key} className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {f.label}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => clearFilter(f.key)} />
            </span>
          ))}
          <button onClick={resetAll}
            style={{ color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
            Tout effacer
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* Filters sidebar (desktop) / bottom sheet (mobile) */}
        {isMobile ? (
          <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtrer les résultats">
            {filterFields}
          </BottomSheet>
        ) : (
          filtersOpen && (
            <aside className="card" style={{ width: 260, flexShrink: 0, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: 0, fontSize: '1rem' }}>Filtrer les résultats</h3>
                <button onClick={() => setFiltersOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={16} /></button>
              </div>
              {filterFields}
            </aside>
          )
        )}

        {/* Results */}
        <div style={{ flex: 1 }}>
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {sorted.map(l => (
                <div
                  key={l.id}
                  className="card card-hover"
                  style={{ overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                  onClick={() => onSelectListing(l.id)}
                >
                  <button
                    onClick={e => { e.stopPropagation(); onToggleFavorite(l.id) }}
                    style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Heart size={14} fill={favorites.includes(l.id) ? '#FE0000' : 'none'} color={favorites.includes(l.id) ? '#FE0000' : '#666'} />
                  </button>
                  <div style={{ height: 170, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                    <img src={listingImage(l)} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div style={{ padding: '12px 12px' }}>
                    <div className="price-tag" style={{ fontSize: '1rem' }}>{l.price != null ? formatPrice(l.price) : 'Prix sur demande'}</div>
                    <p style={{ margin: '4px 0 6px', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'Nunito, sans-serif', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>{l.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--fg-muted)', fontSize: '0.75rem' }}>
                      <MapPin size={11} />{listingLocation(l)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.72rem', color: 'var(--fg-subtle)' }}>
                      <span>{formatRelativeDate(l.publishedAt ?? l.createdAt)}</span>
                      <span style={{ display: 'flex', gap: 6 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Eye size={11} />{l.viewsCount}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Heart size={11} />{l.favoritesCount}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sorted.map(l => (
                <div
                  key={l.id}
                  className="card card-hover listing-list-card"
                  onClick={() => onSelectListing(l.id)}
                >
                  <div className="listing-list-thumb">
                    <img src={listingImage(l)} alt={l.title}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 className="listing-list-title">{l.title}</h3>
                        <div className="price-tag">{l.price != null ? formatPrice(l.price) : 'Prix sur demande'}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); onToggleFavorite(l.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                        <Heart size={18} fill={favorites.includes(l.id) ? '#FE0000' : 'none'} color={favorites.includes(l.id) ? '#FE0000' : '#999'} />
                      </button>
                    </div>
                    <p className="listing-list-desc">{l.description}</p>
                    <div className="listing-list-meta">
                      <span><MapPin size={12} />{listingLocation(l)}</span>
                      <span>{formatRelativeDate(l.publishedAt ?? l.createdAt)}</span>
                      <span><Eye size={12} />{l.viewsCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--fg-muted)' }}>
              Aucune annonce ne correspond à votre recherche.
            </div>
          )}

          {data && data.listings.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: '2rem' }}>
              <button
                className="btn-outline"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.5rem 0.9rem', opacity: page <= 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={16} /> Précédent
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--fg-muted)' }}>
                Page {data.listings.page} / {data.listings.totalPages}
              </span>
              <button
                className="btn-outline"
                disabled={page >= data.listings.totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.5rem 0.9rem', opacity: page >= data.listings.totalPages ? 0.5 : 1 }}
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
