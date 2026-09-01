import { useEffect, useState } from 'react'
import { MapPin, ChevronDown } from 'lucide-react'
import { MARKETS } from '../data/markets'
import type { StoredLocation } from '../lib/location'

type LocationPillProps = {
  location: StoredLocation | null | undefined
  onChange: (location: StoredLocation) => void
  compact?: boolean
}

// Detected via IP on first load (see App.tsx) — this is just the override
// UI, since a wrong or unknown detection must never trap the user behind a
// filter they can't see or clear.
export default function LocationPill({ location, onChange, compact }: LocationPillProps) {
  const [open, setOpen] = useState(false)
  const [city, setCity] = useState(location?.city ?? '')
  const market = location?.countryCode ? MARKETS.find(m => m.countryCode === location.countryCode) : undefined
  const label = market ? (location?.city ? `${location.city}, ${market.country}` : market.country) : 'Tous les pays'

  useEffect(() => setCity(location?.city ?? ''), [location?.city])

  const pick = (countryCode: string | null) => {
    // A city belongs to the previous market; retaining it would create
    // impossible pairs such as Dakar/CI and an empty feed.
    setCity('')
    onChange({ countryCode, city: null, source: 'manual' })
    if (!countryCode) setOpen(false)
  }

  const applyCity = () => {
    if (!location?.countryCode) return
    onChange({ countryCode: location.countryCode, city: city.trim() || null, source: 'manual' })
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={label}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          background: 'var(--border-subtle)', border: '1px solid var(--border)', borderRadius: 10,
          color: 'var(--fg-muted)', fontSize: '0.8rem', fontWeight: 700,
          padding: compact ? 0 : '0 12px', width: compact ? 38 : undefined, height: 38,
          justifyContent: 'center',
        }}
      >
        <MapPin size={16} />
        {!compact && <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
        {!compact && <ChevronDown size={13} />}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 29 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 30,
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', padding: 6, width: 250, maxHeight: 380, overflowY: 'auto',
          }}>
            <button
              onClick={() => pick(null)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', background: !market ? 'var(--border-subtle)' : 'none', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: 'var(--fg)' }}
            >
              Tous les pays
            </button>
            {MARKETS.map(m => (
              <button
                key={m.countryCode}
                onClick={() => pick(m.countryCode)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', background: market?.countryCode === m.countryCode ? 'var(--border-subtle)' : 'none', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, color: 'var(--fg)' }}
              >
                {m.country}
              </button>
            ))}
            {market && (
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, padding: '10px 6px 4px' }}>
                <label style={{ display: 'block', marginBottom: 5, color: 'var(--fg-muted)', fontSize: '0.72rem', fontWeight: 700 }}>Ville ou commune</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="input" value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyCity()} placeholder="Ex : Cocody" style={{ minWidth: 0, padding: '7px 8px', fontSize: '0.78rem' }} />
                  <button className="btn-primary" onClick={applyCity} style={{ padding: '7px 9px', fontSize: '0.75rem' }}>OK</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
