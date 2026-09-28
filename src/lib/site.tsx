import { useEffect, type ReactNode } from 'react'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'

// Site-wide settings set in the back-office (« Réglages du site », Backend
// content/site-config.ts): brand, SEO, contacts, social and app links, and
// the "0 % commission" promises shown across the app. DEFAULT_SITE mirrors
// the backend defaults so nothing jumps while the query loads.
export const SITE_CONFIG_QUERY = gql`
  query SiteConfig { siteConfig }
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
    title: "Dilchap — Marketplace Côte d'Ivoire",
    description: "Achetez et vendez près de chez vous en Côte d'Ivoire : annonces, négociation sur le chat et remise en main propre.",
    image: '',
  },
  contact: { email: '', hours: '', address: '' },
  socials: { facebook: '', instagram: '', tiktok: '', youtube: '', x: '', linkedin: '', whatsapp: '' },
  apps: { android: '', ios: '' },
  claims: { noCommission: true },
}

export function useSite(): SiteConfig {
  const { data } = useQuery<{ siteConfig: SiteConfig }>(SITE_CONFIG_QUERY, { fetchPolicy: 'cache-first' })
  return data?.siteConfig ?? DEFAULT_SITE
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

// Browser tab title, description and share tags from « Réglages du site ».
// Set at runtime: search engines that run JavaScript (Google) read them;
// link previews that don't (WhatsApp, Facebook) keep the static index.html.
export function useSeo() {
  const { seo, brand } = useSite()
  useEffect(() => {
    document.title = seo.title || brand.name
    setMeta('name', 'description', seo.description)
    setMeta('property', 'og:title', seo.title || brand.name)
    setMeta('property', 'og:description', seo.description)
    setMeta('property', 'og:site_name', brand.name)
    setMeta('property', 'og:image', seo.image)
    setMeta('name', 'apple-mobile-web-app-title', brand.name)
  }, [seo.title, seo.description, seo.image, brand.name])
}
