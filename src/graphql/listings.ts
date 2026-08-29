import { gql } from '@apollo/client'

export const LISTINGS_QUERY = gql`
  query Listings($filter: ListingFilterInput, $sort: ListingSort, $page: Float, $pageSize: Float) {
    listings(filter: $filter, sort: $sort, page: $page, pageSize: $pageSize) {
      totalCount
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
        negotiable
        deliveryAvailable
        tags
        attributes
        viewsCount
        favoritesCount
        publishedAt
        createdAt
        coverImageUrl
        boostExpiresAt
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
        }
      }
    }
  }
`

export const RECOMMENDED_LISTINGS_QUERY = gql`
  query RecommendedListings($limit: Float) {
    recommendedListings(limit: $limit) {
      id
      title
      description
      price
      currency
      countryCode
      city
      locationLabel
      condition
      negotiable
      deliveryAvailable
      tags
      attributes
      viewsCount
      favoritesCount
      publishedAt
      createdAt
      coverImageUrl
      boostExpiresAt
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
      }
    }
  }
`

export const SIMILAR_LISTINGS_QUERY = gql`
  query SimilarListings($listingId: String!, $limit: Float) {
    similarListings(listingId: $listingId, limit: $limit) {
      id
      title
      description
      price
      currency
      countryCode
      city
      locationLabel
      condition
      negotiable
      deliveryAvailable
      tags
      attributes
      viewsCount
      favoritesCount
      publishedAt
      createdAt
      coverImageUrl
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
      negotiable
      deliveryAvailable
      status
      tags
      attributes
      viewsCount
      favoritesCount
      publishedAt
      createdAt
      coverImageUrl
      boostExpiresAt
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
      negotiable
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
        coverImageUrl
        boostExpiresAt
      }
    }
  }
`

export const DELETE_LISTING_MUTATION = gql`
  mutation DeleteListing($id: String!) {
    deleteListing(id: $id)
  }
`

export const BUMP_LISTING_MUTATION = gql`
  mutation BumpListing($id: String!) {
    bumpListing(id: $id) {
      id
      publishedAt
    }
  }
`

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
  coverImageUrl: string | null
  boostExpiresAt: string | null
}

export type MyListingDetail = {
  id: string
  title: string
  description: string
  price: number | null
  currency: string
  countryCode: string
  city: string
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
  seller: {
    id: string
    fullName: string
    avatarUrl: string | null
    city: string | null
    createdAt: string
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
  title: string
  description: string
  price: number | null
  currency: string
  countryCode: string
  city: string
  locationLabel: string | null
  condition: string | null
  negotiable: boolean
  deliveryAvailable: boolean
  tags: string[]
  attributes: Record<string, string>
  viewsCount: number
  favoritesCount: number
  publishedAt: string | null
  createdAt: string
  coverImageUrl: string | null
  boostExpiresAt?: string | null
  status?: string
  activeCampaignDiscount?: CampaignDiscount | null
  media: { url: string }[]
  category: { slug: string; name: string }
  subcategory: { slug: string; name: string } | null
  seller: { id: string; fullName: string }
}

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
}

export type ListingSort = 'RECENT' | 'PRICE_ASC' | 'PRICE_DESC'
