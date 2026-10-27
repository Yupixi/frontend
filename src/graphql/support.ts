import { gql } from '@apollo/client'
import type { BadgeTier } from './badges'
import supportNs from '../i18n/ns/support'

// Labels are read at call time (current language): functions and getters,
// never strings frozen at import.
const st = supportNs.t as (key: string) => string

// Member ↔ Dilchap team requests. Priority and response target come from
// the paid badge ("Vendeur certifié" < 2 h, "Compte vérifié" < 24 h).
export type SupportCategory = 'ACCOUNT_RECOVERY' | 'PAYMENT' | 'LISTING' | 'DISPUTE' | 'BADGE' | 'SHOP' | 'OTHER'
export type SupportStatus = 'OPEN' | 'ANSWERED' | 'RESOLVED'
export type SupportPriority = 'NORMAL' | 'HIGH' | 'URGENT'
// How much the problem weighs, as the member says (staff can raise it to
// CRITICAL).
export type SupportImportance = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'

// « Joindre »: one of the member's objects, as a compact card (title,
// price, status, date). The server only ever lists and accepts the
// member's own objects — and, for listings, those they consulted (signed
// in), within the « Règles » window: `origin` says which.
export type SupportObjectKind = 'LISTING' | 'DEAL' | 'PAYMENT' | 'DISPUTE' | 'CONVERSATION'
export type SupportObjectRef = { kind: SupportObjectKind; id: string }
export type SupportObjectCard = {
  kind: SupportObjectKind; id: string; title: string; subtitle: string | null; price: number | null; currency: string
  status: string; statusLabel: string; date: string; image: string | null
  // LISTING: the member's own, or one they consulted (absent on old cards).
  origin?: 'OWN' | 'VIEWED'; viewedAt?: string | null
  // LISTING consulted and no longer public (paused, deleted, seller
  // suspended): the copy of the last visit; `statusLabel` says why.
  snapshotAt?: string; sellerName?: string; city?: string
}
export type SupportTicketObject = { id: string; kind: SupportObjectKind; targetId: string; snapshot: SupportObjectCard; auto: boolean; createdAt: string }
const KINDS: SupportObjectKind[] = ['LISTING', 'DEAL', 'PAYMENT', 'DISPUTE', 'CONVERSATION']
export const OBJECT_KIND_ICON: Record<SupportObjectKind, string> = { LISTING: 'sell', DEAL: 'handshake', PAYMENT: 'payments', DISPUTE: 'gavel', CONVERSATION: 'forum' }
// [kind, picker label, icon]
export const objectKinds = (): [SupportObjectKind, string, string][] => KINDS.map(k => [k, st(`kinds.${k}`), OBJECT_KIND_ICON[k]])
const labelGetters = <K extends string>(keys: readonly K[], prefix: string) =>
  Object.defineProperties({} as Record<K, string>, Object.fromEntries(keys.map(k => [k, { get: () => st(`${prefix}.${k}`), enumerable: true }])))
export const OBJECT_KIND_LABEL = labelGetters(KINDS, 'kind')

export type SupportTicket = {
  id: string
  reference: string
  category: SupportCategory
  subject: string
  status: SupportStatus
  priority: SupportPriority
  importance: SupportImportance
  badgeTier: BadgeTier | null
  dueAt: string
  firstResponseAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  messages: { id: string; body: string; attachments: string[] | null; readAt: string | null; createdAt: string; adminId: string | null; admin: { fullName: string } | null }[]
  // Objects the member attached (cards as they were when attached).
  objects?: SupportTicketObject[]
  // Staff replies not read yet.
  unread: number
}

const CATEGORIES: SupportCategory[] = ['PAYMENT', 'BADGE', 'LISTING', 'DISPUTE', 'SHOP', 'ACCOUNT_RECOVERY', 'OTHER']
export const supportCategories = (): [SupportCategory, string][] => CATEGORIES.map(k => [k, st(`category.${k}`)])
export const CATEGORY_LABEL = labelGetters(CATEGORIES, 'category')

// What the member picks when opening a conversation (CRITICAL is staff's).
const IMPORTANCE_ICON: [SupportImportance, string][] = [['LOW', 'help'], ['NORMAL', 'report'], ['HIGH', 'block']]
// [importance, label, icon, hint]
export const importanceChoices = (): [SupportImportance, string, string, string][] =>
  IMPORTANCE_ICON.map(([k, icon]) => [k, st(`importance.${k}`), icon, st(`importanceHint.${k}`)])
export const IMPORTANCE_LABEL = labelGetters(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const, 'importance')


export const MY_SUPPORT_TICKETS_QUERY = gql`query MySupportTickets { mySupportTickets }`
export const CREATE_SUPPORT_TICKET_MUTATION = gql`mutation CreateSupportTicket($input: SupportTicketInput!) { createSupportTicket(input: $input) }`
export const REPLY_SUPPORT_TICKET_MUTATION = gql`mutation ReplySupportTicket($id: ID!, $input: SupportReplyInput!) { replySupportTicket(id: $id, input: $input) }`
export const MY_SUPPORT_UNREAD_QUERY = gql`query MySupportUnread { mySupportUnread }`
export const MARK_SUPPORT_READ_MUTATION = gql`mutation MarkSupportTicketRead($id: ID!) { markSupportTicketRead(id: $id) }`
// Staff replied / changed a ticket: which one (the tab refetches).
export const SUPPORT_TICKET_UPDATED_SUBSCRIPTION = gql`subscription SupportTicketUpdated { supportTicketUpdated }`
export const CLOSE_SUPPORT_TICKET_MUTATION = gql`mutation CloseSupportTicket($id: ID!) { closeSupportTicket(id: $id) }`
export const MY_SUPPORT_ATTACHABLES_QUERY = gql`query MySupportAttachables($kind: SupportObjectKind, $search: String) { mySupportAttachables(kind: $kind, search: $search) }`
export const MY_SUPPORT_ATTACHABLE_QUERY = gql`query MySupportAttachable($kind: SupportObjectKind!, $id: ID!) { mySupportAttachable(kind: $kind, id: $id) }`
export const ATTACH_SUPPORT_OBJECTS_MUTATION = gql`mutation AttachSupportObjects($id: ID!, $objects: [SupportObjectRefInput!]!) { attachSupportObjects(id: $id, objects: $objects) }`
export const REQUEST_RECOVERY_MUTATION = gql`mutation RequestAccountRecovery($input: RecoveryRequestInput!) { requestAccountRecovery(input: $input) }`

// « L'assistant Dilchap » (AI) of the « Support » tab: answers first, from
// the help center and the member's own data, and hands over to an agent
// (button « Parler à un agent », or by itself when unsure). `enabled: false`
// (off for the member's country, or not set up): tickets only, as before.
export type AssistantSource = { key: string; title: string }
export type AssistantMessage = { id: string; role: 'MEMBER' | 'ASSISTANT' | 'SYSTEM'; body: string; sources: AssistantSource[] | null; createdAt: string }
export type AssistantConversation = {
  id: string
  status: 'ACTIVE' | 'HANDED_OFF' | 'CLOSED'
  handedOffAt: string | null
  ticket: { id: string; reference: string } | null
  createdAt: string
  messages: AssistantMessage[]
}
export type AssistantState =
  | { enabled: false }
  | { enabled: true; welcomeMessage: string; suggestions: string[]; remainingToday: number; conversation: AssistantConversation | null }
export type AssistantSendResult = {
  conversation: AssistantConversation | null
  ticketId?: string | null
  limited?: boolean
  handedOff?: { reason: string; reference: string }
}
export const SUPPORT_ASSISTANT_QUERY = gql`query SupportAssistant { supportAssistant }`
export const SEND_SUPPORT_ASSISTANT_MUTATION = gql`mutation SendSupportAssistantMessage($input: SupportAssistantMessageInput!) { sendSupportAssistantMessage(input: $input) }`
export const SUPPORT_ASSISTANT_HANDOFF_MUTATION = gql`mutation SupportAssistantHandoff($conversationId: ID!) { supportAssistantHandoff(conversationId: $conversationId) }`
