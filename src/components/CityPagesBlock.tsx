import { useQuery } from '@apollo/client/react'
import { CITY_PAGES_QUERY, type CityPages } from '../graphql/categories'
import { useMarketCode } from '../lib/countries'
import { MapPin } from './icons'
import { fmtNumber, useT } from '../i18n'
import home from '../i18n/ns/home'

// « Par ville » at the bottom of the home page: each city, then district,
// of the visitor's country (every open country for « Tous les pays ») with
// its category pages that have enough listings (« Mode à Abidjan »,
// « Locations à Cocody, Abidjan ») — the same links search engines get
// (Backend seo). Real links (<a href>), a click stays in the app.
export default function CityPagesBlock({ onOpen, className = '' }: {
  onOpen: (slug: string, city: string) => void
  className?: string
}) {
  const t = useT(home)
  const country = useMarketCode()
  const { data } = useQuery<{ cityPages: CityPages[] }>(CITY_PAGES_QUERY, { variables: { country: country ?? null } })
  const groups = data?.cityPages ?? []
  if (!groups.length) return null
  const open = (path: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    const [, , slug, city] = path.split('/')
    onOpen(slug, city ?? '')
  }
  return (
    <nav aria-labelledby="home-city-pages" className={className}>
      <h2 id="home-city-pages" className="m-0 mb-4 text-headline-sm text-on-surface md:text-headline-md">{t('cityPages.title')}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(g => (
          <section key={g.city.slug} aria-label={g.city.parentCity ? `${g.city.name}, ${g.city.parentCity}` : g.city.name} className="min-w-0 rounded-2xl bg-surface-lowest p-4 shadow-sm">
            <h3 className="m-0 mb-3 flex min-w-0 items-center gap-1.5 text-title-md text-on-surface">
              <MapPin size={16} className="shrink-0 text-primary" />
              <span className="truncate">{g.city.name}{g.city.parentCity && <span className="text-on-surface-variant">, {g.city.parentCity}</span>}</span>
            </h3>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {g.pages.map(p => (
                <li key={p.path} className="min-w-0 max-w-full">
                  <a href={p.path} onClick={open(p.path)} title={p.name}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-label-md text-on-surface no-underline hover:text-primary">
                    <span className="truncate">{p.rubricName}</span>
                    <span className="sr-only">{t('cityPages.inCity', { city: g.city.name })}</span>
                    <span className="text-label-sm text-outline">{fmtNumber(p.count)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  )
}
