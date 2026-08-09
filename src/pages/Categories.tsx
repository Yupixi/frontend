import { useQuery } from '@apollo/client/react'
import { Search, Building2, Car, Smartphone, Shirt, Sofa, Briefcase, Wrench, Dumbbell, PawPrint, Sprout, Baby, Factory, Package, ChevronRight } from 'lucide-react'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'

const iconMap: Record<string, typeof Building2> = {
  immobilier: Building2, vehicules: Car, electronique: Smartphone,
  mode: Shirt, maison: Sofa, emploi: Briefcase, services: Wrench,
  loisirs: Dumbbell, animaux: PawPrint, agriculture: Sprout,
  famille: Baby, 'materiel-pro': Factory, divers: Package,
}

type CategoriesProps = {
  onNavigate: (page: any) => void
  onCategorySelect?: (categoryId: string) => void
}

export default function Categories({ onCategorySelect }: CategoriesProps) {
  const { data, loading } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const categories = data?.categories ?? []
  const totalSubcategories = categories.reduce((a, c) => a + c.subcategories.length, 0)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: '2rem', margin: '0 0 0.75rem' }}>
          Toutes les catégories
        </h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '1rem', margin: '0 0 1.5rem' }}>
          {loading ? 'Chargement du catalogue...' : `${categories.length} catégories et ${totalSubcategories} sous-catégories`}
        </p>
        <div style={{ position: 'relative', maxWidth: 400, margin: '0 auto' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
          <input className="input" placeholder="Rechercher une catégorie..." style={{ paddingLeft: 40, borderRadius: 999 }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {categories.map(cat => {
          const IconComp = iconMap[cat.slug] || Building2
          return (
            <div key={cat.id} className="card card-hover" style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => onCategorySelect?.(cat.slug)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: cat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: cat.color }}>
                  <IconComp size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem', margin: '0 0 2px', color: 'var(--fg)' }}>{cat.name}</h2>
                  <span style={{ fontSize: '0.8rem', color: cat.color, fontWeight: 700 }}>{cat.subcategories.length} sous-catégories</span>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--fg-subtle)' }} />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {cat.subcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={e => { e.stopPropagation(); onCategorySelect?.(cat.slug) }}
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
                    {sub.name}
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
