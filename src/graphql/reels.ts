import { gql } from '@apollo/client'

// « Reels »: short videos of the sellers, each tied to one of their listings
// (Backend src/modules/reels).

export type ReelStatus = 'UPLOADING' | 'PROCESSING' | 'FAILED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REMOVED' | 'ARCHIVED'

export type ReelListing = {
  id: string
  title: string
  price: number | null
  currency: string
  negotiable: boolean
  minOfferPrice?: number | null
  coverImageUrl: string | null
  city: string
  locationLabel?: string | null
  meetupSpot?: string | null
  status: string
  seller: { id: string; fullName: string; avatarUrl: string | null; badge?: string | null; shop?: { id: string; slug: string; name: string; logoUrl: string | null } | null }
}

export type Reel = {
  id: string
  listingId: string | null
  sellerId: string
  caption: string | null
  status: ReelStatus
  videoUrl: string | null
  videoLowUrl: string | null
  posterUrl: string | null
  durationSec: number
  width: number
  height: number
  publishedAt: string | null
  createdAt: string
  promoted?: boolean | null
  viewsCount: number
  listing: ReelListing | null
}

export type ReelBoost = { id: string; credits: number; viewsGoal: number; views: number; startsAt: string; expiresAt: string; active: boolean }

export type MyReel = Reel & {
  statusReason: string | null
  uploadSize: number | null
  uploadedBytes: number | null
  completesCount: number | null
  clicksCount: number | null
  contactsCount: number | null
  sharesCount: number | null
  paidCredits: number | null
  videoBytes: number | null
  videoLowBytes: number | null
  boost: ReelBoost | null
  canBoost: boolean | null
}

export type ReelSettings = {
  enabled: boolean
  mode: 'FREE' | 'FREE_BOOST' | 'PAID'
  publishPrice: number
  boostEnabled: boolean
  boostPrice: number
  boostHours: number
  boostViewsGoal: number
  verifiedSellersOnly: boolean
  maxDurationSec: number
  maxSizeMb: number
  perListing: number
  perSeller: number
  perDay: number
  adultAllowed: boolean
  viewSeconds: number
  chunkBytes: number
}

const REEL_FIELDS = `
  id listingId sellerId caption status videoUrl videoLowUrl posterUrl durationSec width height publishedAt createdAt promoted viewsCount
  listing {
    id title price currency negotiable minOfferPrice coverImageUrl city locationLabel meetupSpot status
    seller { id fullName avatarUrl badge shop { id slug name logoUrl } }
  }
`

const MY_REEL_FIELDS = `
  ${REEL_FIELDS}
  statusReason uploadSize uploadedBytes completesCount clicksCount contactsCount sharesCount paidCredits videoBytes videoLowBytes canBoost
  boost { id credits viewsGoal views startsAt expiresAt active }
`

export const REEL_SETTINGS_QUERY = gql`
  query ReelSettings($countryCode: String) {
    reelSettings(countryCode: $countryCode) {
      enabled mode publishPrice boostEnabled boostPrice boostHours boostViewsGoal verifiedSellersOnly
      maxDurationSec maxSizeMb perListing perSeller perDay adultAllowed viewSeconds chunkBytes
    }
  }
`

export const REELS_FEED_QUERY = gql`
  query ReelsFeed($countryCode: String, $city: String, $interestCategories: [String!], $cursor: String, $limit: Int, $startId: ID, $seenIds: [ID!], $adultSection: Boolean, $rotationSeed: String) {
    reelsFeed(countryCode: $countryCode, city: $city, interestCategories: $interestCategories, cursor: $cursor, limit: $limit, startId: $startId, seenIds: $seenIds, adultSection: $adultSection, rotationSeed: $rotationSeed) {
      nextCursor
      items { ${REEL_FIELDS} }
    }
  }
`

export const REEL_QUERY = gql`
  query Reel($id: ID!) { reel(id: $id) { ${REEL_FIELDS} } }
`

export const LISTING_REELS_QUERY = gql`
  query ListingReels($listingId: ID!) { listingReels(listingId: $listingId) { ${REEL_FIELDS} } }
`

export const SELLER_REELS_QUERY = gql`
  query SellerReels($sellerId: ID!, $cursor: String, $limit: Int) {
    sellerReels(sellerId: $sellerId, cursor: $cursor, limit: $limit) { nextCursor items { ${REEL_FIELDS} } }
  }
`

export const MY_REELS_QUERY = gql`
  query MyReels($listingId: ID) { myReels(listingId: $listingId) { ${MY_REEL_FIELDS} } }
`

// One of the seller's own Reels as « Mes Reels » shows it (the `reel`
// query answers the owner with the owner fields): boost from the feed.
export const OWN_REEL_QUERY = gql`
  query OwnReel($id: ID!) { reel(id: $id) { ${MY_REEL_FIELDS} } }
`

// « Déposer une annonce »: can a Reel be joined to the listing being
// written (no listing yet), its price and the balance.
export const REEL_DRAFT_ELIGIBILITY_QUERY = gql`
  query ReelDraftEligibility($countryCode: String, $adult: Boolean) {
    reelDraftEligibility(countryCode: $countryCode, adult: $adult) { allowed reason price balance sellerReels todayReels }
  }
`

export const MY_REEL_STATS_QUERY = gql`
  query MyReelStats($id: ID!, $days: Int) {
    myReelStats(id: $id, days: $days) {
      views completes clicks contacts shares completionRate
      days { day views completes clicks contacts shares boostedViews }
      boosts { id credits viewsGoal views startsAt expiresAt active }
    }
  }
`

export const REEL_ELIGIBILITY_QUERY = gql`
  query ReelEligibility($listingId: ID!) {
    reelEligibility(listingId: $listingId) { allowed reason price balance listingReels sellerReels todayReels }
  }
`

export const START_REEL_MUTATION = gql`
  mutation StartReel($input: StartReelInput!) {
    startReel(input: $input) { chunkBytes uploadPath reel { id status uploadSize } }
  }
`

export const FINISH_REEL_MUTATION = gql`
  mutation FinishReel($id: ID!) { finishReel(id: $id) { ${MY_REEL_FIELDS} } }
`

export const DELETE_REEL_MUTATION = gql`
  mutation DeleteReel($id: ID!) { deleteReel(id: $id) }
`

export const BOOST_REEL_MUTATION = gql`
  mutation BoostReel($id: ID!) { boostReel(id: $id) { ${MY_REEL_FIELDS} } }
`

export const REPORT_REEL_MUTATION = gql`
  mutation ReportReel($id: ID!, $reason: String!, $message: String) { reportReel(id: $id, reason: $reason, message: $message) }
`

// Sent with fetch by lib/reels (batched beacon), not through Apollo.
export const RECORD_REEL_EVENTS_MUTATION = `mutation RecordReelEvents($events: [ReelEventInput!]!, $sessionId: String) { recordReelEvents(events: $events, sessionId: $sessionId) }`

export const REEL_STATUS_LABEL: Record<ReelStatus, string> = {
  UPLOADING: 'Envoi en cours',
  PROCESSING: 'En préparation',
  FAILED: 'Vidéo illisible',
  PENDING_REVIEW: 'En vérification',
  APPROVED: 'En ligne',
  REJECTED: 'Refusé',
  REMOVED: 'Retiré',
  ARCHIVED: 'Supprimé',
}
