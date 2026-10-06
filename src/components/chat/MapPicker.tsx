import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import { project, tilesFor, unproject, type LatLng } from '../../lib/maps'

const MIN_Z = 5
const MAX_Z = 18

// A light slippy map on OpenStreetMap tiles (lazy-loaded with the meet-up
// sheet, no library): drag to move, tap to drop the pin, +/− to zoom.
// `marks`: the « Lieux conseillés » shown as small dots (tap one to pick it).
export default function MapPicker({ center, value, marks = [], onPick, onPickMark }: {
  center: LatLng
  value: LatLng | null
  marks?: { id: string; point: LatLng; name: string }[]
  onPick: (p: LatLng) => void
  onPickMark?: (id: string) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 320, h: 260 })
  const [view, setView] = useState({ c: value ?? center, z: 15 })
  const drag = useRef<{ x: number; y: number; c: LatLng; moved: boolean } | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  // A new centre (place picked in the list, own position): follow it.
  useEffect(() => { setView(v => ({ ...v, c: value ?? center })) }, [value?.lat, value?.lng, center.lat, center.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  const origin = project(view.c, view.z)
  const toScreen = (p: LatLng) => {
    const q = project(p, view.z)
    return { x: q.x - origin.x + size.w / 2, y: q.y - origin.y + size.h / 2 }
  }
  const fromScreen = (x: number, y: number) => unproject(origin.x + x - size.w / 2, origin.y + y - size.h / 2, view.z)
  const zoom = (d: number) => setView(v => ({ ...v, z: Math.min(MAX_Z, Math.max(MIN_Z, v.z + d)) }))

  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    drag.current = { x: e.clientX, y: e.clientY, c: view.c, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) < 6) return
    d.moved = true
    const start = project(d.c, view.z)
    setView(v => ({ ...v, c: unproject(start.x - dx, start.y - dy, v.z) }))
  }
  const up = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || d.moved) return
    const r = box.current!.getBoundingClientRect()
    onPick(fromScreen(e.clientX - r.left, e.clientY - r.top))
  }
  const pin = value ? toScreen(value) : null

  return (
    <div className="relative">
      <div
        ref={box}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => { drag.current = null }}
        onWheel={e => zoom(e.deltaY < 0 ? 1 : -1)}
        role="application"
        aria-label="Carte : touchez pour placer le point de rendez-vous, glissez pour vous déplacer"
        className="relative h-64 w-full cursor-crosshair touch-none select-none overflow-hidden rounded-2xl bg-surface-container sm:h-72"
      >
        {tilesFor(view.c, view.z, size.w, size.h).map(t => (
          <img key={t.key} src={t.src} alt="" draggable={false} decoding="async" className="pointer-events-none absolute h-64 w-64 max-w-none" style={{ left: t.left, top: t.top }} />
        ))}
        {marks.map(m => {
          const s = toScreen(m.point)
          if (s.x < -10 || s.y < -10 || s.x > size.w + 10 || s.y > size.h + 10) return null
          return (
            <button key={m.id} type="button" onClick={() => onPickMark?.(m.id)} title={m.name} aria-label={`Choisir ${m.name}`}
              className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-solid border-white bg-tertiary p-0 text-white shadow" style={{ left: s.x, top: s.y }}>
              <Icon name="verified_user" size={12} />
            </button>
          )
        })}
        {pin && (
          <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-full text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)]" style={{ left: pin.x, top: pin.y }} aria-hidden>
            <Icon name="location_on" size={38} fill />
          </span>
        )}
        <span className="pointer-events-none absolute bottom-0 right-0 rounded-tl-md bg-white/85 px-1 text-[9px] leading-4 text-neutral-700">© OpenStreetMap</span>
      </div>
      <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-xl bg-surface-lowest shadow">
        <button type="button" onClick={() => zoom(1)} aria-label="Zoomer" className="flex h-9 w-9 cursor-pointer items-center justify-center border-none bg-transparent text-on-surface"><Icon name="add" size={18} /></button>
        <button type="button" onClick={() => zoom(-1)} aria-label="Dézoomer" className="flex h-9 w-9 cursor-pointer items-center justify-center border-0 border-t border-solid border-outline-variant bg-transparent text-on-surface"><Icon name="remove" size={18} /></button>
      </div>
    </div>
  )
}
