import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { CategoryIcon } from '../components/Icon'
import { Search, ChevronRight, Home } from '../components/icons'
import { CATEGORIES_QUERY, type RemoteCategory } from '../graphql/categories'

type CategoriesProps = {
  onNavigate: (page: any) => void
  onCategorySelect?: (categoryId: string) => void
}

// Full catalogue of rayons — same tile language as the home category grid.
export default function Categories({ onNavigate, onCategorySelect }: CategoriesProps) {
  const { data, loading } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  const [q, setQ] = useState('')
  const categories = (data?.categories ?? []).filter(c =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.subcategories.some(s => s.name.toLowerCase().includes(q.toLowerCase())))
  const total = (data?.categories ?? []).reduce((n, c) => n + (c.listingsCount ?? 0), 0)

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-8 pt-5 md:px-8 lg:px-12">
      <nav className="mb-2 flex items-center gap-1 text-label-md text-on-surface-variant">
        <button onClick={() => onNavigate('home')} className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-label-md text-on-surface-variant hover:text-primary"><Home size={14} /> Accueil</button>
        <ChevronRight size={14} className="text-outline-variant" />
        <span className="font-semibold text-on-surface">Toutes les catégories</span>
      </nav>
      <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <span className="text-label-sm font-bold uppercase tracking-wider text-primary">Univers d'achats</span>
          <h1 className="m-0 mt-1 text-headline-lg-mobile text-on-surface md:text-headline-lg">Parcourez par catégorie</h1>
          <p className="m-0 mt-1 text-body-md text-on-surface-variant"><b className="text-on-surface">{total.toLocaleString('fr-FR')} annonces</b> en ligne dans {data?.categories.length ?? 0} rayons.</p>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-lowest px-3 py-2.5 md:w-80">
          <Search size={19} className="text-outline" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Chercher une catégorie…" className="w-full border-none bg-transparent text-body-md text-on-surface outline-none" />
        </label>
      </div>

      {loading && <p className="text-on-surface-variant">Chargement…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(cat => (
          <div key={cat.id} className="rounded-2xl border border-outline-variant bg-surface-lowest p-4 transition-shadow hover:shadow-card-hover">
            <button onClick={() => onCategorySelect?.(cat.slug)} className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-0 text-left">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-container text-primary"><CategoryIcon icon={cat.icon} size={28} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-headline-sm text-on-surface">{cat.name}</span>
                <span className="text-body-sm text-on-surface-variant">{(cat.listingsCount ?? 0).toLocaleString('fr-FR')} annonce{(cat.listingsCount ?? 0) > 1 ? 's' : ''}</span>
              </span>
              <ChevronRight size={20} className="text-outline" />
            </button>
            {cat.subcategories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {cat.subcategories.slice(0, 6).map(s => (
                  <button key={s.id} onClick={() => onCategorySelect?.(cat.slug)} className="cursor-pointer rounded-lg border-none bg-surface-container-low px-2.5 py-1 text-body-sm text-on-surface hover:bg-surface-container">{s.name}</button>
                ))}
                {cat.subcategories.length > 6 && <span className="px-1 py-1 text-body-sm text-outline">+{cat.subcategories.length - 6}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
