import { gql } from '@apollo/client'

export const CATEGORIES_QUERY = gql`
  query Categories {
    categories {
      id
      slug
      name
      icon
      listingsCount
      color
      description
      highlight
      requiresPrice
      subcategories {
        id
        slug
        name
      }
      attributes {
        key
        label
        type
        options
        required
      }
    }
  }
`

export type CategorySubcategory = {
  id: string
  slug: string
  name: string
}

export type CategoryAttribute = {
  key: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'SELECT'
  options: string[]
  required: boolean
}

export type RemoteCategory = {
  id: string
  slug: string
  name: string
  icon: string
  listingsCount?: number
  color: string
  description?: string | null
  highlight?: string | null
  requiresPrice: boolean
  subcategories: CategorySubcategory[]
  attributes: CategoryAttribute[]
}

export const POPULAR_SEARCHES_QUERY = gql`
  query PopularSearches($limit: Int) { popularSearches(limit: $limit) { term count growth } }
`
export type PopularSearch = { term: string; count: number; growth: number }

export const ACTIVE_CAMPAIGNS_QUERY = gql`
  query ActiveCampaigns {
    activeCampaigns {
      id name slug description type themeColor endsAt
      listings { listing { id coverImageUrl } }
    }
  }
`
export type ActiveCampaignTile = {
  id: string; name: string; slug: string; description: string | null; type: string; themeColor: string | null; endsAt: string
  listings: { listing: { id: string; coverImageUrl: string | null } }[]
}
