/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'taligram-pwa-v1'
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/icon.png',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // SPA navigation fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req)
        } catch {
          const cached = await caches.match('/index.html')
          return cached || Response.error()
        }
      })(),
    )
    return
  }

  // Cache-first for static assets, network-first for others
  event.respondWith(
    (async () => {
      const cached = await caches.match(req)
      if (cached) return cached
      try {
        const res = await fetch(req)
        const isStatic =
          url.pathname.startsWith('/assets/') ||
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.json')

        if (isStatic && res.ok) {
          const cache = await caches.open(CACHE_NAME)
          cache.put(req, res.clone())
        }
        return res
      } catch {
        return cached || Response.error()
      }
    })(),
  )
})

