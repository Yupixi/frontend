import { gql } from '@apollo/client'

// Official shops ("Boutiques officielles").

const SHOP_FIELDS = `
  id slug name description logoUrl bannerUrl
  category { id slug name icon }
  city commune address phone whatsapp email website facebook instagram tiktok
  openingHours { day open close }
  legalIdType legalIdMasked approvedAt isOfficial
  owner { id fullName avatarUrl isVerified createdAt }
  followersCount isFollowedByMe listingsCount salesCount averageRating reviewsCount
  responseTimeMinutes
  aisles { id name position listingsCount }
  highlights { id title price coverUrl }
`

const MY_SHOP_FIELDS = `
  ${SHOP_FIELDS}
  status legalIdNumber hasLegalDoc submittedAt reviewedAt rejectReason rejectComment
  paidUntil featuredCount previousRejections
`

export const SHOP_QUERY = gql`
  query Shop($key: String!) { shop(key: $key) { ${SHOP_FIELDS} } }
`

export const SHOPS_QUERY = gql`
  query Shops($search: String, $categorySlug: String, $city: String, $sort: ShopSort, $page: Int, $pageSize: Int) {
    shops(search: $search, categorySlug: $categorySlug, city: $city, sort: $sort, page: $page, pageSize: $pageSize) {
      total page pageSize
      items { ${SHOP_FIELDS} }
    }
  }
`

export const TRACK_SHOP_VISIT_MUTATION = gql`
  mutation TrackShopVisit($key: String!) { trackShopVisit(key: $key) }
`

export const MY_SHOP_QUERY = gql`
  query MyShop {
    myShop {
      identityVerified
      plan { price credits days }
      shop { ${MY_SHOP_FIELDS} }
    }
  }
`

export const MY_SHOP_STATS_QUERY = gql`
  query MyShopStats($days: Int) {
    myShopStats(days: $days) {
      days visits visitsPrevious followsGained followsPrevious listingViews listingViewsPrevious
      followersCount salesCount periodSales periodSalesPrevious periodSalesVolume
      series { day visits follows listingViews }
      topListings { id title coverUrl views quantity aisleName chats sales }
      lowStock { id title quantity }
    }
  }
`

export const SUBMIT_SHOP_MUTATION = gql`
  mutation SubmitShop($input: SubmitShopInput!) { submitShop(input: $input) { ${MY_SHOP_FIELDS} } }
`

export const UPDATE_SHOP_PROFILE_MUTATION = gql`
  mutation UpdateShopProfile($input: ShopProfileInput!) { updateShopProfile(input: $input) { ${MY_SHOP_FIELDS} } }
`

export const CREATE_SHOP_AISLE_MUTATION = gql`
  mutation CreateShopAisle($name: String!) { createShopAisle(name: $name) { id aisles { id name position listingsCount } } }
`
export const RENAME_SHOP_AISLE_MUTATION = gql`
  mutation RenameShopAisle($id: ID!, $name: String!) { renameShopAisle(id: $id, name: $name) { id aisles { id name position listingsCount } } }
`
export const DELETE_SHOP_AISLE_MUTATION = gql`
  mutation DeleteShopAisle($id: ID!) { deleteShopAisle(id: $id) { id aisles { id name position listingsCount } } }
`
export const REORDER_SHOP_AISLES_MUTATION = gql`
  mutation ReorderShopAisles($ids: [ID!]!) { reorderShopAisles(ids: $ids) { id aisles { id name position listingsCount } } }
`
export const SET_LISTING_AISLE_MUTATION = gql`
  mutation SetListingAisle($listingId: ID!, $aisleId: ID) { setListingAisle(listingId: $listingId, aisleId: $aisleId) { id aisleId } }
`
export const SET_LISTING_FEATURED_MUTATION = gql`
  mutation SetListingFeatured($listingId: ID!, $featured: Boolean!) { setListingFeatured(listingId: $listingId, featured: $featured) { id featuredAt } }
`
export const SET_LISTING_QUANTITY_MUTATION = gql`
  mutation SetListingQuantity($id: String!, $input: UpdateListingInput!) { updateListing(id: $id, input: $input) { id quantity } }
`

export type OpeningHours = { day: number; open: string; close: string }
export type ShopAisle = { id: string; name: string; position: number; listingsCount: number }
export type ShopHighlight = { id: string; title: string; price: number | null; coverUrl: string | null }
export type ShopCategory = { id: string; slug: string; name: string; icon: string }

export type Shop = {
  id: string
  slug: string
  name: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  category: ShopCategory | null
  city: string
  commune: string | null
  address: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  facebook: string | null
  instagram: string | null
  tiktok: string | null
  openingHours: OpeningHours[]
  legalIdType: 'RCCM' | 'NCC'
  legalIdMasked: string
  approvedAt: string | null
  isOfficial: boolean
  owner: { id: string; fullName: string; avatarUrl: string | null; isVerified: boolean; createdAt: string }
  followersCount: number
  isFollowedByMe: boolean
  listingsCount: number
  salesCount: number
  averageRating: number
  reviewsCount: number
  responseTimeMinutes: number | null
  aisles: ShopAisle[]
  highlights: ShopHighlight[]
}

export type ShopStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
export type ShopRejectReason = 'DOC_UNREADABLE' | 'DOC_INVALID' | 'NAME_MISMATCH' | 'NUMBER_MISMATCH' | 'OWNER_MISMATCH' | 'BRAND_MISUSE' | 'INCOMPLETE' | 'OTHER'

export type MyShop = Shop & {
  status: ShopStatus
  legalIdNumber: string
  hasLegalDoc: boolean
  submittedAt: string
  reviewedAt: string | null
  rejectReason: ShopRejectReason | null
  rejectComment: string | null
  paidUntil: string | null
  featuredCount: number
  previousRejections: number
}

export type ShopPlan = { price: number; credits: number; days: number }
export type MyShopData = { myShop: { identityVerified: boolean; plan: ShopPlan; shop: MyShop | null } }

export type ShopStats = {
  days: number
  visits: number
  visitsPrevious: number
  followsGained: number
  followsPrevious: number
  listingViews: number
  listingViewsPrevious: number
  followersCount: number
  salesCount: number
  periodSales: number
  periodSalesPrevious: number
  periodSalesVolume: number
  series: { day: string; visits: number; follows: number; listingViews: number }[]
  topListings: { id: string; title: string; coverUrl: string | null; views: number; quantity: number; aisleName: string | null; chats: number; sales: number }[]
  lowStock: { id: string; title: string; quantity: number }[]
}

export const REJECT_LABELS: Record<ShopRejectReason, string> = {
  DOC_UNREADABLE: 'Document illisible',
  DOC_INVALID: 'Document non valable',
  NAME_MISMATCH: 'Nom commercial différent du document',
  NUMBER_MISMATCH: 'Numéro RCCM / NCC différent du document',
  OWNER_MISMATCH: 'Gérant non rattaché à l’entreprise',
  BRAND_MISUSE: 'Utilisation d’une marque sans autorisation',
  INCOMPLETE: 'Demande incomplète',
  OTHER: 'Autre motif',
}

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// Côte d'Ivoire runs on UTC all year: "open now" from the opening hours.
export function openNow(hours: OpeningHours[], now = new Date()) {
  const day = (now.getUTCDay() + 6) % 7
  const hm = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`
  const today = hours.find(h => h.day === day)
  if (today && hm >= today.open && hm < today.close) return { open: true, until: today.close }
  return { open: false, until: null }
}

export const shopUrl = (slug: string) => `${window.location.origin}${window.location.pathname}?shop=${encodeURIComponent(slug)}`

// The owner's online listings, for aisles / pinned items / stock.
export const MY_SHOP_LISTINGS_QUERY = gql`
  query MyShopListings {
    myListings(status: APPROVED, page: 1, pageSize: 100) {
      totalCount
      items { id title price currency status coverImageUrl quantity aisleId featuredAt category { name } }
    }
  }
`
export type ShopListing = {
  id: string; title: string; price: number | null; currency: string; status: string; coverImageUrl: string | null
  quantity: number; aisleId: string | null; featuredAt: string | null; category: { name: string }
}
