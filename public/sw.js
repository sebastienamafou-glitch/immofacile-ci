const CACHE_NAME = 'immofacile-v1';
const urlsToCache = [
  '/',                // Landing page publique
  '/login',           // Page de connexion (utile hors ligne)
  '/manifest.json',
  '/icon-512.png',    // L'icône (à ajouter dans public/)
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap'
];

// 1. INSTALLATION
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. INTERCEPTION (Stratégie hybride)
self.addEventListener('fetch', event => {
  // On ne cache pas les appels API, ni les méthodes POST (upload, formulaires)
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // A. Si trouvé dans le cache, on le rend
        if (response) {
            return response;
        }
        // B. Sinon, on va chercher sur le réseau
        return fetch(event.request);
      })
  );
});
