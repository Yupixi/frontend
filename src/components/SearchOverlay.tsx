import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@apollo/client/react'
import Icon, { CategoryIcon } from './Icon'
import Price from './Price'
import { LISTINGS_QUERY, type RemoteListing } from '../graphql/listings'
import { CATEGORIES_QUERY, POPULAR_SEARCHES_QUERY, type PopularSearch, type RemoteCategory } from '../graphql/categories'
import { thumbnailUrl } from '../lib/media'

type Props = {
  query: string
  onQueryChange: (q: string) => void
  onSearch: () => void
  onSelectListing: (id: string) => void
  onSelectCategory: (slug: string) => void
  onClose: () => void
  onNavigate: (page: any) => void
}

const RECENT_KEY = 'dilchap_recent_searches'
const readRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[] } catch { return [] }
}
const writeRecent = (list: string[]) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch { /* private mode */ }
}
export const rememberSearch = (term: string) => {
  const t = term.trim()
  if (!t) return
  writeRecent([t, ...readRecent().filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, 6))
}

// Full-screen search panel: live suggestions, recent and popular searches,
// categories.
export default function SearchOverlay({ query, onQueryChange, onSearch, onSelectListing, onSelectCategory, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [recent, setRecent] = useState<string[]>(readRecent)

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
  const { data: categoriesData } = useQuery<{ categories: RemoteCategory[] }>(CATEGORIES_QUERY)
  // Empty categories would lead to a blank results page.
  const categories = (categoriesData?.categories ?? []).filter(c => c.listingsCount !== 0)
  const { data: popularData } = useQuery<{ popularSearches: PopularSearch[] }>(POPULAR_SEARCHES_QUERY, { variables: { limit: 8 } })
  const popular = popularData?.popularSearches ?? []
  const { data: suggestData, loading: suggestLoading } = useQuery<{ listings: { items: RemoteListing[] } }>(
    LISTINGS_QUERY,
    { variables: { filter: { search: debouncedQuery }, pageSize: 8 }, skip: !debouncedQuery },
  )
  const suggestions = debouncedQuery ? (suggestData?.listings.items ?? []) : []

  const runSearch = (term?: string) => {
    if (term != null) onQueryChange(term)
    rememberSearch(term ?? query)
    onSearch()
    onClose()
  }
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIdx >= 0 && suggestions[selectedIdx]) { onSelectListing(suggestions[selectedIdx].id); onClose() }
      else runSearch()
    } else if (e.key === 'Escape') onClose()
  }

  const listboxId = 'search-suggestions'
  const section = (icon: string, label: string, extra?: React.ReactNode) => (
    <div className="mb-3 mt-5 flex items-center justify-between first:mt-2">
      <span className="flex items-center gap-1.5 text-label-sm uppercase text-on-surface-variant"><Icon name={icon} size={16} /> {label}</span>
      {extra}
    </div>
  )

  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" aria-label="Rechercher sur Dilchap" className="safe-pt fixed inset-0 z-[9999] flex flex-col bg-surface">
      <div className="border-0 border-b border-solid border-outline-variant bg-surface-lowest">
        <div className="mx-auto flex max-w-[760px] items-center gap-3 px-4 py-3">
          <div className="relative flex-1" role="none">
            <Icon name="search" size={22} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              ref={inputRef}
              className={`h-13 w-full rounded-2xl border border-transparent bg-surface-container-low py-3.5 pl-12 ${query ? 'pr-12' : 'pr-4'} text-body-lg text-on-surface outline-none focus:border-primary`}
              placeholder="Que cherchez-vous ?"
              value={query}
              onChange={e => { onQueryChange(e.target.value); setSelectedIdx(-1) }}
              onKeyDown={handleKeyDown}
              role="combobox"
              aria-expanded={q.length > 0}
              aria-controls={listboxId}
              aria-activedescendant={selectedIdx >= 0 ? `suggestion-${selectedIdx}` : undefined}
              aria-autocomplete="list"
              aria-label="Rechercher"
              autoComplete="off"
            />
            {query && (
              <button type="button" onClick={() => onQueryChange('')} aria-label="Effacer la recherche" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-surface-container-high text-on-surface-variant"><Icon name="close" size={17} /></button>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer la recherche" className="cursor-pointer border-none bg-transparent px-2 py-2 text-label-lg text-on-surface-variant">Annuler</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto overscroll-contain">
        <div className="mx-auto max-w-[760px] px-4 pb-8 pt-2">
          {q && suggestLoading && <p className="py-8 text-center text-body-md text-on-surface-variant">Recherche…</p>}

          {q && !suggestLoading && suggestions.length > 0 && (
            <div role="listbox" id={listboxId} aria-label="Suggestions">
              {section('trending_up', 'Suggestions')}
              <div className="flex flex-col gap-1">
                {suggestions.map((s, i) => {
                  const idx = s.title.toLowerCase().indexOf(q.toLowerCase())
                  const before = idx > 0 ? s.title.slice(0, idx) : ''
                  const match = idx >= 0 ? s.title.slice(idx, idx + q.length) : s.title
                  const after = idx >= 0 ? s.title.slice(idx + q.length) : ''
                  return (
                    <button
                      key={s.id}
                      id={`suggestion-${i}`}
                      role="option"
                      aria-selected={i === selectedIdx}
                      type="button"
                      onClick={() => { onSelectListing(s.id); onClose() }}
                      onMouseEnter={() => setSelectedIdx(i)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-none p-2 text-left ${i === selectedIdx ? 'bg-surface-container-low' : 'bg-transparent'}`}
                    >
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-container">{s.coverImageUrl ? <img loading="lazy" decoding="async" src={thumbnailUrl(s.coverImageUrl)} alt="" className="h-full w-full object-cover" /> : <Icon name="image" size={20} className="m-2.5 text-on-surface-variant" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-label-lg text-on-surface">{before}<b className="text-primary">{match}</b>{after}</span>
                        <span className="block text-body-sm text-on-surface-variant">dans <span className="text-primary">{s.category.name}</span> • {s.city}</span>
                      </span>
                      <span className="shrink-0 text-label-md text-on-surface"><Price amount={s.price} currency={s.currency} /></span>
                    </button>
                  )
                })}
              </div>
              <button type="button" onClick={() => runSearch()} className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-none bg-surface-container-low py-3 text-label-lg text-primary hover:bg-surface-container">
                Voir tous les résultats pour « {query} » <Icon name="arrow_forward" size={18} />
              </button>
            </div>
          )}

          {q && !suggestLoading && suggestions.length === 0 && (
            <div className="py-12 text-center">
              <Icon name="search_off" size={42} className="text-on-surface-variant" />
              <p className="m-0 mt-2 text-headline-sm text-on-surface">Aucun résultat</p>
              <p className="m-0 mt-1 text-body-sm text-on-surface-variant">Essayez avec d'autres termes, ou lancez la recherche complète.</p>
              <button type="button" onClick={() => runSearch()} className="mt-4 cursor-pointer rounded-xl border-none bg-primary px-5 py-2.5 text-label-md text-white">Rechercher « {query} »</button>
            </div>
          )}

          {!q && (
            <>
              {recent.length > 0 && (
                <>
                  {section('history', 'Recherches récentes', <button onClick={() => { writeRecent([]); setRecent([]) }} className="cursor-pointer border-none bg-transparent p-0 text-label-sm text-primary">Effacer</button>)}
                  <div className="flex flex-col">
                    {recent.map(t => (
                      <button key={t} type="button" onClick={() => runSearch(t)} className="flex cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent px-2 py-2.5 text-left text-body-md text-on-surface hover:bg-surface-container-low">
                        <Icon name="history" size={19} className="text-on-surface-variant" /> <span className="flex-1 truncate">{t}</span> <Icon name="north_west" size={17} className="text-on-surface-variant" />
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
                      <button key={p.term} type="button" onClick={() => runSearch(p.term)} className="flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-surface-lowest px-3.5 py-2 text-label-md text-on-surface hover:text-primary">
                        <Icon name="trending_up" size={15} className="text-primary" /> {p.term}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {section('category', 'Catégories')}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map(cat => (
                  <button key={cat.id} type="button" onClick={() => { onSelectCategory(cat.slug); onClose() }} className="flex cursor-pointer items-center gap-2.5 rounded-xl border-none bg-surface-lowest p-3 text-left hover:bg-surface-container-low">
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
