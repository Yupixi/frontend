import { useEffect, useRef } from 'react'

// Reveal-on-scroll: every `.reveal` element inside the returned ref gets
// `data-shown` once it enters the screen (index.css fades it up, staggered
// by its `--i`). Elements already shown keep it across re-renders; `key`
// re-scans when the list changes.
export function useReveal<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const els = [...root.querySelectorAll<HTMLElement>('.reveal:not([data-shown])')]
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => { el.dataset.shown = '' })
      return
    }
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        ;(e.target as HTMLElement).dataset.shown = ''
        io.unobserve(e.target)
      }
    }, { rootMargin: '0px 0px -40px 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [key])
  return ref
}
