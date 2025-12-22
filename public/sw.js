// CORRECTION AUDIT : Stratégie Network First pour HTML pour éviter bugs CSRF
const CACHE_NAME = 'immofacile-prod-v1';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icon-512.png', // Assurez-vous que ce fichier existe
  '/offline.html', // AJOUT CONSEILLÉ : Mettre la page offline en cache
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap'
];

// 1. INSTALLATION
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
});

// 2. ACTIVATION (Nettoyage vieux caches)
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )));
});

// 3. GESTION DES REQUÊTES (FETCH)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorer les requêtes non-GET ou API
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  // STRATÉGIE "NETWORK FIRST" (Pour le HTML : Dashboard, Pages...)
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // STRATÉGIE "CACHE FIRST" (Pour les Images, CSS, JS, Fonts...)
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, res.clone());
          return res;
        });
      });
    })
  );
});

// 4. GESTION DU PUSH (NOTIFICATIONS) - SORTI DU FETCH
self.addEventListener('push', function(event) {
  let data = { title: 'Nouvelle notification', body: '', url: '/' };
  
  if (event.data) {
    data = event.data.json();
  }
  
  const options = {
    body: data.body,
    icon: '/images/icon-192.png', // Vérifiez que ce chemin est correct dans votre dossier public
    badge: '/images/badge.png',   // Vérifiez que ce chemin est correct
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. CLIC SUR NOTIFICATION - SORTI DU FETCH
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
