// Alcool Barialimites — Service Worker
// RC1 Build 446 · 23/06/2026
const CACHE_NAME = 'barialimites-v4';

const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Alarmes programmées depuis la page ──────────────────────────────────────
// La page envoie { type:'SET_ALARMS', alarmes:[{delaiMs, titre, corps}] }
// Le SW programme les setTimeout dans son propre contexte (résiste au verrouillage)
let _swTimers = [];

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SET_ALARMS') {
    // Annuler les timers existants
    _swTimers.forEach(clearTimeout);
    _swTimers = [];
    // Programmer les nouveaux
    (event.data.alarmes || []).forEach(function(a) {
      _swTimers.push(setTimeout(function() {
        self.registration.showNotification(a.titre, {
          body: a.corps,
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          requireInteraction: true,
          vibrate: [400, 150, 400]
        });
      }, a.delaiMs));
    });
  }
  if (event.data && event.data.type === 'CLEAR_ALARMS') {
    _swTimers.forEach(clearTimeout);
    _swTimers = [];
  }
});

// Fetch : network-first pour HTML, cache-first pour assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isHTML) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
  } else {
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
