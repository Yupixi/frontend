import { gql } from '@apollo/client'

// Seller help while writing a listing (Backend src/modules/moderation):
// live advice from the moderation rules, and "Rédiger avec l'IA".

export const LISTING_ADVICE_QUERY = gql`
  query ListingAdvice($input: ListingAdviceInput!) {
    listingAdvice(input: $input) { code level message }
  }
`
export type ListingAdvice = { code: string; level: 'BLOCKING' | 'WARNING' | 'TIP'; message: string }

export const LISTING_ASSIST_AVAILABLE_QUERY = gql`
  query ListingAssistAvailable { listingAssistAvailable listingAssistPrice }
`
export type ListingAssistOffer = { listingAssistAvailable: boolean; listingAssistPrice: number }

export const ASSIST_LISTING_MUTATION = gql`
  mutation AssistListing($input: ListingAssistInput!) {
    assistListing(input: $input) { title description categoryId subcategoryId brand condition creditsSpent balance }
  }
`
export type ListingDraftSuggestion = {
  title: string
  description: string
  categoryId: string | null
  subcategoryId: string | null
  brand: string | null
  condition: string | null
  creditsSpent: number
  balance: number
}
