import { Search, Building2, Car, Smartphone, Shirt, Sofa, Briefcase, Wrench, Dumbbell, PawPrint, Sprout, Baby, Factory, ChevronRight } from 'lucide-react'
import { categories } from '../data/mockData'

const iconMap: Record<string, typeof Building2> = {
  immobilier: Building2, vehicules: Car, electronique: Smartphone,
  mode: Shirt, maison: Sofa, emploi: Briefcase, services: Wrench,
  loisirs: Dumbbell, animaux: PawPrint, agriculture: Sprout,
  enfants: Baby, 'materiel-pro': Factory,
}

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {categories.map(cat => {
          const IconComp = iconMap[cat.id] || Building2
          return (
            <div key={cat.id} className="card card-hover" style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => onCategorySelect?.(cat.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: cat.color }}>
                  <IconComp size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', margin: '0 0 2px' }}>{cat.name}</h2>
                  <span style={{ fontSize: '0.8rem', color: cat.color, fontWeight: 700 }}>{cat.count.toLocaleString('fr')} annonces</span>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--fg-subtle)' }} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {cat.subcategories.map(sub => (
                  <button
                    key={sub}
                    onClick={e => { e.stopPropagation(); onCategorySelect?.(cat.id) }}
                    style={{
                      cursor: 'pointer', border: 'none', borderRadius: 999,
                      padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700,
                      fontFamily: 'Outfit, sans-serif',
                      background: cat.color + '12', color: cat.color,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = cat.color + '25' }}
                    onMouseLeave={e => { e.currentTarget.style.background = cat.color + '12' }}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
