import { gql } from '@apollo/client'

export type BoostPack = 'BUMP_FLASH' | 'BUMP_PACK_3' | 'BUMP_DAILY_7' | 'FEATURED_48H' | 'FEATURED_7D' | 'TURBO_7D' | 'URGENT_72H'

export type BoostPackInfo = {
  pack: BoostPack
  family: 'BUMP' | 'FEATURED' | 'TURBO' | 'URGENT'
  label: string
  description: string
  price: number
  durationHours: number
  bumpCredits: number
  pinned: boolean
  autoBump: boolean
  urgentBadge: boolean
  // What the formula guarantees, one line each, worded by the server from
  // the back-office settings of the payer's country.
  promises: string[]
  // Card badge while it runs (« En vedette », « Prix Choc », « Vente Urgente »).
  badgeLabel: string | null
  // Local hour of the daily automatic bump (Quotidienne, Turbo).
  autoBumpHour: number | null
}

// Pricing lives in the backend (BoostsService / boost-packs.ts), per
// country: `country` is the payer's (lib/countries usePriceVars).
export const BOOST_PACKS_QUERY = gql`
  query BoostPacks($country: String) {
    boostPacks(country: $country) { pack family label description price durationHours bumpCredits pinned autoBump urgentBadge promises badgeLabel autoBumpHour }
  }
`

export const CREATE_BOOST_MUTATION = gql`
  mutation CreateBoost($input: CreateBoostInput!) {
    createBoost(input: $input) { id pack price expiresAt }
  }
`

export const MY_BOOSTS_QUERY = gql`
  query MyBoosts {
    myBoosts {
      id
      pack
      price
      pinned
      startsAt
      expiresAt
      createdAt
      viewsGained
      contactsGained
      impressions
      upcoming
      listing { id title coverImageUrl media { url } }
    }
  }
`

export type RemoteBoost = {
  id: string
  pack: BoostPack
  price: number
  pinned: boolean
  startsAt: string
  expiresAt: string
  createdAt: string
  viewsGained: number | null
  contactsGained: number | null
  // Reserved-place displays (home « Pépites à la Une », top of results) —
  // formulas « en vedette » only.
  impressions?: number | null
  // Not started yet (awaiting moderation, or chained after the current one).
  upcoming?: boolean | null
  listing: { id: string; title: string; coverImageUrl: string | null; media: { url: string }[] } | null
}
