import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { thumbnailUrl } from '../lib/media'

type Props = {
  images: string[]
  start: number
  alt: string
  onClose: () => void
  // Keeps the page gallery on the photo last seen here.
  onIndexChange?: (i: number) => void
}

// Full-screen photo viewer: swipe (scroll-snap), arrows / keyboard on
// desktop, and the system back button closes it instead of leaving the page.
export default function ImageLightbox({ images, start, alt, onClose, onIndexChange }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const [idx, setIdx] = useState(start)
  const closeRef = useRef(onClose)
  const closedByBack = useRef(false)
  const alive = useRef(false)
  useEffect(() => { closeRef.current = onClose }, [onClose])

  useLayoutEffect(() => {
    const t = track.current
    if (t) t.scrollLeft = start * t.clientWidth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goTo = (i: number) => {
    const t = track.current
    if (!t) return
    const n = (i + images.length) % images.length
    t.scrollTo({ left: n * t.clientWidth, behavior: 'smooth' })
  }
  const onScroll = () => {
    const t = track.current
    if (!t || !t.clientWidth) return
    const i = Math.round(t.scrollLeft / t.clientWidth)
    if (i !== idx) { setIdx(i); onIndexChange?.(i) }
  }

  useEffect(() => {
    alive.current = true
    // One history entry per viewer, even when the effect re-runs (StrictMode).
    if (!window.history.state?.__yupixiSheetMarker) window.history.pushState({ __yupixiSheetMarker: true }, '')
    const onPop = () => { closedByBack.current = true; closeRef.current() }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key === 'ArrowRight') goTo(Math.round((track.current?.scrollLeft ?? 0) / (track.current?.clientWidth || 1)) + 1)
      if (e.key === 'ArrowLeft') goTo(Math.round((track.current?.scrollLeft ?? 0) / (track.current?.clientWidth || 1)) - 1)
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      alive.current = false
      // Deferred: a re-run of the effect keeps the entry instead of popping it.
      window.setTimeout(() => {
        if (!alive.current && !closedByBack.current && window.history.state?.__yupixiSheetMarker) window.history.back()
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const many = images.length > 1
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Photos : ${alt}`} className="fixed inset-0 z-[10000] flex flex-col bg-black animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-center justify-between px-4 pb-2 text-white" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
        <span className="text-label-lg">{many ? `${idx + 1} / ${images.length}` : ''}</span>
        <button onClick={() => closeRef.current()} aria-label="Fermer" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-white hover:bg-white/25">
          <Icon name="close" size={22} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={track} onScroll={onScroll} className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, i) => (
            <div key={i} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
              <img src={src} alt={`${alt} — photo ${i + 1}`} draggable={false} decoding="async" loading={Math.abs(i - start) <= 1 ? 'eager' : 'lazy'} className="max-h-full max-w-full select-none object-contain" />
            </div>
          ))}
        </div>
        {many && (
          <>
            <button onClick={() => goTo(idx - 1)} aria-label="Photo précédente" className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-white hover:bg-white/25 lg:flex"><Icon name="chevron_left" size={28} /></button>
            <button onClick={() => goTo(idx + 1)} aria-label="Photo suivante" className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-white/15 text-white hover:bg-white/25 lg:flex"><Icon name="chevron_right" size={28} /></button>
          </>
        )}
      </div>

      {many && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 pt-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          {images.map((src, i) => (
            <button key={i} onClick={() => goTo(i)} aria-label={`Photo ${i + 1}`} className={`h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-solid p-0 transition-opacity ${i === idx ? 'border-white opacity-100' : 'border-transparent opacity-50'}`}>
              <img src={thumbnailUrl(src)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
