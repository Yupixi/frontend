import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon from '../components/Icon'
import ImageLightbox from '../components/ImageLightbox'
import { useHelpArticles } from '../components/HelpLink'
import { HELP_ARTICLE_QUERY, helpImageUrl, helpKeyOf, helpSlugOf, type HelpArticle, type HelpStep } from '../graphql/help'
import { countryVars, useMarketCode } from '../lib/countries'
import { plainText } from '../lib/format'
import { richHtml } from '../lib/richText'
import { usePageTitle } from '../lib/site'
import { useMediaQuery } from '../lib/useMediaQuery'
import { pathFor } from '../lib/routes'
import { requestOpenLink } from '../lib/navigation'
import { startTour } from '../lib/tourControl'

type Props = {
  // Article shown ('' = the help centre's home).
  slug: string
  onOpenArticle: (slug: string) => void
  onNavigate: (p: any) => void
}

const card = 'rounded-2xl bg-surface-lowest shadow-sm'

// Accents and case don't matter in the search.
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

// Everything a search looks through, in the order a match weighs.
const haystack = (a: HelpArticle) => ({
  title: fold(a.title),
  rest: fold([a.summary, a.section, ...a.steps.flatMap(s => [s.title, plainText(s.body)])].join(' ')),
})

// A real link to the article (/aide/…), opened in the app.
function ArticleLink({ article, onOpen, className, children }: { article: HelpArticle, onOpen: (slug: string) => void, className: string, children: React.ReactNode }) {
  const slug = helpSlugOf(article.key)
  return (
    <a
      href={pathFor('help', { helpSlug: slug })}
      onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onOpen(slug) }}
      className={`no-underline ${className}`}
    >
      {children}
    </a>
  )
}

function ArticleCard({ article, onOpen }: { article: HelpArticle, onOpen: (slug: string) => void }) {
  return (
    <ArticleLink article={article} onOpen={onOpen} className={`${card} group flex min-w-0 items-start gap-3 p-4 transition-shadow hover:shadow-md`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="article" size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-label-lg text-on-surface group-hover:text-primary">{article.title}</span>
        {article.summary && <span className="mt-0.5 block text-body-sm text-on-surface-variant">{article.summary}</span>}
        <span className="mt-1.5 block text-label-sm text-outline">{article.steps.length} étape{article.steps.length > 1 ? 's' : ''}</span>
      </span>
      <Icon name="chevron_right" size={18} className="mt-2.5 shrink-0 text-on-surface-variant" />
    </ArticleLink>
  )
}

// « Toujours bloqué ? »: the team's support (signed-in members), the FAQ.
function ContactCard({ onNavigate }: { onNavigate: (p: any) => void }) {
  return (
    <section data-tour="help-contact" className={`${card} mt-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center`}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tertiary-soft text-tertiary"><Icon name="support_agent" size={26} /></span>
      <div className="min-w-0 flex-1">
        <h2 className="m-0 text-headline-sm text-on-surface">Vous ne trouvez pas la réponse ?</h2>
        <p className="m-0 mt-0.5 text-body-sm text-on-surface-variant">Écrivez à l’équipe Dilchap : vous suivez sa réponse dans votre espace et recevez une notification.</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <a href="/legal/faq" onClick={e => { e.preventDefault(); requestOpenLink('/legal/faq') }} className="flex h-11 items-center gap-1.5 whitespace-nowrap rounded-xl bg-surface-container-low px-4 text-label-md text-on-surface no-underline hover:bg-surface-container">
          <Icon name="help" size={18} /> FAQ
        </a>
        <button onClick={() => onNavigate('support')} className="flex h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border-none bg-primary px-4 text-label-md text-white hover:bg-primary-dark">
          <Icon name="send" size={18} /> Contacter le support
        </button>
      </div>
    </section>
  )
}

function StepImage({ step, alt }: { step: HelpStep, alt: string }) {
  const phone = useMediaQuery('(max-width: 767px)')
  // The phone screenshot on small screens, the desktop one elsewhere; the
  // one there is when only one exists.
  const name = (phone ? step.imageMobile || step.image : step.image || step.imageMobile) ?? null
  const isPhoneShot = !!name && name === step.imageMobile
  const [failed, setFailed] = useState<string | null>(null)
  const [zoom, setZoom] = useState(false)
  if (!name || failed === name) return null
  const src = helpImageUrl(name)
  return (
    <>
      <button
        onClick={() => setZoom(true)}
        aria-label={`Agrandir la capture : ${alt}`}
        className={`group relative mt-4 block cursor-zoom-in overflow-hidden rounded-xl border border-solid border-outline-variant bg-surface-container-low p-0 ${isPhoneShot ? 'mx-auto w-full max-w-[300px]' : 'w-full'}`}
      >
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(name)} className="block h-auto w-full" />
        <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-80 transition-opacity group-hover:opacity-100"><Icon name="search" size={16} /></span>
      </button>
      {zoom && <ImageLightbox images={[src]} start={0} alt={alt} onClose={() => setZoom(false)} />}
    </>
  )
}

function Article({ slug, articles, onOpen, onNavigate }: { slug: string, articles: HelpArticle[] | null, onOpen: (slug: string) => void, onNavigate: (p: any) => void }) {
  const key = helpKeyOf(slug)
  // The list already holds it when the reader comes from the help centre;
  // a direct visit asks for this one only.
  const listed = articles?.find(a => a.key === key)
  const { data, loading } = useQuery<{ helpArticle: HelpArticle | null }>(HELP_ARTICLE_QUERY, {
    variables: { key, ...countryVars(useMarketCode()) },
    skip: !!listed,
  })
  const article = listed ?? data?.helpArticle ?? null
  usePageTitle(article ? `${article.title} — Centre d’aide` : null)
  const related = (articles ?? []).filter(a => article && a.section === article.section && a.key !== article.key)

  const crumbs = (
    <nav aria-label="Fil d’Ariane" className="mb-4 flex min-w-0 items-center gap-1 text-body-sm text-on-surface-variant">
      <a href="/aide" onClick={e => { e.preventDefault(); onOpen('') }} className="flex shrink-0 items-center gap-1 text-on-surface-variant no-underline hover:text-primary"><Icon name="arrow_back" size={17} /> Centre d’aide</a>
      {article && <><Icon name="chevron_right" size={15} className="shrink-0" /><span className="truncate">{article.section}</span></>}
    </nav>
  )

  if (!article) {
    return (
      <>
        {crumbs}
        <div className={`${card} p-8 text-center`}>
          {loading && !data ? (
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-[3px] border-surface-container-high border-t-primary" role="status" aria-label="Chargement" />
          ) : (
            <>
              <Icon name="article" size={36} className="text-on-surface-variant" />
              <h1 className="m-0 mt-2 text-headline-sm text-on-surface">Ce guide n’est pas disponible</h1>
              <p className="m-0 mt-1 text-body-md text-on-surface-variant">Il a peut-être été retiré ou n’existe pas dans votre pays.</p>
              <button onClick={() => onOpen('')} className="mt-4 h-11 cursor-pointer rounded-xl border-none bg-primary px-4 text-label-md text-white">Voir tous les guides</button>
            </>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      {crumbs}
      <article>
        <header className={`${card} p-5 lg:p-7`}>
          <span className="text-label-sm uppercase text-primary">{article.section}</span>
          <h1 className="m-0 mt-1 text-headline-md text-on-surface lg:text-headline-lg">{article.title}</h1>
          {article.summary && <p className="m-0 mt-2 text-body-md text-on-surface-variant">{article.summary}</p>}
        </header>
        <ol className="m-0 mt-4 flex list-none flex-col gap-4 p-0">
          {article.steps.map((step, i) => (
            <li key={i} className={`${card} p-5 lg:p-7`}>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-label-md text-white" aria-hidden>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="m-0 pt-1 text-headline-sm text-on-surface"><span className="sr-only">Étape {i + 1} : </span>{step.title}</h2>
                  {step.body && <div className="rich-text selectable mt-2 text-body-md leading-relaxed text-on-surface [&_p]:my-2" dangerouslySetInnerHTML={{ __html: richHtml(step.body) }} />}
                </div>
              </div>
              <StepImage step={step} alt={step.title} />
            </li>
          ))}
        </ol>
      </article>
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="m-0 mb-3 text-headline-sm text-on-surface">Dans la même rubrique</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {related.map(a => <ArticleCard key={a.key} article={a} onOpen={onOpen} />)}
          </div>
        </section>
      )}
      <ContactCard onNavigate={onNavigate} />
    </>
  )
}

function Home({ articles, loading, onOpen, onNavigate }: { articles: HelpArticle[] | null, loading: boolean, onOpen: (slug: string) => void, onNavigate: (p: any) => void }) {
  usePageTitle('Centre d’aide')
  const [query, setQuery] = useState('')
  const list = articles ?? []
  const index = useMemo(() => new Map(list.map(a => [a.key, haystack(a)])), [list])
  const words = fold(query).split(/\s+/).filter(Boolean)
  // Every word somewhere in the article; title matches first.
  const results = words.length
    ? list
      .map(a => {
        const h = index.get(a.key)!
        if (!words.every(w => h.title.includes(w) || h.rest.includes(w))) return null
        return { a, score: words.filter(w => h.title.includes(w)).length }
      })
      .filter((r): r is { a: HelpArticle, score: number } => !!r)
      .sort((x, y) => y.score - x.score)
      .map(r => r.a)
    : null
  // Sections in the order the articles come (the server's order).
  const sections = [...new Set(list.map(a => a.section))].map(s => ({ name: s, items: list.filter(a => a.section === s) }))

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-lowest via-surface-lowest to-primary-fixed/60 p-5 shadow-sm lg:p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1 text-label-sm uppercase text-primary"><Icon name="menu_book" size={14} /> Centre d’aide</span>
        <h1 className="m-0 mt-3 text-headline-md text-on-surface lg:text-headline-lg">Comment pouvons-nous vous aider ?</h1>
        <p className="m-0 mt-1 max-w-xl text-body-md text-on-surface-variant">Des guides pas à pas, captures d’écran à l’appui, pour acheter et vendre sur Dilchap.</p>
        <label data-tour="help-search" className="mt-5 flex h-12 max-w-xl items-center gap-2 rounded-xl bg-surface-lowest px-3 shadow-sm ring-1 ring-outline-variant focus-within:ring-2 focus-within:ring-primary">
          <Icon name="search" size={20} className="shrink-0 text-on-surface-variant" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Vendre, crédits, remise en main propre…"
            aria-label="Rechercher dans l’aide"
            className="h-full min-w-0 flex-1 border-none bg-transparent text-body-md text-on-surface outline-none"
          />
          {query && <button onClick={() => setQuery('')} aria-label="Effacer" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container-low text-on-surface-variant"><Icon name="close" size={16} /></button>}
        </label>
        <button onClick={() => void startTour('fe-welcome')} className="mt-3 flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-label-md text-primary hover:underline">
          <Icon name="replay" size={17} /> Revoir la visite guidée
        </button>
      </section>

      {loading && !articles ? (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>
          {[0, 1, 2, 3].map(i => <div key={i} className={`${card} h-24 animate-pulse`} />)}
        </div>
      ) : results ? (
        <section className="mt-6" aria-live="polite">
          <h2 className="m-0 mb-3 text-headline-sm text-on-surface">{results.length ? `${results.length} guide${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}` : 'Aucun guide trouvé'}</h2>
          {results.length ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {results.map(a => <ArticleCard key={a.key} article={a} onOpen={onOpen} />)}
            </div>
          ) : (
            <p className={`${card} m-0 p-5 text-body-md text-on-surface-variant`}>Essayez d’autres mots, ou écrivez-nous : l’équipe vous répond.</p>
          )}
        </section>
      ) : sections.length ? (
        <div data-tour="help-sections" className="mt-6 flex flex-col gap-8">
          {sections.map(s => (
            <section key={s.name}>
              <h2 className="m-0 mb-3 text-headline-sm text-on-surface">{s.name}</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {s.items.map(a => <ArticleCard key={a.key} article={a} onOpen={onOpen} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className={`${card} m-0 mt-6 flex items-center gap-2 p-5 text-body-md text-on-surface-variant`}><Icon name="menu_book" size={22} /> Les guides arrivent bientôt.</p>
      )}
      <ContactCard onNavigate={onNavigate} />
    </>
  )
}

// Centre d’aide (/aide, /aide/<article>): member guides from the BO
// « Documentation & aide », in the visitor's market version.
export default function Help({ slug, onOpenArticle, onNavigate }: Props) {
  const { articles, loading } = useHelpArticles()
  return (
    <div className="mx-auto max-w-[960px] px-4 py-6 lg:px-6 lg:py-10">
      {slug
        ? <Article key={slug} slug={slug} articles={articles} onOpen={onOpenArticle} onNavigate={onNavigate} />
        : <Home articles={articles} loading={loading} onOpen={onOpenArticle} onNavigate={onNavigate} />}
    </div>
  )
}
