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
        className={`flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-none bg-surface-container-low text-label-md text-on-surface hover:bg-surface-container ${compact ? 'w-10' : 'px-3'}`}
      >
        <Icon name="location_on" size={18} className="text-primary" />
        {!compact && <span className="max-w-[140px] truncate">{label}</span>}
        {!compact && <Icon name="expand_more" size={17} className="text-on-surface-variant" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[29]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-30 mt-2 max-h-[380px] w-64 overflow-y-auto rounded-2xl border border-outline-variant bg-surface-lowest p-2 shadow-float">
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
