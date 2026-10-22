import { WELCOME_TOUR } from './tourControl'

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

export const TOURS: Record<string, Tour> = {
  [WELCOME_TOUR]: {
    id: WELCOME_TOUR,
    label: 'Visite guidée',
    page: 'home',
    // The essentials only (it used to have 8 steps, and its « Suivant » was
    // the most tapped element of the home page): find, sell, talk.
    steps: [
      { target: 'search', title: 'Bienvenue sur Dilchap !', text: 'Cherchez un article, une marque ou un service près de chez vous, puis affinez par ville et par prix.' },
      { target: 'sell', title: 'Vendre en quelques minutes', text: 'Quelques photos, un prix et votre ville suffisent pour publier une annonce.' },
      { target: 'messages', title: 'Discuter, se retrouver, payer', text: 'Négociez sur le chat, fixez le rendez-vous et payez de main à main à la remise. Revoyez cette visite quand vous voulez : « Visite guidée » dans l’aide.' },
    ],
  },
  'fe-help-center': {
    id: 'fe-help-center',
    label: 'Le Centre d’aide',
    page: 'help',
    steps: [
      { target: 'help-search', title: 'Posez votre question', text: 'Tapez quelques mots : les guides qui en parlent s’affichent aussitôt.' },
      { target: 'help-sections', title: 'Des guides pas à pas', text: 'Chaque guide détaille les étapes avec des captures d’écran, sur ordinateur comme sur téléphone.' },
      { target: 'help-contact', title: 'Toujours bloqué ?', text: 'Écrivez à l’équipe Dilchap : vous suivez sa réponse dans Aide & support.' },
    ],
  },
  'fe-country-picker': {
    id: 'fe-country-picker',
    label: 'Choisir son pays',
    page: 'home',
    steps: [
      { target: 'country', title: 'Changez de pays', text: 'Touchez ici pour choisir un pays et une ville : les annonces, les prix et les moyens de paiement s’adaptent.' },
    ],
  },
  'fe-boost': {
    id: 'fe-boost',
    label: 'Booster une annonce',
    page: 'seller-premium',
    steps: [
      { target: 'boost-credits', title: 'Vos crédits', text: 'Les boosts se paient en crédits, achetés par Mobile Money dans votre porte-monnaie.' },
      { target: 'boost-listing', title: 'Choisissez l’annonce', text: 'Chaque carte montre sa visibilité et ses boutons : Booster, Remonter, Statistiques.' },
      { target: 'boost-packs', title: 'Choisissez la formule', text: 'Les formules côte à côte : ce qu’elles font, leur durée, leur prix en crédits et en F.' },
    ],
  },
}

export const isTour = (id: string | null | undefined): id is string => !!id && id in TOURS
