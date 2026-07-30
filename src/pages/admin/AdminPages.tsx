import { useState } from 'react'
import {
  LayoutDashboard, Users, Package, Tag, Flag, BarChart2, Settings,
  Shield, CheckCircle, XCircle, Eye, Trash2, Edit3, AlertCircle,
  TrendingUp, UserCheck, UserX, Search, Filter, ChevronDown,
  MapPin, Star, Clock, Bell, Globe, Lock, Database,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts'
import { listings, sellers, categories } from '../../data/mockData'

type AdminSidebarProps = { active: string; onNavigate: (page: any) => void }

function AdminSidebar({ active, onNavigate }: AdminSidebarProps) {
  const items = [
    { key: 'admin-dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { key: 'admin-users', icon: Users, label: 'Utilisateurs', badge: '4.2K' },
    { key: 'admin-listings', icon: Package, label: 'Annonces', badge: '85K' },
    { key: 'admin-categories', icon: Tag, label: 'Catégories' },
    { key: 'admin-reports', icon: Flag, label: 'Signalements', badge: 12 },
    { key: 'admin-stats', icon: BarChart2, label: 'Statistiques' },
    { key: 'admin-config', icon: Settings, label: 'Configuration' },
  ]
  return (
    <aside className="sidebar" style={{ position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto', paddingTop: '0.75rem' }}>
      <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Shield size={12} color="var(--primary)" /> Administration
      </div>
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => onNavigate(item.key)}
          className={`sidebar-item ${active === item.key ? 'active' : ''}`}
          style={{ width: '100%', border: 'none', position: 'relative' }}
        >
          <item.icon size={18} />
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.badge && <span style={{ background: active === item.key ? 'var(--primary)' : 'var(--border)', color: active === item.key ? '#fff' : 'var(--fg-muted)', borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 800 }}>{item.badge}</span>}
        </button>
      ))}
    </aside>
  )
}

function PageLayout({ active, onNavigate, children }: { active: string, onNavigate: (p: any) => void, children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', maxWidth: 1280, margin: '0 auto' }}>
      <AdminSidebar active={active} onNavigate={onNavigate} />
      <div style={{ flex: 1, padding: '2rem', minWidth: 0 }}>{children}</div>
    </div>
  )
}

const platformStats = [
  { date: 'Jan', users: 3200, listings: 12400, revenue: 850000 },
  { date: 'Fév', users: 3450, listings: 13100, revenue: 920000 },
  { date: 'Mar', users: 3800, listings: 14200, revenue: 1050000 },
  { date: 'Avr', users: 4100, listings: 15800, revenue: 1120000 },
  { date: 'Mai', users: 4300, listings: 16400, revenue: 1250000 },
  { date: 'Jun', users: 4700, listings: 18200, revenue: 1380000 },
  { date: 'Jul', users: 5100, listings: 20000, revenue: 1520000 },
]

const catData = [
  { name: 'Électronique', value: 28, color: '#8B5CF6' },
  { name: 'Immobilier', value: 22, color: '#3B82F6' },
  { name: 'Véhicules', value: 18, color: '#F59E0B' },
  { name: 'Mode', value: 14, color: '#EC4899' },
  { name: 'Services', value: 10, color: '#EF4444' },
  { name: 'Autres', value: 8, color: '#6B7280' },
]

// ─── ADMIN DASHBOARD ────────────────────────────────────────────────────────
export function AdminDashboard({ onNavigate }: { onNavigate: (p: any) => void }) {
  const kpis = [
    { label: 'Utilisateurs total', value: '42 310', icon: Users, color: '#3B82F6', trend: '+8.4% ce mois' },
    { label: 'Annonces actives', value: '85 240', icon: Package, color: '#FE0000', trend: '+12.1% ce mois' },
    { label: 'Signalements', value: 12, icon: Flag, color: '#EF4444', trend: '3 critiques' },
    { label: 'Revenus FCFA', value: '1.52M', icon: BarChart2, color: '#10B981', trend: '+14.2% ce mois' },
  ]

  const recentActions = [
    { icon: UserCheck, text: 'Nouvel utilisateur vérifié : Aya Koné', time: 'Il y a 5 min', color: '#10B981' },
    { icon: Flag, text: 'Signalement annonce #12345 résolu', time: 'Il y a 12 min', color: '#F59E0B' },
    { icon: XCircle, text: 'Annonce "iPhone XR faux" supprimée', time: 'Il y a 23 min', color: '#EF4444' },
    { icon: CheckCircle, text: 'Annonce #78901 validée avec succès', time: 'Il y a 45 min', color: '#3B82F6' },
    { icon: UserX, text: 'Compte #4523 suspendu pour fraude', time: 'Il y a 1h', color: '#EF4444' },
  ]

  return (
    <PageLayout active="admin-dashboard" onNavigate={onNavigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Tableau de bord Admin</h1>
          <p style={{ color: 'var(--fg-muted)', margin: '4px 0 0', fontSize: '0.875rem' }}>Lundi 28 janvier 2024, Abidjan</p>
        </div>
        <div className="badge badge-red" style={{ fontSize: '0.8rem' }}>
          <Shield size={12} /> Mode Admin
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {kpis.map(k => (
          <div key={k.label} className="stat-card">
            <div className="stat-icon" style={{ background: k.color + '15' }}>
              <k.icon size={22} color={k.color} />
            </div>
            <div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.6rem' }}>{k.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{k.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                <TrendingUp size={11} color={k.color} />
                <span style={{ fontSize: '0.72rem', color: k.color, fontWeight: 700 }}>{k.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* User growth chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Croissance de la plateforme</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={platformStats}>
              <defs>
                <linearGradient id="u" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="l" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FE0000" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#FE0000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} fill="url(#u)" name="Utilisateurs" />
              <Area type="monotone" dataKey="listings" stroke="#FE0000" strokeWidth={2} fill="url(#l)" name="Annonces" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category distribution */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1rem', fontSize: '1rem' }}>Répartition catégories</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                {catData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {catData.slice(0, 4).map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'var(--fg-muted)' }}>{c.name}</span>
                <span style={{ fontWeight: 700, color: 'var(--fg)' }}>{c.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: 0, fontSize: '1rem' }}>Activité récente</h2>
        </div>
        {recentActions.map((action, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem 1.25rem', borderBottom: i < recentActions.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: action.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <action.icon size={16} color={action.color} />
            </div>
            <div style={{ flex: 1, fontSize: '0.875rem', color: 'var(--fg)' }}>{action.text}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-subtle)', flexShrink: 0 }}>{action.time}</div>
          </div>
        ))}
      </div>
    </PageLayout>
  )
}

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────
export function AdminUsers({ onNavigate }: { onNavigate: (p: any) => void }) {
  const [search, setSearch] = useState('')
  const users = [
    ...sellers,
    ...sellers.map(s => ({ ...s, id: s.id + 'x', name: s.name + ' (bis)', verified: false, badge: undefined })),
  ].slice(0, 6).map((s, i) => ({
    ...s,
    email: `${s.name.toLowerCase().replace(/ /g, '.')}@email.ci`,
    role: ['buyer', 'seller', 'seller', 'buyer', 'admin', 'buyer'][i] as 'buyer' | 'seller' | 'admin',
    status: ['active', 'active', 'suspended', 'active', 'active', 'pending'][i] as 'active' | 'suspended' | 'pending',
    joined: ['28 Jan 2024', '15 Jan 2024', '10 Jan 2024', '5 Jan 2024', '15 Déc 2023', '20 Nov 2023'][i],
    listings: [23, 15, 8, 42, 0, 3][i],
  }))

  const statusColors: Record<string, { bg: string, color: string, label: string }> = {
    active: { bg: 'rgba(16,185,129,0.1)', color: '#10B981', label: 'Actif' },
    suspended: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', label: 'Suspendu' },
    pending: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'En attente' },
  }

  return (
    <PageLayout active="admin-users" onNavigate={onNavigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Gestion des utilisateurs</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
            <input className="input" style={{ paddingLeft: 32, width: 220 }} placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}>
            <Filter size={15} /> Filtrer
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: '42 310', color: 'var(--fg)' },
          { label: 'Actifs', value: '38 450', color: '#10B981' },
          { label: 'Suspendus', value: '340', color: '#EF4444' },
          { label: 'En attente', value: '3 520', color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '0.875rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.4rem', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--border-subtle)', borderBottom: '1px solid var(--border)' }}>
              {['Utilisateur', 'Email', 'Rôle', 'Annonces', 'Statut', 'Inscription', 'Actions'].map(h => (
                <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const s = statusColors[u.status]
              const roleColors: Record<string, string> = { buyer: '#3B82F6', seller: '#8B5CF6', admin: '#FE0000' }
              return (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <img src={u.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{u.name}</div>
                        {u.verified && <div style={{ fontSize: '0.72rem', color: '#3B82F6', display: 'flex', alignItems: 'center', gap: 2 }}><Shield size={10} fill="#3B82F6" />Vérifié</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.82rem', color: 'var(--fg-muted)' }}>{u.email}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span className="badge" style={{ background: roleColors[u.role] + '15', color: roleColors[u.role], fontSize: '0.72rem' }}>
                      {u.role === 'buyer' ? '👤 Acheteur' : u.role === 'seller' ? '🏪 Vendeur' : '🛡️ Admin'}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 700 }}>{u.listings}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span className="badge" style={{ background: s.bg, color: s.color, fontSize: '0.72rem' }}>{s.label}</span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{u.joined}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 6, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--fg-muted)' }}><Eye size={13} /></button>
                      <button style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 6, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#F59E0B' }}><Edit3 size={13} /></button>
                      <button style={{ background: 'none', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 6, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EF4444' }}><UserX size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </PageLayout>
  )
}

// ─── ADMIN LISTINGS ──────────────────────────────────────────────────────────
export function AdminListings({ onNavigate, onSelectListing }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void }) {
  const [filter, setFilter] = useState('pending')
  const adminListings = listings.map((l, i) => ({
    ...l,
    adminStatus: ['pending', 'approved', 'approved', 'pending', 'rejected', 'approved', 'pending', 'approved'][i] as 'pending' | 'approved' | 'rejected',
  }))

  const filtered = filter === 'all' ? adminListings : adminListings.filter(l => l.adminStatus === filter)

  return (
    <PageLayout active="admin-listings" onNavigate={onNavigate}>
      <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>Modération des annonces</h1>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--border-subtle)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'pending', label: `En attente (${adminListings.filter(l => l.adminStatus === 'pending').length})` },
          { key: 'approved', label: `Approuvées (${adminListings.filter(l => l.adminStatus === 'approved').length})` },
          { key: 'rejected', label: `Rejetées (${adminListings.filter(l => l.adminStatus === 'rejected').length})` },
          { key: 'all', label: 'Toutes' },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{ padding: '0.55rem 1rem', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.82rem', background: filter === t.key ? 'var(--bg-card)' : 'transparent', color: filter === t.key ? 'var(--primary)' : 'var(--fg-muted)', boxShadow: filter === t.key ? 'var(--shadow-sm)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.map((l, i) => (
          <div key={l.id} style={{ display: 'flex', gap: '0.875rem', padding: '1rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
            <div style={{ width: 72, height: 56, borderRadius: 8, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0, cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>
              <img src={l.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                <p style={{ margin: 0, fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</p>
                <span className="badge" style={{
                  background: l.adminStatus === 'approved' ? 'rgba(16,185,129,0.1)' : l.adminStatus === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                  color: l.adminStatus === 'approved' ? '#10B981' : l.adminStatus === 'pending' ? '#F59E0B' : '#EF4444',
                  fontSize: '0.72rem', flexShrink: 0,
                }}>
                  {l.adminStatus === 'approved' ? '✓ Approuvée' : l.adminStatus === 'pending' ? '⏳ En attente' : '✗ Rejetée'}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                {l.seller.name} · {l.location} · {l.date}
              </div>
            </div>
            {l.adminStatus === 'pending' && (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button style={{ background: 'rgba(16,185,129,0.1)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#10B981' }}>
                  <CheckCircle size={14} /> Approuver
                </button>
                <button style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#EF4444' }}>
                  <XCircle size={14} /> Rejeter
                </button>
                <button style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--fg-muted)' }}>
                  <Eye size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </PageLayout>
  )
}

// ─── CATEGORY MANAGEMENT ─────────────────────────────────────────────────────
export function AdminCategories({ onNavigate }: { onNavigate: (p: any) => void }) {
  return (
    <PageLayout active="admin-categories" onNavigate={onNavigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Gestion des catégories</h1>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag size={15} /> Nouvelle catégorie
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {categories.map(cat => (
          <div key={cat.id} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: cat.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  {cat.icon}
                </div>
                <div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.95rem' }}>{cat.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>{cat.count.toLocaleString('fr')} annonces</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#F59E0B' }}><Edit3 size={12} /></button>
                <button style={{ background: 'none', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EF4444' }}><Trash2 size={12} /></button>
              </div>
            </div>
            <div style={{ marginTop: '0.875rem', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {cat.subcategories.slice(0, 4).map(sub => (
                <span key={sub} className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{sub}</span>
              ))}
              {cat.subcategories.length > 4 && <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>+{cat.subcategories.length - 4}</span>}
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  )
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
export function AdminReports({ onNavigate }: { onNavigate: (p: any) => void }) {
  const reports = [
    { id: 'R001', type: 'Annonce frauduleuse', target: 'iPhone 14 - 50 000 FCFA', reporter: 'Koné Marie', time: 'Il y a 2h', priority: 'high' },
    { id: 'R002', type: 'Contenu inapproprié', target: 'Profil vendeur #4523', reporter: 'Bamba Sékou', time: 'Il y a 3h', priority: 'medium' },
    { id: 'R003', type: 'Escroquerie suspectée', target: 'Villa F6 - 5M FCFA', reporter: 'Traoré Aminata', time: 'Il y a 5h', priority: 'high' },
    { id: 'R004', type: 'Doublon d\'annonce', target: 'MacBook Pro 2022', reporter: 'Yao Ernest', time: 'Hier', priority: 'low' },
    { id: 'R005', type: 'Harcèlement', target: 'Conversation #7890', reporter: 'Diomandé Fatou', time: 'Hier', priority: 'high' },
  ]

  const priorityColors: Record<string, { bg: string, color: string, label: string }> = {
    high: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', label: 'Critique' },
    medium: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'Modérée' },
    low: { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6', label: 'Faible' },
  }

  return (
    <PageLayout active="admin-reports" onNavigate={onNavigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>
          Signalements <span style={{ color: 'var(--primary)' }}>({reports.filter(r => r.priority === 'high').length} critiques)</span>
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {reports.map(r => {
          const p = priorityColors[r.priority]
          return (
            <div key={r.id} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Flag size={20} color={p.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '0.9rem' }}>{r.type}</span>
                  <span className="badge" style={{ background: p.bg, color: p.color, fontSize: '0.72rem' }}>{p.label}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--fg)', marginBottom: 2 }}>Cible : <strong>{r.target}</strong></div>
                <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>Signalé par {r.reporter} · {r.time}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#10B981' }}>Résoudre</button>
                <button style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#EF4444' }}>Supprimer</button>
              </div>
            </div>
          )
        })}
      </div>
    </PageLayout>
  )
}

// ─── ADMIN STATISTICS ────────────────────────────────────────────────────────
export function AdminStats({ onNavigate }: { onNavigate: (p: any) => void }) {
  return (
    <PageLayout active="admin-stats" onNavigate={onNavigate}>
      <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>Statistiques plateforme</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Revenus mensuels (FCFA)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={platformStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000) + 'K'} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={(v: any) => [v.toLocaleString('fr') + ' FCFA', 'Revenus']} />
              <Bar dataKey="revenue" fill="#FE0000" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Croissance utilisateurs</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={platformStats}>
              <defs>
                <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} fill="url(#ug)" name="Utilisateurs" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Taux de conversion', value: '3.2%', icon: TrendingUp, color: '#10B981' },
          { label: 'Durée moy. session', value: '4m 23s', icon: Clock, color: '#3B82F6' },
          { label: 'Villes actives', value: 12, icon: MapPin, color: '#F59E0B' },
          { label: 'Note moy. plateforme', value: '4.7/5', icon: Star, color: '#EC4899' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color + '15' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem' }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  )
}

// ─── ADMIN CONFIG ────────────────────────────────────────────────────────────
export function AdminConfig({ onNavigate }: { onNavigate: (p: any) => void }) {
  const sections = [
    {
      title: 'Paramètres généraux',
      icon: Globe,
      fields: [
        { label: 'Nom de la plateforme', value: 'Yüpixi', type: 'text' },
        { label: 'Email de contact', value: 'contact@yupixi.ci', type: 'email' },
        { label: 'Langue par défaut', value: 'Français', type: 'select', options: ['Français', 'English'] },
        { label: 'Devise', value: 'XOF (FCFA)', type: 'select', options: ['XOF (FCFA)', 'EUR', 'USD'] },
      ],
    },
    {
      title: 'Modération',
      icon: Shield,
      toggles: [
        { label: 'Validation manuelle des annonces', desc: 'Chaque annonce nécessite une approbation admin', defaultOn: true },
        { label: 'Filtrage automatique du contenu', desc: 'Détection IA des contenus inappropriés', defaultOn: true },
        { label: 'Vérification téléphone obligatoire', desc: 'Les vendeurs doivent vérifier leur numéro', defaultOn: false },
        { label: 'Limite d\'annonces pour les gratuits', desc: 'Maximum 5 annonces pour les comptes gratuits', defaultOn: true },
      ],
    },
    {
      title: 'Notifications système',
      icon: Bell,
      toggles: [
        { label: 'Emails de bienvenue', desc: 'Envoyer un email aux nouveaux inscrits', defaultOn: true },
        { label: 'Alertes de signalements', desc: 'Notifier les admins des nouveaux signalements', defaultOn: true },
        { label: 'Rapports quotidiens', desc: 'Rapport automatique chaque matin à 8h', defaultOn: false },
      ],
    },
  ]

  return (
    <PageLayout active="admin-config" onNavigate={onNavigate}>
      <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>Configuration</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 720 }}>
        {sections.map(section => (
          <div key={section.title} className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
              <section.icon size={20} color="var(--primary)" />
              <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', margin: 0 }}>{section.title}</h2>
            </div>
            {section.fields && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {section.fields.map(field => (
                  <div key={field.label}>
                    <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>{field.label}</label>
                    {field.type === 'select' ? (
                      <select className="input">
                        {(field.options || []).map(o => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input className="input" type={field.type} defaultValue={field.value} />
                    )}
                  </div>
                ))}
              </div>
            )}
            {section.toggles && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {section.toggles.map(t => (
                  <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--border-subtle)', borderRadius: 10 }}>
                    <div>
                      <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{t.label}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 2 }}>{t.desc}</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" defaultChecked={t.defaultOn} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            )}
            {section.fields && (
              <button className="btn-primary" style={{ marginTop: '1rem', padding: '0.65rem 1.5rem' }}>Enregistrer</button>
            )}
          </div>
        ))}
      </div>
    </PageLayout>
  )
}
