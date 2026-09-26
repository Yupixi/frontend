import { gql } from '@apollo/client'

// Paid badges: "Compte vérifié" (blue) and "Vendeur certifié" (green). The
// identity check (KYC) is only the prerequisite.
export type BadgeTier = 'VERIFIED' | 'CERTIFIED'

export const BADGE_LABEL: Record<BadgeTier, string> = {
  VERIFIED: 'Compte vérifié',
  CERTIFIED: 'Vendeur certifié',
}

export type BadgePlan = { product: string; tier: BadgeTier; period: 'MONTHLY' | 'YEARLY'; days: number; price: number }
export type MyBadge = {
  tier: BadgeTier | null
  until: string | null
  trial: boolean
  lastTier: BadgeTier | null
  identityVerified: boolean
  certifiedEligible: boolean
  sales: number
  reviews: number
  rating: number
  penalties: number
  criteria: { minSales: number; minReviews: number; minRating: number }
  plans: BadgePlan[]
}

export const MY_BADGE_QUERY = gql`
  query MyBadge {
    myBadge {
      tier until trial lastTier identityVerified certifiedEligible sales reviews rating penalties
      criteria { minSales minReviews minRating }
      plans { product tier period days price }
    }
  }
`
