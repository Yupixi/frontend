import React, { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  LayoutDashboard, Plus, Package, BarChart2, CreditCard, Award, Eye, Heart,
  MessageCircle, TrendingUp, TrendingDown, CheckCircle, XCircle, Edit3,
  Trash2, ChevronRight, Upload, MapPin, Tag, Image, Star, ArrowUp,
  DollarSign, Users, AlertCircle, Home, Settings,
  Bell, LogOut, ChevronDown, Menu, X,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { listings, viewStats, cities } from '../../data/mockData'
import Price from '../../components/Price'
import RichTextEditor from '../../components/RichTextEditor'
import { CATEGORIES_QUERY, type RemoteCategory } from '../../graphql/categories'
import {
  ATTACH_LISTING_MEDIA_MUTATION,
  CREATE_LISTING_MUTATION,
  DELETE_LISTING_MUTATION,
  MY_LISTINGS_QUERY,
  SUBMIT_LISTING_FOR_REVIEW_MUTATION,
  type MyListingRow,
} from '../../graphql/listings'
import { getAccessToken } from '../../lib/auth'
import { uploadImages } from '../../lib/upload'
import type { AuthUser } from '../../graphql/auth'

// ─── DASHBOARD LAYOUT ─────────────────────────────────────────────────────

function DashboardHeader({ activeLabel, currentUser, onBack, onToggleSidebar, onNavigate, onLogout }: { activeLabel: string; currentUser?: AuthUser | null; onBack: () => void; onToggleSidebar?: () => void; onNavigate: (p: any) => void; onLogout: () => void }) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const displayName = currentUser?.fullName || 'Mon compte'
  const displayInitial = displayName.charAt(0).toUpperCase()
  return (
    <header className="dashboard-header" style={{
      height: 60, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 1.25rem', gap: '0.75rem',
      flexShrink: 0,
    }}>
      <button className="dashboard-sidebar-mobile-btn" onClick={onToggleSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)' }}>
        <Menu size={20} />
      </button>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: '0.85rem', fontWeight: 600, padding: '4px 10px', borderRadius: 8, transition: 'all 0.12s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        ← Retour au site
      </button>
      <h1 className="desktop-only" style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.95rem', color: 'var(--fg)' }}>{activeLabel}</h1>
      <div style={{ flex: 1 }} />
      <button onClick={() => onNavigate('buyer-notifications')} style={{ background: 'none', border: 'none', cursor: 'pointer', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', transition: 'all 0.12s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Bell size={18} />
      </button>
      <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
      <div style={{ position: 'relative' }}>
        <button onClick={() => setUserMenuOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 10, cursor: 'pointer', background: 'none', border: 'none', transition: 'all 0.12s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: 30, height: 30, borderRadius: 10, background: 'linear-gradient(135deg, #FE0000, #FF6B35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.8rem', fontFamily: "'Outfit', sans-serif" }}>{displayInitial}</div>
          <div className="desktop-only" style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.78rem', lineHeight: 1.2 }}>{displayName}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--fg-subtle)' }}>{currentUser?.email ?? ''}</div>
          </div>
          <ChevronDown size={14} style={{ color: 'var(--fg-subtle)' }} />
        </button>

        {userMenuOpen && (
          <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: 220, zIndex: 200, padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            {[
              { icon: Home, label: 'Espace Acheteur', page: 'buyer-dashboard' as const },
              { icon: Settings, label: 'Paramètres du compte', page: 'buyer-settings' as const },
            ].map(item => (
              <button
                key={item.page}
                onClick={() => { onNavigate(item.page); setUserMenuOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.85rem', borderRadius: 8, textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
              <button
                onClick={() => { setUserMenuOpen(false); onLogout() }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.85rem', borderRadius: 8, textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={16} />
                Se déconnecter
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

const sidebarItems = [
  { key: 'seller-dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { key: 'seller-post', icon: Plus, label: 'Publier une annonce' },
  { key: 'seller-listings', icon: Package, label: 'Mes annonces' },
  { key: 'seller-stats', icon: BarChart2, label: 'Statistiques' },
  { key: 'seller-payments', icon: CreditCard, label: 'Paiements & Transactions' },
  { key: 'seller-premium', icon: Award, label: 'Abonnement Premium' },
]

function SidebarNav({ active, onNavigate, onClose, listingsCount }: { active: string; onNavigate: (p: any) => void; onClose?: () => void; listingsCount?: number }) {
  return (
    <>
      {sidebarItems.map(item => {
        const badge = item.key === 'seller-listings' ? listingsCount : undefined
        return (
          <button
            key={item.key}
            onClick={() => { onNavigate(item.key); onClose?.() }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '0.6rem 0.75rem', border: 'none', borderRadius: 10,
              cursor: 'pointer', marginBottom: 2,
              background: active === item.key ? 'rgba(254,0,0,0.07)' : 'transparent',
              color: active === item.key ? '#FE0000' : 'var(--fg-muted)',
              fontFamily: "'Outfit', 'Nunito', sans-serif",
              fontWeight: active === item.key ? 800 : 600,
              fontSize: '0.85rem',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { if (active !== item.key) e.currentTarget.style.background = 'var(--border-subtle)' }}
            onMouseLeave={e => { if (active !== item.key) e.currentTarget.style.background = 'transparent' }}
          >
            <item.icon size={18} strokeWidth={active === item.key ? 2.5 : 1.8} />
            <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
            {!!badge && (
              <span style={{
                background: active === item.key ? '#FE0000' : 'var(--border)', color: active === item.key ? '#fff' : 'var(--fg-muted)',
                borderRadius: 8, padding: '1px 8px', fontSize: '0.7rem', fontWeight: 800,
              }}>{badge}</span>
            )}
          </button>
        )
      })}
    </>
  )
}

function DashboardSidebar({ active, onNavigate, sidebarOpen, onClose, listingsCount }: { active: string; onNavigate: (p: any) => void; sidebarOpen?: boolean; onClose?: () => void; listingsCount?: number }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="dashboard-sidebar-desktop" style={{
        width: 230, background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
      }}>
        <div style={{ padding: '1rem 1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <img src="/logo-yupixi-red.svg" alt="Yüpixi" style={{ height: 30, alignSelf: 'flex-start' }} />
          <div style={{ fontSize: '0.65rem', color: 'var(--fg-subtle)', fontWeight: 600, paddingLeft: 2 }}>Espace Vendeur</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem 0.75rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-subtle)', padding: '0.5rem 0.75rem', marginBottom: 4 }}>Navigation</div>
          <SidebarNav active={active} onNavigate={onNavigate} listingsCount={listingsCount} />
        </div>
        <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => onNavigate('home')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.75rem', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'transparent', color: 'var(--fg-muted)', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={16} />
            <span>Retour au site</span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="dashboard-sidebar-overlay" style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          animation: 'fadeIn 0.15s ease-out',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => onClose?.()} />
          <aside style={{
            position: 'relative', width: 280, height: '100%', background: 'var(--bg-card)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideIn 0.2s ease-out',
          }}>
            <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/logo-yupixi-red.svg" alt="Yüpixi" style={{ height: 28 }} />
                <span className="badge" style={{ background: '#FE0000', color: '#fff', fontSize: '0.65rem', padding: '2px 8px' }}>Vendeur</span>
              </div>
              <button onClick={() => onClose?.()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
              <SidebarNav active={active} onNavigate={onNavigate} onClose={onClose} listingsCount={listingsCount} />
            </div>
            <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { onNavigate('home'); onClose?.() }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.75rem', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'transparent', color: 'var(--fg-muted)', fontFamily: "'Outfit', 'Nunito', sans-serif", fontWeight: 600, fontSize: '0.82rem' }}>
                <LogOut size={16} />
                <span>Retour au site</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function DashboardLayout({ active, onNavigate, children, currentUser, onLogout }: { active: string, onNavigate: (p: any) => void, children: React.ReactNode, currentUser?: AuthUser | null, onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: listingsData } = useQuery<{ myListings: { totalCount: number } }>(MY_LISTINGS_QUERY, { variables: { page: 1, pageSize: 1 } })
  const labels: Record<string, string> = {
    'seller-dashboard': 'Tableau de bord',
    'seller-post': 'Publier une annonce',
    'seller-listings': 'Mes annonces',
    'seller-stats': 'Statistiques',
    'seller-premium': 'Abonnement Premium',
    'seller-payments': 'Paiements',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <DashboardSidebar active={active} onNavigate={(p: string) => { setSidebarOpen(false); onNavigate(p) }} sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} listingsCount={listingsData?.myListings.totalCount} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <DashboardHeader activeLabel={labels[active] || active} currentUser={currentUser} onBack={() => onNavigate('home')} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onNavigate={onNavigate} onLogout={onLogout} />
        <main className="dashboard-main" style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

// ─── SELLER DASHBOARD ───────────────────────────────────────────────────────
export function SellerDashboard({ onNavigate, currentUser, onLogout }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  const stats = [
    { label: 'Annonces actives', value: 8, icon: Package, color: '#FE0000', bg: 'rgba(254,0,0,0.08)', trend: '+2', up: true },
    { label: 'Vues ce mois', value: '2 457', icon: Eye, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', trend: '+18%', up: true },
    { label: 'Contacts reçus', value: 84, icon: MessageCircle, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', trend: '+12', up: true },
    { label: 'Favoris reçus', value: 136, icon: Heart, color: '#EC4899', bg: 'rgba(236,72,153,0.08)', trend: '-3', up: false },
  ]

  const topListings = listings.slice(0, 4).map((l, i) => ({ ...l, rank: i + 1 }))

  return (
    <DashboardLayout active="seller-dashboard" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Tableau de bord</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>Bienvenue sur votre espace vendeur</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => onNavigate('seller-post')}>
          <Plus size={16} /> Nouvelle annonce
        </button>
      </div>

      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={20} color={s.color} />
              </div>
              {s.up ? <TrendingUp size={16} color="#10B981" /> : <TrendingDown size={16} color="#EF4444" />}
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.6rem' }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Vues des 7 derniers jours</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={viewStats}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FE0000" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#FE0000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontFamily: "'Outfit', sans-serif" }} />
            <Area type="monotone" dataKey="views" stroke="#FE0000" strokeWidth={2.5} fill="url(#colorViews)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: 0, fontSize: '1rem' }}>Meilleures annonces</h2>
          <button onClick={() => onNavigate('seller-listings')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            Voir tout <ChevronRight size={15} />
          </button>
        </div>
        {topListings.map((l, i) => (
          <div key={l.id} style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem 1.25rem', borderBottom: i < topListings.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1rem', color: l.rank <= 3 ? 'var(--primary)' : 'var(--fg-muted)', width: 22, textAlign: 'center' }}>#{l.rank}</span>
            <div style={{ width: 48, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0 }}>
              <img src={l.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</p>
              <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}><Price amount={l.price} /></span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={13} />{l.views}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Heart size={13} />{l.favorites}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}

// ─── POST LISTING ────────────────────────────────────────────────────────────
export function PostListing({ onNavigate, currentUser, onLogout }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  useEffect(() => {
    if (!getAccessToken()) onNavigate('auth')
  }, [onNavigate])

  const [step, setStep] = useState(1)
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [negotiable, setNegotiable] = useState(false)
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('Abidjan')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [customFields, setCustomFields] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const categories = categoriesData?.categories ?? []
  const [createListing, { loading: creating }] = useMutation<{ createListing: { id: string; status: string } }>(CREATE_LISTING_MUTATION)
  const [attachListingMedia, { loading: attaching }] = useMutation(ATTACH_LISTING_MEDIA_MUTATION)
  const [submitListingForReview, { loading: submittingReview }] = useMutation(SUBMIT_LISTING_FOR_REVIEW_MUTATION)
  const [uploading, setUploading] = useState(false)
  const publishing = creating || uploading || attaching || submittingReview

  const steps = ['Catégorie', 'Sous-catégorie', 'Informations', 'Photos', 'Aperçu']

  const catData = categories.find(c => c.id === categoryId)
  const subData = catData?.subcategories.find(s => s.id === subcategoryId)
  const stepsCount = steps.length

  if (success) {
    return (
      <DashboardLayout active="seller-post" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <CheckCircle size={40} color="#10B981" />
          </div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.75rem', margin: '0 0 0.75rem' }}>Annonce soumise !</h2>
          <p style={{ color: 'var(--fg-muted)', marginBottom: '2rem' }}>Votre annonce est en attente de validation par notre équipe. Elle sera visible par les acheteurs dès son approbation.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => onNavigate('seller-listings')}>Voir mes annonces</button>
            <button className="btn-outline" onClick={() => { setSuccess(false); setStep(1); setCategoryId(''); setSubcategoryId(''); setCustomFields({}); setImageFiles([]); setImagePreviews([]) }}>Publier une autre annonce</button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const noPriceCats = ['emploi', 'services', 'animaux', 'divers']
  const catSlug = catData?.slug ?? ''

  const canGoNext = () => {
    if (step === 1) return !!categoryId
    if (step === 2) return !!subcategoryId
    if (step === 3) {
      if (!title.trim() || !description.trim()) return false
      if (!noPriceCats.includes(catSlug) && !price) return false
      return true
    }
    if (step === 4) return true
    return true
  }

  const titlePlaceholders: Record<string, string> = {
    emploi: 'Ex: Chef de projet IT confirmé - Abidjan',
    vehicules: 'Ex: Toyota RAV4 2021 - Full options',
    immobilier: 'Ex: Villa F4 à louer - Cocody',
    mode: 'Ex: Robe été taille 38 - Très bon état',
    loisirs: 'Ex: Vélo VTT Giant 26 pouces',
    animaux: 'Ex: Chiot berger allemand à donner',
    electronique: 'Ex: iPhone 15 Pro 256Go - Très bon état',
    services: 'Ex: Cours de maths niveau collège et lycée',
    famille: 'Ex: Lit bébé avec matelas - Bon état',
    maison: 'Ex: Canapé d\'angle cuir cognac',
    'materiel-pro': 'Ex: Tracteur John Deere 2022',
    agriculture: 'Ex: Plants de tomates cerises bio',
    divers: 'Ex: Lot de livres à vendre',
  }

  const setCustomField = (key: string, value: string) => {
    setCustomFields(prev => ({ ...prev, [key]: value }))
  }

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return
    const remaining = 8 - imageFiles.length
    const picked = Array.from(files).slice(0, remaining)
    setImageFiles(prev => [...prev, ...picked])
    setImagePreviews(prev => [...prev, ...picked.map(f => URL.createObjectURL(f))])
  }

  const removeImage = (i: number) => {
    setImageFiles(prev => prev.filter((_, idx) => idx !== i))
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const handlePublish = async () => {
    if (!catData) return
    setSubmitError(null)
    try {
      const { data: createData } = await createListing({
        variables: {
          input: {
            categoryId: catData.id,
            subcategoryId: subcategoryId || undefined,
            title: title.trim(),
            description,
            price: noPriceCats.includes(catSlug) ? undefined : (price ? Number(price) : undefined),
            city,
            negotiable,
            attributes: customFields,
          },
        },
      })
      const listingId = createData?.createListing?.id
      if (!listingId) throw new Error('La création a échoué')

      if (imageFiles.length > 0) {
        setUploading(true)
        const urls = await uploadImages(imageFiles)
        setUploading(false)
        await attachListingMedia({ variables: { listingId, urls } })
      }

      await submitListingForReview({ variables: { id: listingId } })
      setSuccess(true)
    } catch (err) {
      setUploading(false)
      setSubmitError(err instanceof Error ? err.message : 'La publication a échoué. Réessayez.')
    }
  }

  return (
    <DashboardLayout active="seller-post" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>Publier une annonce</h1>

        <div className="seller-steps-desktop" style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', alignItems: 'center', background: 'var(--border-subtle)', borderRadius: 12, padding: '0.75rem 1rem' }}>
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: step > i + 1 ? '#10B981' : step === i + 1 ? 'var(--primary)' : 'var(--border)', color: step >= i + 1 ? '#fff' : 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, flexShrink: 0 }}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className="seller-step-label" style={{ fontSize: '0.85rem', fontWeight: step === i + 1 ? 700 : 500, color: step === i + 1 ? 'var(--fg)' : 'var(--fg-muted)', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < steps.length - 1 && <div className="seller-step-line" style={{ width: 24, height: 2, background: step > i + 1 ? '#10B981' : 'var(--border)', borderRadius: 1, flexShrink: 0 }} />}
            </React.Fragment>
          ))}
        </div>
        <div className="seller-steps-mobile" style={{ display: 'none', marginBottom: '1.25rem', background: 'var(--border-subtle)', borderRadius: 10, padding: '0.6rem 1rem', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>{step}</div>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.85rem', color: 'var(--fg)' }}>Étape {step} sur {stepsCount}</span>
          <span style={{ color: 'var(--fg-muted)', fontSize: '0.82rem', marginLeft: 'auto' }}>{steps[step - 1]}</span>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1.5rem', fontSize: '1.1rem' }}>Choisissez une catégorie</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1rem' }}>
                {categories.map(cat => {
                  const selected = categoryId === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { setCategoryId(cat.id); setSubcategoryId(''); setStep(2) }}
                      style={{
                        border: 'none', cursor: 'pointer', borderRadius: 'var(--radius)', overflow: 'hidden',
                        background: selected ? cat.color + '15' : 'transparent',
                        outline: selected ? `2px solid ${cat.color}` : '1.5px solid var(--border)',
                        outlineOffset: -1, transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { if (!selected) e.currentTarget.style.outlineColor = cat.color + '60' }}
                      onMouseLeave={e => { if (!selected) e.currentTarget.style.outlineColor = 'var(--border)' }}
                    >
                      <div style={{ padding: '1.25rem 0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                          {cat.icon}
                        </div>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.82rem', color: selected ? cat.color : 'var(--fg)', textAlign: 'center', lineHeight: 1.2 }}>{cat.name}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 2 && catData && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: catData.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  {catData.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1rem' }}>{catData.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>Choisissez une sous-catégorie</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {catData.subcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => { setSubcategoryId(sub.id); setStep(3) }}
                    style={{
                      padding: '0.85rem 1.25rem', border: '1.5px solid', cursor: 'pointer', textAlign: 'left',
                      borderColor: subcategoryId === sub.id ? catData.color : 'var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      background: subcategoryId === sub.id ? catData.color + '0A' : 'var(--bg-card)',
                      fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', color: subcategoryId === sub.id ? catData.color : 'var(--fg)',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { if (subcategoryId !== sub.id) e.currentTarget.style.borderColor = catData.color + '60' }}
                    onMouseLeave={e => { if (subcategoryId !== sub.id) e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
              <button className="btn-outline" style={{ marginTop: '1.25rem' }} onClick={() => setStep(1)}>← Changer de catégorie</button>
            </div>
          )}

          {step === 3 && catData && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: catData.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  {catData.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '1.05rem' }}>{catData.name}</div>
                  <div style={{ fontSize: '0.78rem', color: catData.color, fontWeight: 600 }}>{subData?.name}</div>
                </div>
              </div>

              <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Titre de l'annonce *</label>
                  <input className="input" placeholder={titlePlaceholders[catSlug] || 'Ex: Titre de votre annonce'} value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: 4 }}>{title.length}/100 caractères</div>
                </div>

                {!noPriceCats.includes(catSlug) && (
                  <div>
                    <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Prix (FCFA) *</label>
                    <div style={{ position: 'relative' }}>
                      <Tag size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
                      <input className="input" style={{ paddingLeft: 40 }} placeholder="Ex: 150 000" value={price} onChange={e => setPrice(e.target.value)} type="number" />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
                      <input type="checkbox" checked={negotiable} onChange={e => setNegotiable(e.target.checked)} style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} /> Prix négociable
                    </label>
                  </div>
                )}

                <div>
                  <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Ville</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: catData.color }} />
                    <select className="input" style={{ paddingLeft: 40 }} value={city} onChange={e => setCity(e.target.value)}>
                      {cities.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {catData.attributes.map(field => (
                  <div key={field.key}>
                    <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>
                      {field.label}{field.required ? ' *' : ''}
                    </label>
                    {field.type === 'SELECT' && field.options.length > 0 ? (
                      <select className="input" value={customFields[field.key] || ''} onChange={e => setCustomField(field.key, e.target.value)}>
                        <option value="">Sélectionnez...</option>
                        {field.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input className="input" type={field.type === 'NUMBER' ? 'number' : 'text'} placeholder={field.label} value={customFields[field.key] || ''} onChange={e => setCustomField(field.key, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Description *</label>
                <RichTextEditor content={description} onChange={onChange => setDescription(onChange)} placeholder="Décrivez votre article en détail... (gras, titres, listes, liens...)" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Ajoutez vos photos</h2>
              <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>La première photo sera la photo principale. Maximum 8 photos.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
                {imagePreviews.map((src, i) => (
                  <div key={src} style={{ aspectRatio: '1', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {i === 0 && (
                      <span style={{ position: 'absolute', top: 6, left: 6, background: 'var(--primary)', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>Principale</span>
                    )}
                    <button
                      onClick={() => removeImage(i)}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                {imageFiles.length < 8 && (
                  <label style={{ aspectRatio: '1', border: '2px dashed var(--primary)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', background: 'rgba(254,0,0,0.02)' }}>
                    <Upload size={28} color="var(--primary)" />
                    <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>Ajouter</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => { handleFilesSelected(e.target.files); e.target.value = '' }}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {step === 5 && catData && (
            <div>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1.5rem', fontSize: '1.1rem' }}>Aperçu de votre annonce</h2>
              <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ height: 220, background: `linear-gradient(135deg, ${catData.color}10 0%, var(--border) 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {imagePreviews[0] ? (
                      <img src={imagePreviews[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Image size={48} color="var(--fg-subtle)" />
                    )}
                  </div>
                  <div style={{ padding: '1.25rem' }}>
                    {!noPriceCats.includes(catSlug) && <div className="price-tag" style={{ fontSize: '1.1rem' }}><Price amount={price ? parseInt(price) : 0} /></div>}
                    {noPriceCats.includes(catSlug) && customFields.salaire && <div className="price-tag" style={{ fontSize: '1.1rem', color: '#6366F1' }}><Price amount={Number(customFields.salaire)} />/mois</div>}
                    <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '8px 0 10px', fontSize: '1.1rem' }}>{title || 'Titre de votre annonce'}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} />{city}</span>
                      <span className="badge" style={{ background: catData.color + '15', color: catData.color }}>{catData.name}</span>
                    </div>
                    <div style={{ marginTop: 12, fontSize: '0.875rem', color: 'var(--fg)', lineHeight: 1.7, maxHeight: 200, overflow: 'auto' }} dangerouslySetInnerHTML={{ __html: description || '<em>Aucune description</em>' }} />
                  </div>
                </div>
                <div className="card" style={{ padding: '1.25rem', background: 'rgba(254,0,0,0.03)', border: '1px solid rgba(254,0,0,0.15)', alignSelf: 'start' }}>
                  {submitError && (
                    <div style={{ marginBottom: 12, padding: '0.6rem 0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.85rem', fontWeight: 600 }}>
                      {submitError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertCircle size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>Avant de publier</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem', color: 'var(--fg-muted)', lineHeight: 1.8 }}>
                        <li>Votre annonce sera publiée immédiatement</li>
                        <li>Elle sera visible dans les résultats de recherche</li>
                        <li>Respectez nos conditions d'utilisation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            {step > 1 && (
              <button className="btn-outline" onClick={() => setStep(s => s - 1)}>← Précédent</button>
            )}
            {step < stepsCount ? (
              <button className="btn-primary" onClick={() => canGoNext() && setStep(s => s + 1)} disabled={!canGoNext()} style={{ opacity: canGoNext() ? 1 : 0.5 }}>Suivant →</button>
            ) : (
              <button className="btn-primary" style={{ background: '#10B981', borderColor: '#10B981', opacity: publishing ? 0.7 : 1 }} onClick={handlePublish} disabled={publishing}>
                {publishing ? 'Publication...' : "✓ Publier l'annonce"}
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// ─── MY LISTINGS ─────────────────────────────────────────────────────────────
const LISTING_STATUS_META: Record<string, { bg: string, color: string, label: string }> = {
  DRAFT: { bg: 'rgba(100,116,139,0.1)', color: '#64748B', label: 'Brouillon' },
  PENDING_REVIEW: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'En attente de validation' },
  APPROVED: { bg: 'rgba(16,185,129,0.1)', color: '#10B981', label: 'En ligne' },
  REJECTED: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', label: 'Rejetée' },
  EXPIRED: { bg: 'rgba(100,116,139,0.1)', color: '#64748B', label: 'Expirée' },
  SOLD: { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6', label: 'Vendue' },
  PAUSED: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'En pause' },
}

export function SellerListings({ onNavigate, onSelectListing, currentUser, onLogout }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  const [filter, setFilter] = useState('all')
  const { data, loading, refetch } = useQuery<{ myListings: { totalCount: number; items: MyListingRow[] } }>(
    MY_LISTINGS_QUERY,
    { variables: { page: 1, pageSize: 100 } },
  )
  const [deleteListing] = useMutation(DELETE_LISTING_MUTATION)

  const myListings = data?.myListings.items ?? []
  const filtered = filter === 'all' ? myListings : myListings.filter(l => l.status === filter)

  const handleDelete = (id: string, title: string) => {
    if (!window.confirm(`Supprimer "${title}" ? Cette action est irréversible.`)) return
    void deleteListing({ variables: { id } }).then(() => refetch())
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
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Mes annonces ({myListings.length})</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>Gérez vos annonces</p>
        </div>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => onNavigate('seller-post')}>
          <Plus size={16} /> Nouvelle annonce
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--border-subtle)', borderRadius: 10, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {filterTabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{ padding: '0.55rem 1rem', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.82rem', background: filter === t.key ? 'var(--bg-card)' : 'transparent', color: filter === t.key ? 'var(--primary)' : 'var(--fg-muted)', boxShadow: filter === t.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fg-muted)' }}>Chargement...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--fg-muted)', marginBottom: '1rem' }}>Aucune annonce dans cette catégorie.</p>
            <button className="btn-primary" onClick={() => onNavigate('seller-post')}>Publier une annonce</button>
          </div>
        )}
        {filtered.map((l, i) => {
          const s = LISTING_STATUS_META[l.status] ?? LISTING_STATUS_META.DRAFT
          return (
            <div key={l.id} style={{ display: 'flex', gap: '0.875rem', padding: '1rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
              <div style={{ width: 72, height: 56, borderRadius: 8, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0, cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>
                {l.coverImageUrl && (
                  <img src={l.coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>{l.title}</p>
                  <span className="badge" style={{ background: s.bg, color: s.color, flexShrink: 0, fontSize: '0.72rem' }}>{s.label}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                  <span className="price-tag" style={{ fontSize: '0.9rem' }}><Price amount={l.price} /></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={12} />{l.viewsCount}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Heart size={12} />{l.favoritesCount}</span>
                  <span>{new Date(l.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => onNavigate('seller-edit')} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--fg-muted)' }}>
                  <Edit3 size={14} /> Modifier
                </button>
                <button onClick={() => handleDelete(l.id, l.title)} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EF4444' }}>
                  <Trash2 size={15} />
                </button>
                {l.status === 'APPROVED' && (
                  <button style={{ background: 'rgba(254,0,0,0.08)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, color: 'var(--primary)' }}>
                    <ArrowUp size={14} /> Booster
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </DashboardLayout>
  )
}

// ─── STATISTICS ────────────────────────────────────────────────────────────
export function SellerStats({ onNavigate, currentUser, onLogout }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  return (
    <DashboardLayout active="seller-stats" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: '0 0 0.25rem' }}>Statistiques</h1>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>Analysez les performances de vos annonces</p>

      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Vues totales', value: '12 457', trend: '+18%', icon: Eye, color: '#3B82F6' },
          { label: 'Contacts', value: 342, trend: '+24%', icon: MessageCircle, color: '#8B5CF6' },
          { label: 'Favoris', value: 568, trend: '+12%', icon: Heart, color: '#EC4899' },
          { label: 'Taux de contact', value: '2.7%', trend: '+0.3%', icon: Users, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.6rem' }}>{s.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
              <TrendingUp size={12} color="#10B981" />
              <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>{s.trend} ce mois</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Vues quotidiennes</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={viewStats}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FE0000" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#FE0000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="views" stroke="#FE0000" strokeWidth={2} fill="url(#g1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Contacts reçus</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={viewStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Bar dataKey="contacts" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  )
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────
export function SellerPayments({ onNavigate, currentUser, onLogout }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  const transactions = [
    { id: 'T001', type: 'Boost annonce', amount: -5000, date: '28 Jan 2024', status: 'success', method: '🟠 Orange Money' },
    { id: 'T002', type: 'Abonnement Pro (mensuel)', amount: -25000, date: '15 Jan 2024', status: 'success', method: '🟡 MTN MoMo' },
    { id: 'T003', type: 'Vente - iPhone 15 Pro', amount: 450000, date: '10 Jan 2024', status: 'success', method: '🔵 Wave' },
    { id: 'T004', type: 'Boost annonce', amount: -5000, date: '05 Jan 2024', status: 'failed', method: '🟠 Orange Money' },
    { id: 'T005', type: 'Abonnement Pro (mensuel)', amount: -25000, date: '15 Déc 2023', status: 'success', method: '🟡 MTN MoMo' },
  ]

  return (
    <DashboardLayout active="seller-payments" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.5rem', margin: '0 0 0.25rem' }}>Paiements & Transactions</h1>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>Gérez vos méthodes de paiement et suivez vos transactions</p>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Méthodes de paiement</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { name: 'Orange Money', num: '+225 07 12 34 56', emoji: '🟠', active: true },
            { name: 'MTN MoMo', num: '+225 05 98 76 54', emoji: '🟡', active: true },
            { name: 'Wave', num: 'Non configuré', emoji: '🔵', active: false },
          ].map(mm => (
            <div key={mm.name} style={{ flex: 1, minWidth: 160, border: `1.5px solid ${mm.active ? 'var(--border)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', padding: '0.875rem', background: mm.active ? 'var(--bg-card)' : 'var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: '1.25rem' }}>{mm.emoji}</span>
                {mm.active ? <CheckCircle size={16} color="#10B981" /> : <XCircle size={16} color="var(--fg-subtle)" />}
              </div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem' }}>{mm.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 2 }}>{mm.num}</div>
              {!mm.active && <button style={{ marginTop: 8, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>+ Ajouter</button>}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: 0, fontSize: '1rem' }}>Historique des transactions</h2>
        </div>
        {transactions.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem 1.25rem', borderBottom: i < transactions.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: t.amount > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {t.amount > 0 ? <ArrowUp size={18} color="#10B981" /> : <DollarSign size={18} color="#EF4444" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.875rem' }}>{t.type}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 2 }}>{t.method} · {t.date}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '0.95rem', color: t.amount > 0 ? '#10B981' : 'var(--fg)' }}>
                {t.amount > 0 ? '+' : ''}<Price amount={t.amount} />
              </div>
              <span className="badge" style={{ fontSize: '0.7rem', background: t.status === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: t.status === 'success' ? '#10B981' : '#EF4444' }}>
                {t.status === 'success' ? '✓ Réussi' : '✗ Échoué'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}

// ─── PREMIUM ─────────────────────────────────────────────────────────────────
export function SellerPremium({ onNavigate, currentUser, onLogout }: { onNavigate: (p: any) => void, currentUser?: AuthUser | null, onLogout: () => void }) {
  const plans = [
    {
      name: 'Gratuit',
      price: 0,
      color: '#6B7280',
      features: ['5 annonces actives', '3 photos par annonce', 'Statistiques de base', 'Support email'],
      current: true,
    },
    {
      name: 'Pro',
      price: 25000,
      color: '#FE0000',
      features: ['Annonces illimitées', '10 photos par annonce', 'Statistiques avancées', '3 boosts par mois', 'Badge Vendeur Pro', 'Support prioritaire', 'Mise en avant dans la recherche'],
      highlight: true,
      current: false,
    },
    {
      name: 'Business',
      price: 75000,
      color: '#8B5CF6',
      features: ['Tout ce qui est dans Pro', 'Annonces sponsorisées', '20 boosts par mois', 'Page boutique dédiée', 'API access', 'Manager dédié', 'Rapports personnalisés'],
      current: false,
    },
  ]

  return (
    <DashboardLayout active="seller-premium" onNavigate={onNavigate} currentUser={currentUser} onLogout={onLogout}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="badge badge-orange" style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>⭐ Plans Premium</div>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '2rem', margin: '0 0 0.75rem' }}>Boostez vos ventes</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '1rem' }}>Choisissez le plan qui correspond à vos besoins</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {plans.map(plan => (
          <div key={plan.name} className="card" style={{ padding: '1.75rem', border: plan.highlight ? `2px solid var(--primary)` : '1px solid var(--border)', position: 'relative', transform: plan.highlight ? 'scale(1.02)' : 'none' }}>
            {plan.highlight && (
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#fff', padding: '4px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800 }}>⭐ Le plus populaire</div>
            )}
            {plan.current && (
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#6B7280', color: '#fff', padding: '4px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800 }}>Plan actuel</div>
            )}
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: '1.2rem', color: plan.color, margin: '0 0 0.75rem' }}>{plan.name}</h2>
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: plan.price === 0 ? '1.5rem' : '2rem' }}>
                {plan.price === 0 ? 'Gratuit' : <Price amount={plan.price} />}
              </span>
              {plan.price > 0 && <span style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}> / mois</span>}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', gap: 8, fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
                  <CheckCircle size={16} color={plan.color} style={{ flexShrink: 0, marginTop: 1 }} />
                  {f}
                </li>
              ))}
            </ul>
            <button className={plan.current ? 'btn-outline' : 'btn-primary'} style={{ width: '100%', padding: '0.75rem', background: plan.current ? undefined : plan.color, borderColor: plan.color, color: plan.current ? plan.color : '#fff' }} disabled={plan.current}>
              {plan.current ? 'Plan actuel' : `Choisir ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, margin: '0 0 1rem', fontSize: '1rem' }}>💳 Paiement sécurisé via Mobile Money</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { name: 'Orange Money', emoji: '🟠', color: '#FF6600' },
            { name: 'MTN MoMo', emoji: '🟡', color: '#FFD700' },
            { name: 'Wave', emoji: '🔵', color: '#009EFF' },
            { name: 'Carte bancaire', emoji: '💳', color: '#1A1A1A' },
          ].map(mm => (
            <div key={mm.name} className="mobile-money-badge">{mm.emoji} {mm.name}</div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
