const CACHE = 'yupixi-v3'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request)
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const cache = await caches.open(CACHE)
          cache.put(request, response.clone()).catch(() => {})
        }
        return response
      } catch (error) {
        const cached = await caches.match(request)
        if (cached) return cached
        return new Response(null, {
          status: 504,
          statusText: 'Gateway Timeout',
        })
      }
    })()
  )
})
