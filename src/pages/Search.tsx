import { useState, useEffect } from 'react'
import { Search as SearchIcon, SlidersHorizontal, Grid, List, MapPin, Heart, Eye, Shield, ChevronDown, X, Star } from 'lucide-react'
import { listings, categories, formatPrice, cities } from '../data/mockData'
import BottomSheet from '../components/BottomSheet'

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

export default function SearchPage({ onNavigate, onSelectListing, favorites, onToggleFavorite, categoryFilter, onClearCategoryFilter, searchTerm: externalSearchTerm, onSearchTermChange, selectedCity: externalCity, onCityChange }: SearchProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [sortBy, setSortBy] = useState('recent')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [selectedCity, setSelectedCity] = useState(externalCity || '')
  const [selectedCategory, setSelectedCategory] = useState(categoryFilter || '')

  useEffect(() => { setSelectedCity(externalCity || '') }, [externalCity])
  const [condition, setCondition] = useState('')

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const filtered = listings.filter(l => {
    if (categoryFilter && l.category !== categoryFilter) return false
    if (selectedCity && l.city !== selectedCity) return false
    if (condition && l.condition !== condition) return false
    if (priceMin && l.price < Number(priceMin)) return false
    if (priceMax && l.price > Number(priceMax)) return false
    if (externalSearchTerm) {
      const q = externalSearchTerm.toLowerCase()
      const match = l.title.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        l.category.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price
    if (sortBy === 'price-desc') return b.price - a.price
    if (sortBy === 'popular') return b.views - a.views
    return 0
  })

  const activeFilters = [
    categoryFilter && categories.find(c => c.id === categoryFilter)?.name,
    selectedCity && selectedCity,
    condition && condition,
    (priceMin || priceMax) && `${priceMin || '0'} – ${priceMax || '∞'} FCFA`,
  ].filter(Boolean) as string[]

  const headerTitle = categoryFilter
    ? categories.find(c => c.id === categoryFilter)?.name || 'Annonces'
    : 'Toutes les annonces'

  const filterFields = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Category */}
      <div>
        <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 8 }}>Catégorie</label>
        <select className="input" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* City */}
      <div>
        <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 8 }}>Ville</label>
        <select className="input" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
          <option value="">Toutes villes</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Price range */}
      <div>
        <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 8 }}>Prix (FCFA)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} style={{ width: '50%' }} />
          <input className="input" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} style={{ width: '50%' }} />
        </div>
      </div>

      {/* Condition */}
      <div>
        <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 8 }}>État</label>
        {['Neuf', 'Comme neuf', 'Très bon état', 'Bon état', 'Passable'].map(c => (
          <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--fg)' }}>
            <input type="radio" name="condition" value={c} checked={condition === c} onChange={() => setCondition(c)} style={{ accentColor: 'var(--primary)' }} />
            {c}
          </label>
        ))}
      </div>

      {/* Options */}
      <div>
        <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 8 }}>Options</label>
        {['Négociable', 'Livraison possible', 'Vendeur vérifié', 'Annonces avec photos'].map(opt => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--fg)' }}>
            <input type="checkbox" style={{ accentColor: 'var(--primary)' }} />
            {opt}
          </label>
        ))}
      </div>

      {/* Seller rating */}
      <div>
        <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 8 }}>Note vendeur minimum</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3,4,5].map(r => (
            <button key={r} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <Star size={18} fill="#F59E0B" color="#F59E0B" />
            </button>
          ))}
        </div>
      </div>

      <button className="btn-primary" style={{ width: '100%', padding: '0.7rem', fontSize: '0.9rem' }} onClick={() => setFiltersOpen(false)}>
        Appliquer les filtres
      </button>
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
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', margin: '4px 0 0' }}>{sorted.length} résultat{sorted.length > 1 ? 's' : ''} trouvé{sorted.length > 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Sort */}
          <div style={{ position: 'relative' }}>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="input"
              style={{ width: 'auto', paddingRight: 32, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="recent">Plus récentes</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="popular">Plus populaires</option>
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
          <div style={{ display: 'flex', background: 'var(--border-subtle)', borderRadius: 8, padding: 3 }}>
            {[{ mode: 'grid', icon: Grid }, { mode: 'list', icon: List }].map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                style={{ padding: '5px 8px', border: 'none', borderRadius: 6, cursor: 'pointer', background: viewMode === mode ? 'var(--bg-card)' : 'transparent', color: viewMode === mode ? 'var(--primary)' : 'var(--fg-muted)', boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none' }}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
          {activeFilters.map(f => (
            <span key={f} className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {f}
              <X size={12} style={{ cursor: 'pointer' }} onClick={() => {
                if (f === selectedCity) setSelectedCity('')
                if (f === condition) setCondition('')
                if (categoryFilter && f === categories.find(c => c.id === categoryFilter)?.name) onClearCategoryFilter?.()
              }} />
            </span>
          ))}
          <button onClick={() => { setSelectedCity(''); setSelectedCategory(''); setCondition(''); setPriceMin(''); setPriceMax(''); onClearCategoryFilter?.() }}
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
                  {l.sponsored && <span className="badge badge-yellow" style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>Sponsorisé</span>}
                  <button
                    onClick={e => { e.stopPropagation(); onToggleFavorite(l.id) }}
                    style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Heart size={14} fill={favorites.includes(l.id) ? '#FE0000' : 'none'} color={favorites.includes(l.id) ? '#FE0000' : '#666'} />
                  </button>
                  <div style={{ height: 170, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                    <img src={l.image} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div style={{ padding: '12px 12px' }}>
                    <div className="price-tag" style={{ fontSize: '1rem' }}>{formatPrice(l.price)}</div>
                    <p style={{ margin: '4px 0 6px', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'Nunito, sans-serif', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>{l.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--fg-muted)', fontSize: '0.75rem' }}>
                      <MapPin size={11} />{l.location}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.72rem', color: 'var(--fg-subtle)' }}>
                      <span>{l.date}</span>
                      <span style={{ display: 'flex', gap: 6 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Eye size={11} />{l.views}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Heart size={11} />{l.favorites}</span>
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
                  className="card card-hover"
                  style={{ display: 'flex', gap: '1rem', cursor: 'pointer', overflow: 'hidden', padding: '1rem' }}
                  onClick={() => onSelectListing(l.id)}
                >
                  <div style={{ width: 150, height: 110, background: 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={l.image} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.95rem', margin: '0 0 4px' }}>{l.title}</h3>
                        <div className="price-tag">{formatPrice(l.price)}</div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); onToggleFavorite(l.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Heart size={18} fill={favorites.includes(l.id) ? '#FE0000' : 'none'} color={favorites.includes(l.id) ? '#FE0000' : '#999'} />
                      </button>
                    </div>
                    <p style={{ color: 'var(--fg-muted)', fontSize: '0.82rem', margin: '6px 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {l.description}
                    </p>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={12} />{l.location}, {l.city}</span>
                      <span>{l.date}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={12} />{l.views}</span>
                      {l.seller.verified && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#3B82F6' }}><Shield size={12} />Vérifié</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
