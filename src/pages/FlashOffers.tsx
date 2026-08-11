import { useState, useEffect } from 'react'
import { Zap, Clock, Heart, MapPin, Eye, Tag, Sparkles, Flame, ArrowRight } from 'lucide-react'
import { listings } from '../data/mockData'
import Price from '../components/Price'

type FlashOffersProps = {
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
}

export default function FlashOffers({ onNavigate, onSelectListing, favorites, onToggleFavorite }: FlashOffersProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        return { hours: 23, minutes: 59, seconds: 59 }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const flashListings = listings.filter(l => l.sponsored)

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
        borderRadius: 'var(--radius)',
        padding: '2.5rem 2rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,221,33,0.15)',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(254,0,0,0.08)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,221,33,0.06)', filter: 'blur(40px)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ background: '#FE0000', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={24} color="#FFDD21" fill="#FFDD21" />
              </div>
              <div>
                <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.8rem', color: '#FFDD21', margin: 0, letterSpacing: '0.02em' }}>
                  Offres Flash
                </h1>
                <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: '2px 0 0' }}>
                  Offres limitées · Prix exceptionnels · Stock épuisable
                </p>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Clock size={18} color="#FFDD21" />
            {['heures', 'minutes', 'secondes'].map((label, i) => {
              const val = [timeLeft.hours, timeLeft.minutes, timeLeft.seconds][i]
              return (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '6px 10px',
                    minWidth: 40,
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 900,
                    fontSize: '1.2rem',
                    color: '#FFDD21',
                  }}>
                    {String(val).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: 4, fontWeight: 700 }}>{label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Flash Deals Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={20} color="#FE0000" fill="#FE0000" />
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.3rem', margin: 0 }}>
            {flashListings.length === 0 ? 'Aucune offre flash pour le moment' : `🔥 ${flashListings.length} offres disponibles`}
          </h2>
        </div>

        {flashListings.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <Zap size={48} style={{ color: 'var(--fg-subtle)', marginBottom: 12 }} />
            <p style={{ color: 'var(--fg-muted)', fontSize: '1rem' }}>
              Revenez bientôt pour découvrir nos offres flash exclusives&nbsp;!
            </p>
            <button onClick={() => onNavigate('home')} className="btn-primary" style={{ marginTop: 12, padding: '0.7rem 1.5rem' }}>
              Retour à l'accueil
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {flashListings.map(l => (
              <div
                key={l.id}
                className="card card-hover"
                style={{ overflow: 'hidden', cursor: 'pointer', position: 'relative', border: '1.5px solid rgba(255,221,33,0.3)' }}
                onClick={() => onSelectListing(l.id)}
              >
                {/* Flash badge */}
                <div style={{
                  position: 'absolute', top: 10, left: 10, zIndex: 2,
                  background: '#FE0000', borderRadius: 6,
                  padding: '3px 10px',
                  display: 'flex', alignItems: 'center', gap: 4,
                  boxShadow: '0 2px 8px rgba(254,0,0,0.3)',
                }}>
                  <Zap size={12} color="#FFDD21" fill="#FFDD21" />
                  <span style={{ color: '#FFDD21', fontWeight: 900, fontSize: '0.72rem', fontFamily: 'Outfit, sans-serif' }}>OFFRE FLASH</span>
                </div>

                {/* Promo ribbon */}
                <div style={{
                  position: 'absolute', top: 10, right: 10, zIndex: 2,
                  background: '#FFDD21', borderRadius: 6,
                  padding: '3px 8px', fontSize: '0.7rem',
                  fontWeight: 900, fontFamily: 'Outfit, sans-serif',
                  color: '#0F172A',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <Tag size={11} />
                  -{Math.floor(Math.random() * 30 + 10)}%
                </div>

                <button
                  onClick={e => { e.stopPropagation(); onToggleFavorite(l.id) }}
                  style={{ position: 'absolute', top: 46, right: 10, zIndex: 2, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Heart size={13} fill={favorites.includes(l.id) ? '#FE0000' : 'none'} color={favorites.includes(l.id) ? '#FE0000' : '#666'} />
                </button>

                <div style={{ height: 180, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                  <img src={l.image} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>

                <div style={{ padding: '14px' }}>
                  {/* Original price crossed out */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div className="price-tag" style={{ fontSize: '1.15rem', color: '#FE0000' }}><Price amount={l.price} /></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)', textDecoration: 'line-through' }}>
                      <Price amount={Math.round(l.price * (1 + Math.random() * 0.4 + 0.1))} />
                    </div>
                  </div>

                  <p style={{ margin: '4px 0 6px', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'Nunito, sans-serif', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
                    {l.title}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--fg-muted)', fontSize: '0.75rem' }}>
                    <MapPin size={11} />{l.location}
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--fg-muted)', fontWeight: 700, marginBottom: 4 }}>
                      <span>Stock écoulé: {Math.floor(Math.random() * 60 + 20)}%</span>
                      <span>Plus que {Math.floor(Math.random() * 8 + 2)}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.floor(Math.random() * 60 + 20)}%`, height: '100%', background: 'linear-gradient(90deg, #FE0000, #FFDD21)', borderRadius: 999 }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.72rem', color: 'var(--fg-subtle)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={11} />{l.views} vues</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} />Fin dans {timeLeft.hours}h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {flashListings.length > 0 && (
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            onClick={() => onNavigate('search')}
            style={{
              background: 'none', border: '1.5px solid var(--border)', borderRadius: 999,
              padding: '0.7rem 2rem', cursor: 'pointer', color: 'var(--fg)',
              fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '0.9rem',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            Voir toutes les annonces
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
