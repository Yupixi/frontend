import { gql } from '@apollo/client'
import deals from '../i18n/ns/deals'

// « Mises en relation & ventes », member side: the private check-in card
// « La vente a-t-elle eu lieu ? », « Marquer comme vendu », the reason of
// a pause / deletion, the purchase intents a tap alone reveals.

export type CheckinAnswer = 'YES' | 'NO' | 'POSTPONED'
export type NotConcludedReason = 'NO_SHOW' | 'NOT_AS_DESCRIBED' | 'PRICE' | 'OTHER'
export type ListingExitReason = 'SOLD_ON_DILCHAP' | 'SOLD_ELSEWHERE' | 'UNAVAILABLE' | 'OTHER'

export type RemoteCheckin = {
  meetupId: string
  role: 'BUYER' | 'SELLER'
  answer: CheckinAnswer | null
  reason: NotConcludedReason | null
  otherSaidYes: boolean
  place: string
  scheduledAt: string
  canEnterCode: boolean
  quantity: number
}

export const CHECKIN_FIELDS = `
  checkin { meetupId role answer reason otherSaidYes place scheduledAt canEnterCode quantity }
`

export const ANSWER_DEAL_CHECKIN_MUTATION = gql`
  mutation AnswerDealCheckin($input: AnswerDealCheckinInput!) {
    answerDealCheckin(input: $input) { id dealStatus closedAt ${CHECKIN_FIELDS} }
  }
`

// Labels are getters: read at render, in the current language.
const label = (k: string) => (deals.t as (k: string) => string)(k)

export const NOT_CONCLUDED_REASONS: { key: NotConcludedReason; readonly label: string }[] = (
  ['NO_SHOW', 'NOT_AS_DESCRIBED', 'PRICE', 'OTHER'] as const
).map(key => ({ key, get label() { return label(`notConcluded.${key}`) } }))

export const EXIT_REASONS: { key: ListingExitReason; readonly label: string; icon: string }[] = (
  [['SOLD_ON_DILCHAP', 'handshake'], ['SOLD_ELSEWHERE', 'storefront'], ['UNAVAILABLE', 'inventory_2'], ['OTHER', 'help']] as const
).map(([key, icon]) => ({ key, icon, get label() { return label(`exit.${key}`) } }))

export type SaleCandidate = {
  conversationId: string
  buyerId: string
  buyerName: string
  buyerAvatarUrl: string | null
  lastMessageAt: string | null
  acceptedOffer: number | null
  meetupConfirmed: boolean
}

// « Vendu à qui ? »: the listing (stock) and its conversations.
export const SALE_CANDIDATES_QUERY = gql`
  query ListingSaleCandidates($listingId: ID!, $id: String!) {
    myListing(id: $id) { id title quantity status price currency }
    listingSaleCandidates(listingId: $listingId) { conversationId buyerId buyerName buyerAvatarUrl lastMessageAt acceptedOffer meetupConfirmed }
  }
`

export const MARK_LISTING_SOLD_MUTATION = gql`
  mutation MarkListingSold($input: MarkListingSoldInput!) {
    markListingSold(input: $input) { id status quantity }
  }
`

export const PAUSE_LISTING_MUTATION = gql`
  mutation PauseListing($id: ID!, $reason: ListingExitReason) {
    pauseListing(id: $id, reason: $reason) { id status }
  }
`

export const RESUME_LISTING_MUTATION = gql`
  mutation ResumeListing($id: ID!) {
    resumeListing(id: $id) { id status }
  }
`

export const DELETE_LISTING_WITH_REASON_MUTATION = gql`
  mutation DeleteListingWithReason($id: String!, $reason: ListingExitReason) {
    deleteListing(id: $id, reason: $reason)
  }
`

// « Appeler » and « Partager » (first-party, rate-limited statistics).
export const TRACK_LISTING_INTENT_MUTATION = gql`
  mutation TrackListingIntent($listingId: ID!, $type: IntentType!) {
    trackListingIntent(listingId: $listingId, type: $type)
  }
`
