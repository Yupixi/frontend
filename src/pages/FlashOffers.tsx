import { useEffect, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { Zap, Clock, Heart, MapPin, Eye, Tag, Flame, ArrowRight } from 'lucide-react'
import { ACTIVE_CAMPAIGN_QUERY, type ActiveCampaign, type ActiveCampaignListing } from '../graphql/content'
import Price from '../components/Price'

type FlashOffersProps = {
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
}

function useCountdown(endsAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!endsAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [endsAt])

  if (!endsAt) return null
  const diffMs = Math.max(0, new Date(endsAt).getTime() - now)
  const hours = Math.floor(diffMs / 3_600_000)
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000)
  const seconds = Math.floor((diffMs % 60_000) / 1000)
  return { hours, minutes, seconds, ended: diffMs <= 0 }
}

function discountedPrice(entry: ActiveCampaignListing): number | null {
  const { price } = entry.listing
  if (price == null) return null
  if (entry.salePrice != null) return entry.salePrice
  if (entry.discountPercent != null) return Math.round(price * (1 - entry.discountPercent / 100))
  return null
}

export default function FlashOffers({ onNavigate, onSelectListing, favorites, onToggleFavorite }: FlashOffersProps) {
  const { data, loading } = useQuery<{ activeCampaign: ActiveCampaign | null }>(ACTIVE_CAMPAIGN_QUERY)
  const campaign = data?.activeCampaign
  const countdown = useCountdown(campaign?.endsAt)
  const entries = campaign?.listings ?? []

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
              <div style={{ background: campaign?.themeColor || '#FE0000', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={24} color="#FFDD21" fill="#FFDD21" />
              </div>
              <div>
                <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.8rem', color: '#FFDD21', margin: 0, letterSpacing: '0.02em' }}>
                  {campaign?.name || 'Offres Flash'}
                </h1>
                <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: '2px 0 0' }}>
                  {campaign?.description || 'Offres limitées · Prix exceptionnels'}
                </p>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          {countdown && !countdown.ended && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Clock size={18} color="#FFDD21" />
              {['heures', 'minutes', 'secondes'].map((label, i) => {
                const val = [countdown.hours, countdown.minutes, countdown.seconds][i]
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
          )}
        </div>
      </div>

      {/* Flash Deals Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Flame size={20} color="#FE0000" fill="#FE0000" />
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '1.3rem', margin: 0 }}>
            {loading
              ? 'Chargement...'
              : entries.length === 0
                ? 'Aucune offre flash pour le moment'
                : `🔥 ${entries.length} offre${entries.length > 1 ? 's' : ''} disponible${entries.length > 1 ? 's' : ''}`}
          </h2>
        </div>

        {!loading && entries.length === 0 ? (
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
            {entries.map(entry => {
              const { listing } = entry
              const salePrice = discountedPrice(entry)
              return (
                <div
                  key={entry.id}
                  className="card card-hover"
                  style={{ overflow: 'hidden', cursor: 'pointer', position: 'relative', border: '1.5px solid rgba(255,221,33,0.3)' }}
                  onClick={() => onSelectListing(listing.id)}
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
                  {entry.discountPercent != null && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10, zIndex: 2,
                      background: '#FFDD21', borderRadius: 6,
                      padding: '3px 8px', fontSize: '0.7rem',
                      fontWeight: 900, fontFamily: 'Outfit, sans-serif',
                      color: '#0F172A',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      <Tag size={11} />
                      -{entry.discountPercent}%
                    </div>
                  )}

                  <button
                    onClick={e => { e.stopPropagation(); onToggleFavorite(listing.id) }}
                    style={{ position: 'absolute', top: 46, right: 10, zIndex: 2, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <Heart size={13} fill={favorites.includes(listing.id) ? '#FE0000' : 'none'} color={favorites.includes(listing.id) ? '#FE0000' : '#666'} />
                  </button>

                  <div style={{ height: 180, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                    {listing.coverImageUrl && (
                      <img src={listing.coverImageUrl} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    )}
                  </div>

                  <div style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div className="price-tag" style={{ fontSize: '1.15rem', color: '#FE0000' }}>
                        <Price amount={salePrice ?? listing.price} />
                      </div>
                      {salePrice != null && listing.price != null && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)', textDecoration: 'line-through' }}>
                          <Price amount={listing.price} />
                        </div>
                      )}
                    </div>

                    <p style={{ margin: '4px 0 6px', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'Nunito, sans-serif', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
                      {listing.title}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--fg-muted)', fontSize: '0.75rem' }}>
                      <MapPin size={11} />{listing.locationLabel ? `${listing.locationLabel}, ${listing.city}` : listing.city}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.72rem', color: 'var(--fg-subtle)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={11} />{listing.viewsCount} vues</span>
                      {countdown && !countdown.ended && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} />Fin dans {countdown.hours}h</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      {entries.length > 0 && (
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
