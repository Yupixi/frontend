import { useState, type ReactNode } from 'react'
import DOMPurify from 'dompurify'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  Heart, Share2, MapPin, MessageCircle, Phone,
  ChevronLeft, ChevronRight, Eye, Tag, Truck, CheckCircle,
  Calendar, ArrowLeft, Flag, ExternalLink,
} from 'lucide-react'
import Price from '../components/Price'
import { LISTING_QUERY, LISTINGS_QUERY, type RemoteListing, type RemoteListingDetail } from '../graphql/listings'
import { CREATE_REPORT_MUTATION } from '../graphql/reports'
import { getAccessToken } from '../lib/auth'
import { formatRelativeDate } from '../lib/format'

type ListingDetailProps = {
  listingId: string
  onNavigate: (page: any) => void
  onSelectSeller: (id: string) => void
  onContactSeller: (sellerId: string, listingId?: string) => void
  favorites: string[]
  onToggleFavorite: (id: string) => void
}

const REPORT_REASONS = [
  'Prix suspect',
  'Annonce frauduleuse',
  'Contenu inapproprié',
  'Article déjà vendu',
  'Autre',
]

function X({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}

function listingLocation(listing: RemoteListing): string {
  return listing.locationLabel ? `${listing.locationLabel}, ${listing.city}` : listing.city
}

function SpecItem({ icon, label, value }: { icon: ReactNode, label: string, value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem' }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--primary)' }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--fg-subtle)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '0.82rem', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, color: 'var(--fg)', lineHeight: 1.25, wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  )
}

export default function ListingDetail({ listingId, onNavigate, onSelectSeller, onContactSeller, favorites, onToggleFavorite }: ListingDetailProps) {
  const [imgIdx, setImgIdx] = useState(0)
  const [contactOpen, setContactOpen] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [sellerSheetOpen, setSellerSheetOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0])
  const [reportMessage, setReportMessage] = useState('')
  const [reportDone, setReportDone] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const { data, loading } = useQuery<{ listing: RemoteListingDetail | null }>(LISTING_QUERY, {
    variables: { id: listingId },
  })
  const listing = data?.listing

  const { data: similarData } = useQuery<{ listings: { items: RemoteListing[] } }>(LISTINGS_QUERY, {
    variables: { filter: { categorySlug: listing?.category.slug }, pageSize: 5 },
    skip: !listing,
  })
  const similar = (similarData?.listings.items ?? []).filter(l => l.id !== listingId).slice(0, 4)

  const [createReport, { loading: reporting }] = useMutation(CREATE_REPORT_MUTATION)

  if (loading) {
    return <div style={{ maxWidth: 1280, margin: '0 auto', padding: '3rem 1rem', textAlign: 'center', color: 'var(--fg-muted)' }}>Chargement...</div>
  }

  if (!listing) {
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--fg-muted)', marginBottom: '1rem' }}>Cette annonce n'existe plus ou a été retirée.</p>
        <button onClick={() => onNavigate('home')} className="btn-primary" style={{ padding: '0.7rem 1.5rem' }}>Retour à l'accueil</button>
      </div>
    )
  }

  const images = listing.media.length > 0 ? listing.media.map(m => m.url) : (listing.coverImageUrl ? [listing.coverImageUrl] : [])
  const isFav = favorites.includes(listing.id)

  // The app never puts state in the URL (see App.tsx), so the shareable
  // link is built here with a `?listing=` param App.tsx knows to read on
  // load — a plain window.location.href would just point at the homepage.
  const shareUrl = `${window.location.origin}${window.location.pathname}?listing=${listing.id}`

  const shareListing = async () => {
    const shareData = { title: listing.title, text: `${listing.title} — ${listingLocation(listing)}`, url: shareUrl }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled the native share sheet — not an error.
      }
      return
    }
    await navigator.clipboard.writeText(shareUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const submitReport = async () => {
    await createReport({
      variables: {
        targetType: 'LISTING',
        targetListingId: listing.id,
        reason: reportReason,
        message: reportMessage || undefined,
      },
    })
    setReportDone(true)
  }

  const openReport = () => {
    if (!getAccessToken()) {
      onNavigate('auth')
      return
    }
    setReportOpen(true)
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1rem', paddingBottom: '5rem' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
        <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={16} /> Retour
        </button>
        <span>/</span>
        <span>{listing.category.name}</span>
        <span className="listing-breadcrumb-sep">/</span>
        <span className="listing-breadcrumb-title" style={{ color: 'var(--fg)' }}>{listing.title}</span>
      </div>

      <div className="listing-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem' }}>
        <div>
          {/* Image gallery */}
          <div className="card" style={{ overflow: 'hidden', marginBottom: '1.25rem' }}>
            <div className="listing-detail-image" style={{ position: 'relative', height: 420, background: 'var(--border-subtle)' }}>
              {images.length > 0 ? (
                <img
                  src={images[imgIdx]}
                  alt={listing.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)' }}>
                  <Tag size={48} />
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => Math.max(0, i - 1))} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setImgIdx(i => Math.min(images.length - 1, i + 1))} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <ChevronRight size={20} />
                  </button>
                  <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)', color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 800, fontFamily: "'Outfit', 'Nunito', sans-serif" }}>
                    {imgIdx + 1} / {images.length}
                  </div>
                </>
              )}
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
          <div className="card listing-detail-card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div className="listing-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: '1rem' }}>
              <div style={{ minWidth: 0 }}>
                <h1 className="listing-detail-title" style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: '0 0 8px', color: 'var(--fg)' }}>{listing.title}</h1>
                <div className="price-tag" style={{ fontSize: '1.75rem' }}><Price amount={listing.price} /></div>
                {listing.negotiable && <span className="badge badge-green" style={{ marginTop: 6 }}>Prix négociable</span>}
              </div>
              <div className="listing-detail-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => onToggleFavorite(listing.id)} style={{ background: isFav ? 'rgba(254,0,0,0.08)' : 'var(--border-subtle)', border: isFav ? '1.5px solid rgba(254,0,0,0.3)' : '1.5px solid var(--border)', borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Heart size={18} fill={isFav ? '#FE0000' : 'none'} color={isFav ? '#FE0000' : 'var(--fg-muted)'} />
                </button>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => void shareListing()} title="Partager l'annonce" style={{ background: 'var(--border-subtle)', border: '1.5px solid var(--border)', borderRadius: 10, width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Share2 size={18} color="var(--fg-muted)" />
                  </button>
                  {linkCopied && (
                    <span style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--fg)', color: 'var(--bg-card)', fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap', zIndex: 5 }}>
                      Lien copié !
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                <MapPin size={15} color="var(--primary)" /> {listingLocation(listing)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                <Calendar size={15} /> Publié {formatRelativeDate(listing.publishedAt ?? listing.createdAt)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                <Eye size={15} /> {listing.viewsCount} vues
              </div>
            </div>

            <div className="listing-detail-specs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <SpecItem icon={<Tag size={15} />} label="Catégorie" value={listing.category.name} />
              {listing.subcategory && <SpecItem icon={<Tag size={15} />} label="Sous-catégorie" value={listing.subcategory.name} />}
              {listing.condition && listing.condition !== 'N/A' && <SpecItem icon={<CheckCircle size={15} />} label="État" value={listing.condition} />}
              <SpecItem icon={<Truck size={15} />} label="Livraison" value={listing.deliveryAvailable ? 'Disponible' : 'Non disponible'} />
            </div>

            <h3 style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, fontSize: '1rem', margin: '0 0 0.75rem' }}>Description</h3>
            <div
              style={{ color: 'var(--fg)', lineHeight: 1.7, fontSize: '0.9rem' }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(listing.description) }}
            />

            {listing.tags.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '1.25rem', paddingTop: '1.25rem' }}>
                <h3 style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, fontSize: '1rem', margin: '0 0 0.75rem' }}>Mots-clés</h3>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {listing.tags.map(t => <span key={t} className="badge badge-gray">{t}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
            <h3 style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, margin: '0 0 1rem' }}>Localisation</h3>
            <div className="map-placeholder" style={{ height: 220 }}>
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: 'var(--primary)' }}>
                  <MapPin size={22} />
                </div>
                <div style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, color: 'var(--fg)', fontSize: '0.9rem' }}>{listingLocation(listing)}</div>
                <div style={{ color: 'var(--fg-muted)', fontSize: '0.8rem', marginTop: 4 }}>Carte interactive — Côte d'Ivoire</div>
                <button
                  className="btn-outline"
                  style={{ padding: '6px 14px', fontSize: '0.8rem', margin: '12px auto 0' }}
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${listingLocation(listing)}, Côte d'Ivoire`)}`,
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                >
                  <ExternalLink size={13} /> Ouvrir dans Maps
                </button>
              </div>
            </div>
          </div>

          {/* Similar listings */}
          {similar.length > 0 && (
            <div>
              <h3 style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, fontSize: '1.1rem', margin: '0 0 1rem' }}>Annonces similaires</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {similar.map(l => (
                  <div key={l.id} className="card card-hover" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => onNavigate('listing-detail')}>
                    <div style={{ height: 130, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                      <img src={l.coverImageUrl ?? l.media[0]?.url ?? ''} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div className="price-tag" style={{ fontSize: '0.95rem' }}><Price amount={l.price} /></div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--fg)', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.title}</p>
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
            <h3 style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Contacter le vendeur</h3>

            <button className="btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.75rem' }} onClick={() => onContactSeller(listing.seller.id, listing.id)}>
              <MessageCircle size={18} /> Envoyer un message
            </button>

            {listing.seller.phone ? (
              contactOpen ? (
                <div style={{ background: 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>{listing.seller.phone}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: 4 }}>Cliquez pour appeler</div>
                </div>
              ) : (
                <button className="btn-outline" style={{ width: '100%', padding: '0.85rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.75rem' }} onClick={() => setContactOpen(true)}>
                  <Phone size={16} /> Afficher le numéro
                </button>
              )
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)', textAlign: 'center', marginBottom: '0.75rem' }}>Numéro non renseigné</p>
            )}

            {offerOpen ? (
              <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                <label style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Votre offre (FCFA)</label>
                <input className="input" placeholder="Ex: 430 000" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} style={{ marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }}>Envoyer l'offre</button>
                  <button onClick={() => setOfferOpen(false)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.6rem', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={16} /></button>
                </div>
              </div>
            ) : (
              <button onClick={() => setOfferOpen(true)} style={{ width: '100%', background: 'none', border: '1.5px dashed var(--border)', borderRadius: 8, padding: '0.7rem', cursor: 'pointer', color: 'var(--fg-muted)', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Tag size={15} /> Faire une offre
              </button>
            )}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: '1.25rem', paddingTop: '1.25rem' }}>
              <button onClick={() => onSelectSeller(listing.seller.id)} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                {listing.seller.avatarUrl ? (
                  <img src={listing.seller.avatarUrl} alt={listing.seller.fullName} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary)' }}>
                    {listing.seller.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, fontSize: '0.9rem', color: 'var(--fg)' }}>{listing.seller.fullName}</div>
                  {listing.seller.city && <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 2 }}>{listing.seller.city}</div>}
                </div>
              </button>

              <button onClick={() => onSelectSeller(listing.seller.id)} style={{ marginTop: '0.75rem', width: '100%', background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.6rem', cursor: 'pointer', color: 'var(--fg)', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 700, fontSize: '0.85rem' }}>
                Voir le profil complet →
              </button>
            </div>

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              {reportDone ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Merci, votre signalement a été transmis.</p>
              ) : reportOpen ? (
                <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'left' }}>
                  <label style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 700, fontSize: '0.8rem', display: 'block', marginBottom: 6 }}>Motif</label>
                  <select className="input" value={reportReason} onChange={e => setReportReason(e.target.value)} style={{ marginBottom: 8 }}>
                    {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <textarea className="input" placeholder="Détails (optionnel)" value={reportMessage} onChange={e => setReportMessage(e.target.value)} rows={2} style={{ marginBottom: 8, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-primary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem' }} disabled={reporting} onClick={submitReport}>
                      {reporting ? 'Envoi...' : 'Envoyer'}
                    </button>
                    <button onClick={() => setReportOpen(false)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '0.6rem', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <button onClick={openReport} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, margin: '0 auto' }}>
                  <Flag size={13} /> Signaler cette annonce
                </button>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--fg)' }}>🔒 Conseils de sécurité</h4>
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
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1rem', color: 'var(--primary)' }}><Price amount={listing.price} /></div>
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
                {listing.seller.avatarUrl ? (
                  <img src={listing.seller.avatarUrl} alt={listing.seller.fullName} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--primary)' }}>
                    {listing.seller.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--fg)' }}>{listing.seller.fullName}</div>
                  {listing.seller.city && <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 2 }}>{listing.seller.city}</div>}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--fg-muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>

              <button className="btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.75rem' }} onClick={() => { setSellerSheetOpen(false); onContactSeller(listing.seller.id, listing.id) }}>
                <MessageCircle size={18} /> Envoyer un message
              </button>

              {listing.seller.phone ? (
                contactOpen ? (
                  <div style={{ background: 'var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                    <a href={`tel:${listing.seller.phone}`} style={{ fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', textDecoration: 'none' }}>{listing.seller.phone}</a>
                    <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: 4 }}>Appuyez pour appeler</div>
                  </div>
                ) : (
                  <button className="btn-outline" style={{ width: '100%', padding: '0.85rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: '0.75rem' }} onClick={() => setContactOpen(true)}>
                    <Phone size={16} /> Afficher le numéro
                  </button>
                )
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)', textAlign: 'center', marginBottom: '0.75rem' }}>Numéro non renseigné</p>
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
