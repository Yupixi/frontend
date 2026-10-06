import type { BadgeTier } from './badges'
import { gql } from '@apollo/client'

const MESSAGE_FIELDS = `
  id
  conversationId
  senderId
  body
  attachments
  audioUrl
  audioDuration
  replyTo { id senderId body attachments audioUrl }
  readAt
  createdAt
  sender {
    id
    fullName
    avatarUrl
  }
  offer {
    id
    amount
    status
  }
  meetup {
    id
    proposedById
    place
    scheduledAt
    status
    handoverCode
    handedOverAt
    address
    lat
    lng
    pointSource
    placeId
  }
  kind
  system
`

const CONVERSATION_FIELDS = `
  id
  listingId
  lastMessageAt
  unreadCount
  dealStatus
  dealClosedAt
  closedAt
  closedReason
  closesAt
  canManageDeal
  createdAt
  listing {
    id
    title
    coverImageUrl
    price
    currency
    status
    negotiable
    quantity
    condition
    originalPrice
    paymentMethods
    meetupSpot
    city
    locationLabel
  }
  otherParticipant {
    id
    fullName
    avatarUrl
    city
    createdAt
    badge
    averageRating
    reviewsCount
  }
  lastMessage {
    ${MESSAGE_FIELDS}
  }
`

export const MY_CONVERSATIONS_QUERY = gql`
  query MyConversations {
    myConversations {
      ${CONVERSATION_FIELDS}
    }
  }
`

export const CONVERSATION_QUERY = gql`
  query Conversation($id: String!) {
    conversation(id: $id) {
      ${CONVERSATION_FIELDS}
      safetyAlerts
      messages {
        ${MESSAGE_FIELDS}
      }
    }
  }
`

export const START_CONVERSATION_MUTATION = gql`
  mutation StartConversation($recipientId: String!, $listingId: String) {
    startConversation(recipientId: $recipientId, listingId: $listingId) {
      ${CONVERSATION_FIELDS}
    }
  }
`

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($conversationId: String!, $body: String!, $attachments: [String!], $replyToId: String, $audioUrl: String, $audioDuration: Int) {
    sendMessage(conversationId: $conversationId, body: $body, attachments: $attachments, replyToId: $replyToId, audioUrl: $audioUrl, audioDuration: $audioDuration) {
      ${MESSAGE_FIELDS}
    }
  }
`

export const MARK_CONVERSATION_READ_MUTATION = gql`
  mutation MarkConversationRead($conversationId: String!) {
    markConversationRead(conversationId: $conversationId)
  }
`

export const SET_CONVERSATION_DEAL_STATUS_MUTATION = gql`
  mutation SetConversationDealStatus($conversationId: String!, $status: ConversationDealStatus!, $quantity: Int) {
    setConversationDealStatus(conversationId: $conversationId, status: $status, quantity: $quantity) {
      ${CONVERSATION_FIELDS}
    }
  }
`

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($conversationId: String!) {
    messageAdded(conversationId: $conversationId) {
      ${MESSAGE_FIELDS}
    }
  }
`

// Fires for either participant on ANY conversation the moment a new message
// lands, whether or not that thread is open — this is what makes the inbox
// list itself live instead of only the currently-open thread.
export const CONVERSATION_UPDATED_SUBSCRIPTION = gql`
  subscription ConversationUpdated {
    conversationUpdated {
      ${CONVERSATION_FIELDS}
    }
  }
`

// A read receipt only ever changed on the NEXT fetch (reopening the
// thread) without this — the sender's open thread had no way to hear
// that the other side just read their message.
export const CONVERSATION_READ_SUBSCRIPTION = gql`
  subscription ConversationRead($conversationId: String!) {
    conversationRead(conversationId: $conversationId)
  }
`

export const SET_TYPING_MUTATION = gql`
  mutation SetTyping($conversationId: String!, $isTyping: Boolean!) {
    setTyping(conversationId: $conversationId, isTyping: $isTyping)
  }
`

export const TYPING_STATUS_SUBSCRIPTION = gql`
  subscription TypingStatus($conversationId: String!) {
    typingStatus(conversationId: $conversationId) {
      userId
      isTyping
    }
  }
`

// Accepting/rejecting an offer doesn't create a new message, so the thread
// wouldn't otherwise learn about the decision until it was reopened.
export const OFFER_UPDATED_SUBSCRIPTION = gql`
  subscription OfferUpdated($conversationId: String!) {
    offerUpdated(conversationId: $conversationId)
  }
`

export type RemoteUserRef = {
  id: string
  fullName: string
  avatarUrl: string | null
  city?: string | null
  createdAt?: string
  badge?: BadgeTier | null
  averageRating?: number
  reviewsCount?: number
}

export type RemoteMeetup = {
  id: string
  proposedById: string
  place: string
  scheduledAt: string
  status: 'PROPOSED' | 'CONFIRMED' | 'DECLINED'
  handoverCode?: string | null
  handedOverAt?: string | null
  // Meet-up point shared by the proposer (visible to both members only).
  address?: string | null
  lat?: number | null
  lng?: number | null
  pointSource?: 'SUGGESTED' | 'MAP' | 'CURRENT' | 'TEXT' | null
  placeId?: string | null
}

// A Dilchap card of the thread (SYSTEM message), built by the server from
// structured data.
export type SystemCard = {
  type: 'OFFER_ACCEPTED' | 'MEETUP_CONFIRMED' | 'SAFETY_NOTICE' | 'DEAL_CONCLUDED'
  title: string
  lines: string[]
  listingTitle?: string
  amount?: number
  currency?: string
  place?: string
  address?: string | null
  lat?: number | null
  lng?: number | null
  scheduledAt?: string
  checklist?: string[]
  next?: string
  cta?: 'MEETUP' | 'REVIEW' | 'REPORT'
  rule?: string
}

// A private safety banner (only the member at risk receives it).
export type SafetyAlert = { id: string; rule: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; text: string; messageId: string | null; senderId: string; createdAt: string }

export type RemoteMessageOffer = {
  id: string
  amount: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
}

export type RemoteMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  // Photos sent with the message (body may be empty).
  attachments: string[]
  // Voice message: file URL and length in seconds.
  audioUrl?: string | null
  audioDuration?: number | null
  replyTo: { id: string; senderId: string; body: string; attachments: string[]; audioUrl?: string | null } | null
  readAt: string | null
  createdAt: string
  sender: RemoteUserRef
  offer: RemoteMessageOffer | null
  meetup?: RemoteMeetup | null
  kind?: 'TEXT' | 'SYSTEM'
  system?: SystemCard | null
}

export type RemoteConversation = {
  id: string
  listingId: string | null
  lastMessageAt: string | null
  unreadCount: number
  dealStatus: 'DISCUSSING' | 'CONCLUDED' | 'NOT_CONCLUDED'
  dealClosedAt: string | null
  // No more messages: concluded sale, or closed after warned inactivity.
  closedAt?: string | null
  closedReason?: 'DEAL_CONCLUDED' | 'INACTIVE' | null
  // Inactivity warning sent: closes at this date unless someone writes.
  closesAt?: string | null
  canManageDeal: boolean
  createdAt: string
  listing: {
    id: string; title: string; coverImageUrl: string | null; price: number | null; currency: string; status: string; negotiable: boolean; quantity?: number
    condition?: string | null; originalPrice?: number | null; paymentMethods?: string[]; meetupSpot?: string | null; city?: string; locationLabel?: string | null
  } | null
  otherParticipant: RemoteUserRef
  lastMessage: RemoteMessage | null
  messages?: RemoteMessage[]
  safetyAlerts?: SafetyAlert[]
}

export const PROPOSE_MEETUP_MUTATION = gql`
  mutation ProposeMeetup($conversationId: String!, $place: String!, $scheduledAt: DateTime!, $point: MeetupPointInput) {
    proposeMeetup(conversationId: $conversationId, place: $place, scheduledAt: $scheduledAt, point: $point) { id }
  }
`

export const RESPOND_TO_MEETUP_MUTATION = gql`
  mutation RespondToMeetup($meetupId: String!, $confirm: Boolean!) {
    respondToMeetup(meetupId: $meetupId, confirm: $confirm) { id status }
  }
`

// Inbox preview of a message: its text, or what it carries.
export const messagePreview = (m: { body: string; attachments?: string[]; audioUrl?: string | null; system?: SystemCard | null } | null | undefined) =>
  !m ? '' : m.system ? `Dilchap : ${m.system.title}` : m.body || (m.audioUrl ? 'Message vocal' : m.attachments?.length ? (m.attachments.length > 1 ? `${m.attachments.length} photos` : 'Photo') : '')

// Inbox order: latest message first, conversations without messages last.
export const byLatestMessage = (a: { lastMessageAt: string | null }, b: { lastMessageAt: string | null }) =>
  (b.lastMessageAt ? Date.parse(b.lastMessageAt) : -Infinity) - (a.lastMessageAt ? Date.parse(a.lastMessageAt) : -Infinity)

export const DISMISS_SAFETY_ALERT_MUTATION = gql`
  mutation DismissChatSafetyAlert($id: String!, $reported: Boolean) {
    dismissChatSafetyAlert(id: $id, reported: $reported)
  }
`

// « Lieux conseillés » for this conversation's meet-up (closest first when
// a position is given; it is not stored).
export const MEETUP_PLACES_QUERY = gql`
  query MeetupPlaceSuggestions($conversationId: String!, $near: [LatLngInput!]) {
    meetupPlaceSuggestions(conversationId: $conversationId, near: $near)
  }
`
export type MeetupPlaceSuggestion = {
  id: string
  name: string
  address: string
  city: string
  lat: number
  lng: number
  type: string
  typeLabel: string
  distanceKm: number | null
  closest: boolean
}
export type MeetupPlaces = { enabled: boolean; currentPosition: boolean; city: string; places: MeetupPlaceSuggestion[] }
