import type { BadgeTier } from './badges'
import { gql } from '@apollo/client'

// ─── Porte-monnaie ──────────────────────────────────────────────────────────
export const CREDIT_PACKS_QUERY = gql`
  query CreditPacks { creditPacks { pack label tagline price credits bonusCredits perks } }
`
export const MY_WALLET_QUERY = gql`
  query MyWallet { myWallet { credits totalSales salesCount confirmationRate averageRating reviewsCount } }
`
export const MY_WALLET_TRANSACTIONS_QUERY = gql`
  query MyWalletTransactions($types: [WalletTransactionType!], $page: Int, $pageSize: Int) {
    myWalletTransactions(types: $types, page: $page, pageSize: $pageSize) {
      totalCount
      items { id type amount credits label method createdAt listing { id title } }
    }
  }
`
export const BUY_CREDITS_MUTATION = gql`
  mutation BuyCredits($pack: String!, $method: String!) {
    buyCredits(pack: $pack, method: $method) { credits }
  }
`

export type CreditPack = { pack: string; label: string; tagline: string; price: number; credits: number; bonusCredits: number; perks: string[] }
export type WalletSummary = { credits: number; totalSales: number; salesCount: number; confirmationRate: number | null; averageRating: number; reviewsCount: number }
export type WalletTxType = 'CREDIT_PURCHASE' | 'CREDIT_SPENT' | 'BOOST_PURCHASE' | 'SALE'
export type WalletTx = { id: string; type: WalletTxType; amount: number; credits: number; label: string; method: string | null; createdAt: string; listing: { id: string; title: string } | null }

// ─── Commandes & Envois ─────────────────────────────────────────────────────
export const MY_SALES_ORDERS_QUERY = gql`
  query MySalesOrders($stage: String) {
    mySalesOrders(stage: $stage) {
      id reference stage agreedPrice dealStatus dealClosedAt agreedAt disputeId
      acceptedOffer { id amount }
      meetup { id place scheduledAt status proposedById }
      buyer { id fullName avatarUrl city isVerified badge averageRating reviewsCount buyerRating buyerReviewsCount }
      listing {
        id title price currency condition brand size coverImageUrl paymentMethods meetupSpot city locationLabel deliveryAvailable
        category { name }
      }
    }
  }
`
export const MY_SALES_ORDERS_STATS_QUERY = gql`
  query MySalesOrdersStats { mySalesOrdersStats { activeMeetups volumeInProgress conversionRate pending inProgress done cancelled } }
`
export type SalesStage = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type SalesOrder = {
  id: string; reference: string; stage: SalesStage; agreedPrice: number | null; dealStatus: string; dealClosedAt: string | null; agreedAt: string; disputeId: string | null
  acceptedOffer: { id: string; amount: number } | null
  meetup: { id: string; place: string; scheduledAt: string; status: 'PROPOSED' | 'CONFIRMED' | 'DECLINED'; proposedById: string } | null
  buyer: { id: string; fullName: string; avatarUrl: string | null; city: string | null; isVerified: boolean; badge?: BadgeTier | null; averageRating: number; reviewsCount: number; buyerRating: number; buyerReviewsCount: number }
  listing: {
    id: string; title: string; price: number | null; currency: string; condition: string | null; brand: string | null; size: string | null
    coverImageUrl: string | null; paymentMethods: string[]; meetupSpot: string | null; city: string; locationLabel: string | null; deliveryAvailable: boolean
    category: { name: string }
  }
}
export type SalesStats = { activeMeetups: number; volumeInProgress: number; conversionRate: number | null; pending: number; inProgress: number; done: number; cancelled: number }

// ─── Avis & Réputation ──────────────────────────────────────────────────────
export const MY_REPUTATION_QUERY = gql`
  query MyReputation {
    myReputation {
      averageRating reviewsCount satisfactionRate negativeCount responseTimeMinutes topMeetupPlace confirmedMeetups salesCount isVerified hasPhone
      distribution { stars count }
    }
  }
`
export const SELLER_REVIEWS_FULL_QUERY = gql`
  query SellerReviewsFull($sellerId: String!) {
    sellerReviews(sellerId: $sellerId) {
      id rating comment createdAt reply repliedAt
      author { id fullName avatarUrl city }
      listing { id title price currency condition coverImageUrl category { name } }
    }
  }
`
export const REPLY_TO_REVIEW_MUTATION = gql`
  mutation ReplyToReview($reviewId: String!, $reply: String!) {
    replyToReview(reviewId: $reviewId, reply: $reply) { id reply repliedAt }
  }
`
export type Reputation = {
  averageRating: number; reviewsCount: number; satisfactionRate: number | null; negativeCount: number; responseTimeMinutes: number | null
  topMeetupPlace: string | null; confirmedMeetups: number; salesCount: number; isVerified: boolean; badge?: BadgeTier | null; hasPhone: boolean
  distribution: { stars: number; count: number }[]
}
export type FullReview = {
  id: string; rating: number; comment: string | null; createdAt: string; reply: string | null; repliedAt: string | null
  author: { id: string; fullName: string; avatarUrl: string | null; city: string | null }
  listing: { id: string; title: string; price: number | null; currency: string; condition: string | null; coverImageUrl: string | null; category: { name: string } } | null
}
