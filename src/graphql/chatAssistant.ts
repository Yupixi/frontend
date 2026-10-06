import { gql } from '@apollo/client'

// « Aide Dilchap »: the member's private AI assistant in a conversation, on
// demand. Answers are only shown to the member; nothing is ever sent for
// them.

export type ChatAssistantAction = 'FAIR_PRICE' | 'MEETUP_PREP' | 'INSPECT' | 'DRAFT_REPLY' | 'SCAM_CHECK'

export type ChatAssistantStatus = {
  enabled: boolean
  available: boolean
  reason: 'DISABLED' | 'BUDGET' | 'DAILY_LIMIT' | 'CONVERSATION_LIMIT' | 'CLOSED' | null
  reasonText: string | null
  noticeAccepted: boolean
  priceCredits: number
  remainingToday: number
  remainingInConversation: number
  actions: { id: ChatAssistantAction; label: string }[]
}

export type ChatAssistantAnswer = {
  action: ChatAssistantAction
  message: string
  items: string[]
  draft: string | null
  price: { low: number; high: number; suggested: number; currency: string } | null
  meetup: { place: string; placeId: string | null; address: string | null; lat: number | null; lng: number | null; scheduledAt: string | null } | null
  risk: 'none' | 'low' | 'medium' | 'high' | null
  creditsSpent: number
  remainingToday: number
  remainingInConversation: number
}

export const CHAT_ASSISTANT_QUERY = gql`
  query ChatAssistant($conversationId: ID!) { chatAssistant(conversationId: $conversationId) }
`
export const ACCEPT_CHAT_ASSISTANT_NOTICE = gql`
  mutation AcceptChatAssistantNotice { acceptChatAssistantNotice }
`
export const ASK_CHAT_ASSISTANT = gql`
  mutation AskChatAssistant($conversationId: ID!, $action: String!, $hint: String) {
    askChatAssistant(conversationId: $conversationId, action: $action, hint: $hint)
  }
`
