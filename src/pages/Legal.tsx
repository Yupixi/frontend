import { useQuery } from '@apollo/client/react'
import Icon from '../components/Icon'
import { CONTENT_PAGE_QUERY, LEGAL_PAGES, type ContentPage } from '../graphql/content'
import { renderMarkdown } from '../lib/markdown'

// Legal & help pages (CGU, remise en main propre, FAQ, confidentialité),
// written by the team in the Backoffice "CMS & Pages légales".
export default function Legal({ slug, onOpenLegal, onNavigate }: { slug: string; onOpenLegal: (slug: string) => void; onNavigate: (p: any) => void }) {
  const { data, loading } = useQuery<{ contentPage: ContentPage | null }>(CONTENT_PAGE_QUERY, { variables: { slug } })
  const page = data?.contentPage
  const meta = LEGAL_PAGES.find((p) => p.slug === slug) ?? LEGAL_PAGES[0]

  return (
    <div className="mx-auto max-w-[960px] px-4 py-6 lg:px-6 lg:py-10">
      <button onClick={() => onNavigate('home')} className="mb-4 flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-body-sm text-on-surface-variant hover:text-primary"><Icon name="arrow_back" size={18} /> Accueil</button>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {LEGAL_PAGES.map((p) => (
          <button key={p.slug} onClick={() => onOpenLegal(p.slug)} className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-none px-3.5 py-2 text-label-md ${p.slug === slug ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`}>
            <Icon name={p.icon} size={17} /> {p.label}
          </button>
        ))}
      </div>
      <article className="rounded-2xl bg-surface-lowest p-5 shadow-sm lg:p-8">
        <h1 className="m-0 text-headline-lg-mobile text-on-surface lg:text-headline-lg">{page?.title ?? meta.label}</h1>
        {page?.updatedAt && <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Mise à jour le {new Date(page.updatedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</p>}
        {loading && !page ? (
          <p className="mt-6 text-on-surface-variant">Chargement…</p>
        ) : page?.body?.trim() ? (
          <div className="legal-content mt-6 text-body-md leading-relaxed text-on-surface [&_a]:text-primary [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-headline-sm [&_h3]:mt-4 [&_h3]:text-label-lg [&_li]:ml-5 [&_li]:list-disc [&_p]:my-3" dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }} />
        ) : (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-surface-container-low p-4 text-body-md text-on-surface-variant"><Icon name="edit_note" size={22} /> Cette page est en cours de rédaction par l'équipe Dilchap.</p>
        )}
      </article>
    </div>
  )
}
