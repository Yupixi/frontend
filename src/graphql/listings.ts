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
`

export const LISTING_QUERY = gql`
  query Listing($id: String!) {
    listing(id: $id) {
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
        phone
        avatarUrl
        city
        createdAt
      }
    }
  }
`

export type RemoteListingDetail = RemoteListing & {
  seller: {
    id: string
    fullName: string
    phone: string | null
    avatarUrl: string | null
    city: string | null
    createdAt: string
  }
}

export type RemoteListing = {
  id: string
  title: string
  description: string
  price: number | null
  currency: string
  city: string
  locationLabel: string | null
  condition: string | null
  negotiable: boolean
  deliveryAvailable: boolean
  tags: string[]
  viewsCount: number
  favoritesCount: number
  publishedAt: string | null
  createdAt: string
  coverImageUrl: string | null
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
  condition?: string
  minPrice?: number
  maxPrice?: number
}

export type ListingSort = 'RECENT' | 'PRICE_ASC' | 'PRICE_DESC'
