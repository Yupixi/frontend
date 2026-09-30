import { print } from 'graphql'
import { apolloClient, GRAPHQL_URL } from './apollo'
import { registerServiceWorker } from './serviceWorker'
import { VAPID_PUBLIC_KEY_QUERY, SAVE_PUSH_SUBSCRIPTION_MUTATION, REMOVE_PUSH_SUBSCRIPTION_MUTATION } from '../graphql/push'

// VAPID public keys are base64url — the Push API wants a raw Uint8Array.
function urlBase64ToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// Called once per authenticated session (real login or guest) — see
// App.tsx's handleAuthenticated. Silently no-ops on unsupported browsers
// or if the visitor declines the permission prompt; messaging still works
// without it, this is purely a "notify me even if I close the tab" layer.
export type PushSubscriptionResult =
  | 'subscribed'
  | 'permission-required'
  | 'permission-denied'
  | 'ios-install-required'
  | 'unsupported'
  | 'not-configured'
  | 'error'

function isIosBrowser(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function getPushAvailability(): PushSubscriptionResult | 'available' {
  if (isIosBrowser() && !isStandalone()) return 'ios-install-required'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'permission-denied'
  if (Notification.permission === 'default') return 'permission-required'
  return 'available'
}

export async function subscribeToPush(requestPermission = false): Promise<PushSubscriptionResult> {
  const availability = getPushAvailability()
  if (availability === 'unsupported' || availability === 'ios-install-required' || availability === 'permission-denied') return availability

  try {
    if (Notification.permission === 'default') {
      if (!requestPermission) return 'permission-required'
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return permission === 'denied' ? 'permission-denied' : 'permission-required'
    }

    const { data } = await apolloClient.query<{ vapidPublicKey: string | null }>({
      query: VAPID_PUBLIC_KEY_QUERY,
      fetchPolicy: 'network-only',
    })
    if (!data?.vapidPublicKey) return 'not-configured'

    registerServiceWorker()
    let timeout: ReturnType<typeof setTimeout> | undefined
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Service worker unavailable')), 15000)
      }),
    ]).finally(() => clearTimeout(timeout))
    let subscription = await registration.pushManager.getSubscription()
    const applicationServerKey = urlBase64ToUint8Array(data.vapidPublicKey)
    const existingKey = subscription?.options.applicationServerKey
    if (subscription && existingKey && (
      existingKey.byteLength !== applicationServerKey.byteLength
      || new Uint8Array(existingKey).some((value, index) => value !== applicationServerKey[index])
    )) {
      await subscription.unsubscribe()
      subscription = null
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as BufferSource,
      })
    }

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return 'error'

    await apolloClient.mutate({
      mutation: SAVE_PUSH_SUBSCRIPTION_MUTATION,
      variables: { input: { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, userAgent: navigator.userAgent.slice(0, 300), platform: devicePlatform() } },
    })
    return 'subscribed'
  } catch {
    return 'error'
  }
}

// Sign-out (or an expired session): this device stops receiving the
// account's notifications — messages, offers, disputes of the previous member
// on a shared phone. The server forgets the endpoint when we still hold the
// session's token (sent as is: this must not go through the refresh logic
// of the Apollo link, which could sign the member back in); the browser
// subscription is dropped either way. A next sign-in subscribes again.
export async function unsubscribeFromPush(accessToken: string | null): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager?.getSubscription()
    if (!subscription) return
    if (accessToken) {
      await fetch(GRAPHQL_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ query: print(REMOVE_PUSH_SUBSCRIPTION_MUTATION), variables: { endpoint: subscription.endpoint } }),
      }).catch(() => undefined)
    }
    await subscription.unsubscribe()
  } catch {
    // Best effort: signing out never waits on this.
  }
}

// Coarse device family, for reach per platform in the Backoffice.
function devicePlatform(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

// App icon badge = unread notifications (installed PWA; no-op elsewhere).
export function syncAppBadge(count: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
  if (!nav.setAppBadge) return
  void (count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.())?.catch(() => undefined)
}
