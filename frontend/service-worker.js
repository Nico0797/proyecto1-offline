const CACHE_NAME = 'encaja-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/@phosphor-icons/web',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo cachear GET requests
  if (event.request.method !== 'GET') return;
  
  // Estrategia: Network falling back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar respuesta válida para guardar en cache
        if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Implementación futura de sincronización
      Promise.resolve()
    );
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.text() : 'Nueva notificación';
  event.waitUntil(
    self.registration.showNotification('EnCaja', {
      body: data,
      icon: '/static/icons/icon-192x192.png',
      badge: '/static/icons/icon-192x192.png'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/panel.html')
  );
});