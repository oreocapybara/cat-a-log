const CACHE_NAME = 'cat-a-log-v2';
const STATIC_ASSETS = [
  '/',
  '/map',
  '/manifest.json',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for navigation and static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests — let the browser handle them
  if (request.method !== 'GET') {
    return;
  }

  // Skip API routes and Supabase requests — always go to network
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        // Fallback to cache when offline
        const cached = await caches.match(request);
        if (cached) return cached;

        // For navigation requests, return the cached home page as a fallback
        if (request.mode === 'navigate') {
          const fallback = await caches.match('/');
          if (fallback) return fallback;
        }

        // Last resort: return a proper offline response
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});
