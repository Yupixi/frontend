import { gql } from '@apollo/client'
import home from '../i18n/ns/home'

// Home page content set in the back-office (« Page d'accueil », Backend
// content/home-config.ts). defaultHome mirrors the backend defaults: the
// page renders with it until the query answers (no layout jump). Texts may
// contain {{ville}} / {{pays}}, filled with the visitor's country (fillPlaces).
// The BO can keep one version per country: `country` is the visitor's
// market (none = general).
export const HOME_CONFIG_QUERY = gql`
  query HomeConfig($country: String) { homeConfig(country: $country) }
`

export type HomeSectionKey = 'reassurance' | 'categories' | 'campaign' | 'pepites' | 'reels' | 'shops' | 'certified' | 'sellCta' | 'latest' | 'howItWorks'
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

// Built at each call, in the visitor's language. The {{ville}} / {{pays}}
// markers are the BO's (filled by fillPlaces), not i18n variables: no
// `ville` / `pays` value is ever passed to t, so they come out untouched.
export const defaultHome = (): HomeConfig => {
  const t = home.t
  return {
    sections: (['reassurance', 'categories', 'campaign', 'pepites', 'reels', 'shops', 'certified', 'sellCta', 'latest', 'howItWorks'] as const).map(key => ({ key, visible: true })),
    hero: {
      intervalSec: 6,
      slides: [
        {
          image: '/stitch/hero-0.webp', badge: t('defaults.slide0.badge'), badgeIcon: 'local_fire_department', tone: 'red',
          title: t('defaults.slide0.title'),
          text: t('defaults.slide0.text'),
          tags: [t('defaults.slide0.tag1'), t('defaults.slide0.tag2'), t('defaults.slide0.tag3'), t('defaults.slide0.tag4')],
        },
        {
          image: '/stitch/hero-1.webp', badge: t('defaults.slide1.badge'), badgeIcon: 'smartphone', tone: 'blue',
          title: t('defaults.slide1.title'),
          text: t('defaults.slide1.text'),
          tags: [t('defaults.slide1.tag1'), t('defaults.slide1.tag2'), t('defaults.slide1.tag3'), t('defaults.slide1.tag4')],
        },
        {
          image: '/stitch/hero-2.webp', badge: t('defaults.slide2.badge'), badgeIcon: 'diamond', tone: 'green',
          title: t('defaults.slide2.title'),
          text: t('defaults.slide2.text'),
          tags: [t('defaults.slide2.tag1'), t('defaults.slide2.tag2'), t('defaults.slide2.tag3'), t('defaults.slide2.tag4')],
        },
      ],
    },
    trends: [
      { label: t('defaults.trend.sneakers'), term: 'sneakers', maxPrice: null },
      { label: t('defaults.trend.highTech'), term: 'iphone', maxPrice: null },
      { label: t('defaults.trend.dressing'), term: 'robe', maxPrice: null },
      { label: t('defaults.trend.under'), term: '', maxPrice: 20000 },
    ],
    reassurance: [
      { icon: 'percent', title: t('defaults.reassurance.p2p.title'), text: t('defaults.reassurance.p2p.text') },
      { icon: 'shield_with_heart', title: t('defaults.reassurance.handover.title'), text: t('defaults.reassurance.handover.text') },
      { icon: 'contactless', title: t('defaults.reassurance.direct.title'), text: t('defaults.reassurance.direct.text') },
    ],
    mobileStrip: { title: t('defaults.mobileStrip.title'), text: t('defaults.mobileStrip.text') },
    flashFallback: { title: t('defaults.flash.title'), subtitle: t('defaults.flash.subtitle'), text: t('defaults.flash.text') },
    sellCta: {
      badge: t('defaults.sellCta.badge'),
      title: t('defaults.sellCta.title'),
      text: t('defaults.sellCta.text'),
      button: t('defaults.sellCta.button'),
      link: t('defaults.sellCta.link'),
    },
    howItWorks: {
      kicker: t('defaults.how.kicker'),
      title: t('defaults.how.title'),
      text: t('defaults.how.text'),
      steps: [
        { title: t('defaults.how.step1.title'), text: t('defaults.how.step1.text') },
        { title: t('defaults.how.step2.title'), text: t('defaults.how.step2.text') },
        { title: t('defaults.how.step3.title'), text: t('defaults.how.step3.text') },
      ],
      badges: [t('defaults.how.badge1'), t('defaults.how.badge2'), t('defaults.how.badge3')],
    },
  }
}
