import { gql } from '@apollo/client'

// ─── Notifications ──────────────────────────────────────────────────────

export const MY_NOTIFICATIONS_QUERY = gql`
  query MyNotifications {
    myNotifications {
      id
      type
      title
      body
      listingId
      conversationId
      offerId
      readAt
      createdAt
    }
  }
`

export const DELETE_NOTIFICATION_MUTATION = gql`
  mutation DeleteNotification($id: String!) { deleteNotification(id: $id) }
`

export const MARK_NOTIFICATION_READ_MUTATION = gql`
  mutation MarkNotificationRead($id: String!) {
    markNotificationRead(id: $id)
  }
`

export const MARK_ALL_NOTIFICATIONS_READ_MUTATION = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`

export type NotificationKind =
  | 'MESSAGE' | 'LISTING_APPROVED' | 'LISTING_REJECTED' | 'LISTING_STATUS_CHANGED'
  | 'OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'ANNOUNCEMENT' | 'SAVED_SEARCH_MATCH' | 'DISPUTE'
  | 'MEETUP' | 'PRICE_DROP'

// Material Symbols icon + tone per notification kind (bell menu and
// notifications page).
export const NOTIFICATION_META: Record<NotificationKind, { icon: string; cls: string }> = {
  MESSAGE: { icon: 'chat', cls: 'bg-sky-100 text-sky-600' },
  LISTING_APPROVED: { icon: 'check_circle', cls: 'bg-tertiary-soft text-tertiary' },
  LISTING_REJECTED: { icon: 'warning', cls: 'bg-primary-fixed text-primary' },
  LISTING_STATUS_CHANGED: { icon: 'info', cls: 'bg-surface-container text-on-surface-variant' },
  OFFER_RECEIVED: { icon: 'local_offer', cls: 'bg-primary-fixed text-primary' },
  OFFER_ACCEPTED: { icon: 'handshake', cls: 'bg-tertiary-soft text-tertiary' },
  OFFER_REJECTED: { icon: 'block', cls: 'bg-surface-container text-on-surface-variant' },
  ANNOUNCEMENT: { icon: 'campaign', cls: 'bg-primary-fixed text-primary' },
  SAVED_SEARCH_MATCH: { icon: 'notifications_active', cls: 'bg-tertiary-soft text-tertiary' },
  DISPUTE: { icon: 'gavel', cls: 'bg-primary-fixed text-primary' },
  MEETUP: { icon: 'handshake', cls: 'bg-tertiary-soft text-tertiary' },
  PRICE_DROP: { icon: 'trending_down', cls: 'bg-primary-fixed text-primary' },
}

// Dispute notifications go to the seller's "Litiges" page or the buyer's
// purchases, told apart by their (server-side) wording.
export const notificationTarget = (n: { type: NotificationKind; title: string }) =>
  n.type === 'MESSAGE' || n.type === 'MEETUP' ? 'buyer-messages'
    : n.type === 'DISPUTE' ? (/vente|L'acheteur/.test(n.title) ? 'seller-disputes' : 'buyer-disputes')
      : null

export type RemoteNotification = {
  id: string
  type: NotificationKind
  title: string
  body: string
  listingId: string | null
  conversationId: string | null
  offerId?: string | null
  readAt: string | null
  createdAt: string
}

// ─── View history ───────────────────────────────────────────────────────

export const MY_VIEW_HISTORY_QUERY = gql`
  query MyViewHistory {
    myViewHistory {
      viewedAt
      listing {
        id
        title
        price
        currency
        city
        coverImageUrl
      }
    }
  }
`

export const REMOVE_VIEW_HISTORY_ITEM_MUTATION = gql`
  mutation RemoveViewHistoryItem($listingId: String!) { removeViewHistoryItem(listingId: $listingId) }
`

export const CLEAR_VIEW_HISTORY_MUTATION = gql`
  mutation ClearViewHistory {
    clearViewHistory
  }
`

export type RemoteListingView = {
  viewedAt: string
  listing: {
    id: string
    title: string
    price: number | null
    currency: string
    city: string
    coverImageUrl: string | null
  }
}

// ─── Profile / settings ─────────────────────────────────────────────────

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      fullName
      phone
      city
      avatarUrl
    }
  }
`

export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input)
  }
`

export const UPDATE_NOTIFICATION_PREFERENCES_MUTATION = gql`
  mutation UpdateNotificationPreferences($preferences: JSON!) {
    updateNotificationPreferences(preferences: $preferences) {
      id
      notificationPreferences
    }
  }
`
