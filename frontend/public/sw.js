const CACHE_NAME = 'smart-picker-landing-v4';
const LANDING_PAGE_CACHE = 'landing-page-v4';

// Critical assets to cache for landing page - only files that exist at runtime
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache critical assets first
self.addEventListener('install', (event) => {
  console.log('New service worker installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(LANDING_PAGE_CACHE).then((cache) => {
      console.log('Caching critical landing page assets');
      return cache.addAll(CRITICAL_ASSETS).then(() => {
        console.log('Critical assets cached successfully');
      }).catch((error) => {
        console.log('Error caching critical assets:', error);
      });
    })
  );
});

// Fetch event - serve from cache when possible, but prioritize fresh content
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip requests with unsupported schemes (chrome-extension, moz-extension, etc.)
  if (event.request.url.startsWith('chrome-extension://') || 
      event.request.url.startsWith('moz-extension://') ||
      event.request.url.startsWith('safari-extension://') ||
      event.request.url.startsWith('ms-browser-extension://')) {
    return;
  }

  // Handle landing page requests with network-first strategy for HTML
  if (event.request.url.includes('/') || event.request.url.includes('/index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh response
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(LANDING_PAGE_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return a basic response if no cache found
            return new Response('Network error - no cached version available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        })
    );
  }
  
  // Handle JS/CSS with cache-first strategy
  else if (event.request.url.includes('/js/') || event.request.url.includes('/css/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fetch from network if not cached
        return fetch(event.request).then((networkResponse) => {
          // Don't cache non-successful responses
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clone the response to cache it
          const responseToCache = networkResponse.clone();
          caches.open(LANDING_PAGE_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch((error) => {
          // Return a basic error response if network fails
          return new Response('Network error', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
    );
  }
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('New service worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Take control of all clients immediately
      self.clients.claim(),
      
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== LANDING_PAGE_CACHE && cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});
