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
}

// Pricing lives in the backend (BoostsService / boost-packs.ts).
export const BOOST_PACKS_QUERY = gql`
  query BoostPacks {
    boostPacks { pack family label description price durationHours bumpCredits pinned autoBump urgentBadge }
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
  listing: { id: string; title: string; coverImageUrl: string | null; media: { url: string }[] } | null
}
