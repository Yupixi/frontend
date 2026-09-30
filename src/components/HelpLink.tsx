import { useQuery } from '@apollo/client/react'
import Icon from './Icon'
import { HELP_ARTICLES_QUERY, helpKeyOf, helpSlugOf, type HelpArticle } from '../graphql/help'
import { countryVars, useMarketCode } from '../lib/countries'
import { requestOpenHelp } from '../lib/navigation'
import { pathFor } from '../lib/routes'

// The help centre's articles for the visitor's market (one request per
// country, shared by the help centre and every « En savoir plus » link).
export function useHelpArticles() {
  const { data, previousData, loading, error } = useQuery<{ helpArticles: HelpArticle[] | null }>(HELP_ARTICLES_QUERY, {
    variables: countryVars(useMarketCode()),
    fetchPolicy: 'cache-first',
  })
  return { articles: (data ?? previousData)?.helpArticles ?? null, loading, error }
}

// « ? En savoir plus »: small link to a help article, shown only when the
// article is published (for this country). A real link (/aide/…), opened
// in the app.
export default function HelpLink({ article, label = 'En savoir plus', className = '' }: { article: string, label?: string, className?: string }) {
  const { articles } = useHelpArticles()
  const key = helpKeyOf(article)
  if (!articles?.some(a => a.key === key)) return null
  const slug = helpSlugOf(key)
  return (
    <a
      href={pathFor('help', { helpSlug: slug })}
      onClick={e => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        requestOpenHelp(slug)
      }}
      className={`inline-flex items-center gap-1 whitespace-nowrap text-label-sm text-on-surface-variant no-underline hover:text-primary ${className}`}
    >
      <Icon name="help" size={15} /> {label}
    </a>
  )
}
