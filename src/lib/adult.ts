import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import type { ApolloClient } from '@apollo/client'
import { createContext, useContext } from 'react'
import { useMarketCode } from './countries'
import { noteAdultListing } from './metaPixel'
import { useAdultSpace } from './adultMode'

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
  return useAdultAccessState(skip, country).access
}

// The same, with whether it is still being asked (the section's pages show
// a neutral loading state meanwhile, never « Connectez-vous » before the
// server answered for a signed-in member).
export function useAdultAccessState(skip = false, country?: string | null): { access: AdultAccess | null; loading: boolean } {
  const market = useMarketCode()
  const countryCode = country || market
  const { data, previousData } = useQuery<{ adultAccess: AdultAccess }>(ADULT_ACCESS_QUERY, {
    variables: { countryCode: countryCode ?? null },
    skip,
    fetchPolicy: 'cache-first',
  })
  const access = (data ?? previousData)?.adultAccess ?? null
  return { access, loading: !skip && !data }
}

// Who the visitor is changed (signed in, signed out, another account): the
// cached answers about the section are dropped and the ones on screen asked
// again. The cache used to keep a « LOGIN » answered while the member's
// session was being restored.
export function refreshAdultAccess(client: ApolloClient) {
  client.cache.evict({ id: 'ROOT_QUERY', fieldName: 'adultAccess' })
  client.cache.evict({ id: 'ROOT_QUERY', fieldName: 'adultHome' })
  client.cache.gc()
  // Only the ones on screen (naming the query asked Apollo for one even
  // when no page watched it: « Unknown query AdultAccess » warning).
  void client.refetchQueries({
    include: 'active',
    onQueryUpdated: (oq) => oq.queryName === 'AdultAccess',
  }).catch(() => undefined)
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
  const inContext = useInAdultSection()
  const inSpace = useAdultSpace()
  const inSection = inContext || inSpace
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
