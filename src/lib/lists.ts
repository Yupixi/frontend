import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { useMemo } from 'react'
import type { DisputeReason } from '../graphql/sellerTools'
import { useLocale } from '../i18n'
import layout from '../i18n/ns/layout'
import { countryVars, useCountries, useCountry, useMarketCode, useMemberCountryCode } from './countries'

// Choices offered in forms, edited in the back-office (« Listes de
// référence », Backend content/reference-lists.ts). defaultLists mirrors
// the backend defaults so forms are complete while the query loads. The BO
// can keep one version per country: `country` picks it (none = general).
export const REFERENCE_LISTS_QUERY = gql`
  query ReferenceLists($country: String) { referenceLists(country: $country) }
`

export type ReferenceLists = {
  // Places come from the country (« Pays »), see useLists.
  cities: string[]
  communes: string[]
  meetupSpots: { name: string, sub: string }[]
  // City split into the `communes` ('' for « Tous les pays »).
  mainCity: string
  conditions: { value: string, hint: string, icon: string }[]
  rejectReasons: string[]
  reportReasons: { listing: string[], user: string[], shop: string[] }
  disputeReasons: Record<DisputeReason, { label: string, hint: string }>
  quickReplies: { buyer: string[], seller: string[] }
}

// Built at each call, in the visitor's language. Condition values stay as
// stored on listings (the hint is what's read).
export const defaultLists = (): ReferenceLists => {
  const t = layout.t
  return {
    cities: [],
    communes: [],
    meetupSpots: [],
    mainCity: '',
    conditions: [
      { value: 'Neuf', hint: t('lists.condition.new'), icon: 'new_releases' }, // i18n-ignore
      { value: 'Très bon état', hint: t('lists.condition.veryGood'), icon: 'thumb_up' }, // i18n-ignore
      { value: 'Bon état', hint: t('lists.condition.good'), icon: 'check' }, // i18n-ignore
      { value: 'Pour pièces', hint: t('lists.condition.parts'), icon: 'build' }, // i18n-ignore
    ],
    rejectReasons: [
      t('lists.reject.photos'), t('lists.reject.counterfeit'), t('lists.reject.price'), t('lists.reject.description'),
      t('lists.reject.forbidden'), t('lists.reject.category'), t('lists.reject.duplicate'), t('lists.reject.contact'),
    ],
    reportReasons: {
      listing: [t('lists.report.suspectPrice'), t('lists.report.fraud'), t('lists.report.scam'), t('lists.report.inappropriate'), t('lists.report.sold'), t('lists.report.other')],
      user: [t('lists.report.scam'), t('lists.report.fakeProfile'), t('lists.report.behaviour'), t('lists.report.notAsDescribed'), t('lists.report.other')],
      shop: [t('lists.report.counterfeit'), t('lists.report.scam'), t('lists.report.misleading'), t('lists.report.behaviour'), t('lists.report.other')],
    },
    disputeReasons: {
      FAKE_PAYMENT: { label: t('lists.dispute.fakePayment.label'), hint: t('lists.dispute.fakePayment.hint') },
      NOT_AS_DESCRIBED: { label: t('lists.dispute.notAsDescribed.label'), hint: t('lists.dispute.notAsDescribed.hint') },
      NO_SHOW: { label: t('lists.dispute.noShow.label'), hint: t('lists.dispute.noShow.hint') },
      LATE: { label: t('lists.dispute.late.label'), hint: t('lists.dispute.late.hint') },
      COUNTERFEIT: { label: t('lists.dispute.counterfeit.label'), hint: t('lists.dispute.counterfeit.hint') },
      PAYMENT_PRESSURE: { label: t('lists.dispute.paymentPressure.label'), hint: t('lists.dispute.paymentPressure.hint') },
      OTHER: { label: t('lists.dispute.other.label'), hint: t('lists.dispute.other.hint') },
    },
    quickReplies: {
      buyer: [t('lists.quick.buyer1'), t('lists.quick.buyer2'), t('lists.quick.buyer3'), t('lists.quick.buyer4')],
      seller: [t('lists.quick.seller1'), t('lists.quick.seller2'), t('lists.quick.seller3'), t('lists.quick.seller4')],
    },
  }
}

// Lists of a country (the BO's version for it, with its cities, districts
// of its main city and meet-up spots): `countryCode` (the listing's, the
// shop's…), else the visitor's market; for « Tous les pays », the general
// lists with the main city of each country and no districts.
export function useLists(countryCode?: string | null): ReferenceLists {
  const market = useMarketCode()
  const code = countryCode === undefined ? market : countryCode
  // Each country is cached apart; the previous lists stay while another
  // country's load (no flash of the defaults on a switch).
  const { data, previousData } = useQuery<{ referenceLists: ReferenceLists }>(REFERENCE_LISTS_QUERY, {
    variables: countryVars(code),
    fetchPolicy: 'cache-first',
  })
  const countries = useCountries()
  const country = useCountry(code, true)
  const locale = useLocale()
  const fallback = useMemo(() => defaultLists(), [locale]) // eslint-disable-line react-hooks/exhaustive-deps
  const lists = (data ?? previousData)?.referenceLists ?? fallback
  return useMemo(() => country
    ? { ...lists, cities: country.cities, communes: country.districts, meetupSpots: country.meetupSpots, mainCity: country.mainCity }
    : { ...lists, cities: countries.map(c => c.mainCity), communes: [], meetupSpots: [], mainCity: '' }, [lists, country, countries])
}

// Member screens (disputes, chat quick replies): the lists of the member's
// account country, where their deals happen, else the visitor's market.
export function useMemberLists(): ReferenceLists {
  return useLists(useMemberCountryCode())
}

// "Where do you live" pickers: districts of the main city, then the other towns.
export function placeOptions(l: ReferenceLists): string[] {
  return [...l.communes, ...l.cities.filter(c => c !== l.mainCity)]
}

export function useDisputeLabel(): (r: DisputeReason) => string {
  const { disputeReasons } = useMemberLists()
  return r => disputeReasons[r]?.label ?? r
}
