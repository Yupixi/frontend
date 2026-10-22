import type { BadgeTier } from './badges'
import { gql } from '@apollo/client'

export const LISTINGS_QUERY = gql`
  query Listings($filter: ListingFilterInput, $sort: ListingSort, $page: Float, $pageSize: Float, $rotationSeed: String, $interestCategories: [String!], $searchAsTyped: Boolean) {
    listings(filter: $filter, sort: $sort, page: $page, pageSize: $pageSize, rotationSeed: $rotationSeed, interestCategories: $interestCategories, searchAsTyped: $searchAsTyped) {
      promoted { listingId slot }
      totalCount
      searchCorrection { original corrected applied learned }
      rankingVariant
      page
      pageSize
      totalPages
      items {
        id
        title
        description
        price
        currency
        countryCode
        city
        locationLabel
        condition
        brand
        modelName
        size
        originalPrice
        meetupSpot
        paymentMethods
        minOfferPrice
        urgentUntil
        negotiable
        quantity
        aisleId
        featuredAt
        bundleOffer { name tiers { minQty percent } }
        deliveryAvailable
        tags
        attributes
        viewsCount
        favoritesCount
        publishedAt
        bumpedAt
        promoBadge { kind label percent at }
        createdAt
        coverImageUrl isAdult
        boostExpiresAt
        boostBadges { kind label }
        activeCampaignDiscount {
          campaignId
          campaignName
          campaignSlug
          themeColor
          discountPercent
          salePrice
        }
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
          averageRating
          reviewsCount
          shop { id slug name logoUrl }
        }
      }
    }
  }
`

// « Vouliez-vous dire … ? » of a search (Backend listings/search-correction).
// `applied`: the results are the correction's (the typed words found nothing).
export type SearchCorrection = { original: string; corrected: string; applied: boolean; learned: boolean }

export const RECOMMENDED_LISTINGS_QUERY = gql`
  query RecommendedListings($limit: Float, $countryCode: String, $city: String, $placement: FeedPlacement, $interestCategories: [String!], $excludeIds: [String!], $rotationSeed: String) {
    recommendedListings(limit: $limit, countryCode: $countryCode, city: $city, placement: $placement, interestCategories: $interestCategories, excludeIds: $excludeIds, rotationSeed: $rotationSeed) {
      id
      title
      description
      price
      currency
      countryCode
      city
      locationLabel
      condition
      brand
      modelName
      size
      originalPrice
      meetupSpot
      paymentMethods
      minOfferPrice
      urgentUntil
      negotiable
      quantity
      aisleId
      featuredAt
      bundleOffer { name tiers { minQty percent } }
      deliveryAvailable
      tags
      attributes
      viewsCount
      favoritesCount
      publishedAt
      bumpedAt
      promoBadge { kind label percent at }
      createdAt
      coverImageUrl isAdult
      boostExpiresAt
      boostBadges { kind label }
      activeCampaignDiscount {
        campaignId
        campaignName
        campaignSlug
        themeColor
        discountPercent
        salePrice
      }
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
        averageRating
        reviewsCount
        shop { id slug name logoUrl }
      }
    }
  }
`

// « Pépites à la Une » with its reserved places (impressions « en position
// boostée »).
export const RECOMMENDED_RAIL_QUERY = gql`
  query RecommendedRail($limit: Float, $countryCode: String, $city: String, $placement: FeedPlacement, $interestCategories: [String!], $excludeIds: [String!], $rotationSeed: String) {
    recommendedRail(limit: $limit, countryCode: $countryCode, city: $city, placement: $placement, interestCategories: $interestCategories, excludeIds: $excludeIds, rotationSeed: $rotationSeed) {
      promoted { listingId slot }
      items {
      id
      title
      description
      price
      currency
      countryCode
      city
      locationLabel
      condition
      brand
      modelName
      size
      originalPrice
      meetupSpot
      paymentMethods
      minOfferPrice
      urgentUntil
      negotiable
      quantity
      aisleId
      featuredAt
      bundleOffer { name tiers { minQty percent } }
      deliveryAvailable
      tags
      attributes
      viewsCount
      favoritesCount
      publishedAt
      bumpedAt
      promoBadge { kind label percent at }
      createdAt
      coverImageUrl isAdult
      boostExpiresAt
      boostBadges { kind label }
      activeCampaignDiscount {
        campaignId
        campaignName
        campaignSlug
        themeColor
        discountPercent
        salePrice
      }
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
        averageRating
        reviewsCount
        shop { id slug name logoUrl }
      }
    }
      }
  }
`

export const SIMILAR_LISTINGS_QUERY = gql`
  query SimilarListings($listingId: String!, $limit: Float, $countryCode: String) {
    similarListings(listingId: $listingId, limit: $limit, countryCode: $countryCode) {
      id
      title
      description
      price
      currency
      countryCode
      city
      locationLabel
      condition
      brand
      modelName
      size
      originalPrice
      meetupSpot
      paymentMethods
      minOfferPrice
      urgentUntil
      negotiable
      quantity
      aisleId
      featuredAt
      bundleOffer { name tiers { minQty percent } }
      deliveryAvailable
      tags
      attributes
      viewsCount
      favoritesCount
      publishedAt
      bumpedAt
      promoBadge { kind label percent at }
      createdAt
      coverImageUrl isAdult
      activeCampaignDiscount {
        campaignId
        campaignName
        campaignSlug
        themeColor
        discountPercent
        salePrice
      }
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
        averageRating
        reviewsCount
        shop { id slug name logoUrl }
      }
    }
  }
`

// « Ceux qui ont vu ceci ont aussi vu » (empty until enough members looked
// at both listings: the rail is then hidden).
export const ALSO_VIEWED_LISTINGS_QUERY = gql`
  query AlsoViewedListings($listingId: String!, $limit: Int, $countryCode: String) {
    alsoViewedListings(listingId: $listingId, limit: $limit, countryCode: $countryCode) {
      id
      title
      description
      price
      currency
      countryCode
      city
      locationLabel
      condition
      brand
      modelName
      size
      originalPrice
      meetupSpot
      paymentMethods
      minOfferPrice
      urgentUntil
      negotiable
      quantity
      aisleId
      featuredAt
      bundleOffer { name tiers { minQty percent } }
      deliveryAvailable
      tags
      attributes
      viewsCount
      favoritesCount
      publishedAt
      bumpedAt
      promoBadge { kind label percent at }
      createdAt
      coverImageUrl isAdult
      activeCampaignDiscount {
        campaignId
        campaignName
        campaignSlug
        themeColor
        discountPercent
        salePrice
      }
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
        averageRating
        reviewsCount
        shop { id slug name logoUrl }
      }
    }
  }
`

export const LISTING_QUERY = gql`
  query Listing($id: String!) {
    listing(id: $id) {
      id
      title
      description
      price
      currency
      countryCode
      city
      locationLabel
      condition
      brand
      modelName
      size
      originalPrice
      meetupSpot
      paymentMethods
      minOfferPrice
      urgentUntil
      negotiable
      quantity
      aisleId
      featuredAt
      bundleOffer { name tiers { minQty percent } }
      deliveryAvailable
      status
      tags
      attributes
      viewsCount
      favoritesCount
      publishedAt
      bumpedAt
      promoBadge { kind label percent at }
      lastBumpedAt
      nextAutoBumpAt
      autoBumpsLeft
      createdAt
      coverImageUrl isAdult
      boostExpiresAt
      boostBadges { kind label }
      activeCampaignDiscount {
        campaignId
        campaignName
        campaignSlug
        themeColor
        discountPercent
        salePrice
      }
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
        city
        createdAt
        shop { id slug name logoUrl }
      }
    }
  }
`

export const MY_LISTING_QUERY = gql`
  query MyListing($id: String!) {
    myListing(id: $id) {
      id
      title
      description
      price
      currency
      countryCode
      city
      locationLabel
      condition
      brand
      modelName
      size
      originalPrice
      meetupSpot
      paymentMethods
      minOfferPrice
      deliveryAvailable
      negotiable
      quantity
      aisleId
      featuredAt
      bundleOffer { name tiers { minQty percent } }
      status
      attributes
      media {
        id
        url
      }
      category {
        id
        slug
      }
      subcategory {
        id
        slug
      }
    }
  }
`

export const CREATE_LISTING_MUTATION = gql`
  mutation CreateListing($input: CreateListingInput!) {
    createListing(input: $input) {
      id
      status
    }
  }
`

export const UPDATE_LISTING_MUTATION = gql`
  mutation UpdateListing($id: String!, $input: UpdateListingInput!) {
    updateListing(id: $id, input: $input) {
      id
      status
    }
  }
`

export const DELETE_LISTING_MEDIA_MUTATION = gql`
  mutation DeleteListingMedia($mediaId: String!) {
    deleteListingMedia(mediaId: $mediaId)
  }
`

export const ATTACH_LISTING_MEDIA_MUTATION = gql`
  mutation AttachListingMedia($listingId: String!, $urls: [String!]!) {
    attachListingMedia(listingId: $listingId, urls: $urls) {
      id
    }
  }
`

export const SUBMIT_LISTING_FOR_REVIEW_MUTATION = gql`
  mutation SubmitListingForReview($id: String!) {
    submitListingForReview(id: $id) {
      id
      status
    }
  }
`

export const MY_LISTINGS_QUERY = gql`
  query MyListings($page: Float, $pageSize: Float) {
    myListings(page: $page, pageSize: $pageSize) {
      totalCount
      items {
        id
        title
        price
        currency
        status
        viewsCount
        favoritesCount
        createdAt
        publishedAt
        coverImageUrl isAdult
        boostExpiresAt
        contactsCount
        pendingOffersCount
        views24h
        activeConversationsCount
        condition
        size
        brand
        mediaCount: media { id }
        category { name slug }
        subcategory { name }
        autoBumpUntil
        urgentUntil
        city
        locationLabel
        staffEditedAt
        lastBumpedAt
        nextAutoBumpAt
        autoBumpsLeft
        promoBadge { kind label percent at }
      }
    }
  }
`

export const DELETE_LISTING_MUTATION = gql`
  mutation DeleteListing($id: String!) {
    deleteListing(id: $id)
  }
`

// « Remonter »: the answer carries the proof (graphql/bumps.ts).
export { BUMP_LISTING_MUTATION } from './bumps'

export type MyListingRow = {
  id: string
  title: string
  price: number | null
  currency: string
  status: string
  viewsCount: number
  favoritesCount: number
  createdAt: string
  publishedAt: string | null
  // « Remontée il y a … » (BO BUMP_HINT_HOURS), null otherwise.
  bumpedAt?: string | null
  coverImageUrl: string | null
  boostExpiresAt: string | null
  contactsCount?: number
  pendingOffersCount?: number
  views24h?: number
  activeConversationsCount?: number
  condition?: string | null
  size?: string | null
  brand?: string | null
  mediaCount?: { id: string }[]
  subcategory?: { name: string } | null
  autoBumpUntil?: string | null
  urgentUntil?: string | null
  category?: { name: string; slug: string }
  city?: string
  locationLabel?: string | null
  // Content corrected by the Dilchap team (seller only).
  staffEditedAt?: string | null
  // Last bump on top, next automatic bump and how many are left (seller only).
  lastBumpedAt?: string | null
  nextAutoBumpAt?: string | null
  autoBumpsLeft?: number | null
  // The card's pill buyers see now (« En vedette », « Remontée il y a … »).
  promoBadge?: PromoBadge | null
}

export type MyListingDetail = {
  id: string
  quantity?: number
  title: string
  description: string
  price: number | null
  currency: string
  countryCode: string
  city: string
  locationLabel: string | null
  condition: string | null
  brand: string | null
  modelName: string | null
  size: string | null
  originalPrice: number | null
  meetupSpot: string | null
  paymentMethods: string[]
  minOfferPrice: number | null
  deliveryAvailable: boolean
  negotiable: boolean
  status: string
  attributes: Record<string, string>
  media: { id: string; url: string }[]
  category: { id: string; slug: string }
  subcategory: { id: string; slug: string } | null
}

export type CreateListingInput = {
  categoryId: string
  subcategoryId?: string
  title: string
  description: string
  price?: number
  currency?: string
  countryCode?: string
  city: string
  locationLabel?: string
  condition?: string
  negotiable?: boolean
  deliveryAvailable?: boolean
  attributes?: Record<string, string>
  tags?: string[]
}

export type RemoteListingDetail = RemoteListing & {
  // Seller only: last bump on top, next automatic bump, how many left.
  lastBumpedAt?: string | null
  nextAutoBumpAt?: string | null
  autoBumpsLeft?: number | null
  seller: {
    id: string
    fullName: string
    avatarUrl: string | null
    city: string | null
    createdAt: string
    shop?: ShopBadge | null
  }
}

export type CampaignDiscount = {
  campaignId: string
  campaignName: string
  campaignSlug: string
  themeColor: string | null
  discountPercent: number | null
  salePrice: number | null
}

export type RemoteListing = {
  id: string
  // « Section Adultes » (lib/adult.ts): photos blurred outside the section.
  isAdult?: boolean | null
  title: string
  description: string
  price: number | null
  currency: string
  countryCode: string
  city: string
  locationLabel: string | null
  condition: string | null
  brand?: string | null
  modelName?: string | null
  size?: string | null
  originalPrice?: number | null
  meetupSpot?: string | null
  paymentMethods?: string[]
  minOfferPrice?: number | null
  urgentUntil?: string | null
  negotiable: boolean
  deliveryAvailable: boolean
  tags: string[]
  attributes: Record<string, string>
  viewsCount: number
  favoritesCount: number
  publishedAt: string | null
  // « Remontée il y a … » (BO BUMP_HINT_HOURS), null otherwise.
  bumpedAt?: string | null
  createdAt: string
  coverImageUrl: string | null
  boostExpiresAt?: string | null
  // Badges of the boosts running now, the first one is shown on the card
  // (FEATURED « En vedette », TURBO « Turbo », URGENT « Urgent »).
  boostBadges?: BoostBadge[]
  // The card's one pill (« Badges des annonces », BO › Classement): why it
  // is placed where it is, only while it really is.
  promoBadge?: PromoBadge | null
  status?: string
  activeCampaignDiscount?: CampaignDiscount | null
  media: { url: string }[]
  category: { slug: string; name: string }
  subcategory: { slug: string; name: string } | null
  seller: { id: string; fullName: string; avatarUrl?: string | null; badge?: BadgeTier | null; averageRating?: number; reviewsCount?: number; shop?: ShopBadge | null }
  quantity?: number
  aisleId?: string | null
  featuredAt?: string | null
  // Official shop bundle ("2 achetés = -10 %").
  bundleOffer?: BundleOffer | null
}

export type BoostBadge = { kind: 'FEATURED' | 'TURBO' | 'URGENT'; label: string }

export type PromoBadgeKind = 'FEATURED' | 'TURBO' | 'URGENT' | 'PROMO' | 'BUMP'
export type PromoBadge = { kind: PromoBadgeKind; label: string; percent?: number | null; at?: string | null }

// A card a paid formula placed in the list (reserved « En vedette » place,
// place in front after a bump).
export type PromotedPlace = { listingId: string; slot: 'FEATURED' | 'BUMP' }

export type BundleOffer = { name: string; tiers: { minQty: number; percent: number }[] }

// Official shop of the seller (null for members).
export type ShopBadge = { id: string; slug: string; name: string; logoUrl: string | null }

export type ListingFilterInput = {
  search?: string
  categorySlug?: string
  subcategorySlug?: string
  city?: string
  countryCode?: string
  currency?: string
  condition?: string
  minPrice?: number
  maxPrice?: number
  sellerId?: string
  subcategorySlugs?: string[]
  conditions?: string[]
  brands?: string[]
  sizes?: string[]
  cities?: string[]
  // Districts of the city (« Cocody »): its « Locations à Cocody » pages.
  districts?: string[]
  verifiedSellersOnly?: boolean
  categorySlugs?: string[]
  handoverOnly?: boolean
  mobileMoneyOnly?: boolean
  officialShopsOnly?: boolean
  aisleId?: string
  featuredOnly?: boolean
  promoOnly?: boolean
  // « Section Adultes » (its own marketplace) or the general one.
  space?: 'GENERAL' | 'ADULT'
}

export type ListingSort = 'RELEVANCE' | 'RECENT' | 'PRICE_ASC' | 'PRICE_DESC' | 'POPULAR'

export const LISTING_FACETS_QUERY = gql`
  query ListingFacets($filter: ListingFilterInput) {
    listingFacets(filter: $filter) {
      subcategories { value label count }
      conditions { value label count }
      brands { value label count }
      sizes { value label count }
      cities { value label count }
      categories { value label count }
      priceHistogram { min max count }
    }
  }
`

export type FacetCount = { value: string; label: string; count: number }
export type ListingFacets = Record<'subcategories' | 'conditions' | 'brands' | 'sizes' | 'cities' | 'categories', FacetCount[]> & {
  priceHistogram: { min: number; max: number; count: number }[]
}

export const CREATE_SAVED_SEARCH_MUTATION = gql`
  mutation CreateSavedSearch($label: String!, $filter: ListingFilterInput!) {
    createSavedSearch(label: $label, filter: $filter) { id label }
  }
`

export const PRICE_RANGE_QUERY = gql`
  query PriceRange($categoryId: String!, $subcategoryId: String, $countryCode: String) {
    priceRange(categoryId: $categoryId, subcategoryId: $subcategoryId, countryCode: $countryCode) { low median high sampleSize }
  }
`
export type PriceRange = { low: number; median: number; high: number; sampleSize: number }
