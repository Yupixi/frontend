import { useState, useEffect, useRef } from 'react'
import { Search, MapPin, TrendingUp, Clock, X } from 'lucide-react'
import { listings, categories } from '../data/mockData'

type Props = {
  query: string
  onQueryChange: (q: string) => void
  onSearch: () => void
  onSelectListing: (id: string) => void
  onClose: () => void
  onNavigate: (page: any) => void
}

export default function SearchOverlay({ query, onQueryChange, onSearch, onSelectListing, onClose, onNavigate }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [selectedIdx, setSelectedIdx] = useState(-1)

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    return () => prev?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const q = query.toLowerCase().trim()

  const catName = (id: string) => categories.find(c => c.id === id)?.name || id

  const suggestions = q
    ? (() => {
        const seen = new Set<string>()
        const results: { term: string; catName: string; catColor: string }[] = []
        for (const l of listings) {
          const lower = l.title.toLowerCase()
          if (lower.includes(q)) {
            const key = l.title
            if (!seen.has(key)) {
              seen.add(key)
              results.push({
                term: l.title,
                catName: catName(l.category),
                catColor: categories.find(c => c.id === l.category)?.color || '#FE0000',
              })
            }
          }
          if (results.length >= 8) break
        }
        return results
      })()
    : []

  const popularSearches = ['iPhone 15', 'Toyota', 'Villa Cocody', 'PS5', 'Canapé', 'Vélo']

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        onQueryChange(suggestions[selectedIdx].term)
        onSearch()
        onClose()
      } else {
        onSearch()
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const listboxId = 'search-suggestions'
  const expanded = q.length > 0

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Rechercher sur Yüpixi"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg)',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      {/* Header with search input */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} role="none">
            <div style={{ flex: 1, position: 'relative' }} role="none">
              <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} aria-hidden="true" />
              <input
                ref={inputRef}
                className="input"
                style={{ paddingLeft: 48, paddingRight: 48, fontSize: '1rem', height: 52, borderRadius: 14, background: 'var(--bg)', borderColor: 'var(--border)' }}
                placeholder="Rechercher sur Yüpixi..."
                value={query}
                onChange={e => { onQueryChange(e.target.value); setSelectedIdx(-1) }}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded={expanded}
                aria-controls={listboxId}
                aria-activedescendant={selectedIdx >= 0 ? `suggestion-${selectedIdx}` : undefined}
                aria-autocomplete="list"
                aria-label="Rechercher"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => onQueryChange('')}
                  aria-label="Effacer la recherche"
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-subtle)', padding: 4 }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer la recherche" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontWeight: 700, fontSize: '0.9rem', padding: '8px 12px', fontFamily: "'Outfit', sans-serif" }}>
              Annuler
            </button>
          </div>
        </div>
      </div>

      {/* Results area */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1, overflow: 'auto',
        background: 'var(--bg)',
        animation: 'slideDown 0.2s ease-out',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0.75rem 1.25rem 2rem' }}>
          {q && suggestions.length > 0 && (
            <div role="listbox" id={listboxId} aria-label="Suggestions" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: 4 }}>
                <TrendingUp size={14} style={{ color: 'var(--fg-subtle)' }} aria-hidden="true" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggestions</span>
              </div>
              {suggestions.map((s, i) => {
                const idx = s.term.toLowerCase().indexOf(q)
                const before = idx > 0 ? s.term.slice(0, idx) : ''
                const match = idx >= 0 ? s.term.slice(idx, idx + q.length) : ''
                const after = idx >= 0 ? s.term.slice(idx + q.length) : ''
                return (
                  <button
                    key={s.term}
                    id={`suggestion-${i}`}
                    role="option"
                    aria-selected={i === selectedIdx}
                    type="button"
                    onClick={() => { onQueryChange(s.term); onSearch(); onClose() }}
                    onMouseEnter={() => setSelectedIdx(i)}
                    style={{
                      width: '100%', display: 'flex', gap: 10, alignItems: 'center',
                      padding: '0.55rem 0.75rem', border: 'none', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      background: i === selectedIdx ? 'var(--border-subtle)' : 'transparent',
                      color: 'var(--fg)', transition: 'all 0.1s',
                    }}
                  >
                    <Search size={15} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} aria-hidden="true" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {before}<span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--primary)' }}>{match}</span>{after}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--fg-subtle)', marginTop: 1 }}>
                        dans <span style={{ color: s.catColor, fontWeight: 700 }}>{s.catName}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => { onSearch(); onClose() }}
                style={{
                  width: '100%', padding: '0.75rem', border: '1.5px solid var(--border)', borderRadius: 12,
                  cursor: 'pointer', textAlign: 'center', marginTop: 8,
                  background: 'var(--bg-card)', color: 'var(--primary)',
                  fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.85rem',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
              >
                Rechercher "{query}" →
              </button>
            </div>
          )}

          {q && suggestions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--fg-muted)' }}>
              <Search size={40} style={{ opacity: 0.3, marginBottom: 12 }} aria-hidden="true" />
              <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>Aucun résultat</p>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Essayez avec d'autres termes</p>
            </div>
          )}

          {!q && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: 12 }}>
                <Clock size={14} style={{ color: 'var(--fg-subtle)' }} aria-hidden="true" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recherches populaires</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="none">
                {popularSearches.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { onQueryChange(s); onSearch(); onClose() }}
                    style={{
                      padding: '8px 18px', border: '1.5px solid var(--border)', borderRadius: 999,
                      cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--fg-muted)',
                      fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.82rem',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--fg-muted)' }}
                  >
                    <TrendingUp size={13} style={{ marginRight: 6 }} aria-hidden="true" />
                    {s}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.75rem 0', borderBottom: '1px solid var(--border-subtle)', marginTop: '1.5rem', marginBottom: 12 }}>
                <MapPin size={14} style={{ color: 'var(--fg-subtle)' }} aria-hidden="true" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catégories</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="none">
                {categories.slice(0, 8).map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { onQueryChange(cat.name); onClose() }}
                    style={{
                      padding: '8px 18px', border: 'none', borderRadius: 999,
                      cursor: 'pointer', background: cat.color + '12', color: cat.color,
                      fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '0.82rem',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
