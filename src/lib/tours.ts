import { WELCOME_TOUR } from './tourControl'
import tours from '../i18n/ns/tours'

// Guided tours of the storefront (started with lib/tourControl startTour).
// Each step points at an element marked `data-tour="<target>"` (the first
// one visible on screen); a step without target is a centred card. Steps
// whose target isn't on screen are skipped, `only` keeps a step to phones
// (bottom tab bar, < lg) or to desktops. The ids (always « fe-… ») are what the BO's
// « Nouveau » announcements refer to (tourId) and what the member's
// `toursSeen` records. Loaded with the tour chunk, not the first page.

export type TourStep = {
  target?: string
  title: string
  text: string
  only?: 'mobile' | 'desktop'
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export type Tour = {
  id: string
  label: string
  // App page the tour happens on (opened first when elsewhere).
  page?: string
  steps: TourStep[]
}

// Texts are read when a tour starts (getters), in the visitor's language.
type TourKey = Parameters<typeof tours.t>[0]
const tx = (key: string) => tours.t(key as TourKey)
const step = (target: string, key: string, extra: Partial<TourStep> = {}): TourStep => ({
  target,
  ...extra,
  get title() { return tx(`${key}.title`) },
  get text() { return tx(`${key}.text`) },
})
const tour = (id: string, labelKey: string, page: string, steps: TourStep[]): Tour => ({
  id,
  get label() { return tx(labelKey) },
  page,
  steps,
})

export const TOURS: Record<string, Tour> = {
  // The essentials only (it used to have 8 steps, and its « Suivant » was
  // the most tapped element of the home page): find, sell, talk.
  [WELCOME_TOUR]: tour(WELCOME_TOUR, 'welcome.label', 'home', [
    step('search', 'welcome.search'),
    step('sell', 'welcome.sell'),
    step('messages', 'welcome.messages'),
  ]),
  'fe-help-center': tour('fe-help-center', 'helpCenter.label', 'help', [
    step('help-search', 'helpCenter.search'),
    step('help-sections', 'helpCenter.sections'),
    step('help-contact', 'helpCenter.contact'),
  ]),
  'fe-country-picker': tour('fe-country-picker', 'countryPicker.label', 'home', [
    step('country', 'countryPicker.country'),
  ]),
  'fe-boost': tour('fe-boost', 'boost.label', 'seller-premium', [
    step('boost-credits', 'boost.credits'),
    step('boost-listing', 'boost.listing'),
    step('boost-packs', 'boost.packs'),
  ]),
}

export const isTour = (id: string | null | undefined): id is string => !!id && id in TOURS
