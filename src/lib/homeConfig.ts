import { gql } from '@apollo/client'

// Home page content set in the back-office (« Page d'accueil », Backend
// content/home-config.ts). DEFAULT_HOME mirrors the backend defaults: the
// page renders with it until the query answers (no layout jump). Texts may
// contain {{ville}} / {{pays}}, filled with the visitor's country (fillPlaces).
export const HOME_CONFIG_QUERY = gql`
  query HomeConfig { homeConfig }
`

export type HomeSectionKey = 'reassurance' | 'categories' | 'campaign' | 'pepites' | 'shops' | 'certified' | 'sellCta' | 'latest' | 'howItWorks'
export type HomeSlide = { image: string, badge: string, badgeIcon: string, tone: 'red' | 'blue' | 'green' | 'amber' | 'dark', title: string, text: string, tags: string[] }
export type HomeConfig = {
  sections: { key: HomeSectionKey, visible: boolean }[]
  hero: { intervalSec: number, slides: HomeSlide[] }
  trends: { label: string, term: string, maxPrice: number | null }[]
  reassurance: { icon: string, title: string, text: string }[]
  mobileStrip: { title: string, text: string }
  flashFallback: { title: string, subtitle: string, text: string }
  sellCta: { badge: string, title: string, text: string, button: string, link: string }
  howItWorks: { kicker: string, title: string, text: string, steps: { title: string, text: string }[], badges: string[] }
}

export const SLIDE_TONE: Record<HomeSlide['tone'], { badge: string, icon: string }> = {
  red: { badge: 'bg-primary/25 border-primary/40', icon: 'text-amber-400' },
  blue: { badge: 'bg-blue-500/25 border-blue-400/40', icon: 'text-blue-300' },
  green: { badge: 'bg-tertiary/30 border-white/30', icon: 'text-emerald-300' },
  amber: { badge: 'bg-amber-500/25 border-amber-300/40', icon: 'text-amber-200' },
  dark: { badge: 'bg-black/40 border-white/20', icon: 'text-white' },
}

export const DEFAULT_HOME: HomeConfig = {
  sections: (['reassurance', 'categories', 'campaign', 'pepites', 'shops', 'certified', 'sellCta', 'latest', 'howItWorks'] as const).map(key => ({ key, visible: true })),
  hero: {
    intervalSec: 6,
    slides: [
      {
        image: '/stitch/hero-0.webp', badge: 'Plateforme N°1 à {{ville}}', badgeIcon: 'local_fire_department', tone: 'red',
        title: 'Achetez et vendez vos *pépites mode & sneakers* à {{ville}}',
        text: 'Zéro frais, zéro commission. Des milliers de pièces uniques entre particuliers à {{ville}} et partout {{pays}}.',
        tags: ['✨ #ModeVintage', '👟 #SneakersRares', '👗 #WaxContemporain', '⚡ #VenteFlash'],
      },
      {
        image: '/stitch/hero-1.webp', badge: 'High-Tech & Bons Plans', badgeIcon: 'smartphone', tone: 'blue',
        title: 'Donnez une seconde vie à votre *High-Tech & Audio* au meilleur prix',
        text: 'Smartphones, casques, consoles et accessoires sans intermédiaire. Négociez directement sur le chat.',
        tags: ['🎧 #CasquesSansFil', '📱 #iPhonesReconditionnés', '💻 #LaptopsPro', '🎮 #Gaming'],
      },
      {
        image: '/stitch/hero-2.webp', badge: 'Affaires en or', badgeIcon: 'diamond', tone: 'green',
        title: 'Trouvez les *meilleures affaires directes* 100% P2P',
        text: 'Échangez en direct en lieu sécurisé avec Wave, Orange Money ou espèces. Remise en main propre sans surprise.',
        tags: ['📍 #RemiseSécurisée', '🤝 #0Commission', '📲 #PaiementWave', '🛡️ #VendeursVérifiés'],
      },
    ],
  },
  trends: [
    { label: 'Sneakers authentiques', term: 'sneakers', maxPrice: null },
    { label: 'High-Tech', term: 'iphone', maxPrice: null },
    { label: 'Dressing', term: 'robe', maxPrice: null },
    { label: 'Moins de 20 000 F', term: '', maxPrice: 20000 },
  ],
  reassurance: [
    { icon: 'percent', title: '100% P2P & Gratuit', text: '0% de commission sur toutes vos ventes' },
    { icon: 'shield_with_heart', title: 'Remise en main propre', text: 'Vérifiez le produit avant paiement en lieu sécurisé' },
    { icon: 'contactless', title: 'Paiements directs acceptés', text: 'Wave, Orange Money ou espèces sans intermédiaire' },
  ],
  mobileStrip: { title: '100% P2P • 0% Commission', text: 'Remise directe' },
  flashFallback: { title: 'Bons plans du moment', subtitle: 'Prix doux entre particuliers', text: 'Ventes flash et fins de dressing express, en direct des particuliers.' },
  sellCta: {
    badge: 'Vente éclair',
    title: 'Vendez en 2 minutes chrono et gardez 100% de votre argent',
    text: "Prenez une photo, fixez votre prix en F, et convenez d'un lieu de rendez-vous sécurisé (centres commerciaux, stations-service…).",
    button: 'Publier une annonce gratuite',
    link: 'Découvrir nos options de boost',
  },
  howItWorks: {
    kicker: 'Simplicité & Sécurité',
    title: 'Comment fonctionne Dilchap ?',
    text: 'Le circuit court : sans intermédiaire coûteux, en toute confiance.',
    steps: [
      { title: 'Dénichez votre pépite', text: 'Parcourez des centaines de pièces uniques publiées chaque jour à proximité de votre commune ou de votre lieu de travail.' },
      { title: 'Négociez en direct sur le chat', text: 'Échangez avec le vendeur via la messagerie instantanée, posez vos questions et fixez un prix équitable sans intermédiaire.' },
      { title: 'Payez en main propre sécurisé', text: "Rendez-vous dans un lieu public. Testez l'article puis payez directement via Wave, Orange Money ou espèces." },
    ],
    badges: ['Profils et avis certifiés', '0 F de frais de plateforme', 'Équipe de modération active 7j/7'],
  },
}
