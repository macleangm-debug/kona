// Kona Service Worker for Offline Downloads
const CACHE_NAME = 'kona-offline-cache-v1';
const STATIC_CACHE = 'kona-static-v1';

// Assets to pre-cache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle offline video requests
  if (url.pathname.startsWith('/offline-video/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return new Response('Video not available offline', { status: 404 });
      })
    );
    return;
  }

  // Network-first strategy for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first strategy for static assets
  if (event.request.destination === 'image' || 
      event.request.destination === 'style' || 
      event.request.destination === 'script') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((fetchResponse) => {
          if (!fetchResponse || fetchResponse.status !== 200) {
            return fetchResponse;
          }
          const responseClone = fetchResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return fetchResponse;
        });
      })
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.destination === 'document') {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_VIDEO') {
    const { url, cacheKey } = event.data;
    event.waitUntil(
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error('Failed to fetch video');
          return caches.open(CACHE_NAME).then((cache) => {
            return cache.put(cacheKey, response);
          });
        })
        .then(() => {
          event.source.postMessage({ type: 'VIDEO_CACHED', cacheKey });
        })
        .catch((error) => {
          event.source.postMessage({ type: 'VIDEO_CACHE_ERROR', cacheKey, error: error.message });
        })
    );
  }
  
  if (event.data && event.data.type === 'DELETE_CACHED_VIDEO') {
    const { cacheKey } = event.data;
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.delete(cacheKey);
      })
    );
  }
});

// Background sync for failed downloads
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-downloads') {
    event.waitUntil(retryFailedDownloads());
  }
});

async function retryFailedDownloads() {
  console.log('[SW] Retrying failed downloads...');
}

console.log('[SW] Service Worker loaded');
