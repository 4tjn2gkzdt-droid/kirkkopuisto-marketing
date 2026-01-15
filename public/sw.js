// Service Worker - PWA offline-toiminnallisuus
const CACHE_NAME = 'kirkkopuisto-v1'
const urlsToCache = [
  '/',
  '/login',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
]

// Asennus - cachettaa tiedostot
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache avattu')
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error('Cache-virhe:', error)
      })
  )
})

// Aktivointi - poistaa vanhat cachet
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Poistetaan vanha cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Fetch - palauttaa cachesta jos offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Jos pyyntö onnistuu, cachettaa vastaus
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone)
        })
        return response
      })
      .catch(() => {
        // Jos offline, yritä palauttaa cachesta
        return caches.match(event.request).then((response) => {
          if (response) {
            return response
          }
          // Jos ei löydy cachesta, palauta offline-sivu
          return caches.match('/')
        })
      })
  )
})
