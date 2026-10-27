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
      adult
      subcategories {
        id
        slug
        name
        adult
      }
      attributes {
        key
        label
        type
        options
        optionLabels { value label }
        required
      }
    }
  }
`

export type CategorySubcategory = {
  id: string
  slug: string
  name: string
  // « Section Adultes (18+) » (lib/adult.ts).
  adult?: boolean
}

export type CategoryAttribute = {
  key: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'SELECT'
  options: string[]
  // Each option's stored value (kept in the listing, as sent) and its label
  // in the page's language (BO « Catégories » › EN).
  optionLabels?: { value: string; label: string }[]
  required: boolean
}

// The label of a stored option value, in the page's language.
export const optionLabel = (a: Pick<CategoryAttribute, 'optionLabels'> | undefined, value: string) =>
  a?.optionLabels?.find(o => o.value === value)?.label ?? value

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
  // « Adultes (18+) »: never a home tile; its pages need the age gate.
  adult?: boolean
  subcategories: CategorySubcategory[]
  attributes: CategoryAttribute[]
}

// The visitor's market: searches made by several visitors there that find
// live listings (Backend listings/search-stats.service.ts).
export const POPULAR_SEARCHES_QUERY = gql`
  query PopularSearches($limit: Int, $countryCode: String) { popularSearches(limit: $limit, countryCode: $countryCode) { term count growth } }
`
// In the « Section Adultes » space: its own terms only (lib/adultMode).
export const SECTION_POPULAR_SEARCHES_QUERY = gql`
  query SectionPopularSearches($limit: Int, $countryCode: String) { popularSearches(limit: $limit, countryCode: $countryCode, adultSection: true) { term count growth } }
`
export type PopularSearch = { term: string; count: number; growth: number }

// `country`: the visitor's market (the campaigns running there).
export const ACTIVE_CAMPAIGNS_QUERY = gql`
  query ActiveCampaigns($country: String) {
    activeCampaigns(country: $country) {
      id name slug description type themeColor endsAt
      listings { listing { id coverImageUrl isAdult } }
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
// same data search engines get (Backend seo). `country`: the visitor's
// market, for its version of the text (a city page takes its city's); a
// subcategory without a text of its own gets its category's.
export const CATEGORY_LANDING_QUERY = gql`
  query CategoryLanding($slug: String!, $city: String, $country: String) {
    categoryLanding(slug: $slug, city: $city, country: $country) {
      slug
      name
      kind
      categorySlug
      categoryName
      subcategorySlug
      city { slug name countryCode parentCity }
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

// « Par ville » of the home page: the category pages of each city (then
// district) offered to search engines — the links crawlers get too.
export const CITY_PAGES_QUERY = gql`
  query CityPages($country: String) {
    cityPages(country: $country) {
      city { slug name countryCode parentCity }
      pages { name rubricName count path }
    }
  }
`

export type CityPages = {
  city: { slug: string; name: string; countryCode: string; parentCity: string | null }
  pages: { name: string; rubricName: string; count: number; path: string }[]
}

export type CategoryLanding = {
  slug: string
  name: string
  kind: 'category' | 'subcategory'
  categorySlug: string
  categoryName: string
  subcategorySlug: string | null
  // parentCity: a district's city (« Cocody » → « Abidjan »).
  city: { slug: string; name: string; countryCode: string; parentCity: string | null } | null
  path: string
  count: number
  introText: string | null
  faq: { question: string; answer: string }[]
  otherCities: LandingLink[]
  relatedCategories: LandingLink[]
}
