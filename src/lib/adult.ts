import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { createContext, useContext } from 'react'
import { useMarketCode } from './countries'
import { noteAdultListing } from './metaPixel'

// « Section Adultes (18+) » (Backend modules/adult): open per country in the
// Backoffice, shown only to logged-in members who ticked « J'ai 18 ans ou
// plus ». The server never sends adult listings to anyone else (it answers
// with the ADULT_GATE error); the storefront shows the gate, blurs their
// photos outside the section and keeps them away from Meta.

export type AdultStatus = 'DISABLED' | 'LOGIN' | 'UNDERAGE' | 'CONFIRM' | 'OK'

export type AdultAccess = {
  status: AdultStatus
  enabled: boolean
  blurPhotos: boolean
  notice: string
  confirmedAt: string | null
}

export const ADULT_ACCESS_QUERY = gql`
  query AdultAccess($countryCode: String) {
    adultAccess(countryCode: $countryCode) { status enabled blurPhotos notice confirmedAt }
  }
`

export const CONFIRM_ADULT_MUTATION = gql`
  mutation ConfirmAdult($countryCode: String) {
    confirmAdult(countryCode: $countryCode) { status enabled blurPhotos notice confirmedAt }
  }
`

export const REVOKE_ADULT_MUTATION = gql`
  mutation RevokeAdultConfirmation { revokeAdultConfirmation }
`

export type SearchIntent = 'NONE' | 'ADULT' | 'PORN'
export type SearchRouting = {
  intent: SearchIntent
  access: AdultStatus
  sectionAvailable: boolean
  sectionSlug: string | null
  adultResults: number
}

export const SEARCH_ROUTING_QUERY = gql`
  query SearchRouting($term: String!, $countryCode: String) {
    searchRouting(term: $term, countryCode: $countryCode) { intent access sectionAvailable sectionSlug adultResults }
  }
`

// The visitor's standing in their market (one shared query).
export function useAdultAccess(skip = false): AdultAccess | null {
  const countryCode = useMarketCode()
  const { data, previousData } = useQuery<{ adultAccess: AdultAccess }>(ADULT_ACCESS_QUERY, {
    variables: { countryCode: countryCode ?? null },
    skip,
    fetchPolicy: 'cache-first',
  })
  return (data ?? previousData)?.adultAccess ?? null
}

// The server's « gate instead of the data » answer, with its reason.
export function adultGateReason(error: unknown): AdultStatus | null {
  const errs = (error as { graphQLErrors?: { extensions?: Record<string, unknown> }[]; errors?: { extensions?: Record<string, unknown> }[] } | undefined)
  const list = errs?.graphQLErrors ?? errs?.errors ?? []
  const hit = list.find((e) => e.extensions?.code === 'ADULT_GATE')
  return hit ? ((hit.extensions?.reason as AdultStatus) ?? 'LOGIN') : null
}

// Publishing in the section without the verification it asks.
export function adultSellerError(error: unknown): string | null {
  const errs = (error as { graphQLErrors?: { message: string; extensions?: Record<string, unknown> }[] } | undefined)
  const hit = errs?.graphQLErrors?.find((e) => e.extensions?.code === 'ADULT_SELLER')
  return hit ? hit.message : null
}

// Inside the section (its category pages, its listings): photos shown to a
// confirmed member.
export const AdultSectionContext = createContext(false)
export const useInAdultSection = () => useContext(AdultSectionContext)

// Whether a listing's photo is blurred where it is shown.
export function useAdultBlur(): (listing: { id: string; isAdult?: boolean | null } | null | undefined) => boolean {
  const inSection = useInAdultSection()
  const access = useAdultAccess()
  return (listing) => {
    if (!listing?.isAdult) return false
    noteAdultListing(listing.id)
    if (access?.status !== 'OK') return true
    return inSection ? false : access.blurPhotos
  }
}

// Class of a blurred photo (index.css).
export const ADULT_BLUR_CLASS = 'adult-blur'
