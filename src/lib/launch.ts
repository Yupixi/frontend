import { useEffect, useState } from 'react'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { countryVars, setMarketState, useMarketCode } from './countries'
import { earlyLocationLookup, getStoredLocation } from './location'

// « Lancement » (BO › Contenu): until the launch date the storefront shows
// the launch page. The team opens the real site with its secret link
// (?acces=<key>), remembered on that browser. The launch can differ per
// country (BO « par pays »): `country` is the visitor's market.
export const LAUNCH_STATUS_QUERY = gql`
  query LaunchStatus($key: String, $country: String) { launchStatus(key: $key, country: $country) }
`

export type LaunchStatus = {
  active: boolean
  launchAt: string | null
  title: string
  text: string
  image: string
  preview: boolean
}

const KEY_STORE = 'yupixi_launch_key'

// The team's key: from the link (then stored and dropped from the address
// bar), else the one stored earlier on this browser.
export function previewKey(): string | null {
  try {
    const url = new URL(window.location.href)
    const fromLink = url.searchParams.get('acces')
    if (fromLink) {
      localStorage.setItem(KEY_STORE, fromLink)
      url.searchParams.delete('acces')
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
      return fromLink
    }
    return localStorage.getItem(KEY_STORE)
  } catch {
    return null
  }
}

// First visit (no place stored yet): wait briefly for the IP lookup, as
// Home does (App's LOCATION_WAIT_MS), so the gate asks for the visitor's
// country at once. A late answer still sets the market (App, once shown,
// stores it and takes over).
const LOCATION_WAIT_MS = 700
function useFirstVisitMarket(): boolean {
  const [ready, setReady] = useState(() => !earlyLocationLookup)
  useEffect(() => {
    if (!earlyLocationLookup) return
    let active = true
    const giveUp = window.setTimeout(() => setReady(true), LOCATION_WAIT_MS)
    void earlyLocationLookup.then(detected => {
      if (detected?.countryCode && !getStoredLocation()) setMarketState({ market: detected.countryCode })
      if (active) setReady(true)
    })
    return () => { active = false; window.clearTimeout(giveUp) }
  }, [])
  return ready
}

export function useLaunch() {
  const key = previewKey()
  const market = useMarketCode()
  const ready = useFirstVisitMarket()
  // Asked again when the market changes (country picker, sign-in): the
  // page appears or goes. The last answer stays meanwhile, so the site is
  // never unmounted by a blank loading screen on a switch.
  const { data, previousData, loading, error, refetch } = useQuery<{ launchStatus: LaunchStatus }>(LAUNCH_STATUS_QUERY, {
    variables: { key, ...countryVars(market) },
    fetchPolicy: 'network-only',
    skip: !ready,
  })
  const status = (data ?? previousData)?.launchStatus ?? null
  return { status, loading: (!ready || loading) && !status, error, refetch }
}
