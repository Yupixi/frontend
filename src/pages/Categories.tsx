import { ChevronRight, Search } from 'lucide-react'
import { categories } from '../data/mockData'

type CategoriesProps = {
  onNavigate: (page: any) => void
  onCategorySelect?: (categoryId: string) => void
}

export default function Categories({ onNavigate, onCategorySelect }: CategoriesProps) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2rem', margin: '0 0 0.75rem' }}>
          Toutes les catégories
        </h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '1rem', margin: '0 0 1.5rem' }}>
          Explorez les {categories.reduce((a, c) => a + c.count, 0).toLocaleString('fr')} annonces disponibles
        </p>
        <div style={{ position: 'relative', maxWidth: 400, margin: '0 auto' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
          <input className="input" placeholder="Rechercher une catégorie..." style={{ paddingLeft: 40, borderRadius: 999 }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {categories.map(cat => (
          <div key={cat.id} className="card card-hover" style={{ padding: '1.5rem', cursor: 'pointer' }}               onClick={() => onCategorySelect?.(cat.id)}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: cat.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 }}>
                {cat.icon}
              </div>
              <div>
                <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', margin: '0 0 4px' }}>{cat.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{cat.count.toLocaleString('fr')} annonces</span>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--fg-subtle)', marginLeft: 'auto', alignSelf: 'center' }} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {cat.subcategories.map(sub => (
                <button
                  key={sub}
                  onClick={e => { e.stopPropagation(); onCategorySelect?.(cat.id) }}
                  className="badge badge-gray"
                  style={{ cursor: 'pointer', border: 'none', background: 'var(--border-subtle)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = cat.color + '20')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
