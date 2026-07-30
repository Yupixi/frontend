import { useState, useEffect } from 'react'
import { ArrowRight, Star, Zap, MapPin, Heart, Eye, Tag, ChevronRight, Award, Sparkles, CheckCircle, Store, ShieldCheck, CreditCard, Building2, Car, Smartphone, Shirt, Sofa, Briefcase, Wrench, Dumbbell, PawPrint, Sprout, Baby, Factory } from 'lucide-react'
import { listings, categories, formatPrice } from '../data/mockData'

type HomeProps = {
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
  onCategorySelect?: (categoryId: string) => void
}

// Synchronized Hero showcase items matching the animated rotating text
const heroShowcaseItems = [
  {
    id: 'l1',
    text: "un iPhone 15 Pro",
    title: "iPhone 15 Pro Max 256Go Titan Natural",
    category: "Électronique & Phones",
    price: "720 000 FCFA",
    location: "Abidjan, Cocody",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&h=450&fit=crop",
    sellerName: "Yao Telecom Pro",
    badge: "Populaire"
  },
  {
    id: 'l2',
    text: "une Villa à Cocody",
    title: "Superbe Villa Duplex 5 Pièces avec Piscine",
    category: "Immobilier",
    price: "185 000 000 FCFA",
    location: "Abidjan, Cocody Riviera 3",
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&h=450&fit=crop",
    sellerName: "Immo Luxe Abidjan",
    badge: "Haut Standing"
  },
  {
    id: 'l3',
    text: "une Toyota Hilux",
    title: "Toyota Hilux Revo 4x4 Double Cabine 2023",
    category: "Véhicules",
    price: "24 500 000 FCFA",
    location: "Abidjan, Marcory",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&h=450&fit=crop",
    sellerName: "Auto Prestige CI",
    badge: "Certifié 4x4"
  },
  {
    id: 'l4',
    text: "des Baskets de Marque",
    title: "Nike Air Force 1 '07 Edition Limitée Neuf",
    category: "Mode & Beauté",
    price: "45 000 FCFA",
    location: "Abidjan, Yopougon",
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=450&fit=crop",
    sellerName: "Koffi Sneakers Shop",
    badge: "Offre Flash"
  },
  {
    id: 'l5',
    text: "un Appartement Meublé",
    title: "Appartement Meublé 3 Pièces Haut Standing",
    category: "Immobilier",
    price: "450 000 FCFA / mois",
    location: "Abidjan, Zone 4",
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=450&fit=crop",
    sellerName: "Residence Serenite",
    badge: "Meublé Luxe"
  },
]

function ListingCard({ listing, onSelect, onToggleFav, isFav }: {
  listing: typeof listings[0], onSelect: () => void, onToggleFav: () => void, isFav: boolean
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="card card-hover" style={{ overflow: 'hidden', cursor: 'pointer', position: 'relative', background: 'var(--bg-card)' }} onClick={onSelect}>

      {/* Badges Overlay */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {listing.sponsored && (
          <span className="badge badge-yellow">
            <Sparkles size={11} /> Sponsorisé
          </span>
        )}
        {listing.negotiable && (
          <span className="badge badge-red" style={{ background: '#FE0000', color: '#FFF' }}>
            Négociable
          </span>
        )}
      </div>

      {/* Heart Favorite Button */}
      <button
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
      <div style={{ height: 190, background: 'var(--border-subtle)', overflow: 'hidden', position: 'relative' }}>
        {!imgError ? (
          <img
            src={listing.image}
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
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="price-tag">{formatPrice(listing.price)}</div>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
          <MapPin size={13} style={{ color: 'var(--primary)' }} />
          <span>{listing.location}, {listing.city}</span>
        </div>

        {/* Card Footer Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {listing.seller.verified ? (
              <span className="badge badge-blue" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                <ShieldCheck size={12} style={{ color: '#00A3E0' }} /> Vendeur Vérifié
              </span>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)' }}>{listing.date}</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem', color: 'var(--fg-subtle)', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Eye size={13} />{listing.views}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Heart size={13} />{listing.favorites}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Home({ onNavigate, onSelectListing, favorites, onToggleFavorite }: HomeProps) {
  const featured = listings.filter(l => l.sponsored)
  const recent = listings.slice(0, 8)

  const [idx, setIdx] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (isHovered) return // Pause auto-rotation when user hovers over the 3D fan cards
    const timer = setInterval(() => {
      setIdx(prev => (prev + 1) % heroShowcaseItems.length)
    }, 2800)
    return () => clearInterval(timer)
  }, [isHovered])

  const currentShowcase = heroShowcaseItems[idx]

  // Indices for 3D Fan Stack (Active item + 2 stacked items behind)
  const nextIdx1 = (idx + 1) % heroShowcaseItems.length
  const nextIdx2 = (idx + 2) % heroShowcaseItems.length

  const stackCards = [
    { item: heroShowcaseItems[idx], realIdx: idx, position: 'front' },
    { item: heroShowcaseItems[nextIdx1], realIdx: nextIdx1, position: 'middle' },
    { item: heroShowcaseItems[nextIdx2], realIdx: nextIdx2, position: 'back' },
  ]

  return (
    <div>

      {/* Official Yüpixi Hero Section with 3D FAN STACKED CARDS */}
      <section className="pattern-yupixi" style={{
        padding: '3.5rem 1rem 4rem',
        position: 'relative',
        color: '#FFFFFF',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'center'
          }}>

            {/* Left Column: Headline & Controls */}
            <div>
              {/* Official Tagline */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#FFDD21',
                color: '#0F172A',
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: '0.85rem',
                fontWeight: 900,
                fontFamily: "'Outfit', sans-serif",
                marginBottom: '1.25rem',
                border: '1px solid rgba(255, 221, 33, 0.9)'
              }}>
                <CheckCircle size={14} style={{ color: '#FE0000' }} />
                <span>Trouver ce que l'on cherche se fait toujours avec le sourire !</span>
              </div>

              {/* Headline with ANIMATED ROTATING TEXT */}
              <h1 style={{
                color: '#FFFFFF',
                fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)',
                margin: '0 0 1.25rem',
                lineHeight: 1.15,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 900,
                letterSpacing: '-0.03em',
              }}>
                Trouvez & Achetez{' '}
                <span key={idx} className="animated-word">
                  {currentShowcase.text}
                </span>{' '}
                en Côte d'Ivoire
              </h1>

              <p style={{
                color: 'rgba(255,255,255,0.92)',
                fontSize: '1.15rem',
                margin: '0 0 2.25rem',
                lineHeight: 1.6,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600
              }}>
                Parcourez les meilleures annonces certifiées et payez en toute sécurité par Wave, Orange Money ou MTN MoMo.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '1rem', padding: '0.85rem 2rem' }}
                  onClick={() => onNavigate('search')}
                >
                  Parcourir les annonces <ArrowRight size={18} />
                </button>

                <button
                  className="btn-outline"
                  style={{ border: '2px solid #FFFFFF', color: '#FFFFFF', fontSize: '1rem', padding: '0.85rem 2rem', background: 'rgba(255,255,255,0.08)' }}
                  onClick={() => onNavigate('seller-post')}
                >
                  + Publier une annonce
                </button>
              </div>

              {/* Key Platform Stats Counter */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: '0.75rem',
                background: 'rgba(0,0,0,0.25)',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                {[
                  { value: '85 000+', label: 'Annonces Actives' },
                  { value: '42 000+', label: 'Vendeurs Vérifiés' },
                  { value: '100% Sécurisé', label: 'Wave & Orange' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ color: '#FFDD21', fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.3rem' }}>{s.value}</div>
                    <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.775rem', marginTop: 2, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: 3D FAN STACKED PRODUCT CARDS (ÉVENTAIL D'ILLUSTRATIONS ANIMÉ AU SURVOL) */}
            <div
              style={{
                display: 'flex',
                justify: 'center',
                alignItems: 'center',
                minHeight: 440,
                position: 'relative',
                userSelect: 'none'
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Stacked Fan Container */}
              <div style={{ position: 'relative', width: 340, height: 420 }}>
                {stackCards.map((cardObj, i) => {
                  const card = cardObj.item
                  const isFront = i === 0
                  const isMiddle = i === 1
                  const isBack = i === 2

                  // Fan Transform calculations on normal vs hover state
                  let transformStyle = ''
                  let zIndexValue = 1
                  let opacityValue = 1

                  if (isFront) {
                    zIndexValue = 10
                    opacityValue = 1
                    transformStyle = isHovered
                      ? 'rotate(-6deg) translateX(-35px) translateY(-10px) scale(1.02)'
                      : 'rotate(0deg) translateX(0) translateY(0) scale(1)'
                  } else if (isMiddle) {
                    zIndexValue = 5
                    opacityValue = 0.95
                    transformStyle = isHovered
                      ? 'rotate(10deg) translateX(55px) translateY(12px) scale(0.98)'
                      : 'rotate(5deg) translateX(20px) translateY(-10px) scale(0.95)'
                  } else if (isBack) {
                    zIndexValue = 2
                    opacityValue = 0.88
                    transformStyle = isHovered
                      ? 'rotate(-16deg) translateX(-95px) translateY(25px) scale(0.92)'
                      : 'rotate(-6deg) translateX(-20px) translateY(-18px) scale(0.9)'
                  }

                  return (
                    <div
                      key={card.id + '_' + i}
                      onClick={() => {
                        setIdx(cardObj.realIdx)
                        onSelectListing(card.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        background: '#FFFFFF',
                        color: '#0F172A',
                        borderRadius: 'var(--radius-lg)',
                        border: isFront ? '3px solid #FFDD21' : '2px solid #E2E8F0',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transform: transformStyle,
                        zIndex: zIndexValue,
                        opacity: opacityValue,
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      {/* Card Image */}
                      <div style={{ height: 230, position: 'relative', overflow: 'hidden', background: '#F1F5F9' }}>
                        <img
                          src={card.image}
                          alt={card.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          background: '#FFDD21',
                          color: '#0F172A',
                          fontFamily: "'Outfit', sans-serif",
                          fontWeight: 900,
                          fontSize: '0.725rem',
                          padding: '3px 10px',
                          borderRadius: 999,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Sparkles size={11} style={{ color: '#FE0000' }} />
                          {card.category}
                        </div>

                        <div style={{
                          position: 'absolute',
                          bottom: 10,
                          right: 10,
                          background: '#FE0000',
                          color: '#FFFFFF',
                          fontFamily: "'Outfit', sans-serif",
                          fontWeight: 900,
                          fontSize: '0.725rem',
                          padding: '3px 10px',
                          borderRadius: 8
                        }}>
                          {card.badge}
                        </div>
                      </div>

                      {/* Card Info Body */}
                      <div style={{ padding: '1rem 1.15rem' }}>
                        <div style={{
                          color: '#FE0000',
                          fontFamily: "'Outfit', sans-serif",
                          fontWeight: 900,
                          fontSize: '1.3rem',
                          marginBottom: 2
                        }}>
                          {card.price}
                        </div>

                        <h3 style={{
                          margin: '0 0 8px',
                          fontSize: '0.95rem',
                          fontWeight: 800,
                          fontFamily: "'Outfit', sans-serif",
                          color: '#0F172A',
                          lineHeight: 1.25,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {card.title}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.775rem', color: '#64748B', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={13} style={{ color: '#FE0000' }} />
                            <span>{card.location}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#00A3E0', fontWeight: 800 }}>
                            <ShieldCheck size={13} />
                            <span>Vendeur Certifié</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Guarantee Bar */}
      <section style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '1.25rem 1rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { icon: ShieldCheck, text: 'Vendeurs Vérifiés avec Pièce ID' },
            { icon: CreditCard, text: 'Paiement Wave & Orange Money' },
            { icon: Star, text: 'Avis Clients Certifiés' },
            { icon: Award, text: 'Support 7j/7 en Côte d\'Ivoire' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--fg)', fontSize: '0.9rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(254,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <item.icon size={18} color="#FE0000" />
              </div>
              {item.text}
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
                enfants: Baby, 'materiel-pro': Factory,
              }
              const IconComp = iconMap[cat.id] || Building2
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategorySelect?.(cat.id)}
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
                    <span style={{ fontSize: '0.65rem', color: cat.color, fontWeight: 700 }}>{cat.count.toLocaleString('fr')}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Featured Sponsored Section */}
        <section style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 className="section-title" style={{ margin: 0 }}>Annonces en Vedette</h2>
              <span className="badge badge-yellow" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                <Sparkles size={13} /> Sponsorisées
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {featured.map(l => (
              <ListingCard
                key={l.id}
                listing={l}
                onSelect={() => onSelectListing(l.id)}
                onToggleFav={() => onToggleFavorite(l.id)}
                isFav={favorites.includes(l.id)}
              />
            ))}
          </div>
        </section>

        {/* Recent Listings */}
        <section style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 className="section-title" style={{ margin: 0 }}>Récemment Publiées</h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: '4px 0 0' }}>Les dernières opportunités ajoutées à Abidjan & villes de Côte d'Ivoire</p>
            </div>
            <button
              onClick={() => onNavigate('search')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.9rem' }}
            >
              Voir toutes les annonces <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {recent.map(l => (
              <ListingCard
                key={l.id}
                listing={l}
                onSelect={() => onSelectListing(l.id)}
                onToggleFav={() => onToggleFavorite(l.id)}
                isFav={favorites.includes(l.id)}
              />
            ))}
          </div>
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
