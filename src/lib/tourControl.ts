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
export const noteTourPage = (page: string) => { currentPage = page }

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
