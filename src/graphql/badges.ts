import { gql } from '@apollo/client'
import badges from '../i18n/ns/badges'
import { getLocale } from '../i18n'

// Paid badges: "Compte vérifié" (blue) and "Vendeur certifié" (green). The
// identity check (KYC) is only the prerequisite.
export type BadgeTier = 'VERIFIED' | 'CERTIFIED'

// Names set in the Backoffice (Configuration › Langues), per language, once
// loaded (useSellerBadgeNames); the app's own words until then.
const remoteNames: Partial<Record<string, Partial<Record<BadgeTier, string>>>> = {}
export function setSellerBadgeNames(locale: string, names: Partial<Record<BadgeTier, string>>) {
  remoteNames[locale] = names
}

export const BADGE_LABEL: Record<BadgeTier, string> = {
  get VERIFIED() { return remoteNames[getLocale()]?.VERIFIED || badges.t('tier.VERIFIED') },
  get CERTIFIED() { return remoteNames[getLocale()]?.CERTIFIED || badges.t('tier.CERTIFIED') },
}

// The paid badges' names in the request's language (Backend sellerBadgeNames).
export const SELLER_BADGE_NAMES_QUERY = gql`
  query SellerBadgeNames { sellerBadgeNames }
`

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
  // "Vendeur certifié": free boosts per 30 days, campaign early access.
  monthlyCredits: number
  earlyAccessHours: number
}

// `country`: the payer's country for the plans' prices (usePriceVars;
// default: the account's).
export const MY_BADGE_QUERY = gql`
  query MyBadge($country: String) {
    myBadge(country: $country) {
      tier until trial lastTier identityVerified certifiedEligible sales reviews rating penalties
      criteria { minSales minReviews minRating }
      plans { product tier period days price }
      monthlyCredits earlyAccessHours
    }
  }
`
