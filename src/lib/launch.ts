import { useEffect, useState } from 'react'
import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { countryVars, setMarketState, useMarketCode } from './countries'
import { earlyLocationLookup, getStoredLocation } from './location'

// « Lancement » (BO › Contenu): until the launch date the storefront shows
// the launch page. The team opens the real site with its secret link
// (?acces=<key>), remembered on that browser (storage and a cookie) and
// sent with every launchStatus. The launch can differ per country (BO
// « par pays »): `country` is the visitor's market.
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
  // The key sent is a preview key (of any country's launch page); false:
  // rotated in the Backoffice, forget it. Null when none was sent.
  keyValid?: boolean | null
}

const KEY_STORE = 'yupixi_launch_key'
const KEY_COOKIE = 'dilchap_acces'
const KEY_RE = /^[A-Za-z0-9_-]{12,64}$/

const readCookie = () => {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${KEY_COOKIE}=([^;]*)`))
    return m ? decodeURIComponent(m[1]) : null
  } catch {
    return null
  }
}
const writeCookie = (value: string | null) => {
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = value
      ? `${KEY_COOKIE}=${encodeURIComponent(value)}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
      : `${KEY_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`
  } catch { /* cookies blocked */ }
}

function remember(key: string) {
  try { localStorage.setItem(KEY_STORE, key) } catch { /* private mode */ }
  writeCookie(key)
}

// The team's key: from the link (then stored and dropped from the address
// bar), else the one stored earlier on this browser — local storage, or
// the cookie when the storage was cleared (iOS clears script storage of
// sites not visited for a while).
export function previewKey(): string | null {
  try {
    const url = new URL(window.location.href)
    const fromLink = url.searchParams.get('acces')
    if (fromLink && KEY_RE.test(fromLink)) {
      remember(fromLink)
      url.searchParams.delete('acces')
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
      return fromLink
    }
  } catch { /* no URL API */ }
  let stored: string | null = null
  try { stored = localStorage.getItem(KEY_STORE) } catch { /* private mode */ }
  const key = stored ?? readCookie()
  if (key && !stored) remember(key)
  return key && KEY_RE.test(key) ? key : null
}

// The key was rotated in the Backoffice: this browser stops sending it.
export function forgetPreviewKey() {
  try { localStorage.removeItem(KEY_STORE) } catch { /* private mode */ }
  writeCookie(null)
  setManifestKey(null)
}

// The installed app (home screen) opens the address of the manifest's
// start_url. iPhones give an installed app its own storage, without the
// key this browser remembered: with a valid key, the manifest is asked
// (?equipe=1, with the cookie) and the storefront's server answers a
// start_url carrying the key from that cookie (Caddyfile → Backend
// /seo/manifest.json), so the installed app opens the preview too. The
// link itself never shows the key: Microsoft Clarity records the page.
const MANIFEST = '/manifest.json?v=dilchap-3'
export function setManifestKey(key: string | null) {
  try {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (!link) return
    const href = key ? `${MANIFEST}&equipe=1` : MANIFEST
    // Manifests are fetched without cookies unless asked.
    if (key && link.crossOrigin !== 'use-credentials') link.crossOrigin = 'use-credentials'
    if (link.getAttribute('href') !== href) link.setAttribute('href', href)
  } catch { /* no DOM */ }
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
  // A key the server no longer knows is forgotten; a valid one goes into
  // the manifest (installed app).
  const answer = data?.launchStatus
  useEffect(() => {
    if (!answer || !key) return
    if (answer.keyValid === false) forgetPreviewKey()
    else if (answer.preview) setManifestKey(key)
  }, [answer, key])
  return { status, loading: (!ready || loading) && !status, error, refetch }
}
