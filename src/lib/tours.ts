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
    steps: [
      { title: 'Bienvenue sur Dilchap !', text: 'Voici l’essentiel pour acheter et vendre près de chez vous. La visite prend moins d’une minute.' },
      { target: 'country', title: 'Votre pays', text: 'Les annonces, les prix et les moyens de paiement suivent le pays choisi ici. Vous pouvez en changer à tout moment.' },
      { target: 'search', title: 'Rechercher', text: 'Trouvez un article, une marque ou un service, puis affinez par ville, prix et état.' },
      { target: 'categories', title: 'Les catégories', text: 'Parcourez les rayons : téléphones, véhicules, immobilier, mode…' },
      { target: 'sell', title: 'Vendre un article', text: 'Publiez une annonce en quelques minutes : photos, prix et ville suffisent.' },
      { target: 'messages', title: 'Vos messages', text: 'Discutez avec les vendeurs et les acheteurs, négociez le prix et fixez le rendez-vous de remise en main propre.' },
      { target: 'account', only: 'desktop', title: 'Votre compte', text: 'Le menu Mon compte réunit vos annonces, vos achats, votre porte-monnaie de crédits et vos paramètres.' },
      { target: 'account', only: 'mobile', title: 'Votre compte', text: 'L’onglet Compte réunit vos annonces, vos achats, votre porte-monnaie de crédits et vos paramètres.' },
      { target: 'help', only: 'desktop', title: 'Besoin d’aide ?', text: 'Le Centre d’aide explique chaque étape, captures à l’appui. Vous pouvez revoir cette visite depuis vos paramètres.' },
      { only: 'mobile', title: 'Besoin d’aide ?', text: 'Le Centre d’aide se trouve dans Compte › Aide & support. Vous pouvez revoir cette visite depuis vos paramètres.' },
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
      { target: 'boost-listing', title: 'Choisissez l’annonce', text: 'Sélectionnez l’annonce à mettre en avant et suivez ses vues, favoris et contacts.' },
      { target: 'boost-packs', title: 'Choisissez la formule', text: 'Remontée immédiate en tête de liste ou mise en avant sur plusieurs jours : l’effet est immédiat.' },
    ],
  },
}

export const isTour = (id: string | null | undefined): id is string => !!id && id in TOURS
