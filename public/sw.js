// Bump on every deploy that changes cached assets — old-named caches are
// swept in `activate`.
const VERSION = 'v18'

// Set by the app (see src/lib/activeConversation.ts) whenever a conversation
// thread mounts/unmounts on screen — lets the push handler below know not
// to alert for a message the recipient is already looking at.
let activeConversationId = null
const STATIC_CACHE = `yupixi-static-${VERSION}`
const PAGE_CACHE = `yupixi-pages-${VERSION}`
const OFFLINE_URL = '/offline.html'

const APP_SHELL = [
  '/',
  '/manifest.json?v=dilchap-2',
  OFFLINE_URL,
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  )
  // Deliberately no skipWaiting() here — a tab already open on the old JS
  // bundle would otherwise get its in-flight requests served by the new
  // worker mid-session. The app prompts the user instead (see
  // src/lib/serviceWorker.ts) and this worker only activates once it
  // receives the SKIP_WAITING message below.
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'CONFIG' && event.data.graphqlUrl) {
    event.waitUntil(
      caches.open(CONFIG_CACHE).then((cache) =>
        cache.put(CONFIG_KEY, new Response(JSON.stringify({ graphqlUrl: event.data.graphqlUrl }), { headers: { 'content-type': 'application/json' } })),
      ),
    )
  }
  if (event.data?.type === 'ACTIVE_CONVERSATION') activeConversationId = event.data.conversationId || null
})

// Where the app's GraphQL API lives (sent by the app on startup, see
// src/lib/serviceWorker.ts) — kept in Cache Storage because a push can wake
// this worker long after every tab is closed.
const CONFIG_CACHE = 'yupixi-sw-config'
const CONFIG_KEY = '/__sw-config'

async function readConfig() {
  try {
    const res = await (await caches.open(CONFIG_CACHE)).match(CONFIG_KEY)
    if (res) return await res.json()
  } catch {
    // fall through
  }
  return { graphqlUrl: `${self.location.origin}/graphql` }
}

// Delivery tracking (Backend PushService.track): delivered / clicked
// (+ which button) / dismissed. Signed by the server, best-effort.
async function track(data, event, action) {
  if (!data?.d || !data?.s) return
  try {
    const { graphqlUrl } = await readConfig()
    await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        query: 'mutation($d: String!, $s: String!, $e: String!, $a: String) { trackPush(delivery: $d, signature: $s, event: $e, action: $a) }',
        variables: { d: data.d, s: data.s, e: event, a: action ?? null },
      }),
    })
  } catch {
    // offline: the stats just miss this one
  }
}

// Fires even when no tab is open — this is what lets an anonymous guest
// (no email/SMS ever sent to them) learn a seller replied. Payload shape
// (v2) is Backend push-payload.ts → PushPayload: every Notification API
// option the platforms support — big picture, action buttons, grouping tag,
// sticky, silent — plus the app icon badge count.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    // ignore malformed payloads
  }
  const title = data.title || 'Dilchap'
  event.waitUntil(
    (async () => {
      // Skip the OS-level alert only when a focused tab is already showing
      // this exact conversation — the message still lands live there via
      // the messageAdded subscription, so a push on top would be a
      // duplicate. A matching but unfocused/backgrounded tab still notifies.
      if (data.conversationId && data.conversationId === activeConversationId) {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        if (windows.some((client) => client.focused)) return
      }
      const maxActions = self.Notification?.maxActions ?? 2
      const actions = Array.isArray(data.actions) ? data.actions.slice(0, maxActions) : []
      await self.registration.showNotification(title, {
        body: data.body || '',
        // Large icon: the sender's avatar, a listing photo… else the app icon.
        icon: data.icon || '/icon-192.png',
        // Status-bar icon: must be a white silhouette on transparent.
        badge: '/badge-96.png',
        image: data.image || undefined,
        tag: data.tag || undefined,
        renotify: !!(data.tag && data.renotify),
        requireInteraction: !!data.requireInteraction,
        silent: !!data.silent,
        vibrate: data.silent ? undefined : [120, 60, 120],
        timestamp: data.ts || Date.now(),
        lang: 'fr',
        actions: actions.map((a) => ({ action: a.action, title: a.title })),
        data: {
          url: data.url || '/',
          actionUrls: Object.fromEntries(actions.map((a) => [a.action, a.url])),
          d: data.d,
          s: data.s,
        },
      })
      if (typeof data.badgeCount === 'number' && 'setAppBadge' in self.navigator) {
        await (data.badgeCount > 0 ? self.navigator.setAppBadge(data.badgeCount) : self.navigator.clearAppBadge()).catch(() => {})
      }
      await track(data, 'delivered')
    })(),
  )
})

// Same-origin check on the parsed URL: a prefix test would accept
// `https://<our-host>.other.tld`.
function isSameOrigin(url) {
  try {
    return new URL(url, self.location.origin).origin === self.location.origin
  } catch {
    return false
  }
}

// Absolute http(s) URL a notification click may open. Anything else
// (protocol-relative `//host`, other schemes, unparsable) falls back to the
// home page.
function notificationTarget(raw) {
  if (typeof raw !== 'string' || !raw || /^[/\\]{2}/.test(raw)) return new URL('/', self.location.origin).href
  try {
    const target = new URL(raw, self.location.origin)
    if (target.protocol === 'https:' || target.protocol === 'http:') return target.href
  } catch {
    // fall through
  }
  return new URL('/', self.location.origin).href
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  // A button opens its own page; the notification body opens `url`.
  const url = notificationTarget((event.action && data.actionUrls?.[event.action]) || data.url)
  event.waitUntil(
    (async () => {
      await track(data, 'clicked', event.action || 'open')
      // External links (https://…) open in a new window.
      if (!isSameOrigin(url)) {
        return self.clients.openWindow?.(url)
      }
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windowClients) {
        if (isSameOrigin(client.url) && 'focus' in client) {
          // The running app opens the page itself, without a reload (App
          // routes every notification link: conversation, listing, shop,
          // shortcut page + dispute / ticket…).
          client.postMessage({ type: 'yupixi:open-url', url })
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })(),
  )
})

self.addEventListener('notificationclose', (event) => {
  event.waitUntil(track(event.notification.data || {}, 'dismissed'))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE && key !== CONFIG_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Build output with a content hash in its name (Vite chunks, the icon font
// subset): a cache hit is always right. Fixed names in public/ (logo,
// payment logos, icons, help screenshots) can change under the same name.
function isHashedAsset(url) {
  return url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || /^\/fonts\/.+-[0-9a-f]{8}\.woff2$/.test(url.pathname))
}
function isPublicFile(url) {
  return url.origin === self.location.origin && !url.pathname.startsWith('/aide/') && /\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/i.test(url.pathname)
}

// Every deploy adds new chunk names and orphans the old ones: keep only the
// most recent entries (Cache Storage lists keys in insertion order), so the
// origin's storage — which also holds the listing draft photos — never
// fills up to the point the browser evicts it all.
const STATIC_MAX_ENTRIES = 250
async function trimStaticCache() {
  const cache = await caches.open(STATIC_CACHE)
  // Only build files: the app shell and the offline page stay.
  const keys = (await cache.keys()).filter((key) => isHashedAsset(new URL(key.url)))
  const extra = keys.length - STATIC_MAX_ENTRIES
  if (extra > 0) await Promise.all(keys.slice(0, extra).map((key) => cache.delete(key)))
}

// A missing file comes back as the app shell (SPA fallback, status 200):
// never keep that under a file's name.
const isShellFallback = (response) => (response.headers.get('content-type') || '').includes('text/html')

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  // Cross-origin requests (listing photos on the media host, Google Fonts)
  // were never cached here anyway — going through the worker only added a
  // hop and turned any worker-side network hiccup into a 504. The browser's
  // HTTP cache handles them (media is served `immutable`).
  if (url.origin !== self.location.origin) return

  // HTML navigations: network-first (always serve the latest shell when
  // online), falling back to a cached copy or the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          // One copy of the app shell for offline use: every page (each
          // listing has its own address) is the same app.
          // (Not a printed QR code's page /q/…: its own title and noindex.)
          if (response.ok && !url.pathname.startsWith('/q/')) {
            const cache = await caches.open(PAGE_CACHE)
            cache.put('/', response.clone()).catch(() => {})
          }
          return response
        } catch {
          const cached = (await caches.match(request)) || (await caches.match('/'))
          return cached || (await caches.match(OFFLINE_URL)) || new Response(null, { status: 504 })
        }
      })(),
    )
    return
  }

  // Hashed build files: cache-first — their names change on every build,
  // so a cache hit is always correct.
  if (isHashedAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        try {
          const response = await fetch(request)
          if (response && response.status === 200 && !isShellFallback(response)) {
            const cache = await caches.open(STATIC_CACHE)
            event.waitUntil(cache.put(request, response.clone()).then(trimStaticCache).catch(() => {}))
          }
          return response
        } catch {
          return new Response(null, { status: 504 })
        }
      })(),
    )
    return
  }

  // Other files of public/ (fixed names): the cached copy at once, refreshed
  // in the background for the next time (a new logo shows up on the visit
  // after the deploy instead of never).
  if (isPublicFile(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE)
        const cached = await cache.match(request)
        const refresh = fetch(request)
          .then((response) => {
            if (response && response.status === 200 && !isShellFallback(response)) cache.put(request, response.clone()).catch(() => {})
            return response
          })
        if (cached) {
          event.waitUntil(refresh.catch(() => {}))
          return cached
        }
        try {
          return await refresh
        } catch {
          return new Response(null, { status: 504 })
        }
      })(),
    )
    return
  }

  // Everything else (GraphQL is POST and already excluded above; REST GETs
  // like media/uploads): network-first with a soft cache fallback so the
  // app stays browsable offline, never authoritative over a live response.
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request)
        if (response && response.status === 200 && url.origin === self.location.origin && !isShellFallback(response)) {
          const cache = await caches.open(PAGE_CACHE)
          cache.put(request, response.clone()).catch(() => {})
        }
        return response
      } catch {
        const cached = await caches.match(request)
        return cached || new Response(null, { status: 504, statusText: 'Gateway Timeout' })
      }
    })(),
  )
})
