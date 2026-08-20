import { gql } from '@apollo/client'
import type { RemoteListing } from './listings'

const BANNER_FIELDS = `
  id
  title
  subtitle
  body
  imageUrl
  ctaLabel
  ctaUrl
  secondaryCtaLabel
  secondaryCtaUrl
  stats {
    value
    label
    description
  }
  backgroundColor
  textColor
  isActive
`

export const HOME_BANNERS_QUERY = gql`
  query HomeBanners {
    hero: activeBanners(slot: HOME_HERO) { ${BANNER_FIELDS} }
    trustBar: activeBanners(slot: HOME_TRUST_BAR) { ${BANNER_FIELDS} }
    partners: activeBanners(slot: HOME_PARTNERS) { ${BANNER_FIELDS} }
    sellerCta: activeBanners(slot: HOME_SELLER_CTA) { ${BANNER_FIELDS} }
    featuredToggle: bannerBySlot(slot: HOME_FEATURED) { ${BANNER_FIELDS} }
    promoStrip: activeBanners(slot: HOME_PROMO_STRIP) { ${BANNER_FIELDS} }
    howItWorks: activeBanners(slot: HOME_HOW_IT_WORKS) { ${BANNER_FIELDS} }
    testimonials: activeBanners(slot: HOME_TESTIMONIALS) { ${BANNER_FIELDS} }
  }
`

export const CATEGORY_TOP_BANNER_QUERY = gql`
  query CategoryTopBanner {
    activeBanners(slot: CATEGORY_TOP) { ${BANNER_FIELDS} }
  }
`

export const FLASH_OFFERS_BANNER_QUERY = gql`
  query FlashOffersBanner {
    activeBanners(slot: FLASH_OFFERS_HERO) { ${BANNER_FIELDS} }
  }
`

// "Toutes les pages — Bandeau annonce" in the BO — despite the name, shown
// only on seller-facing pages (Mes annonces, Tableau de bord) where a
// listing-boost promo is actually relevant, not truly on every page.
export const SITEWIDE_RIBBON_QUERY = gql`
  query SitewideRibbon {
    activeBanners(slot: SITEWIDE_RIBBON) { ${BANNER_FIELDS} }
  }
`

export const ACTIVE_CAMPAIGN_QUERY = gql`
  query ActiveCampaign {
    activeCampaign {
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
          }
        }
      }
    }
  }
`

export const FOOTER_SETTINGS_QUERY = gql`
  query FooterSettings {
    footerSettings {
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

export type RemoteBannerStat = {
  value: string
  label: string
  description: string | null
}

export type RemoteBanner = {
  id: string
  title: string
  subtitle: string | null
  body: string | null
  imageUrl: string | null
  ctaLabel: string | null
  ctaUrl: string | null
  secondaryCtaLabel: string | null
  secondaryCtaUrl: string | null
  stats: RemoteBannerStat[] | null
  backgroundColor: string | null
  textColor: string | null
  isActive: boolean
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
