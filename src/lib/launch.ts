import { gql } from '@apollo/client'
import { useQuery } from '@apollo/client/react'

// « Lancement » (BO › Contenu): until the launch date the storefront shows
// the launch page. The team opens the real site with its secret link
// (?acces=<key>), remembered on that browser.
export const LAUNCH_STATUS_QUERY = gql`
  query LaunchStatus($key: String) { launchStatus(key: $key) }
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

export function useLaunch() {
  const key = previewKey()
  const { data, loading, error, refetch } = useQuery<{ launchStatus: LaunchStatus }>(LAUNCH_STATUS_QUERY, {
    variables: { key },
    fetchPolicy: 'network-only',
  })
  return { status: data?.launchStatus ?? null, loading: loading && !data, error, refetch }
}
