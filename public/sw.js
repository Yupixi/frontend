// Bump on every deploy that changes cached assets — old-named caches are
// swept in `activate`.
const VERSION = 'v5'
const STATIC_CACHE = `yupixi-static-${VERSION}`
const PAGE_CACHE = `yupixi-pages-${VERSION}`
const OFFLINE_URL = '/offline.html'

const APP_SHELL = [
  '/',
  '/manifest.json',
  OFFLINE_URL,
  '/favicon.svg',
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
})

// Fires even when no tab is open — this is what lets an anonymous guest
// (no email/SMS ever sent to them) learn a seller replied. Payload shape
// is set by Backend NotificationsService.create → PushService.sendToUser.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    // ignore malformed payloads
  }
  const title = data.title || 'Yupixi'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate?.(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

function isStaticAsset(url) {
  return url.origin === self.location.origin && /\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/i.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

  // HTML navigations: network-first (always serve the latest shell when
  // online), falling back to a cached copy or the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          const cache = await caches.open(PAGE_CACHE)
          cache.put(request, response.clone()).catch(() => {})
          return response
        } catch {
          const cached = await caches.match(request)
          return cached || (await caches.match(OFFLINE_URL)) || new Response(null, { status: 504 })
        }
      })(),
    )
    return
  }

  // Hashed static assets (JS/CSS/images/fonts): cache-first — their
  // filenames change on every build, so a cache hit is always correct.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        try {
          const response = await fetch(request)
          if (response && response.status === 200) {
            const cache = await caches.open(STATIC_CACHE)
            cache.put(request, response.clone()).catch(() => {})
          }
          return response
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
        if (response && response.status === 200 && url.origin === self.location.origin) {
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
