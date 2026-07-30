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
            <div key={cat.id} onClick={() => onCategorySelect?.(cat.id)} style={{ padding: '1.25rem', borderRadius: 'var(--radius)', cursor: 'pointer', background: cat.color, transition: 'transform 0.15s', border: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#FFF' }}>
                  <IconComp size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '1rem', margin: '0 0 2px', color: '#FFF' }}>{cat.name}</h2>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{cat.count.toLocaleString('fr')} annonces</span>
                </div>
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {cat.subcategories.map(sub => (
                  <button
                    key={sub}
                    onClick={e => { e.stopPropagation(); onCategorySelect?.(cat.id) }}
                    style={{
                      cursor: 'pointer', border: 'none', borderRadius: 999,
                      padding: '3px 10px', fontSize: '0.75rem', fontWeight: 800,
                      fontFamily: 'Outfit, sans-serif',
                      background: 'rgba(255,255,255,0.2)', color: '#FFF',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.35)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
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
