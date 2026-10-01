import { ChevronDown, MapPin } from './icons'
import type { CategoryLanding, LandingLink } from '../graphql/categories'

// Bottom of a category page (/categorie/<slug>[/<ville>]): the team's
// introduction and FAQ (BO « Catégories »), then the same page in other
// cities and neighbouring categories. Real links (<a href>), so search
// engines follow them; a click stays in the app.
export default function CategoryLandingExtras({ landing, rubricName, cityName, introHtml, onOpen }: {
  landing: CategoryLanding
  rubricName: string
  cityName?: string
  introHtml: string
  onOpen: (slug: string, city?: string) => void
}) {
  const open = (l: LandingLink, city?: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    onOpen(l.slug, city)
  }
  const cityWord = (path: string) => path.split('/')[3]
  const hasLinks = landing.otherCities.length > 0 || landing.relatedCategories.length > 0
  if (!introHtml && !landing.faq.length && !hasLinks) return null
  return (
    <div className="mt-8 flex flex-col gap-6">
      {introHtml && (
        <section aria-labelledby="category-intro" className="rounded-2xl bg-surface-container-low p-5">
          <h2 id="category-intro" className="m-0 mb-2 text-headline-sm text-on-surface">À propos de « {rubricName} »</h2>
          <div className="rich-text text-body-md leading-relaxed text-on-surface-variant [&_h2]:text-title-md [&_h2]:text-on-surface [&_h3]:text-on-surface [&_p]:my-2" dangerouslySetInnerHTML={{ __html: introHtml }} />
        </section>
      )}

      {landing.faq.length > 0 && (
        <section aria-labelledby="category-faq">
          <h2 id="category-faq" className="m-0 mb-3 text-headline-sm text-on-surface">Questions fréquentes</h2>
          <div className="flex flex-col gap-2">
            {landing.faq.map((f, i) => (
              <details key={i} className="group rounded-xl bg-surface-lowest p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-label-lg text-on-surface">
                  {f.question}
                  <ChevronDown size={18} className="shrink-0 text-on-surface-variant transition-transform group-open:rotate-180" />
                </summary>
                <p className="m-0 mt-2 whitespace-pre-line text-body-md text-on-surface-variant">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {landing.otherCities.length > 0 && (
        <nav aria-labelledby="category-cities">
          <h2 id="category-cities" className="m-0 mb-3 text-headline-sm text-on-surface">{rubricName} dans d’autres villes</h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {landing.otherCities.map(c => (
              <li key={c.slug}>
                <a href={c.path} onClick={open({ ...c, slug: landing.slug }, c.slug)} className="inline-flex items-center gap-1.5 rounded-full border border-solid border-outline-variant bg-surface-lowest px-3 py-1.5 text-label-md text-on-surface no-underline hover:border-primary hover:text-primary">
                  <MapPin size={14} className="text-primary" /> {rubricName} à {c.name}
                  <span className="text-label-sm text-outline">{c.count.toLocaleString('fr-FR')}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {landing.relatedCategories.length > 0 && (
        <nav aria-labelledby="category-related">
          <h2 id="category-related" className="m-0 mb-3 text-headline-sm text-on-surface">{cityName ? `Autres catégories à ${cityName}` : 'Catégories proches'}</h2>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {landing.relatedCategories.map(r => (
              <li key={r.slug}>
                <a href={r.path} onClick={open(r, cityWord(r.path))} className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-label-md text-on-surface no-underline hover:text-primary">
                  {cityName ? `${r.name} à ${cityName}` : r.name}
                  <span className="text-label-sm text-outline">{r.count.toLocaleString('fr-FR')}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
