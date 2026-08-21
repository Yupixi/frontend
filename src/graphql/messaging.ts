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
`

const CONVERSATION_FIELDS = `
  id
  listingId
  lastMessageAt
  unreadCount
  createdAt
  listing {
    id
    title
    coverImageUrl
    price
    currency
    status
  }
  otherParticipant {
    id
    fullName
    avatarUrl
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

export type RemoteUserRef = {
  id: string
  fullName: string
  avatarUrl: string | null
}

export type RemoteMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  readAt: string | null
  createdAt: string
  sender: RemoteUserRef
}

export type RemoteConversation = {
  id: string
  listingId: string | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
  listing: { id: string; title: string; coverImageUrl: string | null; price: number | null; currency: string; status: string } | null
  otherParticipant: RemoteUserRef
  lastMessage: RemoteMessage | null
  messages?: RemoteMessage[]
}
