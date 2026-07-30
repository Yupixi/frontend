import { useState } from 'react'
import {
  LayoutDashboard, Plus, Package, BarChart2, CreditCard, Award, Eye, Heart,
  MessageCircle, TrendingUp, TrendingDown, CheckCircle, XCircle, Edit3,
  Trash2, ChevronRight, Upload, MapPin, Tag, Image, Star, ArrowUp,
  DollarSign, Users, AlertCircle, Smartphone,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { listings, viewStats, formatPrice } from '../../data/mockData'

type SellerSidebarProps = { active: string; onNavigate: (page: any) => void }

function SellerSidebar({ active, onNavigate }: SellerSidebarProps) {
  const items = [
    { key: 'seller-dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { key: 'seller-post', icon: Plus, label: 'Publier une annonce' },
    { key: 'seller-listings', icon: Package, label: 'Mes annonces', badge: 8 },
    { key: 'seller-stats', icon: BarChart2, label: 'Statistiques' },
    { key: 'seller-payments', icon: CreditCard, label: 'Paiements' },
    { key: 'seller-premium', icon: Award, label: 'Abonnement Premium' },
  ]
  return (
    <aside className="sidebar" style={{ position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto', paddingTop: '0.75rem' }}>
      <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-subtle)' }}>
        Espace Vendeur
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
          {item.badge && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 800 }}>{item.badge}</span>}
        </button>
      ))}
    </aside>
  )
}

function PageLayout({ active, onNavigate, children }: { active: string, onNavigate: (p: any) => void, children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', maxWidth: 1280, margin: '0 auto' }}>
      <SellerSidebar active={active} onNavigate={onNavigate} />
      <div style={{ flex: 1, padding: '2rem', minWidth: 0 }}>{children}</div>
    </div>
  )
}

// ─── SELLER DASHBOARD ───────────────────────────────────────────────────────
export function SellerDashboard({ onNavigate }: { onNavigate: (p: any) => void }) {
  const stats = [
    { label: 'Annonces actives', value: 8, icon: Package, color: '#FE0000', bg: 'rgba(254,0,0,0.08)', trend: '+2', up: true },
    { label: 'Vues ce mois', value: '2 457', icon: Eye, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', trend: '+18%', up: true },
    { label: 'Contacts reçus', value: 84, icon: MessageCircle, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', trend: '+12', up: true },
    { label: 'Favoris reçus', value: 136, icon: Heart, color: '#EC4899', bg: 'rgba(236,72,153,0.08)', trend: '-3', up: false },
  ]

  const topListings = listings.slice(0, 4).map((l, i) => ({ ...l, rank: i + 1 }))

  return (
    <PageLayout active="seller-dashboard" onNavigate={onNavigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Tableau de bord vendeur</h1>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => onNavigate('seller-post')}>
          <Plus size={16} /> Nouvelle annonce
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.75rem' }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{s.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                {s.up ? <TrendingUp size={12} color="#10B981" /> : <TrendingDown size={12} color="#EF4444" />}
                <span style={{ fontSize: '0.75rem', color: s.up ? '#10B981' : '#EF4444', fontWeight: 700 }}>{s.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Views chart */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Vues des 7 derniers jours</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={viewStats}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FE0000" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#FE0000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--fg-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'Nunito, sans-serif' }} />
            <Area type="monotone" dataKey="views" stroke="#FE0000" strokeWidth={2.5} fill="url(#colorViews)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top listings */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: 0, fontSize: '1rem' }}>Meilleures annonces</h2>
          <button onClick={() => onNavigate('seller-listings')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            Voir tout <ChevronRight size={15} />
          </button>
        </div>
        {topListings.map((l, i) => (
          <div key={l.id} style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem 1.25rem', borderBottom: i < topListings.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1rem', color: l.rank <= 3 ? 'var(--primary)' : 'var(--fg-muted)', width: 20, textAlign: 'center' }}>#{l.rank}</span>
            <div style={{ width: 48, height: 40, borderRadius: 6, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0 }}>
              <img src={l.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</p>
              <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>{formatPrice(l.price)}</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={13} />{l.views}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Heart size={13} />{l.favorites}</span>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  )
}

// ─── POST LISTING ────────────────────────────────────────────────────────────
export function PostListing({ onNavigate }: { onNavigate: (p: any) => void }) {
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('Abidjan')
  const [condition, setCondition] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [success, setSuccess] = useState(false)

  const steps = ['Catégorie', 'Informations', 'Photos', 'Aperçu']

  if (success) {
    return (
      <PageLayout active="seller-post" onNavigate={onNavigate}>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <CheckCircle size={40} color="#10B981" />
          </div>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.75rem', margin: '0 0 0.75rem' }}>Annonce publiée !</h2>
          <p style={{ color: 'var(--fg-muted)', marginBottom: '2rem' }}>Votre annonce est en ligne et visible par des milliers d'acheteurs.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => onNavigate('seller-listings')}>Voir mes annonces</button>
            <button className="btn-outline" onClick={() => { setSuccess(false); setStep(1) }}>Publier une autre annonce</button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout active="seller-post" onNavigate={onNavigate}>
      <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>Publier une annonce</h1>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', alignItems: 'center' }}>
        {steps.map((s, i) => (
          <>
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: step > i + 1 ? '#10B981' : step === i + 1 ? 'var(--primary)' : 'var(--border)', color: step >= i + 1 ? '#fff' : 'var(--fg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: step === i + 1 ? 700 : 500, color: step === i + 1 ? 'var(--fg)' : 'var(--fg-muted)' }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: step > i + 1 ? '#10B981' : 'var(--border)', borderRadius: 1, maxWidth: 60 }} />}
          </>
        ))}
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: 680 }}>
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1.1rem' }}>Choisissez une catégorie</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
              {[
                { id: 'immobilier', name: 'Immobilier', icon: '🏠' },
                { id: 'vehicules', name: 'Véhicules', icon: '🚗' },
                { id: 'electronique', name: 'Électronique', icon: '📱' },
                { id: 'mode', name: 'Mode & Beauté', icon: '👗' },
                { id: 'maison', name: 'Maison', icon: '🛋️' },
                { id: 'emploi', name: 'Emploi', icon: '💼' },
                { id: 'services', name: 'Services', icon: '🔧' },
                { id: 'loisirs', name: 'Loisirs', icon: '⚽' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  style={{ padding: '1rem', border: '2px solid', borderColor: category === cat.id ? 'var(--primary)' : 'var(--border)', borderRadius: 'var(--radius-sm)', background: category === cat.id ? 'rgba(254,0,0,0.04)' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}
                >
                  <div style={{ fontSize: '1.75rem', marginBottom: 6 }}>{cat.icon}</div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.82rem', color: 'var(--fg)' }}>{cat.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: 0, fontSize: '1.1rem' }}>Détails de l'annonce</h2>
            <div>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Titre de l'annonce *</label>
              <input className="input" placeholder="Ex: iPhone 15 Pro 256Go - Très bon état" value={title} onChange={e => setTitle(e.target.value)} />
              <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: 4 }}>{title.length}/100 caractères</div>
            </div>
            <div>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Prix (FCFA) *</label>
              <div style={{ position: 'relative' }}>
                <Tag size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
                <input className="input" style={{ paddingLeft: 36 }} placeholder="Ex: 150 000" value={price} onChange={e => setPrice(e.target.value)} type="number" />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
                <input type="checkbox" style={{ accentColor: 'var(--primary)' }} /> Prix négociable
              </label>
            </div>
            <div>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 8 }}>État</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['Neuf', 'Comme neuf', 'Très bon état', 'Bon état', 'Passable'].map(c => (
                  <button key={c} onClick={() => setCondition(c)} style={{ padding: '6px 14px', border: '1.5px solid', borderColor: condition === c ? 'var(--primary)' : 'var(--border)', borderRadius: 999, background: condition === c ? 'rgba(254,0,0,0.05)' : 'var(--bg-card)', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.82rem', color: condition === c ? 'var(--primary)' : 'var(--fg-muted)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Description *</label>
              <textarea className="input" style={{ minHeight: 120, resize: 'vertical' }} placeholder="Décrivez votre article en détail..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <label style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', display: 'block', marginBottom: 6 }}>Ville</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
                <select className="input" style={{ paddingLeft: 34 }} value={city} onChange={e => setCity(e.target.value)}>
                  {['Abidjan', 'Bouaké', 'Daloa', 'Korhogo', 'Yamoussoukro', 'San-Pédro'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Ajoutez vos photos</h2>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>La première photo sera la photo principale. Maximum 8 photos.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              <div style={{ aspectRatio: '1', border: '2px dashed var(--primary)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', background: 'rgba(254,0,0,0.02)' }}>
                <Upload size={24} color="var(--primary)" />
                <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>Photo 1</span>
              </div>
              {[2,3,4,5,6,7,8].map(n => (
                <div key={n} style={{ aspectRatio: '1', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', background: 'var(--border-subtle)' }}>
                  <Image size={18} color="var(--fg-subtle)" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--fg-subtle)' }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1.1rem' }}>Aperçu de votre annonce</h2>
            <div className="card" style={{ overflow: 'hidden', marginBottom: '1.25rem' }}>
              <div style={{ height: 200, background: 'linear-gradient(135deg, var(--border-subtle) 0%, var(--border) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Image size={40} color="var(--fg-subtle)" />
              </div>
              <div style={{ padding: '1rem' }}>
                <div className="price-tag">{price ? `${parseInt(price).toLocaleString('fr')} FCFA` : '0 FCFA'}</div>
                <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '6px 0 8px', fontSize: '1rem' }}>{title || 'Titre de votre annonce'}</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--fg-muted)', display: 'flex', gap: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={12} />{city}</span>
                  <span className="badge badge-gray">{condition || 'État'}</span>
                </div>
                <p style={{ marginTop: 8, fontSize: '0.875rem', color: 'var(--fg)', lineHeight: 1.5 }}>{description || 'Description de votre annonce...'}</p>
              </div>
            </div>
            <div className="card" style={{ padding: '1rem', background: 'rgba(254,0,0,0.03)', border: '1px solid rgba(254,0,0,0.15)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', marginBottom: 4 }}>Avant de publier</div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.82rem', color: 'var(--fg-muted)', lineHeight: 1.7 }}>
                    <li>Votre annonce sera examinée par notre équipe</li>
                    <li>Elle sera visible dans les prochaines 2 heures</li>
                    <li>Respectez nos conditions d'utilisation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          {step > 1 && (
            <button className="btn-outline" onClick={() => setStep(s => s - 1)}>← Précédent</button>
          )}
          {step < 4 ? (
            <button className="btn-primary" onClick={() => setStep(s => s + 1)}>Suivant →</button>
          ) : (
            <button className="btn-primary" style={{ background: '#10B981', borderColor: '#10B981' }} onClick={() => setSuccess(true)}>
              ✓ Publier l'annonce
            </button>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

// ─── MY LISTINGS ─────────────────────────────────────────────────────────────
export function SellerListings({ onNavigate, onSelectListing }: { onNavigate: (p: any) => void, onSelectListing: (id: string) => void }) {
  const [filter, setFilter] = useState('all')
  const myListings = listings.map(l => ({
    ...l,
    status: ['active', 'active', 'active', 'paused', 'expired', 'active', 'active', 'active'][listings.indexOf(l) % 8] as 'active' | 'paused' | 'expired',
  }))

  const statusColors: Record<string, { bg: string, color: string, label: string }> = {
    active: { bg: 'rgba(16,185,129,0.1)', color: '#10B981', label: 'Active' },
    paused: { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'En pause' },
    expired: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', label: 'Expirée' },
  }

  const filtered = filter === 'all' ? myListings : myListings.filter(l => l.status === filter)

  return (
    <PageLayout active="seller-listings" onNavigate={onNavigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: 0 }}>Mes annonces ({myListings.length})</h1>
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => onNavigate('seller-post')}>
          <Plus size={16} /> Nouvelle annonce
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--border-subtle)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'all', label: `Toutes (${myListings.length})` },
          { key: 'active', label: `Actives (${myListings.filter(l => l.status === 'active').length})` },
          { key: 'paused', label: `En pause (${myListings.filter(l => l.status === 'paused').length})` },
          { key: 'expired', label: `Expirées (${myListings.filter(l => l.status === 'expired').length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{ padding: '0.55rem 1rem', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.82rem', background: filter === t.key ? 'var(--bg-card)' : 'transparent', color: filter === t.key ? 'var(--primary)' : 'var(--fg-muted)', boxShadow: filter === t.key ? 'var(--shadow-sm)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.map((l, i) => {
          const s = statusColors[l.status]
          return (
            <div key={l.id} style={{ display: 'flex', gap: '0.875rem', padding: '1rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
              <div style={{ width: 72, height: 56, borderRadius: 8, overflow: 'hidden', background: 'var(--border-subtle)', flexShrink: 0, cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>
                <img src={l.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                  <p style={{ margin: 0, fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => onSelectListing(l.id)}>{l.title}</p>
                  <span className="badge" style={{ background: s.bg, color: s.color, flexShrink: 0, fontSize: '0.72rem' }}>{s.label}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                  <span className="price-tag" style={{ fontSize: '0.9rem' }}>{formatPrice(l.price)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={12} />{l.views}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Heart size={12} />{l.favorites}</span>
                  <span>{l.date}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => onNavigate('seller-edit')} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: 'var(--fg-muted)' }}>
                  <Edit3 size={14} /> Modifier
                </button>
                <button style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EF4444' }}>
                  <Trash2 size={15} />
                </button>
                {l.status === 'active' && (
                  <button style={{ background: 'rgba(254,0,0,0.08)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: 'var(--primary)' }}>
                    <ArrowUp size={14} /> Booster
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </PageLayout>
  )
}

// ─── STATISTICS ────────────────────────────────────────────────────────────
export function SellerStats({ onNavigate }: { onNavigate: (p: any) => void }) {
  return (
    <PageLayout active="seller-stats" onNavigate={onNavigate}>
      <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>Statistiques</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Vues totales', value: '12 457', trend: '+18%', icon: Eye, color: '#3B82F6' },
          { label: 'Contacts', value: 342, trend: '+24%', icon: MessageCircle, color: '#8B5CF6' },
          { label: 'Favoris', value: 568, trend: '+12%', icon: Heart, color: '#EC4899' },
          { label: 'Taux de contact', value: '2.7%', trend: '+0.3%', icon: Users, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color + '15' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.6rem' }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>{s.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                <TrendingUp size={11} color="#10B981" />
                <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>{s.trend} ce mois</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Vues quotidiennes</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={viewStats}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FE0000" stopOpacity={0.15} />
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
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Contacts reçus</h2>
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
    </PageLayout>
  )
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────
export function SellerPayments({ onNavigate }: { onNavigate: (p: any) => void }) {
  const transactions = [
    { id: 'T001', type: 'Boost annonce', amount: -5000, date: '28 Jan 2024', status: 'success', method: '🟠 Orange Money' },
    { id: 'T002', type: 'Abonnement Pro (mensuel)', amount: -25000, date: '15 Jan 2024', status: 'success', method: '🟡 MTN MoMo' },
    { id: 'T003', type: 'Vente - iPhone 15 Pro', amount: 450000, date: '10 Jan 2024', status: 'success', method: '🔵 Wave' },
    { id: 'T004', type: 'Boost annonce', amount: -5000, date: '05 Jan 2024', status: 'failed', method: '🟠 Orange Money' },
    { id: 'T005', type: 'Abonnement Pro (mensuel)', amount: -25000, date: '15 Déc 2023', status: 'success', method: '🟡 MTN MoMo' },
  ]

  return (
    <PageLayout active="seller-payments" onNavigate={onNavigate}>
      <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.5rem', margin: '0 0 1.5rem' }}>Paiements & Transactions</h1>

      {/* Mobile money methods */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1.25rem', fontSize: '1rem' }}>Méthodes de paiement</h2>
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
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{mm.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 2 }}>{mm.num}</div>
              {!mm.active && <button style={{ marginTop: 8, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>+ Ajouter</button>}
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: 0, fontSize: '1rem' }}>Historique des transactions</h2>
        </div>
        {transactions.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem 1.25rem', borderBottom: i < transactions.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: t.amount > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {t.amount > 0 ? <ArrowUp size={18} color="#10B981" /> : <DollarSign size={18} color="#EF4444" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: '0.875rem' }}>{t.type}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 2 }}>{t.method} · {t.date}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '0.95rem', color: t.amount > 0 ? '#10B981' : 'var(--fg)' }}>
                {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('fr')} FCFA
              </div>
              <span className="badge" style={{ fontSize: '0.7rem', background: t.status === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: t.status === 'success' ? '#10B981' : '#EF4444' }}>
                {t.status === 'success' ? '✓ Réussi' : '✗ Échoué'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  )
}

// ─── PREMIUM ─────────────────────────────────────────────────────────────────
export function SellerPremium({ onNavigate }: { onNavigate: (p: any) => void }) {
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
    <PageLayout active="seller-premium" onNavigate={onNavigate}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="badge badge-orange" style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>⭐ Plans Premium</div>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2rem', margin: '0 0 0.75rem' }}>Boostez vos ventes</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '1rem' }}>Choisissez le plan qui correspond à vos besoins</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {plans.map(plan => (
          <div
            key={plan.name}
            className="card"
            style={{
              padding: '1.75rem',
              border: plan.highlight ? `2px solid var(--primary)` : '1px solid var(--border)',
              position: 'relative',
              transform: plan.highlight ? 'scale(1.02)' : 'none',
            }}
          >
            {plan.highlight && (
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--primary)', color: '#fff', padding: '4px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800 }}>
                ⭐ Le plus populaire
              </div>
            )}
            {plan.current && (
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#6B7280', color: '#fff', padding: '4px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 800 }}>
                Plan actuel
              </div>
            )}
            <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1.2rem', color: plan.color, margin: '0 0 0.75rem' }}>{plan.name}</h2>
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: plan.price === 0 ? '1.5rem' : '2rem' }}>
                {plan.price === 0 ? 'Gratuit' : plan.price.toLocaleString('fr') + ' FCFA'}
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
            <button
              className={plan.current ? 'btn-outline' : 'btn-primary'}
              style={{ width: '100%', padding: '0.75rem', background: plan.current ? undefined : plan.color, borderColor: plan.color, color: plan.current ? plan.color : '#fff' }}
              disabled={plan.current}
            >
              {plan.current ? 'Plan actuel' : `Choisir ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Mobile money payment */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, margin: '0 0 1rem', fontSize: '1rem' }}>💳 Paiement sécurisé via Mobile Money</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { name: 'Orange Money', emoji: '🟠', color: '#FF6600' },
            { name: 'MTN MoMo', emoji: '🟡', color: '#FFD700' },
            { name: 'Wave', emoji: '🔵', color: '#009EFF' },
            { name: 'Carte bancaire', emoji: '💳', color: '#1A1A1A' },
          ].map(mm => (
            <div key={mm.name} className="mobile-money-badge">
              {mm.emoji} {mm.name}
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
