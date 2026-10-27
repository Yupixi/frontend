import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { countryVars, useCountry, useMarket, useMarketCode, useMemberCountryCode } from './countries'
import { FOOTER_SETTINGS_QUERY } from '../graphql/content'
import { useLocale } from '../i18n'
import seoNs from '../i18n/ns/seo'

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

// Built at each call, in the visitor's language.
export const defaultSite = (): SiteConfig => ({
  brand: { name: 'Dilchap', logoUrl: '', tagline: seoNs.t('default.tagline') },
  seo: {
    title: seoNs.t('default.title'),
    description: seoNs.t('default.description'),
    image: '',
  },
  contact: { email: '', hours: '', address: '' },
  socials: { facebook: '', instagram: '', tiktok: '', youtube: '', x: '', linkedin: '', whatsapp: '' },
  apps: { android: '', ios: '' },
  claims: { noCommission: true },
})

// The visitor's market version (« Tous les pays »: the general one). Each
// country is cached apart; the previous one stays while another loads.
export function useSite(): SiteConfig {
  const market = useMarketCode()
  const { data, previousData } = useQuery<{ siteConfig: SiteConfig }>(SITE_CONFIG_QUERY, {
    variables: countryVars(market),
    fetchPolicy: 'cache-first',
  })
  return (data ?? previousData)?.siteConfig ?? defaultSite()
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
// Read at each call (seo namespace, `page.<id>`), in the visitor's language.
const PAGE_IDS = new Set([
  'search', 'reels', 'seller-reels', 'flash-offers', 'listing-detail', 'seller-profile',
  'categories', 'auth', 'legal', 'shop', 'shops', 'help',
  'buyer-dashboard', 'buyer-favorites', 'buyer-messages', 'buyer-notifications',
  'buyer-history', 'buyer-settings', 'buyer-purchases', 'buyer-receipts', 'buyer-receipt',
  'buyer-handover', 'buyer-dispute-new', 'buyer-disputes',
  'seller-dashboard', 'seller-post', 'seller-edit', 'seller-listings',
  'seller-stats', 'seller-premium', 'seller-orders', 'seller-wallet',
  'seller-reviews', 'seller-disputes', 'seller-handover', 'seller-kyc',
  'seller-shop', 'seller-shop-stats', 'seller-shop-promos',
  'seller-badge', 'seller-qr', 'seller-campaigns', 'support',
])
const pageTitle = (page: string): string | undefined =>
  PAGE_IDS.has(page) ? (seoNs.t as (k: string) => string)(`page.${page}`) : undefined

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
  if (ctx.adult || page === 'adult-home') return seoNs.t('adultSection')
  if (page === 'search') {
    if (ctx.category) return fromSlug(ctx.category)
    const q = ctx.searchTerm?.trim()
    return q ? seoNs.t('searchFor', { q: q.slice(0, 60) }) : seoNs.t('page.search')
  }
  return pageTitle(page) ?? seoNs.t('fallback')
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
  const local = market ? seoNs.t('market.local', { city: market.mainCity, inCountry: market.inName }) : ''
  const byCountry = market ? seoNs.t('market.titleCountry', { brand, inCountry: market.inName }) : ''
  const generated = market ? [seoNs.t('market.titleLocal', { brand, local }), byCountry].find(t => t.length <= 60) ?? byCountry : ''
  const description = market ? seoNs.t('market.description', { local, description: site.description }) : site.description
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
// Language of the title last written (the first page's comes from the server, in French).
let titleLocale = 'fr'

export function useSeo(page: string, ctx: { searchTerm?: string; category?: string; adult?: boolean } = {}) {
  const { seo: siteSeo, brand } = useSite()
  // Titles are read in the visitor's language: a switch re-renders (and re-sets) them.
  const locale = useLocale()
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
    // After a language switch (the app is mounted afresh) the title is
    // always rewritten, in the new language.
    if (!moved.current && titleLocale === locale && !(own && !document.title.includes(` | ${brand.name}`))) return
    titleLocale = locale
    document.title = own ? `${own} | ${brand.name}` : seo.title || brand.name
  }, [page, own, seo.title, brand.name, locale])
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
