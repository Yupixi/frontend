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
      isVerified
      bio
      coverUrl
      salesCount
      followersCount
      isFollowedByMe
      responseTimeMinutes
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
  isVerified: boolean
  bio: string | null
  coverUrl: string | null
  salesCount: number
  followersCount: number
  isFollowedByMe: boolean
  responseTimeMinutes: number | null
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

export const FOLLOW_SELLER_MUTATION = gql`
  mutation FollowSeller($sellerId: String!) { followSeller(sellerId: $sellerId) }
`
export const UNFOLLOW_SELLER_MUTATION = gql`
  mutation UnfollowSeller($sellerId: String!) { unfollowSeller(sellerId: $sellerId) }
`

export function formatResponseTime(minutes: number | null | undefined): string | null {
  if (minutes == null) return null
  if (minutes < 60) return `< ${Math.max(5, Math.ceil(minutes / 5) * 5)} min`
  if (minutes < 24 * 60) return `< ${Math.ceil(minutes / 60)} h`
  return `${Math.ceil(minutes / 1440)} j`
}
