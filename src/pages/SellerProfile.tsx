import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import { Star, MapPin, MessageCircle, Clock, Eye, Heart } from 'lucide-react'
import { LISTINGS_QUERY, type RemoteListing } from '../graphql/listings'
import {
  SELLER_PROFILE_QUERY,
  SELLER_REVIEWS_QUERY,
  CREATE_REVIEW_MUTATION,
  type RemoteSellerProfile,
  type RemoteReview,
} from '../graphql/reviews'
import Price from '../components/Price'
import { formatRelativeDate } from '../lib/format'

type SellerProfileProps = {
  sellerId: string
  onNavigate: (page: any) => void
  onSelectListing: (id: string) => void
  onContactSeller: (sellerId: string) => void
  isLoggedIn: boolean
}

function Stars({ rating, size = 14 }: { rating: number, size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size} fill={s <= Math.round(rating) ? '#F59E0B' : 'var(--border)'} color={s <= Math.round(rating) ? '#F59E0B' : 'var(--border)'} />
      ))}
    </div>
  )
}

function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export default function SellerProfile({ sellerId, onNavigate, onSelectListing, onContactSeller, isLoggedIn }: SellerProfileProps) {
  const [tab, setTab] = useState<'listings' | 'reviews'>('listings')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const { data: profileData, loading: profileLoading, refetch: refetchProfile } = useQuery<{ sellerProfile: RemoteSellerProfile }>(SELLER_PROFILE_QUERY, {
    variables: { sellerId },
  })
  const seller = profileData?.sellerProfile

  const { data: listingsData } = useQuery<{ listings: { items: RemoteListing[] } }>(LISTINGS_QUERY, {
    variables: { filter: { sellerId }, pageSize: 24 },
  })
  const sellerListings = listingsData?.listings.items ?? []

  const { data: reviewsData, refetch: refetchReviews } = useQuery<{ sellerReviews: RemoteReview[] }>(SELLER_REVIEWS_QUERY, {
    variables: { sellerId },
  })
  const reviews = reviewsData?.sellerReviews ?? []
  const ratingCounts = [5, 4, 3, 2, 1].map(r => reviews.filter(rv => rv.rating === r).length)

  const [createReview, { loading: submittingReview }] = useMutation(CREATE_REVIEW_MUTATION)

  const submitReview = async () => {
    setReviewError(null)
    try {
      await createReview({ variables: { input: { sellerId, rating: reviewRating, comment: reviewComment || undefined } } })
      setReviewSubmitted(true)
      setReviewComment('')
      void refetchReviews()
      void refetchProfile()
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Impossible d'envoyer l'avis.")
    }
  }

  if (profileLoading) {
    return <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1rem', textAlign: 'center', color: 'var(--fg-muted)' }}>Chargement...</div>
  }

  if (!seller) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--fg-muted)', marginBottom: '1rem' }}>Ce profil vendeur n'existe pas.</p>
        <button onClick={() => onNavigate('home')} className="btn-primary" style={{ padding: '0.7rem 1.5rem' }}>Retour à l'accueil</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Profile header */}
      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--border)', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2rem', color: 'var(--fg-muted)' }}>
            {seller.avatarUrl ? (
              <img src={seller.avatarUrl} alt={seller.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              seller.fullName.charAt(0).toUpperCase()
            )}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 6px' }}>{seller.fullName}</h1>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {seller.city && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                  <MapPin size={14} color="var(--primary)" /> {seller.city}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                <Clock size={14} /> Membre depuis {memberSince(seller.createdAt)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Annonces', value: seller.listingsCount },
                { label: 'Avis', value: seller.reviewsCount },
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
              onClick={() => (isLoggedIn ? onContactSeller(sellerId) : onNavigate('auth'))}>
              <MessageCircle size={16} /> Envoyer un message
            </button>
            {seller.reviewsCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Stars rating={seller.averageRating} size={18} />
                <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.1rem' }}>{seller.averageRating.toFixed(1)}</span>
                <span style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>/ 5 ({seller.reviewsCount} avis)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--border-subtle)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'listings', label: `Annonces (${seller.listingsCount})` },
          { key: 'reviews', label: `Avis (${seller.reviewsCount})` },
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
        sellerListings.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', textAlign: 'center', padding: '2rem 0' }}>Aucune annonce active pour l'instant.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {sellerListings.map(l => (
              <div key={l.id} className="card card-hover" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>
                <div style={{ height: 170, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                  {l.coverImageUrl && (
                    <img src={l.coverImageUrl} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )}
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div className="price-tag" style={{ fontSize: '1rem' }}><Price amount={l.price} currency={l.currency} /></div>
                  <p style={{ margin: '4px 0 6px', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'Nunito, sans-serif', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.title}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                    <span>{l.publishedAt ? formatRelativeDate(l.publishedAt) : ''}</span>
                    <span style={{ display: 'flex', gap: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Eye size={12} />{l.viewsCount}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Heart size={12} />{l.favoritesCount}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Rating summary */}
          {seller.reviewsCount > 0 && (
            <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '3rem', color: 'var(--fg)' }}>{seller.averageRating.toFixed(1)}</div>
                <Stars rating={seller.averageRating} size={20} />
                <div style={{ color: 'var(--fg-muted)', fontSize: '0.8rem', marginTop: 4 }}>{seller.reviewsCount} avis</div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                {[5, 4, 3, 2, 1].map((r, i) => (
                  <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', width: 8 }}>{r}</span>
                    <Star size={12} fill="#F59E0B" color="#F59E0B" />
                    <div className="progress-bar" style={{ flex: 1 }}>
                      <div className="progress-fill" style={{ width: `${Math.round((ratingCounts[i] / seller.reviewsCount) * 100)}%` }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', width: 32 }}>{Math.round((ratingCounts[i] / seller.reviewsCount) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leave a review */}
          {seller.canReview && !reviewSubmitted && (
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.95rem' }}>Laisser un avis</h3>
              <div style={{ display: 'flex', gap: 4, marginBottom: '0.75rem' }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setReviewRating(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <Star size={24} fill={s <= reviewRating ? '#F59E0B' : 'var(--border)'} color={s <= reviewRating ? '#F59E0B' : 'var(--border)'} />
                  </button>
                ))}
              </div>
              <textarea
                className="input"
                placeholder="Votre expérience avec ce vendeur (optionnel)"
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                rows={3}
                style={{ width: '100%', resize: 'vertical', marginBottom: '0.75rem' }}
              />
              {reviewError && <p style={{ color: 'var(--primary)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{reviewError}</p>}
              <button className="btn-primary" disabled={submittingReview} onClick={() => void submitReview()} style={{ padding: '0.6rem 1.5rem' }}>
                {submittingReview ? 'Envoi...' : 'Publier mon avis'}
              </button>
            </div>
          )}
          {reviewSubmitted && (
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Merci, votre avis a été publié.</p>
          )}

          {reviews.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', textAlign: 'center', padding: '1rem 0' }}>Aucun avis pour l'instant.</p>
          ) : (
            reviews.map(r => (
              <div key={r.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                    {r.author.avatarUrl ? (
                      <img src={r.author.avatarUrl} alt={r.author.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      r.author.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>{r.author.fullName}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                      <Stars rating={r.rating} size={13} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>{formatRelativeDate(r.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {r.comment && <p style={{ color: 'var(--fg)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
