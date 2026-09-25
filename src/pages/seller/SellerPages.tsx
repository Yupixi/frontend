import { useMutation, useQuery } from '@apollo/client/react'
import {
  Plus,
  Eye,
  Heart,
  Package,
  X,
  Clock,
  ChevronRight,
  Users,
  Check,
} from '../../components/icons'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Price from '../../components/Price'
import {
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
export { default as PostListing } from './PostListing'


// front — avoids an N+1 burst of queries when the list first renders.
export function ListingOffersPanel({ listingId }: { listingId: string }) {
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

export { default as SellerListings } from './MyListings'


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
