import { Suspense, useEffect, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { MY_ONBOARDING_QUERY, type Announcement, type Onboarding as OnboardingData } from '../graphql/help'
import { lazyPage } from '../lib/lazyPage'
import ErrorBoundary from './ErrorBoundary'
import { markTourSeen, startTour, tourRunning, WELCOME_TOUR } from '../lib/tourControl'

const AnnouncementDialog = lazyPage(() => import('./AnnouncementDialog'))

// Screens nothing may cover: signing in, the listing wizard.
const QUIET_PAGES = ['auth', 'seller-post', 'seller-edit']

// At most one thing per page load: the welcome tour, or one announcement.
let shownThisLoad = false

// Signed-in members: the welcome tour on their first visit of the home page
// (once, `toursSeen`), else the newest « Nouveau » announcement they
// haven't seen, as a sheet (phone) / dialog (desktop).
export default function Onboarding({ page, enabled }: { page: string, enabled: boolean }) {
  const { data } = useQuery<{ myOnboarding: OnboardingData | null }>(MY_ONBOARDING_QUERY, { skip: !enabled, fetchPolicy: 'cache-first' })
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const onboarding = data?.myOnboarding

  useEffect(() => {
    if (!enabled || !onboarding || shownThisLoad || QUIET_PAGES.includes(page)) return
    // A tour started by hand (« Revoir la visite guidée »…) counts.
    if (tourRunning()) { shownThisLoad = true; return }
    const seen = onboarding.toursSeen ?? []
    if (!seen.includes(WELCOME_TOUR)) {
      // Its steps point at the home page's header and rails.
      if (page !== 'home') return
      shownThisLoad = true
      void startTour(WELCOME_TOUR)
      return
    }
    const next = (onboarding.announcements ?? []).find(a => !seen.includes(a.id))
    if (next) {
      shownThisLoad = true
      setAnnouncement(next)
    }
  }, [enabled, onboarding, page])

  if (!announcement) return null
  const close = () => {
    void markTourSeen(announcement.id)
    setAnnouncement(null)
  }
  return (
    // An announcement that can't load is simply not shown.
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <AnnouncementDialog
          announcement={announcement}
          onLater={close}
          onDiscover={() => {
            const tour = announcement.tourId
            close()
            if (tour) void startTour(tour)
          }}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
