import { gql } from '@apollo/client'

// Proof of the bumps (Backend listing_bumps journal): where a listing
// stands after its last bump, the automatic bumps still to come, and the
// history of every bump. Seller only (null for anyone else).
export type BumpPosition = { rank: number; peers: number; categoryName: string | null; city: string }

export type BumpStatus = {
  id: string
  title: string
  status: string
  city?: string
  lastBumpedAt: string | null
  nextAutoBumpAt: string | null
  autoBumpsLeft: number | null
  autoBumpUntil?: string | null
  category?: { name: string; slug: string } | null
  bumpPosition?: BumpPosition | null
  lastBump?: Pick<BumpEntry, 'id' | 'source' | 'sourceLabel' | 'packLabel' | 'credits' | 'offerPercent' | 'createdAt'> | null
}

const STATUS_FIELDS = `
  id title status city lastBumpedAt nextAutoBumpAt autoBumpsLeft autoBumpUntil
  category { name slug }
  bumpPosition { rank peers categoryName city }
  lastBump { id source sourceLabel packLabel credits offerPercent createdAt }
`

export const LISTING_BUMP_STATUS_QUERY = gql`
  query ListingBumpStatus($id: String!) {
    myListing(id: $id) { ${STATUS_FIELDS} }
  }
`

// « Remonter » (credits): the answer carries the proof.
export const BUMP_LISTING_MUTATION = gql`
  mutation BumpListing($id: String!) {
    bumpListing(id: $id) { publishedAt ${STATUS_FIELDS} }
  }
`

export type BumpEntry = {
  id: string
  listingId: string
  listingTitle: string | null
  createdAt: string
  source: 'MANUAL' | 'PACK' | 'AUTO' | 'STAFF' | 'REPUBLISH'
  sourceLabel: string
  packLabel: string | null
  credits: number
  offerPercent: number | null
  rank: number | null
  peers: number | null
  categoryName: string | null
  city: string
}

export const MY_LISTING_BUMPS_QUERY = gql`
  query MyListingBumps($listingId: String, $take: Int) {
    myListingBumps(listingId: $listingId, take: $take) {
      id listingId listingTitle createdAt source sourceLabel packLabel credits offerPercent rank peers categoryName city
    }
  }
`
