import { Suspense, useEffect, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { MY_ONBOARDING_QUERY, type Announcement, type Onboarding as OnboardingData } from '../graphql/help'
import { lazyPage } from '../lib/lazyPage'
import ErrorBoundary from './ErrorBoundary'
import { markTourSeen, startTour, tourMomentReached, tourRunning, WELCOME_TOUR } from '../lib/tourControl'
import { useRules } from '../lib/rules'
import { isAdVisit } from '../lib/campaignParams'
import { useConsentOpen } from './ConsentBanner'

const AnnouncementDialog = lazyPage(() => import('./AnnouncementDialog'))

// Screens nothing may cover: signing in, the listing wizard.
const QUIET_PAGES = ['auth', 'seller-post', 'seller-edit']

// At most one thing per page load: the welcome tour, or one announcement.
let shownThisLoad = false

// Signed-in members: the welcome tour once (`toursSeen`), on the home
// page, when « Règles › Visite guidée » lets it open by itself — never on the
// page a visit lands on (after a first action, or from the 2nd visit),
// never for a visit from an ad, never over the cookie banner, after the
// rule's delay on the page. Else the newest « Nouveau » announcement they
// haven't seen, as a sheet (phone) / dialog (desktop). « Visite guidée »
// (help centre, account menu) plays it any time.
export default function Onboarding({ page, enabled }: { page: string, enabled: boolean }) {
  // Visitors: nothing to load (no rules query, no onboarding query).
  return enabled ? <MemberOnboarding page={page} enabled /> : null
}

function MemberOnboarding({ page, enabled }: { page: string, enabled: boolean }) {
  const { data } = useQuery<{ myOnboarding: OnboardingData | null }>(MY_ONBOARDING_QUERY, { skip: !enabled, fetchPolicy: 'cache-first' })
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const onboarding = data?.myOnboarding
  const rules = useRules()
  const autoTour = rules.WELCOME_TOUR_AUTOSTART === 1
  const delayMs = Math.max(0, rules.WELCOME_TOUR_DELAY_SECONDS) * 1000
  const consentOpen = useConsentOpen()

  useEffect(() => {
    if (!enabled || !onboarding || shownThisLoad || QUIET_PAGES.includes(page) || consentOpen) return
    // A tour started by hand (« Visite guidée »…) counts.
    if (tourRunning()) { shownThisLoad = true; return }
    const seen = onboarding.toursSeen ?? []
    if (!seen.includes(WELCOME_TOUR)) {
      // Its steps point at the home page's header and bars.
      if (!autoTour || page !== 'home' || isAdVisit() || !tourMomentReached()) return
      // One timer while the member stays on the home page (leaving it, or
      // the cookie banner coming back, cancels it).
      const t = setTimeout(() => {
        if (shownThisLoad || tourRunning()) return
        shownThisLoad = true
        void startTour(WELCOME_TOUR)
      }, delayMs)
      return () => clearTimeout(t)
    }
    const next = (onboarding.announcements ?? []).find(a => !seen.includes(a.id))
    if (next) {
      shownThisLoad = true
      setAnnouncement(next)
    }
  }, [enabled, onboarding, page, autoTour, delayMs, consentOpen])

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
