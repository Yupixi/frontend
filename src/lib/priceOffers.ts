import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { getAccessToken } from './auth'
import { countryVars, useMarketCode, usePayerCountryCode } from './countries'

// Price offers (BO « Offres & gratuités »): a discount or a free period on
// what members pay in credits. The server applies them to every purchase;
// the storefront shows the price the member will really pay, with the same
// rule (best offer, never cumulated, rounded in their favour).

export type OfferOperation = 'BUMP' | 'BOOST' | 'CAMPAIGN' | 'BADGE' | 'SHOP' | 'AI_ASSIST' | 'CHAT_ASSIST'
export type LiveOffer = {
  id: string
  name: string
  message: string
  percent: number
  endsAt: string
  // Empty = every paid operation.
  operations: string[]
  // Category offers: only listings of these categories.
  categoryIds: string[] | null
  // Countries it applies in (empty = every country).
  countryCodes?: string[]
}

// `country`: the visitor's market (none = the every-country offers only).
export const PRICE_OFFERS_QUERY = gql`query PriceOffers($country: String) { priceOffers(country: $country) }`
export const MY_PRICE_OFFERS_QUERY = gql`query MyPriceOffers { myPriceOffers }`

const LISTING_OPERATIONS: OfferOperation[] = ['BUMP', 'BOOST', 'CAMPAIGN']

// Whether an offer applies in `country` (undefined: not known here, the
// server already chose; null: « Tous les pays », every-country offers only).
export const coversCountry = (o: LiveOffer, country: string | null | undefined) =>
  country === undefined || !o.countryCodes?.length || (!!country && o.countryCodes.includes(country))

// The live offers that concern this visitor: everyone's in their market, or
// (signed in) also theirs, their shop's and the category ones, in the
// country they pay in (their account's). Re-read every 5 minutes: an offer
// can start or end while the page is open.
export function usePriceOffers(): LiveOffer[] {
  const signedIn = !!getAccessToken()
  const market = useMarketCode()
  const payer = usePayerCountryCode()
  const { data } = useQuery<{ priceOffers?: LiveOffer[]; myPriceOffers?: LiveOffer[] }>(
    signedIn ? MY_PRICE_OFFERS_QUERY : PRICE_OFFERS_QUERY,
    { variables: signedIn ? {} : countryVars(market), fetchPolicy: 'cache-and-network', pollInterval: 5 * 60_000 },
  )
  const list = (signedIn ? data?.myPriceOffers : data?.priceOffers) ?? []
  const now = Date.now()
  // A member whose country isn't known here: the server's choice stands.
  const country = signedIn ? payer ?? undefined : market
  return list.filter(o => Date.parse(o.endsAt) > now && coversCountry(o, country))
}

// `country`: where the purchase is charged (see coversCountry); the lists
// from usePriceOffers are already limited to the payer's country.
export function bestOffer(offers: LiveOffer[], op: OfferOperation, categoryId?: string | null, country?: string | null): LiveOffer | null {
  let best: LiveOffer | null = null
  for (const o of offers) {
    if (!coversCountry(o, country)) continue
    if (o.operations.length && !o.operations.includes(op)) continue
    if (o.categoryIds && !(LISTING_OPERATIONS.includes(op) && categoryId && o.categoryIds.includes(categoryId))) continue
    if (!best || o.percent > best.percent) best = o
  }
  return best
}

export const discounted = (credits: number, percent: number) =>
  percent >= 100 ? 0 : Math.max(0, Math.floor((credits * (100 - percent)) / 100))

export type OfferPrice = { price: number; base: number; percent: number; name: string | null }

export function applyOffer(offers: LiveOffer[], op: OfferOperation, base: number, categoryId?: string | null): OfferPrice {
  const o = base > 0 ? bestOffer(offers, op, categoryId) : null
  return o ? { price: discounted(base, o.percent), base, percent: o.percent, name: o.name } : { price: base, base, percent: 0, name: null }
}

const LISTING_CATEGORY_QUERY = gql`query ListingOfferCategory($id: String!) { listing(id: $id) { id category { id } } }`

// Category of a listing, read only while a category offer is live (the
// screens that sell a boost rarely have it at hand).
export function useListingCategoryId(offers: LiveOffer[], listingId?: string | null, known?: string | null) {
  const needed = !known && !!listingId && offers.some(o => o.categoryIds)
  const { data } = useQuery<{ listing: { id: string; category: { id: string } | null } | null }>(LISTING_CATEGORY_QUERY, { variables: { id: listingId ?? '' }, skip: !needed })
  return known ?? data?.listing?.category?.id ?? null
}

// What `base` credits really cost this member for this operation (on this
// listing, for the operations about one).
export function useOfferPrice(op: OfferOperation, base: number | null | undefined, categoryId?: string | null, listingId?: string | null): OfferPrice | null {
  const offers = usePriceOffers()
  const category = useListingCategoryId(offers, LISTING_OPERATIONS.includes(op) ? listingId : null, categoryId)
  return base == null ? null : applyOffer(offers, op, base, category)
}

// The operation of a « Payer en crédits » purchase (as the server counts it).
export function operationOf(kind: string, product?: string | null): OfferOperation | null {
  if (kind === 'BOOST_PACK') return product === 'BUMP_FLASH' ? 'BUMP' : 'BOOST'
  if (kind === 'BADGE_SUBSCRIPTION') return 'BADGE'
  if (kind === 'SHOP_SUBSCRIPTION') return 'SHOP'
  if (kind === 'CAMPAIGN_ENTRY') return 'CAMPAIGN'
  return null
}

// Operation of a boost pack (the flash one is a bump).
export const packOperation = (pack: string): OfferOperation => (pack === 'BUMP_FLASH' ? 'BUMP' : 'BOOST')

export const offerLabel = (percent: number) => (percent >= 100 ? 'Offert' : `−${percent} %`)
