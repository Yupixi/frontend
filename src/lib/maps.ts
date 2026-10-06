// Meet-up point helpers: links that open the member's maps app (« Ouvrir
// dans Maps », « Itinéraire ») and OpenStreetMap tile maths for the small
// static previews and the map picker. No API key, no SDK.

export type LatLng = { lat: number; lng: number }

export type Platform = 'ios' | 'android' | 'desktop'

export function platform(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): Platform {
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

const fixed = (n: number) => n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')

// Google Maps universal links (work in the app when installed, else web).
export const googleMapsUrl = (p: LatLng) =>
  `https://www.google.com/maps/search/?api=1&query=${fixed(p.lat)},${fixed(p.lng)}`
export const googleDirectionsUrl = (p: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${fixed(p.lat)},${fixed(p.lng)}`
export const appleMapsUrl = (p: LatLng, label?: string) =>
  `https://maps.apple.com/?ll=${fixed(p.lat)},${fixed(p.lng)}${label ? `&q=${encodeURIComponent(label)}` : ''}`
export const appleDirectionsUrl = (p: LatLng) =>
  `https://maps.apple.com/?daddr=${fixed(p.lat)},${fixed(p.lng)}&dirflg=d`
export const geoUri = (p: LatLng, label?: string) =>
  `geo:${fixed(p.lat)},${fixed(p.lng)}?q=${fixed(p.lat)},${fixed(p.lng)}${label ? `(${encodeURIComponent(label)})` : ''}`
export const osmUrl = (p: LatLng) =>
  `https://www.openstreetmap.org/?mlat=${fixed(p.lat)}&mlon=${fixed(p.lng)}#map=17/${fixed(p.lat)}/${fixed(p.lng)}`

// What « Ouvrir dans Maps » / « Itinéraire » open on this device: the
// native app (Apple Maps on iOS, a geo: intent on Android with Google Maps
// as the fallback), Google Maps in a new tab on a computer.
export function mapsTargets(p: LatLng, label?: string, on: Platform = platform()) {
  if (on === 'ios') return { open: appleMapsUrl(p, label), directions: appleDirectionsUrl(p), fallback: googleMapsUrl(p) }
  if (on === 'android') return { open: geoUri(p, label), directions: googleDirectionsUrl(p), fallback: googleMapsUrl(p) }
  return { open: googleMapsUrl(p), directions: googleDirectionsUrl(p), fallback: googleMapsUrl(p) }
}

// Opens a maps link. A geo: URI with no app to handle it leaves the page in
// place: then the Google Maps link opens instead.
export function openMaps(url: string, fallback: string) {
  if (url.startsWith('geo:')) {
    let left = false
    const onHide = () => { left = true }
    document.addEventListener('visibilitychange', onHide, { once: true })
    window.location.href = url
    window.setTimeout(() => {
      document.removeEventListener('visibilitychange', onHide)
      if (!left && document.visibilityState === 'visible') window.open(fallback, '_blank', 'noopener')
    }, 1200)
    return
  }
  window.open(url, '_blank', 'noopener')
}

// ---- OpenStreetMap tiles (slippy map maths) -------------------------------

export const TILE = 256
export const tileUrl = (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`

// World pixel coordinates of a point at zoom z.
export function project(p: LatLng, z: number) {
  const scale = TILE * 2 ** z
  const sin = Math.sin((p.lat * Math.PI) / 180)
  return {
    x: ((p.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  }
}
export function unproject(x: number, y: number, z: number): LatLng {
  const scale = TILE * 2 ** z
  const lng = (x / scale) * 360 - 180
  const n = Math.PI - (2 * Math.PI * y) / scale
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  return { lat, lng }
}

// Tiles covering a w×h box centred on `center` at zoom z, with their
// position in the box (px).
export function tilesFor(center: LatLng, z: number, w: number, h: number) {
  const c = project(center, z)
  const left = c.x - w / 2
  const top = c.y - h / 2
  const max = 2 ** z
  const out: { key: string; src: string; left: number; top: number }[] = []
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + w) / TILE); tx++)
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + h) / TILE); ty++) {
      if (ty < 0 || ty >= max) continue
      const x = ((tx % max) + max) % max
      out.push({ key: `${z}/${tx}/${ty}`, src: tileUrl(z, x, ty), left: tx * TILE - left, top: ty * TILE - top })
    }
  return out
}

// Great-circle distance in km.
export function distanceKm(a: LatLng, b: LatLng) {
  const rad = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

export const hasPoint = (m: { lat?: number | null; lng?: number | null } | null | undefined): m is LatLng =>
  !!m && typeof m.lat === 'number' && typeof m.lng === 'number'
