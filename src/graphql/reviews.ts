import { gql } from '@apollo/client'

export const SELLER_PROFILE_QUERY = gql`
  query SellerProfile($sellerId: String!) {
    sellerProfile(sellerId: $sellerId) {
      id
      fullName
      avatarUrl
      city
      createdAt
      listingsCount
      averageRating
      reviewsCount
      canReview
      hasReviewed
    }
  }
`

export const SELLER_REVIEWS_QUERY = gql`
  query SellerReviews($sellerId: String!) {
    sellerReviews(sellerId: $sellerId) {
      id
      rating
      comment
      createdAt
      author {
        id
        fullName
        avatarUrl
      }
    }
  }
`

export const CREATE_REVIEW_MUTATION = gql`
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) {
      id
      rating
      comment
      createdAt
      author {
        id
        fullName
        avatarUrl
      }
    }
  }
`

export type RemoteSellerProfile = {
  id: string
  fullName: string
  avatarUrl: string | null
  city: string | null
  createdAt: string
  listingsCount: number
  averageRating: number
  reviewsCount: number
  canReview: boolean
  hasReviewed: boolean
}

export type RemoteReview = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  author: {
    id: string
    fullName: string
    avatarUrl: string | null
  }
}
