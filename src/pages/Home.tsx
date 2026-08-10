import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { ArrowRight, Star, Zap, MapPin, Heart, Eye, Tag, ChevronRight, Award, Sparkles, Store, ShieldCheck, CreditCard, Building2, Car, Smartphone, Shirt, Sofa, Briefcase, Wrench, Dumbbell, PawPrint, Sprout, Baby, Factory, Package } from 'lucide-react'
import { formatPrice } from '../data/mockData'
import ViewToggle from '../components/ViewToggle'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'
import { LISTINGS_QUERY, type RemoteListing } from '../graphql/listings'
import { formatRelativeDate } from '../lib/format'

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
          <div className="price-tag">{listing.price != null ? formatPrice(listing.price) : 'Prix sur demande'}</div>
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
            <div className="price-tag">{listing.price != null ? formatPrice(listing.price) : 'Prix sur demande'}</div>
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

export default function Home({ onNavigate, onSelectListing, favorites, onToggleFavorite, onCategorySelect }: HomeProps) {
  const [homeViewMode, setHomeViewMode] = useState<'grid' | 'list'>('grid')
  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const categories = categoriesData?.categories ?? []

  const { data: listingsData } = useQuery<{ listings: { items: RemoteListing[] } }>(LISTINGS_QUERY, {
    variables: { sort: 'RECENT', page: 1, pageSize: 12 },
  })
  const recent = listingsData?.listings.items ?? []
  // "À la une" = most-favorited of the recent batch — an honest stand-in until
  // paid Boost placements exist (Sprint 2+, see PromotionsModule).
  const highlighted = [...recent].sort((a, b) => b.favoritesCount - a.favoritesCount).slice(0, 4)

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



  return (
    <div>

      {/* Premium Hero Section — Two-Column with Floating Card Mosaic */}
      <section className="hero-premium" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Subtle gradient overlay */}
        <div className="hero-premium-glow" />

        <div className="hero-premium-inner">
          <div className="hero-grid">

            {/* === Left Column: Text, CTA, Stats === */}
            <div className="hero-left">
              <div className="hero-badge">
                <Sparkles size={14} />
                La marketplace nouvelle génération
              </div>

              <h1 className="hero-title">
                Trouvez, <span className="hero-title-accent">Achetez</span> & Vendez<br />
                en Côte d'Ivoire
              </h1>

              <p className="hero-subtitle">
                La plus grande plateforme de petites annonces certifiées en Côte d'Ivoire.
                Parcourez des milliers d'offres et payez en toute sécurité par Mobile Money.
              </p>

              <div className="hero-buttons">
                <button className="hero-btn hero-btn-primary" onClick={() => onNavigate('search')}>
                  Explorer les annonces <ArrowRight size={18} />
                </button>
                <button className="hero-btn hero-btn-outline" onClick={() => onNavigate('seller-post')}>
                  + Publier une annonce
                </button>
              </div>

              {/* Stats */}
              <div className="hero-stats">
                {[
                  { value: '85 000+', label: 'Annonces Actives' },
                  { value: '42 000+', label: 'Vendeurs Vérifiés' },
                  { value: '100%', label: 'Paiement Sécurisé' },
                ].map(s => (
                  <div key={s.label} className="hero-stat-item">
                    <div className="hero-stat-value">{s.value}</div>
                    <div className="hero-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* === Right Column: À la une (most-favorited recent listings) === */}
            <div className="hero-right">
              <div className="hero-boost-header">
                <span className="hero-boost-pill">
                  <Zap size={13} fill="#0F172A" /> À la une
                </span>
                <span className="hero-boost-note">Les annonces les plus populaires du moment</span>
                <span className="hero-boost-hint">Glissez pour voir plus <ChevronRight size={12} /></span>
              </div>

              <div className="hero-mosaic">
                {highlighted.map((card, i) => {
                  const isMain = i === 0
                  const isFav = favorites.includes(card.id)
                  return (
                    <div
                      key={card.id}
                      className={`hero-mosaic-card${isMain ? ' hero-mosaic-card-main' : ''}`}
                      style={{ animationDelay: `${i * 0.15}s` }}
                      onClick={() => onSelectListing(card.id)}
                    >
                      <div className="hero-mosaic-img-wrap">
                        <img src={listingImage(card)} alt={card.title} className="hero-mosaic-img" />
                        {/* Gradient overlay at bottom */}
                        <div className="hero-mosaic-overlay" />

                        {/* Category badge */}
                        <div className="hero-mosaic-category">
                          {card.category.name}
                        </div>

                        {/* Price */}
                        <div className={`hero-mosaic-price${isMain ? ' hero-mosaic-price-lg' : ''}`}>
                          {card.price != null ? formatPrice(card.price) : 'Prix sur demande'}
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
                        onClick={e => { e.stopPropagation(); onToggleFavorite(card.id) }}
                        style={{ color: isFav ? 'var(--primary)' : 'var(--fg-subtle)' }}
                      >
                        <Heart size={isMain ? 16 : 12} fill={isFav ? 'var(--primary)' : 'none'} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="trust-bar">
        <div className="trust-bar-inner">
          {[
            { icon: ShieldCheck, text: 'Vendeurs Vérifiés avec Pièce ID', desc: 'Identité certifiée' },
            { icon: CreditCard, text: 'Paiement Wave & Orange Money', desc: 'Transaction sécurisée' },
            { icon: Star, text: 'Avis Clients Certifiés', desc: 'Recommandations vérifiées' },
            { icon: Award, text: 'Support 7j/7 en Côte d\'Ivoire', desc: 'Assistance dédiée' },
          ].map((item, i) => (
            <div key={item.text} className="trust-bar-item">
              <div className="trust-bar-icon">
                <item.icon size={20} />
              </div>
              <div>
                <div className="trust-bar-text">{item.text}</div>
                <div className="trust-bar-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Content Container */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '3rem 1rem' }}>

        {/* Popular Categories Grid */}
        <section style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>Catégories Populaires</h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>Explorez le catalogue Yüpixi en Côte d'Ivoire</p>
            </div>
            <button
              onClick={() => onNavigate('categories')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.9rem' }}
            >
              Voir tout le catalogue <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {categories.map(cat => {
              const iconMap: Record<string, typeof Building2> = {
                immobilier: Building2, vehicules: Car, electronique: Smartphone,
                mode: Shirt, maison: Sofa, emploi: Briefcase, services: Wrench,
                loisirs: Dumbbell, animaux: PawPrint, agriculture: Sprout,
                famille: Baby, 'materiel-pro': Factory, divers: Package,
              }
              const IconComp = iconMap[cat.slug] || Building2
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
                      color: cat.color,
                    }}>
                      <IconComp size={20} />
                    </div>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.78rem', color: 'var(--fg)', textAlign: 'center', lineHeight: 1.15 }}>{cat.name}</span>
                    <span style={{ fontSize: '0.65rem', color: cat.color, fontWeight: 700 }}>{cat.subcategories.length} sous-catégories</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

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

        {/* Mobile Money Safety Section */}
        <section style={{ marginBottom: '3.5rem' }}>
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
                PAIEMENT MOBILE MONEY 100% SÉCURISÉ
              </div>
              <h3 style={{ color: '#FFFFFF', margin: '0 0 0.75rem', fontSize: '1.8rem', fontFamily: 'Outfit, sans-serif', fontWeight: 900 }}>
                Achetez et Vendez avec Wave, Orange Money & MTN MoMo
              </h3>
              <p style={{ color: '#94A3B8', margin: '0 0 1.5rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                Sur Yüpixi, les transactions sont protégées. Réservez les articles de vos vendeurs préférés via transfert direct sécurisé.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="badge badge-yellow" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>Orange Money</span>
                <span className="badge badge-blue" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>Wave CI</span>
                <span className="badge badge-yellow" style={{ background: '#FFCC00', color: '#000', fontSize: '0.85rem', padding: '6px 14px' }}>MTN MoMo</span>
              </div>
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
        </section>

        {/* CTA Seller Banner */}
        <section>
          <div className="pattern-yupixi" style={{
            borderRadius: 'var(--radius-xl)',
            padding: '3rem 2rem',
            textAlign: 'center',
            position: 'relative',
          }}>
            <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
              <div style={{ display: 'inline-flex', padding: 12, background: '#FFFFFF', borderRadius: 16, color: '#FE0000', marginBottom: '1rem' }}>
                <Store size={36} />
              </div>
              <h2 style={{ color: '#FFFFFF', margin: '0 0 0.75rem', fontSize: '2rem', fontFamily: 'Outfit, sans-serif', fontWeight: 900 }}>
                Devenez Vendeur Certifié Yüpixi
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.92)', margin: '0 0 1.75rem', fontSize: '1.05rem', lineHeight: 1.6 }}>
                Publiez gratuitement vos annonces et touchez plus de 1.2M d'acheteurs en Côte d'Ivoire.
              </p>
              <button
                className="btn-secondary"
                style={{ fontSize: '1.05rem', padding: '0.85rem 2.25rem' }}
                onClick={() => onNavigate('seller-post')}
              >
                Créer ma boutique gratuitement →
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
