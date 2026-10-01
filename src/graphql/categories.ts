import { gql } from '@apollo/client'

// `country`: only the categories active there (BO « Pays » of a category;
// none = every category) — the market for browsing, the listing's country
// in the post wizard.
export const CATEGORIES_QUERY = gql`
  query Categories($country: String) {
    categories(country: $country) {
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

// `country`: the visitor's market (the campaigns running there).
export const ACTIVE_CAMPAIGNS_QUERY = gql`
  query ActiveCampaigns($country: String) {
    activeCampaigns(country: $country) {
      id name slug description type themeColor endsAt
      listings { listing { id coverImageUrl } }
    }
  }
`
export type ActiveCampaignTile = {
  id: string; name: string; slug: string; description: string | null; type: string; themeColor: string | null; endsAt: string
  listings: { listing: { id: string; coverImageUrl: string | null } }[]
}

// A category page (/categorie/<slug>[/<ville>]): category or subcategory,
// its city, the team's introduction and FAQ (BO « Catégories ») and links
// to the same page in other cities and to neighbouring categories — the
// same data search engines get (Backend seo).
export const CATEGORY_LANDING_QUERY = gql`
  query CategoryLanding($slug: String!, $city: String) {
    categoryLanding(slug: $slug, city: $city) {
      slug
      name
      kind
      categorySlug
      categoryName
      subcategorySlug
      city { slug name countryCode }
      path
      count
      introText
      faq { question answer }
      otherCities { slug name count path }
      relatedCategories { slug name count path }
    }
  }
`

export type LandingLink = { slug: string; name: string; count: number; path: string }

export type CategoryLanding = {
  slug: string
  name: string
  kind: 'category' | 'subcategory'
  categorySlug: string
  categoryName: string
  subcategorySlug: string | null
  city: { slug: string; name: string; countryCode: string } | null
  path: string
  count: number
  introText: string | null
  faq: { question: string; answer: string }[]
  otherCities: LandingLink[]
  relatedCategories: LandingLink[]
}
