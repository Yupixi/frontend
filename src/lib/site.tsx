import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { countryVars, useCountry, useMarket, useMarketCode, useMemberCountryCode } from './countries'
import { FOOTER_SETTINGS_QUERY } from '../graphql/content'

// Site-wide settings set in the back-office (« Réglages du site », Backend
// content/site-config.ts): brand, SEO, contacts, social and app links, and
// the "0 % commission" promises shown across the app. DEFAULT_SITE mirrors
// the backend defaults so nothing jumps while the query loads. The BO can
// keep one version per country: `country` picks it (none = general).
export const SITE_CONFIG_QUERY = gql`
  query SiteConfig($country: String) { siteConfig(country: $country) }
`

export type SiteConfig = {
  brand: { name: string, logoUrl: string, tagline: string }
  seo: { title: string, description: string, image: string }
  contact: { email: string, hours: string, address: string }
  socials: { facebook: string, instagram: string, tiktok: string, youtube: string, x: string, linkedin: string, whatsapp: string }
  apps: { android: string, ios: string }
  claims: { noCommission: boolean }
}

export const DEFAULT_SITE: SiteConfig = {
  brand: { name: 'Dilchap', logoUrl: '', tagline: 'La marketplace de confiance' },
  seo: {
    title: 'Dilchap — Marketplace d’Afrique de l’Ouest',
    description: 'Achetez et vendez près de chez vous, de Dakar à Niamey : annonces, négociation sur le chat et remise en main propre.',
    image: '',
  },
  contact: { email: '', hours: '', address: '' },
  socials: { facebook: '', instagram: '', tiktok: '', youtube: '', x: '', linkedin: '', whatsapp: '' },
  apps: { android: '', ios: '' },
  claims: { noCommission: true },
}

// The visitor's market version (« Tous les pays »: the general one). Each
// country is cached apart; the previous one stays while another loads.
export function useSite(): SiteConfig {
  const market = useMarketCode()
  const { data, previousData } = useQuery<{ siteConfig: SiteConfig }>(SITE_CONFIG_QUERY, {
    variables: countryVars(market),
    fetchPolicy: 'cache-first',
  })
  return (data ?? previousData)?.siteConfig ?? DEFAULT_SITE
}

// Support number on member screens (sign-in help, dashboard, KYC): the
// member's country's own (« Pays ») first, as in the footer, else its
// footer version (BO « Pied de page »).
export function useSupportPhone(): string | null {
  const code = useMemberCountryCode()
  const country = useCountry(code)
  const { data, previousData } = useQuery<{ footerSettings: { supportPhone: string | null } | null }>(FOOTER_SETTINGS_QUERY, { variables: countryVars(code) })
  return country?.supportPhone || (data ?? previousData)?.footerSettings?.supportPhone || null
}

// "0 % commission / gratuit / zéro frais" promises: shown only while the
// back-office keeps « Afficher les engagements 0 % commission » on.
export function useNoCommissionClaims(): boolean {
  return useSite().claims.noCommission
}

export function Claim({ children }: { children: ReactNode }) {
  return useNoCommissionClaims() ? <>{children}</> : null
}

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!value) { el?.remove(); return }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = value
}

// Default tab title of each app page, « … | Dilchap » (the server's SEO
// titles for the pages it renders: Backend src/modules/seo).
const PAGE_TITLES: Record<string, string> = {
  search: 'Recherche', reels: 'Reels : les articles en vidéo', 'seller-reels': 'Mes Reels', 'flash-offers': 'Bonnes affaires et promotions', 'listing-detail': 'Annonce', 'seller-profile': 'Vendeur',
  categories: 'Toutes les catégories', auth: 'Connexion', legal: 'Informations légales', shop: 'Boutique officielle', shops: 'Boutiques officielles', help: 'Centre d’aide',
  'buyer-dashboard': 'Mon compte', 'buyer-favorites': 'Mes favoris', 'buyer-messages': 'Messages', 'buyer-notifications': 'Notifications',
  'buyer-history': 'Historique', 'buyer-settings': 'Paramètres', 'buyer-purchases': 'Mes achats', 'buyer-receipts': 'Mes reçus', 'buyer-receipt': 'Reçu',
  'buyer-handover': 'Remise en main propre', 'buyer-dispute-new': 'Ouvrir un litige', 'buyer-disputes': 'Mes litiges',
  'seller-dashboard': 'Mon compte', 'seller-post': 'Publier une annonce', 'seller-edit': 'Modifier une annonce', 'seller-listings': 'Mes annonces',
  'seller-stats': 'Statistiques', 'seller-premium': 'Booster une annonce', 'seller-orders': 'Mes ventes', 'seller-wallet': 'Mes crédits',
  'seller-reviews': 'Mes avis', 'seller-disputes': 'Litiges', 'seller-handover': 'Remise en main propre', 'seller-kyc': 'Vérification d’identité',
  'seller-shop': 'Ma Boutique officielle', 'seller-shop-stats': 'Statistiques de la boutique', 'seller-shop-promos': 'Promotions de la boutique',
  'seller-badge': 'Mon badge', 'seller-qr': 'Mon QR code', 'seller-campaigns': 'Campagnes Dilchap', support: 'Aide & support',
}

// « velos-vtt » → « Velos vtt »: the category page's title until its name is loaded.
const fromSlug = (slug: string) => {
  const words = slug.replace(/-/g, ' ').trim()
  return words ? words[0].toUpperCase() + words.slice(1) : ''
}

/** Default tab title of an app page (null: the site's own title, the home page). */
export function routeTitle(page: string, ctx: { searchTerm?: string; category?: string; adult?: boolean } = {}): string | null {
  if (page === 'home') return null
  // « Section Adultes »: one discreet title for all its pages (a shared
  // screen, the tab list), never a product or a search.
  if (ctx.adult || page === 'adult-home') return 'Section Adultes'
  if (page === 'search') {
    if (ctx.category) return fromSlug(ctx.category)
    const q = ctx.searchTerm?.trim()
    return q ? `Recherche : ${q.slice(0, 60)}` : PAGE_TITLES.search
  }
  return PAGE_TITLES[page] ?? 'Mon compte'
}

// A country's own home title only when it names the site (a stray label
// typed in « Pays » › Titre SEO never becomes the title), its own
// description only when it is a sentence; else written from its main city.
export function marketSeo(
  market: { seoTitle?: string, seoDescription?: string, mainCity: string, inName: string } | undefined,
  site: { title: string, description: string },
  brand: string,
) {
  const ownTitle = market?.seoTitle?.trim() ?? ''
  const ownDescription = market?.seoDescription?.trim() ?? ''
  const local = market ? `à ${market.mainCity} et ${market.inName}` : ''
  const generated = market ? [`${brand} : petites annonces ${local}`, `${brand} : petites annonces ${market.inName}`].find(t => t.length <= 60) ?? `${brand} : petites annonces ${market.inName}` : ''
  const description = market ? `Petites annonces ${local}. ${site.description}` : site.description
  return {
    title: (ownTitle && ownTitle.toLowerCase().includes(brand.toLowerCase()) ? ownTitle : '') || generated || site.title,
    description: ownDescription.length >= 50 ? ownDescription : description.length > 155 ? `${description.slice(0, 154).replace(/\s+\S*$/, '')}…` : description,
  }
}

// Browser tab title, description and share tags of the page shown, set on
// every move to another page — before the address bar changes (App updates
// it in a later effect), so tools reading the title at each new address
// (Microsoft Clarity, Google Analytics) see the new page's. Pages about one
// thing (a listing, a shop, a member, a help article, a category) then put
// their own precise title once loaded (usePageTitle, a passive effect: it
// runs after this one). The first page's tags come from the storefront's
// server (Backend src/modules/seo), already right for that URL: left as
// they are.
export function useSeo(page: string, ctx: { searchTerm?: string; category?: string; adult?: boolean } = {}) {
  const { seo: siteSeo, brand } = useSite()
  // The visitor's country: its own texts (« Pays » in the BO), else « Dilchap :
  // petites annonces à Abidjan et en Côte d’Ivoire » — what search engines
  // get (Backend seo homeMeta) — else the site's.
  const market = useMarket()
  const seo = { ...siteSeo, ...marketSeo(market, siteSeo, brand.name) }
  const firstPage = useRef(page)
  const moved = useRef(false)
  if (page !== firstPage.current || ctx.adult) moved.current = true
  const own = routeTitle(page, ctx)
  useLayoutEffect(() => {
    // First page: the server's title stays, unless it is the generic one of
    // a page it doesn't render (account, sign-in, a search: /compte, /connexion…).
    if (!moved.current && !(own && !document.title.includes(` | ${brand.name}`))) return
    document.title = own ? `${own} | ${brand.name}` : seo.title || brand.name
  }, [page, own, seo.title, brand.name])
  useEffect(() => {
    if (!moved.current) return
    setMeta('name', 'description', seo.description)
    setMeta('property', 'og:title', seo.title || brand.name)
    setMeta('property', 'og:description', seo.description)
    setMeta('property', 'og:site_name', brand.name)
    setMeta('property', 'og:image', seo.image)
    setMeta('name', 'apple-mobile-web-app-title', brand.name)
  }, [page, seo.title, seo.description, seo.image, brand.name])
}

// Tab title of a page about one thing (a listing, a shop, a member).
export function usePageTitle(title: string | null | undefined) {
  const { brand } = useSite()
  useEffect(() => {
    if (title) document.title = `${title} | ${brand.name}`
  }, [title, brand.name])
}
