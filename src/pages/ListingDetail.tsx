import { useState } from 'react'
import {
  Heart, Share2, MapPin, Shield, Star, MessageCircle, Phone,
  ChevronLeft, ChevronRight, Eye, Tag, Truck, CheckCircle,
  Award, Calendar, ArrowLeft, Flag,
} from 'lucide-react'
import { listings, formatPrice } from '../data/mockData'

type ListingDetailProps = {
  listingId: string
  onNavigate: (page: any) => void
  onSelectSeller: (id: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="stars">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={14} className={s <= Math.round(rating) ? 'star-filled' : 'star-empty'} fill={s <= Math.round(rating) ? '#F59E0B' : 'var(--border)'} color={s <= Math.round(rating) ? '#F59E0B' : 'var(--border)'} />
      ))}
    </div>
  )
}

function X({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}

export default function ListingDetail({ listingId, onNavigate, onSelectSeller, favorites, onToggleFavorite }: ListingDetailProps) {
  const listing = listings.find(l => l.id === listingId) || listings[0]
  const [imgIdx, setImgIdx] = useState(0)
  const [contactOpen, setContactOpen] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [sellerSheetOpen, setSellerSheetOpen] = useState(false)
  const similar = listings.filter(l => l.category === listing.category && l.id !== listing.id).slice(0, 4)
  const images = listing.images.length > 0 ? listing.images : [listing.image]
  const isFav = favorites.includes(listing.id)

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1rem', paddingBottom: '5rem' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
        <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={16} /> Retour
        </button>
        <span>/</span>
        <span>Électronique</span>
        <span>/</span>
        <span style={{ color: 'var(--fg)' }}>{listing.title}</span>
      </div>

      <div className="listing-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }}>
        <div>
          {/* Image gallery */}
          <div className="card" style={{ overflow: 'hidden', marginBottom: '1.25rem' }}>
            <div className="listing-detail-image" style={{ position: 'relative', height: 420, background: 'var(--border-subtle)' }}>
              <img
                src={images[imgIdx]}
                alt={listing.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=600&h=420&fit=crop' }}
              />
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <ChevronRight size={20} />
                  </button>
                  <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700 }}>
                    {imgIdx + 1} / {images.length}
                  </div>
                </>
              )}
              {listing.sponsored && <span className="badge badge-yellow" style={{ position: 'absolute', top: 14, left: 14, zIndex: 2 }}>Sponsorisé</span>}
            </div>
            {images.length > 1 && (
              <div className="listing-thumbnails" style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'var(--bg-card)' }}>
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    style={{ width: 64, height: 48, borderRadius: 6, overflow: 'hidden', border: i === imgIdx ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                  >
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details card */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 8px', color: 'var(--fg)' }}>{listing.title}</h1>
                <div className="price-tag" style={{ fontSize: '1.75rem' }}>{formatPrice(listing.price)}</div>
                {listing.negotiable && <span className="badge badge-green" style={{ marginTop: 6 }}>Prix négociable</span>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onToggleFavorite(listing.id)} style={{ background: isFav ? 'rgba(254,0,0,0.08)' : 'var(--border-subtle)', border: isFav ? '1.5px solid rgba(254,0,0,0.3)' : '1.5px solid var(--border)', borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Heart size={18} fill={isFav ? '#FE0000' : 'none'} color={isFav ? '#FE0000' : 'var(--fg-muted)'} />
                </button>
                <button style={{ background: 'var(--border-subtle)', border: '1.5px solid var(--border)', borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Share2 size={18} color="var(--fg-muted)" />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                <MapPin size={15} color="var(--primary)" /> {listing.location}, {listing.city}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                <Calendar size={15} /> Publié {listing.date}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                <Eye size={15} /> {listing.views} vues
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <span className="badge badge-gray"><Tag size={11} /> {listing.condition}</span>
              {listing.delivery && <span className="badge badge-blue"><Truck size={11} /> Livraison possible</span>}
              {listing.negotiable && <span className="badge badge-green"><CheckCircle size={11} /> Négociable</span>}
            </div>

            <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', margin: '0 0 0.75rem' }}>Description</h3>
            <p style={{ color: 'var(--fg)', lineHeight: 1.7, fontSize: '0.9rem', margin: 0 }}>{listing.description}</p>

            <div style={{ borderTop: '1px solid var(--border)', marginTop: '1.25rem', paddingTop: '1.25rem' }}>
              <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', margin: '0 0 0.75rem' }}>Mots-clés</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {listing.tags.map(t => <span key={t} className="badge badge-gray">{t}</span>)}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1rem' }}>Localisation</h3>
            <div className="map-placeholder" style={{ height: 220 }}>
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📍</div>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#444', fontSize: '0.9rem' }}>{listing.location}, {listing.city}</div>
                <div style={{ color: '#666', fontSize: '0.8rem', marginTop: 4 }}>Carte interactive — Côte d'Ivoire</div>
                <button style={{ marginTop: 12, background: '#fff', border: '1.5px solid #4CAF50', color: '#2E7D32', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, margin: '12px auto 0' }}>
                  <ExternalLink size={13} /> Ouvrir dans Maps
                </button>
              </div>
            </div>
          </div>

          {/* Similar listings */}
          {similar.length > 0 && (
            <div>
              <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.1rem', margin: '0 0 1rem' }}>Annonces similaires</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {similar.map(l => (
                  <div key={l.id} className="card card-hover" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => onNavigate('listing-detail')}>
                    <div style={{ height: 130, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                      <img src={l.image} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div className="price-tag" style={{ fontSize: '0.95rem' }}>{formatPrice(l.price)}</div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--fg)', fontFamily: 'Nunito, sans-serif', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: desktop only */}
        <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem', position: 'sticky', top: 80 }}>
            <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Contacter le vendeur</h3>

            <button className="btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.75rem' }} onClick={() => onNavigate('buyer-messages')}>
              <MessageCircle size={18} /> Envoyer un message
            </button>

            {contactOpen ? (
              <div style={{ background: 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>{listing.seller.phone}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: 4 }}>Cliquez pour appeler</div>
              </div>
            ) : (
              <button className="btn-outline" style={{ width: '100%', padding: '0.85rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.75rem' }} onClick={() => setContactOpen(true)}>
                <Phone size={16} /> Afficher le numéro
              </button>
            )}

            {offerOpen ? (
              <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Votre offre (FCFA)</label>
                <input className="input" placeholder="Ex: 430 000" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} style={{ marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}>Envoyer l'offre</button>
                  <button onClick={() => setOfferOpen(false)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.6rem', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={16} /></button>
                </div>
              </div>
            ) : (
              <button onClick={() => setOfferOpen(true)} style={{ width: '100%', background: 'none', border: '1.5px dashed var(--border)', borderRadius: 8, padding: '0.7rem', cursor: 'pointer', color: 'var(--fg-muted)', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Tag size={15} /> Faire une offre
              </button>
            )}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: '1.25rem', paddingTop: '1.25rem' }}>
              <button onClick={() => onSelectSeller(listing.seller.id)} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                <img src={listing.seller.avatar} alt={listing.seller.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                <div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.9rem', color: 'var(--fg)' }}>{listing.seller.name}</div>
                  {listing.seller.verified && <div className="verified-badge" style={{ marginTop: 2 }}><Shield size={11} fill="#3B82F6" /> Vérifié</div>}
                  {listing.seller.badge && <span className="badge badge-orange" style={{ marginTop: 4, fontSize: '0.7rem' }}><Award size={10} /> {listing.seller.badge}</span>}
                </div>
              </button>

              <div className="listing-detail-seller-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                {[
                  { label: 'Note', value: <><Stars rating={listing.seller.rating} /> <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{listing.seller.rating}/5</span></> },
                  { label: 'Avis', value: `${listing.seller.reviews} avis` },
                  { label: 'Annonces', value: listing.seller.listings },
                  { label: 'Répond en', value: listing.seller.responseTime },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--border-subtle)', borderRadius: 8, padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--fg-muted)', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.82rem', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 3 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => onSelectSeller(listing.seller.id)} style={{ marginTop: '0.75rem', width: '100%', background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.6rem', cursor: 'pointer', color: 'var(--fg)', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.85rem' }}>
                Voir le profil complet →
              </button>
            </div>

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto' }}>
                <Flag size={13} /> Signaler cette annonce
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--fg)' }}>🔒 Conseils de sécurité</h4>
            <ul style={{ margin: 0, padding: '0 0 0 16px', color: 'var(--fg-muted)', fontSize: '0.8rem', lineHeight: 1.8 }}>
              <li>Rencontrez le vendeur dans un lieu public</li>
              <li>Vérifiez le produit avant de payer</li>
              <li>N'envoyez jamais d'argent à l'avance</li>
              <li>Méfiez-vous des prix trop bas</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="mobile-contact-bar" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9998,
        background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
        padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1rem', color: 'var(--primary)' }}>{formatPrice(listing.price)}</div>
          {listing.negotiable && <div style={{ fontSize: '0.7rem', color: 'var(--fg-subtle)' }}>Prix négociable</div>}
        </div>
        <button onClick={() => onToggleFavorite(listing.id)} style={{ background: 'var(--border-subtle)', border: 'none', borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Heart size={18} fill={isFav ? '#FE0000' : 'none'} color={isFav ? '#FE0000' : 'var(--fg-muted)'} />
        </button>
        <button onClick={() => setSellerSheetOpen(true)} className="btn-primary" style={{ padding: '0 20px', height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: '0.85rem', fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>
          <MessageCircle size={16} /> Contacter
        </button>
      </div>

      {/* Mobile seller sheet */}
      {sellerSheetOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          animation: 'fadeIn 0.15s ease-out',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setSellerSheetOpen(false)} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'var(--bg-card)', borderRadius: '20px 20px 0 0',
            maxHeight: '85vh', overflow: 'auto',
            animation: 'slideUp 0.25s ease-out',
            fontFamily: "'Outfit', 'Nunito', sans-serif",
          }}>
            {/* Handle */}
            <div style={{ padding: '12px 0 4px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            <div style={{ padding: '0 1.25rem 1.5rem' }}>
              {/* Seller header */}
              <button onClick={() => { setSellerSheetOpen(false); onSelectSeller(listing.seller.id) }} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
                <img src={listing.seller.avatar} alt={listing.seller.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--fg)' }}>{listing.seller.name}</div>
                  {listing.seller.verified && <div className="verified-badge" style={{ marginTop: 2 }}><Shield size={11} fill="#3B82F6" /> Vérifié</div>}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>

              <button className="btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.75rem' }} onClick={() => { setSellerSheetOpen(false); onNavigate('buyer-messages') }}>
                <MessageCircle size={18} /> Envoyer un message
              </button>

              {contactOpen ? (
                <div style={{ background: 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                  <a href={`tel:${listing.seller.phone}`} style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', textDecoration: 'none' }}>{listing.seller.phone}</a>
                  <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: 4 }}>Appuyez pour appeler</div>
                </div>
              ) : (
                <button className="btn-outline" style={{ width: '100%', padding: '0.85rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.75rem' }} onClick={() => setContactOpen(true)}>
                  <Phone size={16} /> Afficher le numéro
                </button>
              )}

              {offerOpen ? (
                <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Votre offre (FCFA)</label>
                  <input className="input" placeholder="Ex: 430 000" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} style={{ marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-primary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}>Envoyer l'offre</button>
                    <button onClick={() => setOfferOpen(false)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.6rem', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setOfferOpen(true)} style={{ width: '100%', background: 'none', border: '1.5px dashed var(--border)', borderRadius: 8, padding: '0.7rem', cursor: 'pointer', color: 'var(--fg-muted)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Tag size={15} /> Faire une offre
                </button>
              )}

              <button onClick={() => setSellerSheetOpen(false)} style={{ width: '100%', background: 'none', border: 'none', borderRadius: 8, padding: '0.85rem', cursor: 'pointer', color: 'var(--fg-muted)', fontWeight: 600, fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
