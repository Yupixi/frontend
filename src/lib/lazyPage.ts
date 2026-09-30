import { lazy, type ComponentType } from 'react'

type Loader<P> = () => Promise<{ default: ComponentType<P> }>
type LazyPage<P> = ReturnType<typeof lazy<ComponentType<P>>> & { preload: () => Promise<unknown> }

// A deploy renames every chunk; a tab opened on the previous build then 404s
// on its next lazy navigation. One hard reload picks up the new index.html —
// but only when a new build is really out: offline, or a chunk that merely
// timed out on a slow network, the error goes to the page's ErrorBoundary
// (« Connexion perdue / Réessayer ») instead of reloading away whatever the
// visitor was typing. At most one such reload a minute, so a genuinely
// broken chunk can't loop.
const RELOAD_FLAG = 'yupixi_chunk_reload'
const RELOAD_GAP_MS = 60_000

function reloadedRecently(): boolean {
  try {
    return Date.now() - (Number(sessionStorage.getItem(RELOAD_FLAG)) || 0) < RELOAD_GAP_MS
  } catch {
    // Storage blocked: no way to guard a loop, so never reload.
    return true
  }
}

function markReload() {
  try { sessionStorage.setItem(RELOAD_FLAG, String(Date.now())) } catch { /* see reloadedRecently */ }
}

// The entry script this page runs vs the one the server's index.html names
// now: different = a deploy happened since the page was loaded.
async function newBuildDeployed(): Promise<boolean> {
  const entry = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.getAttribute('src')
  if (!entry) return false
  try {
    const res = await fetch('/index.html', { cache: 'no-store' })
    if (!res.ok) return false
    return !(await res.text()).includes(entry)
  } catch {
    return false
  }
}

function withReloadOnStaleChunk<P>(load: Loader<P>): Loader<P> {
  return () =>
    load().catch(async err => {
      if (navigator.onLine !== false && !reloadedRecently() && await newBuildDeployed()) {
        markReload()
        window.location.reload()
        return new Promise<never>(() => {})
      }
      throw err
    })
}

// React.lazy plus a `preload()` that warms the same promise, so a page
// fetched ahead of time (idle prefetch, hover) renders without suspending.
// A failed preload never reloads the page (the visitor didn't ask for that
// page yet); rendering it tries again, with the reload above.
export function lazyPage<P>(load: Loader<P>): LazyPage<P> {
  let promise: Promise<{ default: ComponentType<P> }> | null = null
  const safeLoad = withReloadOnStaleChunk(load)
  const once = (recover: boolean) => (promise ??= (recover ? safeLoad : load)().catch(err => {
    promise = null
    throw err
  }))
  const Comp = lazy(() => once(true)) as LazyPage<P>
  Comp.preload = () => once(false)
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
