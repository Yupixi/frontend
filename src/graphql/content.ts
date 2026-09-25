import { gql } from '@apollo/client'
import type { RemoteListing } from './listings'

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
            avatarUrl
            isVerified
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
  query ActiveCampaignBar {
    activeCampaign {
      id
      name
      description
      themeColor
      endsAt
    }
  }
`

export type ActiveCampaignBar = Pick<ActiveCampaign, 'id' | 'name' | 'description' | 'themeColor' | 'endsAt'>

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
