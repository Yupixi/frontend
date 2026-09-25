import { lazy, type ComponentType } from 'react'

type Loader<P> = () => Promise<{ default: ComponentType<P> }>
type LazyPage<P> = ReturnType<typeof lazy<ComponentType<P>>> & { preload: () => Promise<unknown> }

// A deploy renames every chunk; a tab opened on the previous build then 404s
// on its first lazy navigation. One hard reload picks up the new index.html
// (guarded so a genuinely broken chunk can't loop).
const RELOAD_FLAG = 'yupixi_chunk_reload'

function withReloadOnStaleChunk<P>(load: Loader<P>): Loader<P> {
  return () =>
    load().then(
      mod => {
        sessionStorage.removeItem(RELOAD_FLAG)
        return mod
      },
      err => {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1')
          window.location.reload()
          return new Promise<never>(() => {})
        }
        throw err
      },
    )
}

// React.lazy plus a `preload()` that warms the same promise, so a page
// fetched ahead of time (idle prefetch, hover) renders without suspending.
export function lazyPage<P>(load: Loader<P>): LazyPage<P> {
  let promise: Promise<{ default: ComponentType<P> }> | null = null
  const safeLoad = withReloadOnStaleChunk(load)
  const once = () => (promise ??= safeLoad().catch(err => {
    promise = null
    throw err
  }))
  const Comp = lazy(once) as LazyPage<P>
  Comp.preload = once
  return Comp
}

// Fetches the given pages' chunks once the browser is idle — keeps the first
// paint lean while making the next navigation instant.
export function preloadPages(pages: Array<{ preload: () => Promise<unknown> }>) {
  const run = () => pages.forEach(p => void p.preload().catch(() => undefined))
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (conn?.saveData) return
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 2000)
}
