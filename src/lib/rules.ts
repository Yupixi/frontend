import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'

// Limits and delays set in the back-office (« Règles de la marketplace »,
// Backend src/modules/rules/rules.defs.ts). DEFAULT_RULES mirrors the
// backend defaults so the copy is right while the query loads.
export const MARKETPLACE_RULES_QUERY = gql`
  query MarketplaceRules { marketplaceRules }
`

export const DEFAULT_RULES = {
  LISTING_LIFETIME_DAYS: 90,
  LISTING_MAX_PHOTOS: 8,
  DISPUTE_ANSWER_HOURS: 24,
  SUPPORT_SLA_URGENT_HOURS: 2,
  SUPPORT_SLA_HIGH_HOURS: 24,
  SUPPORT_SLA_NORMAL_HOURS: 72,
  SHOP_POSTS_PER_WEEK: 2,
  SHOP_MAX_FEATURED: 8,
  KYC_RETENTION_DAYS: 30,
}
export type MarketplaceRules = typeof DEFAULT_RULES

export function useRules(): MarketplaceRules {
  const { data } = useQuery<{ marketplaceRules: Partial<MarketplaceRules> }>(MARKETPLACE_RULES_QUERY, { fetchPolicy: 'cache-first' })
  return { ...DEFAULT_RULES, ...data?.marketplaceRules }
}

// "moins de 2 h", "moins de 24 h", "moins de 3 jours".
export const delayText = (h: number) => (h <= 24 ? `moins de ${h} h` : h % 24 === 0 ? `moins de ${h / 24} jours` : `moins de ${h} h`)
