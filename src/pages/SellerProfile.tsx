import { useState } from 'react'
import { Star, Shield, MapPin, MessageCircle, Award, Clock, Eye, Heart, ThumbsUp } from 'lucide-react'
import { sellers, listings, formatPrice } from '../data/mockData'

type SellerProfileProps = {
  sellerId: string
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
}

function Stars({ rating, size = 14 }: { rating: number, size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size} fill={s <= Math.round(rating) ? '#F59E0B' : 'var(--border)'} color={s <= Math.round(rating) ? '#F59E0B' : 'var(--border)'} />
      ))}
    </div>
  )
}

const reviews = [
  { id: 1, author: 'Adjoua Marie', rating: 5, text: 'Vendeur très sérieux, article conforme à la description. Livraison rapide !', date: 'Il y a 3 jours', avatar: 'AM' },
  { id: 2, author: 'Koffi Augustin', rating: 4, text: 'Bonne transaction, communication fluide. Je recommande.', date: 'Il y a 1 semaine', avatar: 'KA' },
  { id: 3, author: 'Fatou Traoré', rating: 5, text: 'Excellent vendeur ! Produit nickel, prix honnête. On a pu négocier facilement.', date: 'Il y a 2 semaines', avatar: 'FT' },
  { id: 4, author: 'Bouaké Pierre', rating: 4, text: 'Bien mais la réponse a mis un peu de temps. Produit OK.', date: 'Il y a 1 mois', avatar: 'BP' },
]

export default function SellerProfile({ sellerId, onNavigate, onSelectListing }: SellerProfileProps) {
  const seller = sellers.find(s => s.id === sellerId) || sellers[0]
  const sellerListings = listings.filter(l => l.seller.id === sellerId || true).slice(0, 6)
  const [tab, setTab] = useState<'listings' | 'reviews'>('listings')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Profile header */}
      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={seller.avatar}
              alt={seller.name}
              style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }}
            />
            {seller.verified && (
              <div style={{ position: 'absolute', bottom: 4, right: 4, background: '#3B82F6', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)' }}>
                <Shield size={12} color="#fff" fill="#fff" />
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>{seller.name}</h1>
              {seller.verified && <div className="verified-badge"><Shield size={12} fill="#3B82F6" /> Vendeur vérifié</div>}
              {seller.badge && <span className="badge badge-orange"><Award size={11} /> {seller.badge}</span>}
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                <MapPin size={14} color="var(--primary)" /> {seller.location}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                <Clock size={14} /> Membre depuis {seller.memberSince}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Annonces', value: seller.listings },
                { label: 'Avis', value: seller.reviews },
                { label: 'Taux de réponse', value: `${seller.responseRate}%` },
                { label: 'Temps de réponse', value: seller.responseTime },
              ].map(stat => (
                <div key={stat.label} style={{ background: 'var(--border-subtle)', borderRadius: 10, padding: '0.5rem 1rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.1rem', color: 'var(--fg)' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 1.25rem' }}
              onClick={() => onNavigate('buyer-messages')}>
              <MessageCircle size={16} /> Envoyer un message
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Stars rating={seller.rating} size={18} />
              <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.1rem' }}>{seller.rating}</span>
              <span style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>/ 5 ({seller.reviews} avis)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--border-subtle)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'listings', label: `Annonces (${seller.listings})` },
          { key: 'reviews', label: `Avis (${seller.reviews})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              padding: '0.6rem 1.25rem',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 700,
              fontSize: '0.875rem',
              background: tab === t.key ? 'var(--bg-card)' : 'transparent',
              color: tab === t.key ? 'var(--primary)' : 'var(--fg-muted)',
              boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'listings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {sellerListings.map(l => (
            <div key={l.id} className="card card-hover" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>
              <div style={{ height: 170, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                <img src={l.image} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div className="price-tag" style={{ fontSize: '1rem' }}>{formatPrice(l.price)}</div>
                <p style={{ margin: '4px 0 6px', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'Nunito, sans-serif', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.title}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                  <span>{l.date}</span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Eye size={12} />{l.views}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Heart size={12} />{l.favorites}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Rating summary */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '3rem', color: 'var(--fg)' }}>{seller.rating}</div>
              <Stars rating={seller.rating} size={20} />
              <div style={{ color: 'var(--fg-muted)', fontSize: '0.8rem', marginTop: 4 }}>{seller.reviews} avis</div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              {[5,4,3,2,1].map(r => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', width: 8 }}>{r}</span>
                  <Star size={12} fill="#F59E0B" color="#F59E0B" />
                  <div className="progress-bar" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${r === 5 ? 75 : r === 4 ? 18 : r === 3 ? 5 : 2}%` }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', width: 24 }}>{r === 5 ? 75 : r === 4 ? 18 : r === 3 ? 5 : r === 2 ? 1 : 1}%</span>
                </div>
              ))}
            </div>
          </div>

          {reviews.map(r => (
            <div key={r.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>{r.avatar}</div>
                <div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>{r.author}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                    <Stars rating={r.rating} size={13} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{r.date}</span>
                  </div>
                </div>
              </div>
              <p style={{ color: 'var(--fg)', fontSize: '0.9rem', margin: '0 0 0.75rem', lineHeight: 1.5 }}>{r.text}</p>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ThumbsUp size={13} /> Utile
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
