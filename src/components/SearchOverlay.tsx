import { useState, useEffect, useRef, useMemo } from 'react'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import Icon, { CategoryIcon } from './Icon'
import Price from './Price'
import { type RemoteListing } from '../graphql/listings'
import { CATEGORIES_QUERY, POPULAR_SEARCHES_QUERY, type PopularSearch, type RemoteCategory } from '../graphql/categories'
import { thumbnailUrl } from '../lib/media'
import { useMarketCode, useMarketVars } from '../lib/countries'
import { fold, highlightParts, matchesAll, recordFinalSearch, searchKey } from '../lib/searchText'
import { ADULT_BLUR_CLASS, SEARCH_ROUTING_QUERY, useAdultAccess, useAdultBlur, type SearchRouting } from '../lib/adult'
import { AdultSearchNotice } from './AdultSearchNotice'

type Props = {
  query: string
  onQueryChange: (q: string) => void
  onSearch: () => void
  onSelectListing: (id: string) => void
  onSelectCategory: (slug: string) => void
  onClose: () => void
  onNavigate: (page: any) => void
}

// While typing: a few listings and the subcategories where the words are
// found (never counted as a search, Backend searchSuggestions).
const SEARCH_SUGGESTIONS_QUERY = gql`
  query SearchSuggestions($term: String!, $countryCode: String) {
    searchSuggestions(term: $term, countryCode: $countryCode) {
      listings { id title price currency city coverImageUrl isAdult category { slug name } }
      categories { categorySlug categoryName subcategorySlug subcategoryName count }
    }
  }
`
type Suggestions = {
  listings: (Pick<RemoteListing, 'id' | 'title' | 'price' | 'currency' | 'city' | 'coverImageUrl' | 'isAdult'> & { category: { slug: string; name: string } })[]
  categories: { categorySlug: string; categoryName: string; subcategorySlug: string; subcategoryName: string; count: number }[]
}

const RECENT_KEY = 'dilchap_recent_searches'
const readRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[] } catch { return [] }
}
const writeRecent = (list: string[]) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* private mode */ }
}
// Recent searches: one per wording (accents, capitals and spaces ignored).
export const rememberSearch = (term: string) => {
  const t = term.trim().replace(/\s+/g, ' ')
  if (!t) return
  const key = searchKey(t)
  writeRecent([t, ...readRecent().filter(x => searchKey(x) !== key)].slice(0, 6))
}

function Highlight({ text, query }: { text: string; query: string }) {
  return <>{highlightParts(text, query).map((p, i) => p.hit ? <b key={i} className="text-primary">{p.text}</b> : <span key={i}>{p.text}</span>)}</>
}

type Option =
  | { kind: 'listing'; id: string }
  | { kind: 'category'; slug: string; label: string }
  | { kind: 'all' }

// Full-screen search panel: live suggestions (listings and categories),
// recent and popular searches, categories.
export default function SearchOverlay({ query, onQueryChange, onSearch, onSelectListing, onSelectCategory, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [recent, setRecent] = useState<string[]>(() => {
    // Older lists could hold the same search twice.
    const seen = new Set<string>()
    return readRecent().filter(t => { const k = searchKey(t); if (!k || seen.has(k)) return false; seen.add(k); return true })
  })
  const countryCode = useMarketCode()
  const marketVars = useMarketVars()
  const adultOk = useAdultAccess()?.status === 'OK'
  const blurOf = useAdultBlur()

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    return () => prev?.focus()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  // Keep keyboard focus inside the dialog.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = overlayRef.current?.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])')
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const q = query.trim()
  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY, { variables: marketVars })
  // Empty categories would lead to a blank results page; the « Section
  // Adultes » only for a member who may enter it.
  const allCategories = (categoriesData?.categories ?? []).filter(c => adultOk || !c.adult)
  const categories = allCategories.filter(c => c.listingsCount !== 0)
  const { data: popularData } = useQuery<{ popularSearches: PopularSearch[] }>(POPULAR_SEARCHES_QUERY, { variables: { limit: 8, countryCode: countryCode ?? null } })
  const popular = popularData?.popularSearches ?? []
  const { data: suggestData, previousData: previousSuggest, loading: suggestLoading } = useQuery<{ searchSuggestions: Suggestions }>(
    SEARCH_SUGGESTIONS_QUERY,
    { variables: { term: debouncedQuery, countryCode: countryCode ?? null }, skip: !debouncedQuery },
  )
  const { data: routingData } = useQuery<{ searchRouting: SearchRouting }>(SEARCH_ROUTING_QUERY, {
    variables: { term: debouncedQuery, countryCode: countryCode ?? null }, skip: debouncedQuery.length < 2,
  })
  const routing = debouncedQuery ? routingData?.searchRouting ?? null : null
  const suggest = debouncedQuery ? (suggestData ?? previousSuggest)?.searchSuggestions : undefined
  const suggestions = suggest?.listings ?? []

  // Categories whose name holds the words (« telephone » → Téléphones), then
  // those where the matching listings are (« pantalon » → Mode › Vêtements).
  const categoryHits = useMemo(() => {
    if (!debouncedQuery) return []
    const out: { slug: string; label: string; parent?: string; icon?: string }[] = []
    const seen = new Set<string>()
    const add = (x: { slug: string; label: string; parent?: string; icon?: string }) => { if (!seen.has(x.slug)) { seen.add(x.slug); out.push(x) } }
    for (const c of allCategories) {
      if (matchesAll(c.name, debouncedQuery)) add({ slug: c.slug, label: c.name, icon: c.icon })
      for (const s of c.subcategories) if (matchesAll(s.name, debouncedQuery) && (adultOk || !s.adult)) add({ slug: s.slug, label: s.name, parent: c.name, icon: c.icon })
    }
    for (const s of suggest?.categories ?? []) {
      const c = allCategories.find(x => x.slug === s.categorySlug)
      if (c) add({ slug: s.subcategorySlug, label: s.subcategoryName, parent: s.categoryName, icon: c.icon })
    }
    return out.slice(0, 4)
  }, [debouncedQuery, allCategories, suggest, adultOk])

  // Keyboard order: listings, categories, « Voir tous les résultats ».
  const options: Option[] = q ? [
    ...suggestions.map(s => ({ kind: 'listing' as const, id: s.id })),
    ...categoryHits.map(c => ({ kind: 'category' as const, slug: c.slug, label: c.label })),
    { kind: 'all' as const },
  ] : []
  useEffect(() => { setSelectedIdx(-1) }, [debouncedQuery])

  const runSearch = (term?: string) => {
    const words = (term ?? query).trim()
    if (term != null) onQueryChange(term)
    rememberSearch(words)
    recordFinalSearch(words, countryCode)
    onSearch()
    onClose()
  }
  const choose = (o: Option) => {
    if (o.kind === 'listing') { onSelectListing(o.id); onClose() }
    else if (o.kind === 'category') { onSelectCategory(o.slug); onClose() }
    else runSearch()
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const n = options.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (n) setSelectedIdx(i => (i + 1 >= n ? -1 : i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      // From the input (-1) the last option; from the first, back to the input.
      if (n) setSelectedIdx(i => (i < 0 ? n - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const o = selectedIdx >= 0 ? options[selectedIdx] : undefined
      if (o) choose(o)
      else if (q) runSearch()
    } else if (e.key === 'Escape') onClose()
  }
  const optionId = (i: number) => `search-option-${i}`
  const indexOf = (o: Option) => options.findIndex(x => JSON.stringify(x) === JSON.stringify(o))

  const listboxId = 'search-suggestions'
  const section = (icon: string, label: string, extra?: React.ReactNode) => (
    <div className="mb-3 mt-5 flex items-center justify-between first:mt-2">
      <span className="flex items-center gap-1.5 text-label-sm uppercase text-on-surface-variant"><Icon name={icon} size={16} /> {label}</span>
      {extra}
    </div>
  )
  const noResults = q && debouncedQuery === q && !suggestLoading && suggest && suggestions.length === 0
  const allIdx = options.length - 1

  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" aria-label="Rechercher sur Dilchap" className="safe-pt fixed inset-0 z-[9999] flex flex-col bg-surface">
      <div className="border-0 border-b border-solid border-outline-variant bg-surface-lowest">
        <div className="mx-auto flex max-w-[760px] items-center gap-3 px-4 py-3">
          <div className="relative min-w-0 flex-1" role="none">
            <Icon name="search" size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              ref={inputRef}
              className={`h-13 w-full rounded-2xl border border-transparent bg-surface-container-low py-3.5 pl-12 ${query ? 'pr-12' : 'pr-4'} text-body-lg text-on-surface outline-none focus:border-primary`}
              placeholder="Que cherchez-vous ?"
              value={query}
              onChange={e => { onQueryChange(e.target.value); setSelectedIdx(-1) }}
              onKeyDown={handleKeyDown}
              enterKeyHint="search"
              role="combobox"
              aria-expanded={q.length > 0}
              aria-controls={listboxId}
              aria-activedescendant={selectedIdx >= 0 ? optionId(selectedIdx) : undefined}
              aria-autocomplete="list"
              aria-label="Rechercher"
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => { onQueryChange(''); inputRef.current?.focus() }} aria-label="Effacer la recherche" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container-high text-on-surface-variant"><Icon name="close" size={17} /></button>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer la recherche" className="shrink-0 cursor-pointer border-none bg-transparent px-2 py-2 text-label-lg text-on-surface-variant">Annuler</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto overscroll-contain">
        <div className="mx-auto max-w-[760px] px-4 pb-8 pt-2">
          {routing && <AdultSearchNotice routing={routing} onOpenSection={slug => { onSelectCategory(slug); onClose() }} className="mt-3" />}

          {q && suggestLoading && !suggest && <p className="py-8 text-center text-body-md text-on-surface-variant">Recherche…</p>}

          {q && suggest && !noResults && (
            <div role="listbox" id={listboxId} aria-label="Suggestions">
              {suggestions.length > 0 && section('trending_up', 'Suggestions')}
              <div className="flex flex-col gap-1">
                {suggestions.map(s => {
                  const i = indexOf({ kind: 'listing', id: s.id })
                  const blur = blurOf(s)
                  return (
                    <button
                      key={s.id}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === selectedIdx}
                      type="button"
                      onClick={() => choose({ kind: 'listing', id: s.id })}
                      onMouseEnter={() => setSelectedIdx(i)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-none p-2 text-left ${i === selectedIdx ? 'bg-surface-container-low' : 'bg-transparent'}`}
                    >
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">{s.coverImageUrl ? <img loading="lazy" decoding="async" src={thumbnailUrl(s.coverImageUrl)} alt={`${s.title} — photo 1`} className={`h-full w-full object-cover ${blur ? ADULT_BLUR_CLASS : ''}`} /> : <Icon name="image" size={20} className="m-2.5 text-on-surface-variant" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-label-lg text-on-surface"><Highlight text={s.title} query={q} /></span>
                        <span className="block truncate text-body-sm text-on-surface-variant">dans <span className="text-primary">{s.category.name}</span> • {s.city}{s.isAdult ? ' • Section Adultes' : ''}</span>
                      </span>
                      <span className="shrink-0 text-label-md text-on-surface"><Price amount={s.price} currency={s.currency} /></span>
                    </button>
                  )
                })}
              </div>
              {categoryHits.length > 0 && (
                <>
                  {section('category', 'Dans les catégories')}
                  <div className="flex flex-col gap-1">
                    {categoryHits.map(c => {
                      const i = indexOf({ kind: 'category', slug: c.slug, label: c.label })
                      return (
                        <button key={c.slug} id={optionId(i)} role="option" aria-selected={i === selectedIdx} type="button"
                          onClick={() => choose({ kind: 'category', slug: c.slug, label: c.label })} onMouseEnter={() => setSelectedIdx(i)}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-none px-2 py-2 text-left ${i === selectedIdx ? 'bg-surface-container-low' : 'bg-transparent'}`}>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary"><CategoryIcon icon={c.icon ?? 'category'} size={18} /></span>
                          <span className="min-w-0 flex-1 truncate text-label-lg text-on-surface">{c.parent ? <>{c.parent} <span className="text-on-surface-variant">›</span> </> : null}<Highlight text={c.label} query={q} /></span>
                          <Icon name="arrow_forward" size={17} className="text-on-surface-variant" />
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
              <button id={optionId(allIdx)} role="option" aria-selected={allIdx === selectedIdx} type="button" onClick={() => runSearch()} onMouseEnter={() => setSelectedIdx(allIdx)}
                className={`mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none py-3 text-label-lg text-primary hover:bg-surface-container ${allIdx === selectedIdx ? 'bg-surface-container' : 'bg-surface-container-low'}`}>
                <span className="min-w-0 truncate">Voir tous les résultats pour « {q} »</span> <Icon name="arrow_forward" size={18} className="shrink-0" />
              </button>
            </div>
          )}

          {noResults && (
            <div className="py-10 text-center">
              <Icon name="search_off" size={42} className="text-on-surface-variant" />
              <p className="m-0 mt-2 text-headline-sm text-on-surface">Aucune annonce pour « {q} »</p>
              <p className="m-0 mx-auto mt-1 max-w-sm text-body-sm text-on-surface-variant">
                {fold(q).split(' ').length > 2 ? 'Essayez avec moins de mots, ou ' : 'Vérifiez l’orthographe, essayez un mot proche, ou '}lancez la recherche pour créer une alerte.
              </p>
              {categoryHits.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {categoryHits.map(c => (
                    <button key={c.slug} type="button" onClick={() => { onSelectCategory(c.slug); onClose() }} className="cursor-pointer rounded-full border-none bg-surface-lowest px-3.5 py-2 text-label-md text-on-surface hover:text-primary">{c.label}</button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => runSearch()} className="mt-4 max-w-full cursor-pointer truncate rounded-xl border-none bg-primary px-5 py-2.5 text-label-md text-white">Rechercher « {q} »</button>
            </div>
          )}

          {!q && (
            <>
              {recent.length > 0 && (
                <>
                  {section('history', 'Recherches récentes', <button type="button" onClick={() => { writeRecent([]); setRecent([]) }} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-primary">Effacer</button>)}
                  <div className="flex flex-col">
                    {recent.map(t => (
                      <button key={t} type="button" onClick={() => runSearch(t)} className="flex cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent px-2 py-2.5 text-left text-body-md text-on-surface hover:bg-surface-container-low">
                        <Icon name="history" size={19} className="text-on-surface-variant" /> <span className="min-w-0 flex-1 truncate">{t}</span> <Icon name="north_west" size={17} className="text-on-surface-variant" />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {popular.length > 0 && (
                <>
                  {section('local_fire_department', 'Recherches populaires')}
                  <div className="flex flex-wrap gap-2">
                    {popular.map(p => (
                      <button key={p.term} type="button" onClick={() => runSearch(p.term)} className="flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border-none bg-surface-lowest px-3.5 py-2 text-label-md text-on-surface hover:text-primary">
                        <Icon name="trending_up" size={15} className="shrink-0 text-primary" /> <span className="truncate">{p.term}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {section('category', 'Catégories')}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map(cat => (
                  <button key={cat.id} type="button" onClick={() => { onSelectCategory(cat.slug); onClose() }} className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border-none bg-surface-lowest p-3 text-left hover:bg-surface-container-low">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-fixed text-primary"><CategoryIcon icon={cat.icon} size={20} /></span>
                    <span className="min-w-0"><span className="line-clamp-2 text-label-md leading-tight text-on-surface">{cat.name}</span>{cat.listingsCount != null && <span className="block text-label-sm text-on-surface-variant">{cat.listingsCount} annonce{cat.listingsCount > 1 ? 's' : ''}</span>}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
