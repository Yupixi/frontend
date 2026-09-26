import { useEffect, useRef } from 'react'

type Props = {
  src: string
  alt: string
  eager?: boolean
  // Current slide of the viewer: leaving it resets the zoom.
  active: boolean
  // While zoomed the viewer must stop swiping between photos.
  onZoomChange: (zoomed: boolean) => void
}

const MAX = 4
const DOUBLE_TAP_MS = 300

// Pinch / double-tap / ctrl+wheel zoom with panning, for the photo viewer.
// Transforms are written straight to the element (no re-render per move).
export default function ZoomableImage({ src, alt, eager, active, onZoomChange }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const view = useRef({ s: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ s: number; x: number; y: number; dist: number; mx: number; my: number; px: number; py: number } | null>(null)
  const lastTap = useRef({ t: 0, x: 0, y: 0 })
  const zoomedRef = useRef(false)

  const apply = (s: number, x: number, y: number, animate = false) => {
    const el = img.current
    const b = box.current
    if (!el || !b) return
    s = Math.min(MAX, Math.max(1, s))
    // Keep the photo covering its box: no panning past its edges.
    const maxX = Math.max(0, (el.offsetWidth * s - b.clientWidth) / 2)
    const maxY = Math.max(0, (el.offsetHeight * s - b.clientHeight) / 2)
    x = s === 1 ? 0 : Math.min(maxX, Math.max(-maxX, x))
    y = s === 1 ? 0 : Math.min(maxY, Math.max(-maxY, y))
    view.current = { s, x, y }
    el.style.transition = animate ? 'transform 0.25s cubic-bezier(0.16,1,0.3,1)' : 'none'
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`
    const zoomed = s > 1.01
    if (zoomed !== zoomedRef.current) {
      zoomedRef.current = zoomed
      // Not zoomed: the browser keeps horizontal swipes (photo to photo) and
      // hands pinches to us; zoomed: every gesture is ours.
      b.style.touchAction = zoomed ? 'none' : 'pan-x'
      onZoomChange(zoomed)
    }
  }

  // Zoom to `s` keeping the point (cx, cy) — relative to the box centre — still.
  const zoomAt = (s: number, cx: number, cy: number, animate = false) => {
    const v = view.current
    const k = Math.min(MAX, Math.max(1, s)) / v.s
    apply(v.s * k, cx - (cx - v.x) * k, cy - (cy - v.y) * k, animate)
  }

  const local = (clientX: number, clientY: number) => {
    const r = box.current!.getBoundingClientRect()
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 }
  }

  useEffect(() => { if (!active) apply(1, 0, 0) }, [active]) // eslint-disable-line react-hooks/exhaustive-deps

  // Trackpad pinch / ctrl+wheel on desktop (non-passive to stop page zoom).
  useEffect(() => {
    const b = box.current
    if (!b) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && view.current.s === 1) return
      e.preventDefault()
      const p = local(e.clientX, e.clientY)
      if (e.ctrlKey) zoomAt(view.current.s * Math.exp(-e.deltaY / 100), p.x, p.y)
      else apply(view.current.s, view.current.x - e.deltaX, view.current.y - e.deltaY)
    }
    b.addEventListener('wheel', onWheel, { passive: false })
    return () => b.removeEventListener('wheel', onWheel)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const begin = () => {
    const pts = [...pointers.current.values()]
    const v = view.current
    if (pts.length >= 2) {
      const [a, b] = pts
      const m = local((a.x + b.x) / 2, (a.y + b.y) / 2)
      gesture.current = { ...v, dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: m.x, my: m.y, px: 0, py: 0 }
    } else if (pts.length === 1) {
      gesture.current = { ...v, dist: 0, mx: 0, my: 0, px: pts[0].x, py: pts[0].y }
    } else gesture.current = null
  }

  const onPointerDown = (e: React.PointerEvent) => {
    // First finger of a new gesture: forget any pointer whose "up" was missed.
    if (e.isPrimary) pointers.current.clear()
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    begin()
    // Keep receiving the moves when a finger slides off the photo.
    if (pointers.current.size === 2 || view.current.s > 1) {
      try { (e.target as Element).setPointerCapture?.(e.pointerId) } catch { /* pointer already gone */ }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) return
    const pts = [...pointers.current.values()]
    if (pts.length >= 2 && g.dist) {
      const [a, b] = pts
      const k = Math.hypot(a.x - b.x, a.y - b.y) / g.dist
      const m = local((a.x + b.x) / 2, (a.y + b.y) / 2)
      const s = Math.min(MAX, Math.max(1, g.s * k))
      const f = s / g.s
      // Pinch around the fingers' midpoint, following it as it moves.
      apply(s, m.x - (g.mx - g.x) * f, m.y - (g.my - g.y) * f)
    } else if (pts.length === 1 && g.s > 1) {
      apply(g.s, g.x + (pts[0].x - g.px), g.y + (pts[0].y - g.py))
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const wasPinch = pointers.current.size >= 2
    pointers.current.delete(e.pointerId)
    begin()
    if (wasPinch || e.type === 'pointercancel') return
    // Double tap: zoom in on the tapped point, or back out.
    const now = Date.now()
    const t = lastTap.current
    if (now - t.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 30) {
      lastTap.current = { t: 0, x: 0, y: 0 }
      const p = local(e.clientX, e.clientY)
      if (view.current.s > 1) apply(1, 0, 0, true)
      else zoomAt(2.5, p.x, p.y, true)
    } else lastTap.current = { t: now, x: e.clientX, y: e.clientY }
  }

  return (
    <div
      ref={box}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'pan-x' }}
      className="flex h-full w-full items-center justify-center overflow-hidden"
    >
      <img
        ref={img}
        src={src}
        alt={alt}
        draggable={false}
        decoding="async"
        loading={eager ? 'eager' : 'lazy'}
        className="max-h-full max-w-full select-none object-contain will-change-transform"
      />
    </div>
  )
}
