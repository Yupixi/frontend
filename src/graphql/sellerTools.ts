import { gql } from '@apollo/client'

// ─── Statistiques & Performances ────────────────────────────────────────────
export const SELLER_STATS_QUERY = gql`
  query SellerStats($days: Int) {
    sellerStats(days: $days) {
      days views viewsPrev contacts contactsPrev conversionRate conversionRatePrev
      revenue revenuePrev savedCommission avgSaleDays avgSaleDaysBoosted
      series { day views boostedViews contacts }
      origins { city share sales }
      favoritePlace favoritePlaceShare
      funnel { impressions views favorites contacts sales }
      listings {
        views boostedViews clicks messages boosted pendingOffer soldInHours
        listing { id title price currency status condition coverImageUrl publishedAt createdAt category { name } }
      }
      boost { acceleration investment boostActions unlockedSales roi }
      advice { categoryName lift weekday startHour endHour nextSlot topCities }
    }
  }
`
export const TRACK_LISTING_CLICK_MUTATION = gql`
  mutation TrackListingClick($listingId: ID!) { trackListingClick(listingId: $listingId) }
`

export type ListingPerformance = {
  views: number; boostedViews: number; clicks: number; messages: number; boosted: boolean; pendingOffer: boolean; soldInHours: number | null
  listing: { id: string; title: string; price: number | null; currency: string; status: string; condition: string | null; coverImageUrl: string | null; publishedAt: string | null; createdAt: string; category: { name: string } }
}
export type SellerStats = {
  days: number; views: number; viewsPrev: number; contacts: number; contactsPrev: number
  conversionRate: number | null; conversionRatePrev: number | null
  revenue: number; revenuePrev: number; savedCommission: number; avgSaleDays: number | null; avgSaleDaysBoosted: number | null
  series: { day: string; views: number; boostedViews: number; contacts: number }[]
  origins: { city: string; share: number; sales: number }[]
  favoritePlace: string | null; favoritePlaceShare: number | null
  funnel: { impressions: number; views: number; favorites: number; contacts: number; sales: number }
  listings: ListingPerformance[]
  boost: { acceleration: number | null; investment: number; boostActions: number; unlockedSales: number; roi: number | null }
  advice: { categoryName: string; lift: number; weekday: number; startHour: number; endHour: number; nextSlot: string; topCities: string[] } | null
}

// ─── Litiges & Signalements ─────────────────────────────────────────────────
const DISPUTE_FIELDS = `
  id reference orderReference conversationId openedBy reason description photos amount status deadlineAt
  proposal discountAmount verdict resolvedAt meetupPlace paymentMethod createdAt
  listing { id title price currency condition coverImageUrl city category { name } }
  buyer { id fullName avatarUrl city isVerified buyerRating buyerReviewsCount }
  seller { id fullName avatarUrl city isVerified averageRating reviewsCount }
  events { id actor title body photos createdAt }
`
export const MY_SELLER_DISPUTES_QUERY = gql`
  query MySellerDisputes($status: DisputeStatus) { mySellerDisputes(status: $status) { ${DISPUTE_FIELDS} } }
`
export const MY_BUYER_DISPUTES_QUERY = gql`
  query MyBuyerDisputes { myBuyerDisputes { ${DISPUTE_FIELDS} } }
`
export const DISPUTE_QUERY = gql`
  query Dispute($id: String!) { dispute(id: $id) { ${DISPUTE_FIELDS} } }
`
export const MY_DISPUTE_STATS_QUERY = gql`
  query MyDisputeStats {
    myDisputeStats { amicableRate active nextDeadline resolved penalties total inMediation awaitingBuyer amicable rejected mediationWhatsapp }
  }
`
export const OPEN_DISPUTE_MUTATION = gql`
  mutation OpenDispute($input: OpenDisputeInput!) { openDispute(input: $input) { ${DISPUTE_FIELDS} } }
`
export const RESPOND_TO_DISPUTE_MUTATION = gql`
  mutation RespondToDispute($input: RespondToDisputeInput!) { respondToDispute(input: $input) { ${DISPUTE_FIELDS} } }
`
export const ANSWER_DISPUTE_PROPOSAL_MUTATION = gql`
  mutation AnswerDisputeProposal($input: AnswerDisputeProposalInput!) { answerDisputeProposal(input: $input) { ${DISPUTE_FIELDS} } }
`

export type DisputeStatus = 'AWAITING_SELLER' | 'AWAITING_BUYER' | 'IN_MEDIATION' | 'RESOLVED_AMICABLY' | 'CANCELLED' | 'REJECTED'
export type DisputeReason = 'FAKE_PAYMENT' | 'NOT_AS_DESCRIBED' | 'NO_SHOW' | 'LATE' | 'COUNTERFEIT' | 'PAYMENT_PRESSURE' | 'OTHER'
export type DisputeProposal = 'COURTESY_DISCOUNT' | 'CANCEL_RELIST' | 'ARBITRATION'
export type Dispute = {
  id: string; reference: string; orderReference: string; conversationId: string; openedBy: 'BUYER' | 'SELLER'
  reason: DisputeReason; description: string; photos: string[]; amount: number; status: DisputeStatus; deadlineAt: string
  proposal: DisputeProposal | null; discountAmount: number | null; verdict: string | null; resolvedAt: string | null
  meetupPlace: string | null; paymentMethod: string | null; createdAt: string
  listing: { id: string; title: string; price: number | null; currency: string; condition: string | null; coverImageUrl: string | null; city: string; category: { name: string } } | null
  buyer: { id: string; fullName: string; avatarUrl: string | null; city: string | null; isVerified: boolean; buyerRating: number; buyerReviewsCount: number }
  seller: { id: string; fullName: string; avatarUrl: string | null; city: string | null; isVerified: boolean; averageRating: number; reviewsCount: number }
  events: { id: string; actor: 'BUYER' | 'SELLER' | 'SYSTEM' | 'ADMIN'; title: string; body: string | null; photos: string[]; createdAt: string }[]
}
export type DisputeStats = {
  amicableRate: number | null; active: number; nextDeadline: string | null; resolved: number; penalties: number; total: number
  inMediation: number; awaitingBuyer: number; amicable: number; rejected: number; mediationWhatsapp: string | null
}

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  FAKE_PAYMENT: "Tentative d'arnaque faux SMS (Wave / Orange Money)",
  NOT_AS_DESCRIBED: "Non-conformité présumée de l'article",
  NO_SHOW: 'Désistement sans préavis au point de remise',
  LATE: 'Retard excessif au lieu de rendez-vous (> 45min)',
  COUNTERFEIT: "Suspicion d'article contrefait",
  PAYMENT_PRESSURE: 'Pression pour un paiement hors application',
  OTHER: 'Autre motif',
}
export const DISPUTE_REASON_ICONS: Record<DisputeReason, string> = {
  FAKE_PAYMENT: 'security_update_warning',
  NOT_AS_DESCRIBED: 'flag',
  NO_SHOW: 'person_off',
  LATE: 'schedule',
  COUNTERFEIT: 'new_releases',
  PAYMENT_PRESSURE: 'warning',
  OTHER: 'help',
}
export const disputeIsOpen = (s: DisputeStatus) => s === 'AWAITING_SELLER' || s === 'AWAITING_BUYER' || s === 'IN_MEDIATION'

// ─── Remise en main propre ──────────────────────────────────────────────────
export const SALES_ORDER_QUERY = gql`
  query SalesOrder($id: String!) {
    salesOrder(id: $id) {
      id reference stage agreedPrice dealStatus dealClosedAt agreedAt disputeId disputeStatus sellerPhone paymentMethod
      acceptedOffer { id amount }
      meetup { id place scheduledAt status proposedById handoverCode handedOverAt }
      buyer { id fullName avatarUrl city isVerified buyerRating buyerReviewsCount }
      seller { id fullName avatarUrl city isVerified averageRating reviewsCount }
      listing {
        id title price currency condition brand size coverImageUrl paymentMethods meetupSpot city locationLabel
        category { name }
      }
    }
  }
`
export const MY_PURCHASE_ORDERS_QUERY = gql`
  query MyPurchaseOrders {
    myPurchaseOrders {
      id reference stage agreedPrice dealStatus dealClosedAt agreedAt disputeId disputeStatus paymentMethod
      meetup { id place scheduledAt status proposedById handoverCode handedOverAt }
      seller { id fullName avatarUrl isVerified averageRating reviewsCount }
      listing { id title price currency condition size coverImageUrl paymentMethods meetupSpot city category { name } }
    }
  }
`
export const VERIFY_HANDOVER_CODE_MUTATION = gql`
  mutation VerifyHandoverCode($meetupId: String!, $code: String!) { verifyHandoverCode(meetupId: $meetupId, code: $code) }
`
export const CONFIRM_HANDOVER_MUTATION = gql`
  mutation ConfirmHandover($input: ConfirmHandoverInput!) { confirmHandover(input: $input) { id dealStatus } }
`
export type HandoverOrder = {
  id: string; reference: string; stage: string; agreedPrice: number | null; dealStatus: string; dealClosedAt: string | null; agreedAt: string
  disputeId: string | null; disputeStatus: DisputeStatus | null; sellerPhone?: string | null; paymentMethod?: string | null
  acceptedOffer: { id: string; amount: number } | null
  meetup: { id: string; place: string; scheduledAt: string; status: string; proposedById: string; handoverCode: string | null; handedOverAt: string | null } | null
  buyer: { id: string; fullName: string; avatarUrl: string | null; city: string | null; isVerified: boolean; buyerRating: number; buyerReviewsCount: number }
  seller: { id: string; fullName: string; avatarUrl: string | null; city: string | null; isVerified: boolean; averageRating: number; reviewsCount: number }
  listing: {
    id: string; title: string; price: number | null; currency: string; condition: string | null; brand: string | null; size: string | null
    coverImageUrl: string | null; paymentMethods: string[]; meetupSpot: string | null; city: string; locationLabel: string | null; category: { name: string }
  }
}

// ─── Paramètres & Notifications ─────────────────────────────────────────────
export const SELLER_SETTINGS_QUERY = gql`
  query SellerSettings {
    me {
      id email phone fullName avatarUrl city bio isVerified verifiedAt meetupSpots paymentMethods vacationMode notificationPreferences createdAt
    }
    myReputation {
      averageRating reviewsCount satisfactionRate salesCount responseTimeMinutes trustScore reactivity reactivityPrev activeListings isVerified hasPhone verifiedAt
    }
  }
`
export const UPDATE_SELLER_PROFILE_MUTATION = gql`
  mutation UpdateSellerProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id email phone fullName avatarUrl city bio isVerified boostCredits coverUrl meetupSpots paymentMethods vacationMode notificationPreferences
    }
  }
`
export const UPDATE_PREFERENCES_JSON_MUTATION = gql`
  mutation UpdatePreferencesJson($preferences: JSON!) {
    updateNotificationPreferences(preferences: $preferences) { id notificationPreferences }
  }
`
export const MY_SESSIONS_QUERY = gql`
  query MySessions($currentRefreshToken: String) { mySessions(currentRefreshToken: $currentRefreshToken) { id userAgent createdAt current } }
`
export const REVOKE_SESSION_MUTATION = gql`
  mutation RevokeSession($sessionId: String!) { revokeSession(sessionId: $sessionId) }
`
export const REVOKE_OTHER_SESSIONS_MUTATION = gql`
  mutation RevokeOtherSessions($currentRefreshToken: String!) { revokeOtherSessions(currentRefreshToken: $currentRefreshToken) }
`
export const DELETE_MY_ACCOUNT_MUTATION = gql`
  mutation DeleteMyAccount($password: String!) { deleteMyAccount(password: $password) }
`
export type UserSession = { id: string; userAgent: string | null; createdAt: string; current: boolean }

export type PurchaseOrder = {
  id: string; reference: string; stage: string; agreedPrice: number | null; dealStatus: string; dealClosedAt: string | null; agreedAt: string
  disputeId: string | null; disputeStatus: DisputeStatus | null; paymentMethod: string | null
  meetup: { id: string; place: string; scheduledAt: string; status: string; proposedById: string; handoverCode: string | null; handedOverAt: string | null } | null
  seller: { id: string; fullName: string; avatarUrl: string | null; isVerified: boolean; averageRating: number; reviewsCount: number }
  listing: { id: string; title: string; price: number | null; currency: string; condition: string | null; size?: string | null; coverImageUrl: string | null; paymentMethods: string[]; meetupSpot?: string | null; city?: string; category: { name: string } }
}
