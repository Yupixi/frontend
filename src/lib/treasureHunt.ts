import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { useMarketVars } from './countries'
import { useAdultModeOn } from './adultMode'

// « Chasse au trésor » of the live campaign (Backend promotions/treasure-hunt).

export const TREASURE_HUNT_QUERY = gql`
  query TreasureHunt($country: String) { treasureHunt(country: $country) }
`
export const MY_TREASURE_HUNT_QUERY = gql`
  query MyTreasureHunt($country: String) { myTreasureHunt(country: $country) }
`
export const TREASURE_ON_LISTING_QUERY = gql`
  query TreasureOnListing($listingId: ID!, $country: String) { treasureOnListing(listingId: $listingId, country: $country) }
`
export const FIND_TREASURE_MUTATION = gql`
  mutation FindTreasure($listingId: ID!, $token: String!, $country: String) { findTreasure(listingId: $listingId, token: $token, country: $country) }
`
export const MY_HUNT_VOUCHER_QUERY = gql`
  query MyHuntVoucher($campaignId: ID!) { myHuntVoucher(campaignId: $campaignId) myHuntFinds(campaignId: $campaignId) }
`
export const SET_HUNT_VOUCHER_MUTATION = gql`
  mutation SetHuntVoucher($campaignId: ID!, $percent: Int) { setHuntVoucher(campaignId: $campaignId, percent: $percent) }
`

export type HuntPrize = { id: string; kind: 'DRAW' | 'ADVENT'; name: string; description: string; image: string | null; quantity: number }
export type HuntDay = {
  date: string
  state: 'past' | 'today' | 'locked'
  hint: string | null
  prize: HuntPrize | null
  winnersMax: number
  answer: { id: string; title: string; image: string | null } | null
}
export type Hunt = {
  id: string
  title: string
  intro: string
  giftsToWin: number
  campaign: { id: string; slug: string; name: string; endsAt: string; themeColor: string | null }
  prizes: HuntPrize[]
  today: string
  calendar: HuntDay[]
}
export type MyHunt = {
  found: number
  giftsToWin: number
  qualified: boolean
  today: number
  dailyFindLimit: number
  finds: { id: string; kind: 'GIFT' | 'ADVENT'; day: string; voucherPercent: number | null; listing: { id: string; title: string; image: string | null; seller: { id: string; fullName: string } } }[]
  wins: { id: string; at: string; prize: { name: string; image: string | null } }[]
}
export type ListingGift = { huntId: string; title: string; gift: { kind: 'GIFT' | 'ADVENT'; spot: number; found: boolean; token: string } | null }
export type FindResult = { kind: 'GIFT' | 'ADVENT'; found: number; giftsToWin: number; qualified: boolean; justQualified: boolean; voucherPercent: number | null; wonPrize: { id: string; name: string; image: string | null } | null }

// The live hunt in the visitor's country (none in the Section Adultes).
export function useHunt() {
  const adult = useAdultModeOn()
  const vars = useMarketVars()
  const { data, previousData, loading } = useQuery<{ treasureHunt: Hunt | null }>(TREASURE_HUNT_QUERY, { variables: vars, skip: adult })
  return { hunt: adult ? null : ((data ?? previousData)?.treasureHunt ?? null), loading }
}

export function useMyHunt(enabled: boolean) {
  const vars = useMarketVars()
  const { data, previousData, refetch } = useQuery<{ myTreasureHunt: MyHunt | null }>(MY_TREASURE_HUNT_QUERY, { variables: vars, skip: !enabled })
  return { mine: enabled ? ((data ?? previousData)?.myTreasureHunt ?? null) : null, refetch }
}
