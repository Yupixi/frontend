import { gql } from '@apollo/client'

// Visibility actually delivered (Backend modules/visibility): the cards
// seen, sent in batches (lib/impressions.ts), and the bilan of each boost
// and bump.

export type ImpressionPlacement =
  | 'HOME_FEATURED' | 'HOME_FOR_YOU' | 'HOME_LATEST' | 'HOME_OTHER'
  | 'CATEGORY' | 'SEARCH' | 'CITY' | 'CAMPAIGN' | 'SIMILAR' | 'SELLER' | 'SHOP' | 'OTHER'
export type ImpressionSlot = 'ORGANIC' | 'FEATURED' | 'BUMP'

export const RECORD_IMPRESSIONS_MUTATION = `mutation RecordListingImpressions($items: [ListingImpressionInput!]!) { recordListingImpressions(items: $items) }`

// Bilan of a boost or a bump: the days it ran next to the same number of
// days before (or an average listing of its category).
export type VisibilityReport = {
  from: string
  to: string
  days: number
  ongoing: boolean
  impressions: number
  boostedImpressions: number | null
  boostedPlace: string | null
  impressionsBefore: number | null
  categoryAverage: number | null
  baseline: 'BEFORE' | 'CATEGORY' | 'NONE'
  liftPercent: number | null
  views: number
  viewsBefore: number | null
  contacts: number
  contactsBefore: number | null
  favorites: number
  credits: number
  // Views of the listing's Reels put forward by the boost (En vedette /
  // Turbo); null for the other formulas.
  reelViews: number | null
  summary: string
}

export const REPORT_FIELDS = `report { from to days ongoing impressions boostedImpressions boostedPlace impressionsBefore categoryAverage baseline liftPercent views viewsBefore contacts contactsBefore favorites credits reelViews summary }`

export type SellerVisibility = {
  days: number
  impressions: number
  boosted: number
  impressionsPrev: number
  series: { day: string; impressions: number; boosted: number; views: number }[]
  placements: { placement: ImpressionPlacement; label: string; impressions: number; boosted: number }[]
}

export const MY_VISIBILITY_QUERY = gql`
  query MyVisibility($days: Int) {
    myVisibility(days: $days) {
      days impressions boosted impressionsPrev
      series { day impressions boosted views }
      placements { placement label impressions boosted }
    }
  }
`

export type BadgeSetting = { kind: 'FEATURED' | 'TURBO' | 'URGENT' | 'PROMO' | 'BUMP'; show: boolean; label: string; when: string }

export const LISTING_BADGE_SETTINGS_QUERY = gql`
  query ListingBadgeSettings($country: String) { listingBadgeSettings(country: $country) }
`
