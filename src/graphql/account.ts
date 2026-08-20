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
      readAt
      createdAt
    }
  }
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

export type RemoteNotification = {
  id: string
  type: 'MESSAGE' | 'LISTING_APPROVED' | 'LISTING_REJECTED' | 'LISTING_STATUS_CHANGED'
  title: string
  body: string
  listingId: string | null
  conversationId: string | null
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
