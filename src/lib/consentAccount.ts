import { useEffect } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { MY_COOKIE_CONSENT_QUERY, SAVE_MY_COOKIE_CONSENT } from '../graphql/content'
import { CONSENT_VERSION, adoptConsent, currentConsent, holdConsentBanner, onConsentAnswer, parseConsent, setConsentSignedIn, type Consent } from './analytics'
import { getMarketCode } from './countries'

// The cookie choice kept on the signed-in member's account (Backend
// cookie_consents): a member who chose once is not asked again on another
// device or browser, nor after clearing its storage.
// - Sign-in (or a visit while signed in): the newest of the account's
//   choice and this device's applies. The account's newer one is adopted
//   here; this device's newer one goes to the account — unless it was made
//   while another account was signed in (`account`): a member signing in on
//   a shared device never gets someone else's answer.
// - Each choice made while signed in is saved on the account.
// - Sign-out: this device keeps its choice (it is the browser's too).
// - Meanwhile (signed in, account not read yet) the banner waits, 4 s at
//   most: no flash of a question already answered on another device.
// Best effort: the device's copy works without the network.
export function useAccountConsent(userId: string | null | undefined, signedIn: boolean) {
  const client = useApolloClient()
  useEffect(() => {
    setConsentSignedIn(!!userId)
    if (!userId) {
      // Signed in, the member not loaded yet: wait for it.
      holdConsentBanner(signedIn)
      return
    }
    holdConsentBanner(true)
    let cancelled = false
    const save = (c: Consent) => {
      const country = getMarketCode()
      void client
        .mutate({ mutation: SAVE_MY_COOKIE_CONSENT, variables: { value: { version: CONSENT_VERSION, asked: c.asked, granted: c.granted, purposes: c.purposes, mode: c.mode, at: c.at, ...(country ? { country } : {}) } } })
        .catch(() => undefined)
    }
    const off = onConsentAnswer(save)
    void client
      .query<{ myCookieConsent: unknown }>({ query: MY_COOKIE_CONSENT_QUERY, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        if (cancelled) return
        const remote = parseConsent(data?.myCookieConsent ?? null)
        const local = currentConsent()
        if (remote && (!local || remote.at > local.at)) adoptConsent(remote)
        else if (local && !local.account && (!remote || local.at > remote.at)) save(local)
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) holdConsentBanner(false) })
    return () => { cancelled = true; off() }
  }, [userId, signedIn, client])
}
