import { useState } from 'react'
import Icon from '../Icon'
import { mapsTargets, openMaps, tilesFor, type LatLng } from '../../lib/maps'

const BOX_W = 640
const ZOOM = 16

// A small, lazy OpenStreetMap preview centred on the meet-up point (a few
// tiles, no API key); the pin sits in the middle.
export function StaticMap({ point, height = 132, label }: { point: LatLng; height?: number; label: string }) {
  const tiles = tilesFor(point, ZOOM, BOX_W, height)
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-surface-container" style={{ height }} role="img" aria-label={`Carte : ${label}`}>
      <div className="absolute top-0" style={{ left: `calc(50% - ${BOX_W / 2}px)`, width: BOX_W, height }}>
        {tiles.map(t => (
          <img key={t.key} src={t.src} alt="" loading="lazy" decoding="async" draggable={false} className="absolute h-64 w-64 max-w-none select-none" style={{ left: t.left, top: t.top }} />
        ))}
      </div>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]" aria-hidden>
        <Icon name="location_on" size={34} fill />
      </span>
      <span className="absolute bottom-0 right-0 rounded-tl-md bg-white/85 px-1 text-[9px] leading-4 text-neutral-700">© OpenStreetMap</span>
    </div>
  )
}

// « Ouvrir dans Maps », « Itinéraire », « Copier l’adresse ».
export function MapsActions({ point, label, address, compact }: { point: LatLng | null; label: string; address?: string | null; compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const text = [label, address].filter(Boolean).join(', ')
  const copy = () => {
    void navigator.clipboard?.writeText(point ? `${text} (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})` : text)
      .then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500) })
      .catch(() => undefined)
  }
  const t = point ? mapsTargets(point, label) : null
  const btn = `flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg border-none px-2 py-2 text-label-sm font-semibold ${compact ? '' : 'sm:text-label-md'}`
  return (
    <div className="flex gap-1.5">
      {t && (
        <>
          <a href={t.open} onClick={e => { e.preventDefault(); openMaps(t.open, t.fallback) }} target="_blank" rel="noopener noreferrer" className={`${btn} bg-primary text-white no-underline`} data-maps="open">
            <Icon name="map" size={16} /> Ouvrir dans Maps
          </a>
          <a href={t.directions} target="_blank" rel="noopener noreferrer" className={`${btn} bg-surface-container text-on-surface no-underline`} data-maps="directions">
            <Icon name="directions" size={16} /> Itinéraire
          </a>
        </>
      )}
      <button type="button" onClick={copy} aria-label="Copier l’adresse" title="Copier l’adresse" className={`${btn} ${t ? 'max-w-11 flex-none' : ''} bg-surface-container text-on-surface`}>
        <Icon name={copied ? 'check' : 'content_copy'} size={16} />{!t && (copied ? ' Copiée' : ' Copier l’adresse')}
      </button>
    </div>
  )
}
