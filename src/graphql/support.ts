import { gql } from '@apollo/client'
import type { BadgeTier } from './badges'

// Member ↔ Dilchap team requests. Priority and response target come from
// the paid badge ("Vendeur certifié" < 2 h, "Compte vérifié" < 24 h).
export type SupportCategory = 'ACCOUNT_RECOVERY' | 'PAYMENT' | 'LISTING' | 'DISPUTE' | 'BADGE' | 'SHOP' | 'OTHER'
export type SupportStatus = 'OPEN' | 'ANSWERED' | 'RESOLVED'
export type SupportPriority = 'NORMAL' | 'HIGH' | 'URGENT'

export type SupportTicket = {
  id: string
  reference: string
  category: SupportCategory
  subject: string
  status: SupportStatus
  priority: SupportPriority
  badgeTier: BadgeTier | null
  dueAt: string
  firstResponseAt: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  messages: { id: string; body: string; createdAt: string; adminId: string | null; admin: { fullName: string } | null }[]
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


export const MY_SUPPORT_TICKETS_QUERY = gql`query MySupportTickets { mySupportTickets }`
export const CREATE_SUPPORT_TICKET_MUTATION = gql`mutation CreateSupportTicket($input: SupportTicketInput!) { createSupportTicket(input: $input) }`
export const REPLY_SUPPORT_TICKET_MUTATION = gql`mutation ReplySupportTicket($id: ID!, $message: String!) { replySupportTicket(id: $id, message: $message) }`
export const CLOSE_SUPPORT_TICKET_MUTATION = gql`mutation CloseSupportTicket($id: ID!) { closeSupportTicket(id: $id) }`
export const REQUEST_RECOVERY_MUTATION = gql`mutation RequestAccountRecovery($input: RecoveryRequestInput!) { requestAccountRecovery(input: $input) }`
