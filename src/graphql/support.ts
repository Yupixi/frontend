import { gql } from '@apollo/client'
import type { BadgeTier } from './badges'

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
// member's own objects.
export type SupportObjectKind = 'LISTING' | 'DEAL' | 'PAYMENT' | 'DISPUTE' | 'CONVERSATION'
export type SupportObjectRef = { kind: SupportObjectKind; id: string }
export type SupportObjectCard = {
  kind: SupportObjectKind; id: string; title: string; subtitle: string | null; price: number | null; currency: string
  status: string; statusLabel: string; date: string; image: string | null
}
export type SupportTicketObject = { id: string; kind: SupportObjectKind; targetId: string; snapshot: SupportObjectCard; auto: boolean; createdAt: string }
export const OBJECT_KINDS: [SupportObjectKind, string, string][] = [
  ['LISTING', 'Annonces', 'sell'],
  ['DEAL', 'Achats et ventes', 'handshake'],
  ['PAYMENT', 'Paiements', 'payments'],
  ['DISPUTE', 'Litiges', 'gavel'],
  ['CONVERSATION', 'Conversations', 'forum'],
]
export const OBJECT_KIND_LABEL: Record<SupportObjectKind, string> = { LISTING: 'Annonce', DEAL: 'Achat ou vente', PAYMENT: 'Paiement', DISPUTE: 'Litige', CONVERSATION: 'Conversation' }
export const OBJECT_KIND_ICON = Object.fromEntries(OBJECT_KINDS.map(([k, , icon]) => [k, icon])) as Record<SupportObjectKind, string>

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

export const SUPPORT_CATEGORIES: [SupportCategory, string][] = [
  ['PAYMENT', 'Paiement Mobile Money'],
  ['BADGE', 'Badge & abonnement'],
  ['LISTING', 'Annonce & modération'],
  ['DISPUTE', 'Litige & remise'],
  ['SHOP', 'Boutique officielle'],
  ['ACCOUNT_RECOVERY', 'Accès au compte'],
  ['OTHER', 'Autre question'],
]
export const CATEGORY_LABEL = Object.fromEntries(SUPPORT_CATEGORIES) as Record<SupportCategory, string>

// What the member picks when opening a conversation (CRITICAL is staff's).
export const IMPORTANCE_CHOICES: [SupportImportance, string, string, string][] = [
  ['LOW', 'Simple question', 'help', 'Pas urgent'],
  ['NORMAL', 'Ça me gêne', 'report', 'Je peux attendre un peu'],
  ['HIGH', 'Bloquant', 'block', 'Je ne peux plus avancer'],
]
export const IMPORTANCE_LABEL: Record<SupportImportance, string> = { LOW: 'Simple question', NORMAL: 'Ça me gêne', HIGH: 'Bloquant', CRITICAL: 'Critique' }


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
