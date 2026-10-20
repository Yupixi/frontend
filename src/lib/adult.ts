import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { createContext, useContext } from 'react'
import { useMarketCode } from './countries'
import { noteAdultListing } from './metaPixel'
import { rememberAdultListing } from './adultMode'

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

// The visitor's standing in their market (one shared query), or in
// `country` (a listing published in another country).
export function useAdultAccess(skip = false, country?: string | null): AdultAccess | null {
  const market = useMarketCode()
  const countryCode = country || market
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

// Publishing in the section refused. `reason`: NOT_ELIGIBLE (the seller
// rule of the country asks a verification, `rule` VERIFIED / CERTIFIED /
// OFFICIAL), CONFIRM_AGE (« Tous les membres »: « J'ai 18 ans ou plus » not
// ticked yet, asked right there), UNDERAGE, DISABLED.
export type AdultSellerRefusal = { message: string; reason: string; rule: string | null }
export function adultSellerError(error: unknown): AdultSellerRefusal | null {
  // Apollo 4 (CombinedGraphQLErrors): `errors`; older shapes: `graphQLErrors`.
  type GqlError = { message: string; extensions?: Record<string, unknown> }
  const errs = (error as { graphQLErrors?: GqlError[]; errors?: GqlError[] } | undefined)
  const hit = (errs?.graphQLErrors ?? errs?.errors ?? []).find((e) => e.extensions?.code === 'ADULT_SELLER')
  if (!hit) return null
  const ext = hit.extensions ?? {}
  return {
    message: hit.message,
    reason: typeof ext.reason === 'string' ? ext.reason : 'NOT_ELIGIBLE',
    rule: typeof ext.rule === 'string' ? ext.rule : null,
  }
}

// The refusal is solved by an identity check (« Faire vérifier mon
// identité »), not with « Tous les membres ».
export const needsSellerVerification = (r: AdultSellerRefusal | null) =>
  !!r && r.reason === 'NOT_ELIGIBLE' && !!r.rule && r.rule !== 'ALL'

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
    // Its page then opens in the section's theme at once (lib/adultMode).
    rememberAdultListing(listing.id)
    if (access?.status !== 'OK') return true
    return inSection ? false : access.blurPhotos
  }
}

// Class of a blurred photo (index.css).
export const ADULT_BLUR_CLASS = 'adult-blur'
