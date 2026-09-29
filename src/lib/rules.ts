import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { countryVars, useMarketCode } from './countries'

// Limits and delays set in the back-office (« Règles de la marketplace »,
// Backend src/modules/rules/rules.defs.ts). DEFAULT_RULES mirrors the
// backend defaults so the copy is right while the query loads. The BO can
// set them per country: `country` picks that country's values.
export const MARKETPLACE_RULES_QUERY = gql`
  query MarketplaceRules($country: String) { marketplaceRules(country: $country) }
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

// Rules of the country the server applies them in: pass the listing's
// country (photos, lifetime), the shop's (aisles, featured, posts) or the
// member's account country (useMemberCountryCode: support SLA, disputes,
// KYC, saved searches); omitted → the visitor's market. Each country is
// cached apart; the previous values stay while another country loads.
export function useRules(countryCode?: string | null): MarketplaceRules {
  const market = useMarketCode()
  const { data, previousData } = useQuery<{ marketplaceRules: Partial<MarketplaceRules> }>(MARKETPLACE_RULES_QUERY, {
    variables: countryVars(countryCode === undefined ? market : countryCode),
    fetchPolicy: 'cache-first',
  })
  return { ...DEFAULT_RULES, ...(data ?? previousData)?.marketplaceRules }
}

// "moins de 2 h", "moins de 24 h", "moins de 3 jours".
export const delayText = (h: number) => (h <= 24 ? `moins de ${h} h` : h % 24 === 0 ? `moins de ${h / 24} jours` : `moins de ${h} h`)
