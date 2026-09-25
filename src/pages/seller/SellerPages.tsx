import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  Plus,
  Eye,
  Heart,
  Package,
  X,
  Edit3,
  Clock,
  Trash2,
  ChevronRight,
  ChevronDown,
  Tag,
  ArrowUp,
  TrendingUp,
  Users,
  Check,
} from '../../components/icons'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Price from '../../components/Price'
import BoostMenu from '../../components/BoostMenu'
import {
  BUMP_LISTING_MUTATION,
  DELETE_LISTING_MUTATION,
  MY_LISTINGS_QUERY,
  type MyListingRow,
} from '../../graphql/listings'
import { LISTING_OFFERS_QUERY, RESPOND_TO_OFFER_MUTATION, type RemoteOffer } from '../../graphql/offers'
import type { AuthUser } from '../../graphql/auth'
import { AccountLayout as DashboardLayout } from '../account/AccountLayout'

// ─── SELLER DASHBOARD ───────────────────────────────────────────────────────
export function SellerDashboard({ onNavigate, currentUser, onLogout }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  const { data, loading } = useQuery<{ myListings: { totalCount: number; items: MyListingRow[] } }>(MY_LISTINGS_QUERY, {
    variables: { page: 1, pageSize: 100 },
  })
  const myListings = data?.myListings.items ?? []
  const activeCount = myListings.filter(l => l.status === 'APPROVED').length
  const pendingCount = myListings.filter(l => l.status === 'PENDING_REVIEW').length
  const totalViews = myListings.reduce((sum, l) => sum + l.viewsCount, 0)
  const totalFavorites = myListings.reduce((sum, l) => sum + l.favoritesCount, 0)

  const stats = [
    { label: 'Annonces actives', value: activeCount, icon: Package, color: '#BB0013', bg: 'rgba(187, 0, 19,0.08)' },
    { label: 'Vues totales', value: totalViews, icon: Eye, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'En attente de validation', value: pendingCount, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
    { label: 'Favoris reçus', value: totalFavorites, icon: Heart, color: '#EC4899', bg: 'rgba(236,72,153,0.08)' },
  ]

  const topListings = [...myListings].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 6)
  const chartData = topListings.map(l => ({ name: l.title.length > 14 ? l.title.slice(0, 14) + '…' : l.title, vues: l.viewsCount }))

  return (
    <DashboardLayout active="seller-dashboard" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Tableau de bord</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>Bienvenue sur votre espace vendeur</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => onNavigate('seller-post')}>
          <Plus size={16} /> Nouvelle annonce
        </button>
      </div>

      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '1.6rem' }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Vues par annonce</h2>
        {!loading && chartData.length === 0 ? (
          <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Publiez une annonce pour voir vos statistiques de vues.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#BB0013" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#BB0013" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
              <Area type="monotone" dataKey="vues" stroke="#BB0013" strokeWidth={2.5} fill="url(#colorViews)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, margin: 0, fontSize: '1rem' }}>Meilleures annonces</h2>
          <button onClick={() => onNavigate('seller-listings')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            Voir tout <ChevronRight size={15} />
          </button>
        </div>
        {!loading && topListings.length === 0 && (
          <p style={{ padding: '1.25rem', color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Aucune annonce pour le moment.</p>
        )}
        {topListings.map((l, i) => (
          <div key={l.id} style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem 1.25rem', borderBottom: i < topListings.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '1rem', color: i < 3 ? 'var(--primary)' : 'var(--fg-muted)', width: 22, textAlign: 'center' }}>#{i + 1}</span>
            <div style={{ width: 48, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0 }}>
              {l.coverImageUrl && (
                <img src={l.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</p>
              <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}><Price amount={l.price} /></span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={13} />{l.viewsCount}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Heart size={13} />{l.favoritesCount}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}

// ─── POST LISTING ────────────────────────────────────────────────────────────
const LISTING_STATUS_META: Record<string, { bg: string, color: string, label: string }> = {
  DRAFT: { bg: 'var(--surface-container-high)', color: 'var(--fg-muted)', label: 'Brouillon' },
  PENDING_REVIEW: { bg: 'rgba(245,158,11,0.12)', color: '#B45309', label: 'En attente de validation' },
  APPROVED: { bg: 'var(--tertiary-soft)', color: 'var(--tertiary)', label: 'En ligne' },
  REJECTED: { bg: 'var(--primary-fixed)', color: 'var(--primary)', label: 'Rejetée' },
  EXPIRED: { bg: 'var(--surface-container-high)', color: 'var(--fg-muted)', label: 'Expirée' },
  SOLD: { bg: 'rgba(59,130,246,0.1)', color: '#2563EB', label: 'Vendue' },
  PAUSED: { bg: 'rgba(245,158,11,0.12)', color: '#B45309', label: 'En pause' },
}

export { default as PostListing } from './PostListing'


// front — avoids an N+1 burst of queries when the list first renders.
function ListingOffersPanel({ listingId }: { listingId: string }) {
  const { data, loading, refetch } = useQuery<{ listingOffers: RemoteOffer[] }>(LISTING_OFFERS_QUERY, {
    variables: { listingId },
  })
  const [respondToOffer, { loading: responding }] = useMutation(RESPOND_TO_OFFER_MUTATION)
  const offers = data?.listingOffers ?? []

  const respond = (offerId: string, accept: boolean) =>
    void respondToOffer({ variables: { offerId, accept } }).then(() => refetch())

  if (loading) return <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Chargement...</div>
  if (offers.length === 0) return <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Aucune offre pour l'instant.</div>

  const statusLabel: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'En attente', color: 'var(--fg-muted)' },
    ACCEPTED: { label: 'Acceptée', color: '#10B981' },
    REJECTED: { label: 'Refusée', color: '#EF4444' },
    EXPIRED: { label: 'Expirée', color: 'var(--fg-subtle)' },
  }

  return (
    <div style={{ padding: '0.5rem 1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {offers.map(o => (
        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.75rem', background: 'var(--border-subtle)', borderRadius: 8, flexWrap: 'wrap' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem', fontWeight: 800, color: 'var(--fg-muted)' }}>
            {o.buyer.avatarUrl ? <img src={o.buyer.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : o.buyer.fullName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{o.buyer.fullName}</div>
            <div className="price-tag" style={{ fontSize: '0.85rem' }}><Price amount={o.amount} /></div>
          </div>
          {o.status === 'PENDING' ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button disabled={responding} onClick={() => respond(o.id, true)} style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                <Check size={13} /> Accepter
              </button>
              <button disabled={responding} onClick={() => respond(o.id, false)} style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700 }}>
                <X size={13} /> Refuser
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: statusLabel[o.status]?.color }}>{statusLabel[o.status]?.label}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export function SellerListings({ onNavigate, onSelectListing, onEditListing, currentUser, onLogout }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void, onEditListing: (id: string) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  const [filter, setFilter] = useState('all')
  const [expandedOffers, setExpandedOffers] = useState<string | null>(null)
  const [boostMenuFor, setBoostMenuFor] = useState<string | null>(null)
  const [bumpMessage, setBumpMessage] = useState<{ id: string; text: string } | null>(null)
  const { data, loading, refetch } = useQuery<{ myListings: { totalCount: number; items: MyListingRow[] } }>(
    MY_LISTINGS_QUERY,
    { variables: { page: 1, pageSize: 100 } },
  )
  const [deleteListing] = useMutation(DELETE_LISTING_MUTATION)
  const [bumpListing, { loading: bumping }] = useMutation(BUMP_LISTING_MUTATION)

  const myListings = data?.myListings.items ?? []
  const filtered = filter === 'all' ? myListings : myListings.filter(l => l.status === filter)

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`Supprimer "${title}" ? Cette action est irréversible.`)) return
    void deleteListing({ variables: { id } }).then(() => refetch())
  }

  // Mirrors the backend's 24h cooldown (see ListingsService.bumpListing) so
  // the button can just be disabled instead of round-tripping to find out.
  const BUMP_COOLDOWN_MS = 24 * 60 * 60 * 1000
  const nextBumpAt = (l: MyListingRow) => new Date(new Date(l.publishedAt ?? l.createdAt).getTime() + BUMP_COOLDOWN_MS)
  const canBump = (l: MyListingRow) => nextBumpAt(l) <= new Date()

  const handleBump = (id: string) => {
    setBumpMessage(null)
    void bumpListing({ variables: { id } })
      .then(() => { setBumpMessage({ id, text: 'Remontée en tête du fil !' }); void refetch() })
      .catch(() => setBumpMessage({ id, text: "Réessayez plus tard." }))
  }

  const filterTabs = [
    { key: 'all', label: `Toutes (${myListings.length})` },
    { key: 'PENDING_REVIEW', label: `En attente (${myListings.filter(l => l.status === 'PENDING_REVIEW').length})` },
    { key: 'APPROVED', label: `En ligne (${myListings.filter(l => l.status === 'APPROVED').length})` },
    { key: 'PAUSED', label: `En pause (${myListings.filter(l => l.status === 'PAUSED').length})` },
    { key: 'REJECTED', label: `Rejetées (${myListings.filter(l => l.status === 'REJECTED').length})` },
  ]

  return (
    <DashboardLayout active="seller-listings" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Mes annonces ({myListings.length})</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>Gérez vos annonces</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => onNavigate('seller-post')}>
          <Plus size={16} /> Nouvelle annonce
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--border-subtle)', borderRadius: 10, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {filterTabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{ padding: '0.55rem 1rem', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '0.82rem', background: filter === t.key ? 'var(--bg-card)' : 'transparent', color: filter === t.key ? 'var(--primary)' : 'var(--fg-muted)', boxShadow: filter === t.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'visible' }}>
        {loading && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fg-muted)' }}>Chargement...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--fg-muted)', marginBottom: '1rem' }}>Aucune annonce dans cette catégorie.</p>
            <button className="btn-primary" onClick={() => onNavigate('seller-post')}>Publier une annonce</button>
          </div>
        )}
        {filtered.map((l, i) => {
          const s = LISTING_STATUS_META[l.status] ?? LISTING_STATUS_META.DRAFT
          const offersExpanded = expandedOffers === l.id
          return (
            <div key={l.id}>
            <div className="seller-listing-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', padding: '1rem', borderBottom: offersExpanded ? 'none' : (i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none'), alignItems: 'center' }}>
              <div style={{ width: 72, height: 56, borderRadius: 8, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0, cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>
                {l.coverImageUrl && (
                  <img src={l.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
              </div>
              <div className="seller-listing-content" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>{l.title}</p>
                  <span className="badge" style={{ background: s.bg, color: s.color, flexShrink: 0, fontSize: '0.72rem' }}>{s.label}</span>
                  {l.boostExpiresAt && new Date(l.boostExpiresAt) > new Date() && (
                    <span className="badge" style={{ background: 'rgba(187, 0, 19,0.08)', color: 'var(--primary)', flexShrink: 0, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <ArrowUp size={11} /> Boosté jusqu'au {new Date(l.boostExpiresAt).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                  <span className="price-tag" style={{ fontSize: '0.9rem' }}><Price amount={l.price} /></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={12} />{l.viewsCount}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Heart size={12} />{l.favoritesCount}</span>
                  <span>{new Date(l.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <div className="seller-listing-actions" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => onEditListing(l.id)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: 'var(--fg-muted)' }}>
                  <Edit3 size={14} /> Modifier
                </button>
                <button onClick={() => handleDelete(l.id, l.title)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EF4444' }}>
                  <Trash2 size={15} />
                </button>
                <button onClick={() => setExpandedOffers(offersExpanded ? null : l.id)} style={{ background: offersExpanded ? 'var(--border-subtle)' : 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: 'var(--fg-muted)' }}>
                  <Tag size={14} /> Offres <ChevronDown size={13} style={{ transform: offersExpanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
                </button>
                {l.status === 'APPROVED' && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => handleBump(l.id)}
                      disabled={bumping || !canBump(l)}
                      title={canBump(l) ? 'Remettre en tête du fil' : `Disponible le ${nextBumpAt(l).toLocaleString('fr-FR')}`}
                      style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: canBump(l) ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: canBump(l) ? 'var(--fg-muted)' : 'var(--fg-subtle)', opacity: canBump(l) ? 1 : 0.6 }}
                    >
                      <TrendingUp size={14} /> Remonter
                    </button>
                    {bumpMessage?.id === l.id && (
                      <span style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, fontSize: '0.72rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{bumpMessage.text}</span>
                    )}
                  </div>
                )}
                {l.status === 'APPROVED' && (
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setBoostMenuFor(boostMenuFor === l.id ? null : l.id)} style={{ background: 'rgba(187, 0, 19,0.08)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: 'var(--primary)' }}>
                      <ArrowUp size={14} /> Booster
                    </button>
                    {boostMenuFor === l.id && (
                      <BoostMenu listingId={l.id} onDone={() => { setBoostMenuFor(null); void refetch() }} />
                    )}
                  </div>
                )}
              </div>
            </div>
            {offersExpanded && (
              <div style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: 'var(--bg)' }}>
                <ListingOffersPanel listingId={l.id} />
              </div>
            )}
            </div>
          )
        })}
      </div>
    </DashboardLayout>
  )
}

// ─── STATISTICS ────────────────────────────────────────────────────────────
export function SellerStats({ onNavigate, currentUser, onLogout }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  const { data, loading } = useQuery<{ myListings: { totalCount: number; items: MyListingRow[] } }>(MY_LISTINGS_QUERY, {
    variables: { page: 1, pageSize: 100 },
  })
  const myListings = data?.myListings.items ?? []
  const activeCount = myListings.filter(l => l.status === 'APPROVED').length
  const totalViews = myListings.reduce((sum, l) => sum + l.viewsCount, 0)
  const totalFavorites = myListings.reduce((sum, l) => sum + l.favoritesCount, 0)
  const engagementRate = totalViews > 0 ? ((totalFavorites / totalViews) * 100).toFixed(1) + '%' : '—'

  const byViews = [...myListings].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 6)
    .map(l => ({ name: l.title.length > 14 ? l.title.slice(0, 14) + '…' : l.title, value: l.viewsCount }))
  const byFavorites = [...myListings].sort((a, b) => b.favoritesCount - a.favoritesCount).slice(0, 6)
    .map(l => ({ name: l.title.length > 14 ? l.title.slice(0, 14) + '…' : l.title, value: l.favoritesCount }))

  return (
    <DashboardLayout active="seller-stats" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: '0 0 0.25rem' }}>Statistiques</h1>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>Analysez les performances de vos annonces</p>

      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Annonces actives', value: activeCount, icon: Package, color: '#BB0013' },
          { label: 'Vues totales', value: totalViews, icon: Eye, color: '#3B82F6' },
          { label: 'Favoris reçus', value: totalFavorites, icon: Heart, color: '#EC4899' },
          { label: "Taux d'engagement", value: engagementRate, icon: Users, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 900, fontSize: '1.6rem' }}>{loading ? '—' : s.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Vues par annonce</h2>
          {!loading && byViews.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Aucune donnée pour le moment.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={byViews}>
                <defs>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#BB0013" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#BB0013" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="value" stroke="#BB0013" strokeWidth={2} fill="url(#gViews)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Favoris par annonce</h2>
          {!loading && byFavorites.length === 0 ? (
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem' }}>Aucune donnée pour le moment.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={byFavorites}>
                <defs>
                  <linearGradient id="gFavorites" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#gFavorites)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export { default as SellerPremium } from './Booster'
