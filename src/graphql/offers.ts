import { gql } from '@apollo/client'

const OFFER_FIELDS = `
  id
  amount
  status
  createdAt
  listing {
    id
    title
    price
    currency
    coverImageUrl
  }
  buyer {
    id
    fullName
    avatarUrl
  }
`

export const MAKE_OFFER_MUTATION = gql`
  mutation MakeOffer($input: MakeOfferInput!) {
    makeOffer(input: $input) {
      ${OFFER_FIELDS}
    }
  }
`

export const MY_OFFERS_QUERY = gql`
  query MyOffers {
    myOffers {
      ${OFFER_FIELDS}
    }
  }
`

export const LISTING_OFFERS_QUERY = gql`
  query ListingOffers($listingId: String!) {
    listingOffers(listingId: $listingId) {
      ${OFFER_FIELDS}
    }
  }
`

export const RESPOND_TO_OFFER_MUTATION = gql`
  mutation RespondToOffer($offerId: String!, $accept: Boolean!) {
    respondToOffer(offerId: $offerId, accept: $accept) {
      id
      status
    }
  }
`

// Heuristic, not ML: the median of what buyers and sellers actually agreed
// on for comparable items (see OffersService.getPriceSuggestion) — shown to
// both sides while negotiating so neither is guessing in the dark.
export const PRICE_SUGGESTION_QUERY = gql`
  query PriceSuggestion($listingId: String!) {
    priceSuggestion(listingId: $listingId) {
      suggestedAmount
      minAmount
      maxAmount
      currency
      sampleSize
    }
  }
`

export type RemotePriceSuggestion = {
  suggestedAmount: number | null
  minAmount: number | null
  maxAmount: number | null
  currency: string
  sampleSize: number
}

export type RemoteOffer = {
  id: string
  amount: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  createdAt: string
  listing: {
    id: string
    title: string
    price: number | null
    currency: string
    coverImageUrl: string | null
  }
  buyer: {
    id: string
    fullName: string
    avatarUrl: string | null
  }
}
