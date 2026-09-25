import { gql } from '@apollo/client'

// Listing fields shown on the "Mes favoris" and "Historique" cards.
const CARD_LISTING = `
  id title description price originalPrice currency status condition city locationLabel negotiable deliveryAvailable
  coverImageUrl publishedAt
  category { name slug }
  seller { id fullName avatarUrl isVerified averageRating reviewsCount }
`

export const MY_FAVORITE_ENTRIES_QUERY = gql`
  query MyFavoriteEntries { myFavoriteEntries { savedAt priceAtSave listing { ${CARD_LISTING} } } }
`
export const MY_VIEW_HISTORY_FULL_QUERY = gql`
  query MyViewHistoryFull { myViewHistory { viewedAt listing { ${CARD_LISTING} } } }
`

export type CardListing = {
  id: string; title: string; description: string; price: number | null; originalPrice: number | null; currency: string
  status: string; condition: string | null; city: string; locationLabel: string | null; negotiable: boolean; deliveryAvailable: boolean
  coverImageUrl: string | null; publishedAt: string | null
  category: { name: string; slug: string }
  seller: { id: string; fullName: string; avatarUrl: string | null; isVerified: boolean; averageRating: number; reviewsCount: number }
}
export type FavoriteEntry = { savedAt: string; priceAtSave: number | null; listing: CardListing }
export type HistoryEntry = { viewedAt: string; listing: CardListing }

export const listingPlace = (l: { locationLabel: string | null; city: string }) => (l.locationLabel ? `${l.locationLabel}, ${l.city}` : l.city)
