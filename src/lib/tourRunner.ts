import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'
import './tourRunner.css'
import type { Tour } from './tours'

export { TOURS } from './tours'

// driver.js side of the tours, with their registry: its own chunk, loaded
// by tourControl startTour.

const WAIT_MS = 4000

// The first element marked `data-tour="<name>"` that is actually on screen
// (layouts render some twice: desktop header and phone bar).
function tourTarget(name: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el
  }
  return null
}

// The page may still be loading (lazy chunk, data): wait until the first
// targeted step is on screen, or give up after a few seconds.
function waitForTargets(targets: string[]): Promise<void> {
  if (!targets.length) return Promise.resolve()
  const until = Date.now() + WAIT_MS
  return new Promise(resolve => {
    const check = () => {
      if (targets.some(t => tourTarget(t)) || Date.now() > until) resolve()
      else window.setTimeout(check, 120)
    }
    check()
  })
}

// Resolves once the tour is closed; false when no step could be shown.
export async function runTour(tour: Tour, desktop: boolean): Promise<boolean> {
  const mine = tour.steps.filter(s => !s.only || s.only === (desktop ? 'desktop' : 'mobile'))
  await waitForTargets(mine.flatMap(s => (s.target ? [s.target] : [])))
  const steps: DriveStep[] = mine.flatMap(s => {
    const popover = { title: s.title, description: s.text, side: s.side }
    if (!s.target) return [{ popover }]
    const el = tourTarget(s.target)
    return el ? [{ element: el, popover }] : []
  })
  // Only the intro card left (nothing to point at on this screen).
  if (!steps.some(s => s.element) && steps.length < 2) return false
  return new Promise(resolve => {
    const d = driver({
      steps,
      popoverClass: 'dilchap-tour',
      showProgress: steps.length > 1,
      progressText: '{{current}} / {{total}}',
      nextBtnText: 'Suivant',
      prevBtnText: 'Retour',
      doneBtnText: 'Terminer',
      overlayColor: '#000',
      overlayOpacity: 0.55,
      stagePadding: 6,
      stageRadius: 14,
      smoothScroll: true,
      // The highlighted control stays inert: a tap on it would leave the page mid-tour.
      disableActiveInteraction: true,
      onPopoverRender: popover => { popover.closeButton.setAttribute('aria-label', 'Fermer la visite') },
      onDestroyed: () => resolve(true),
    })
    d.drive()
  })
}
