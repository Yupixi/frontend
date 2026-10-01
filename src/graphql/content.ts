import { gql } from '@apollo/client'
import type { RemoteListing } from './listings'

// `country` (both): the visitor's market.
export const ACTIVE_CAMPAIGN_QUERY = gql`
  query ActiveCampaign($country: String) {
    activeCampaign(country: $country) {
      id
      name
      slug
      description
      themeColor
      startsAt
      endsAt
      listings {
        id
        discountPercent
        salePrice
        listing {
          id
          title
          description
          price
          currency
          city
          locationLabel
          condition
          negotiable
          deliveryAvailable
          tags
          viewsCount
          favoritesCount
          publishedAt
          createdAt
          coverImageUrl
          media {
            url
          }
          category {
            slug
            name
          }
          subcategory {
            slug
            name
          }
          seller {
            id
            fullName
            avatarUrl
            badge
          }
          brand
          size
          originalPrice
          attributes
          countryCode
          boostExpiresAt
          urgentUntil
        }
      }
    }
  }
`

// The site-wide announcement bar only needs the campaign's header — not its
// full listing showcase (that's ACTIVE_CAMPAIGN_QUERY, Home/Flash Offers).
export const ACTIVE_CAMPAIGN_BAR_QUERY = gql`
  query ActiveCampaignBar($country: String) {
    activeCampaign(country: $country) {
      id
      name
      slug
      description
      themeColor
      endsAt
    }
  }
`

export type ActiveCampaignBar = Pick<ActiveCampaign, 'id' | 'name' | 'slug' | 'description' | 'themeColor' | 'endsAt'>

export const FOOTER_SETTINGS_QUERY = gql`
  query FooterSettings($country: String) {
    footerSettings(country: $country) {
      tagline
      quickLinks {
        label
        query
      }
      supportCities
      supportPhone
      copyrightText
    }
  }
`

export type FooterQuickLink = {
  label: string
  query: string
}

export type RemoteFooterSettings = {
  tagline: string | null
  quickLinks: FooterQuickLink[] | null
  supportCities: string | null
  supportPhone: string | null
  copyrightText: string | null
}

export type ActiveCampaignListing = {
  id: string
  discountPercent: number | null
  salePrice: number | null
  listing: RemoteListing
}

export type ActiveCampaign = {
  id: string
  name: string
  slug: string
  description: string | null
  themeColor: string | null
  startsAt: string
  endsAt: string
  listings: ActiveCampaignListing[]
}

// Legal & help pages edited in the Backoffice (CMS & Pages légales);
// `country`: its own version when the pages are « par pays ».
export const CONTENT_PAGE_QUERY = gql`
  query ContentPage($slug: String!, $country: String) { contentPage(slug: $slug, country: $country) }
`
export type ContentPage = { slug: string; title: string; body: string; updatedAt: string }
export const LEGAL_PAGES = [
  { slug: 'cgu', label: "Conditions d'utilisation", icon: 'gavel' },
  { slug: 'remise-en-main-propre', label: 'Remise en main propre', icon: 'handshake' },
  { slug: 'faq', label: 'FAQ & support', icon: 'help' },
  { slug: 'confidentialite', label: 'Confidentialité', icon: 'lock' },
]

// « Mesure d'audience » of the visitor's country (lib/analytics.ts): on or
// off, the GA4 measurement ID and the consent banner texts.
export const ANALYTICS_CONFIG_QUERY = gql`
  query AnalyticsConfig($country: String) { analyticsConfig(country: $country) }
`
