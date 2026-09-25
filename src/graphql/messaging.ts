import { gql } from '@apollo/client'

const MESSAGE_FIELDS = `
  id
  conversationId
  senderId
  body
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
  }
`

const CONVERSATION_FIELDS = `
  id
  listingId
  lastMessageAt
  unreadCount
  dealStatus
  dealClosedAt
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
    isVerified
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
  mutation SendMessage($conversationId: String!, $body: String!) {
    sendMessage(conversationId: $conversationId, body: $body) {
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
  mutation SetConversationDealStatus($conversationId: String!, $status: ConversationDealStatus!) {
    setConversationDealStatus(conversationId: $conversationId, status: $status) {
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
  isVerified?: boolean
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
}

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
  readAt: string | null
  createdAt: string
  sender: RemoteUserRef
  offer: RemoteMessageOffer | null
  meetup?: RemoteMeetup | null
}

export type RemoteConversation = {
  id: string
  listingId: string | null
  lastMessageAt: string | null
  unreadCount: number
  dealStatus: 'DISCUSSING' | 'CONCLUDED' | 'NOT_CONCLUDED'
  dealClosedAt: string | null
  canManageDeal: boolean
  createdAt: string
  listing: {
    id: string; title: string; coverImageUrl: string | null; price: number | null; currency: string; status: string; negotiable: boolean
    condition?: string | null; originalPrice?: number | null; paymentMethods?: string[]; meetupSpot?: string | null; city?: string; locationLabel?: string | null
  } | null
  otherParticipant: RemoteUserRef
  lastMessage: RemoteMessage | null
  messages?: RemoteMessage[]
}

export const PROPOSE_MEETUP_MUTATION = gql`
  mutation ProposeMeetup($conversationId: String!, $place: String!, $scheduledAt: DateTime!) {
    proposeMeetup(conversationId: $conversationId, place: $place, scheduledAt: $scheduledAt) { id }
  }
`

export const RESPOND_TO_MEETUP_MUTATION = gql`
  mutation RespondToMeetup($meetupId: String!, $confirm: Boolean!) {
    respondToMeetup(meetupId: $meetupId, confirm: $confirm) { id status }
  }
`
