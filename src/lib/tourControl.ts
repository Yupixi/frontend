import { apolloClient } from './apollo'
import { getAccessToken } from './auth'
import { requestNavigate } from './navigation'
import { DESKTOP_QUERY } from './useMediaQuery'
import { MARK_TOUR_SEEN_MUTATION, MY_ONBOARDING_QUERY, RESET_MY_TOURS_MUTATION, type Onboarding } from '../graphql/help'

// Starting guided tours and recording them as seen. The tours themselves
// (lib/tours) and driver.js (lib/tourRunner) load only when one starts:
// nothing of them ships with the first page.

// First sign-in: the essentials, once (toursSeen).
export const WELCOME_TOUR = 'fe-welcome'

// App page being shown (App keeps it current), for tours tied to a page.
let currentPage = ''
// Pages seen during this visit: the welcome tour never opens on the very
// first one, only once the member has done something (opened a listing, a
// search, a category…) or on a later visit.
let pagesSeen = 0
let actedThisVisit = false
const MEANINGFUL = ['listing-detail', 'search', 'categories', 'shop', 'shops', 'seller-profile', 'flash-offers']
export const noteTourPage = (page: string) => {
  if (page !== currentPage) pagesSeen++
  if (pagesSeen > 1 && MEANINGFUL.includes(page)) actedThisVisit = true
  currentPage = page
}

// Visits of this browser (one per browser session), counted once at start.
const VISITS_KEY = 'dilchap_visits'
const VISIT_COUNTED_KEY = 'dilchap_visit_counted'
let visits = 1
try {
  visits = Number(localStorage.getItem(VISITS_KEY)) || 0
  if (!sessionStorage.getItem(VISIT_COUNTED_KEY)) {
    visits++
    localStorage.setItem(VISITS_KEY, String(visits))
    sessionStorage.setItem(VISIT_COUNTED_KEY, '1')
  }
} catch { visits = 1 /* storage blocked: treated as a first visit */ }

/** The welcome tour may open by itself now: never on the page a visit
 *  lands on; on a first visit only after a first action (a listing, a
 *  search, a category…), from the 2nd visit on the next page. */
export const tourMomentReached = () => pagesSeen >= 2 && (actedThisVisit || visits >= 2)

// Never shown again: recorded on the account, and at once in the cache.
export function markTourSeen(id: string) {
  // Visitors can replay a tour (help centre); nothing to record for them.
  if (!getAccessToken()) return Promise.resolve(undefined)
  apolloClient.cache.updateQuery<{ myOnboarding: Onboarding }>({ query: MY_ONBOARDING_QUERY }, prev => (
    prev?.myOnboarding && !prev.myOnboarding.toursSeen.includes(id)
      ? { myOnboarding: { ...prev.myOnboarding, toursSeen: [...prev.myOnboarding.toursSeen, id] } }
      : prev
  ))
  return apolloClient.mutate({ mutation: MARK_TOUR_SEEN_MUTATION, variables: { id } }).catch(() => undefined)
}

let running = false
export const tourRunning = () => running

// Plays a tour (opening its page first), then marks it seen — finished or
// closed early alike. False when it couldn't start (unknown id, another
// one playing, nothing to point at).
export async function startTour(id: string): Promise<boolean> {
  if (running) return false
  running = true
  try {
    const { TOURS, runTour } = await import('./tourRunner')
    const tour = TOURS[id]
    if (!tour) return false
    if (tour.page && tour.page !== currentPage) requestNavigate(tour.page)
    const played = await runTour(tour, window.matchMedia(DESKTOP_QUERY).matches)
    if (played) void markTourSeen(id)
    return played
  } catch {
    return false
  } finally {
    running = false
  }
}

// « Revoir la visite guidée »: every tour becomes new again (server side;
// announcements already seen stay seen), then the welcome tour plays at once.
export async function replayTours() {
  await apolloClient.mutate({ mutation: RESET_MY_TOURS_MUTATION }).catch(() => undefined)
  // Storefront tour ids all start with « fe- » (lib/tours).
  apolloClient.cache.updateQuery<{ myOnboarding: Onboarding }>({ query: MY_ONBOARDING_QUERY }, prev => (
    prev?.myOnboarding ? { myOnboarding: { ...prev.myOnboarding, toursSeen: prev.myOnboarding.toursSeen.filter(id => !id.startsWith('fe-')) } } : prev
  ))
  return startTour(WELCOME_TOUR)
}
