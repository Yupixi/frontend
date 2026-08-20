import { gql } from '@apollo/client'

export const CREATE_BOOST_MUTATION = gql`
  mutation CreateBoost($input: CreateBoostInput!) {
    createBoost(input: $input) {
      id
      tier
      expiresAt
    }
  }
`

export const MY_SUBSCRIPTION_QUERY = gql`
  query MySubscription {
    mySubscription {
      tier
      expiresAt
    }
  }
`

export const SUBSCRIBE_TO_PLAN_MUTATION = gql`
  mutation SubscribeToPlan($tier: SubscriptionTier!) {
    subscribeToPlan(tier: $tier) {
      tier
      expiresAt
    }
  }
`

export type BoostTier = 'THREE_DAYS' | 'SEVEN_DAYS' | 'THIRTY_DAYS'
export type SubscriptionTier = 'FREE' | 'PRO' | 'BUSINESS'

export type RemoteMySubscription = {
  tier: SubscriptionTier
  expiresAt: string | null
}

// Display-only — mirrors BoostsService's TIER_DAYS/pricing on the backend.
// No payment gate yet, so these prices aren't charged anywhere; they're
// shown so the picker doesn't look free-as-in-nobody-thought-about-it.
export const BOOST_TIERS: { tier: BoostTier; label: string; days: number; price: number }[] = [
  { tier: 'THREE_DAYS', label: '3 jours', days: 3, price: 2000 },
  { tier: 'SEVEN_DAYS', label: '7 jours', days: 7, price: 5000 },
  { tier: 'THIRTY_DAYS', label: '30 jours', days: 30, price: 15000 },
]
