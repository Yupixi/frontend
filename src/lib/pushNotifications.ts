import { apolloClient } from './apollo'
import { VAPID_PUBLIC_KEY_QUERY, SAVE_PUSH_SUBSCRIPTION_MUTATION } from '../graphql/push'

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
export async function subscribeToPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  try {
    if (Notification.permission === 'denied') return
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
    }

    const { data } = await apolloClient.query<{ vapidPublicKey: string | null }>({
      query: VAPID_PUBLIC_KEY_QUERY,
      fetchPolicy: 'network-only',
    })
    if (!data?.vapidPublicKey) return

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.vapidPublicKey) as BufferSource,
      })
    }

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

    await apolloClient.mutate({
      mutation: SAVE_PUSH_SUBSCRIPTION_MUTATION,
      variables: { input: { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth } },
    })
  } catch {
    // Best-effort — never block the auth flow that triggered this.
  }
}
