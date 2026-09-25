import { useEffect, useState } from 'react'
import Icon from './Icon'
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
  // Mobile header pill (Stitch "Abidjan ▾"): the city alone, else the country.
  const shortLabel = location?.city || market?.country || 'Tous pays'

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

  const option = (active: boolean) => `flex w-full cursor-pointer items-center justify-between rounded-lg border-none px-3 py-2 text-left text-label-md ${active ? 'bg-primary-fixed/60 text-primary' : 'bg-transparent text-on-surface hover:bg-surface-container-low'}`

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title={label}
        className={`flex cursor-pointer items-center justify-center rounded-xl border-none text-label-md text-on-surface ${compact ? 'h-9 gap-1 rounded-full bg-surface-container pl-2 pr-1.5 hover:bg-surface-container-high' : 'h-10 gap-1.5 bg-surface-container-low px-3 hover:bg-surface-container'}`}
      >
        <Icon name="location_on" size={compact ? 16 : 18} className="text-primary" />
        <span className={`truncate ${compact ? 'max-w-[76px]' : 'max-w-[140px]'}`}>{compact ? shortLabel : label}</span>
        <Icon name="expand_more" size={compact ? 16 : 17} className="text-on-surface-variant" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[29]" onClick={() => setOpen(false)} />
          {/* Phones: pinned under the header so it never spills off-screen. */}
          <div className={`z-30 max-h-[380px] overflow-y-auto rounded-2xl border border-outline-variant bg-surface-lowest p-2 shadow-float ${compact ? 'fixed left-4 right-4 top-16' : 'absolute right-0 top-full mt-2 w-64'}`}>
            <div className="px-2 pb-1 pt-1 text-label-sm uppercase text-on-surface-variant">Pays</div>
            <button onClick={() => pick(null)} className={option(!market)}>Tous les pays{!market && <Icon name="check" size={17} />}</button>
            {MARKETS.map(m => (
              <button key={m.countryCode} onClick={() => pick(m.countryCode)} className={option(market?.countryCode === m.countryCode)}>
                {m.country}{market?.countryCode === m.countryCode && <Icon name="check" size={17} />}
              </button>
            ))}
            {market && (
              <div className="mt-2 border-0 border-t border-solid border-outline-variant px-1 pb-1 pt-3">
                <label className="mb-1.5 block text-label-sm text-on-surface-variant">Ville ou commune</label>
                <div className="flex gap-1.5">
                  <input value={city} onChange={e => setCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyCity()} placeholder="Ex : Cocody" className="min-w-0 flex-1 rounded-lg border border-transparent bg-surface-container-low px-2.5 py-2 text-body-sm text-on-surface outline-none focus:border-primary" />
                  <button onClick={applyCity} className="cursor-pointer rounded-lg border-none bg-primary px-3 text-label-md text-white">OK</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
