// Alcool Barialimites — Service Worker
// RC1 Build 445 · 23/06/2026
const CACHE_NAME = 'barialimites-v3'; // v3 force l'éviction de tous les anciens caches

const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// Installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // prend le contrôle immédiatement sans attendre fermeture des onglets
});

// Activation : supprime TOUS les anciens caches (y compris les dizaines de builds précédents)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Suppression ancien cache :', k);
          return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim()) // prend le contrôle de tous les onglets ouverts
  );
});

// Fetch : network-first pour index.html (garantit toujours la dernière version),
// cache-first pour les assets statiques (icônes, manifest)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isHTML) {
    // Network-first pour le HTML : si réseau dispo, toujours charger la dernière version
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request)) // fallback cache si hors ligne
    );
  } else {
    // Cache-first pour les autres assets
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});
