/**
 * FNA Service Worker
 * Provides offline shell experience with network-first API strategy
 */

const CACHE_VERSION = 'fna-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to cache for offline shell
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/charts.js',
  '/profile.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // External CDN - Chart.js
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// API endpoints that should use network-first strategy
const API_PATTERNS = [
  '/summary',
  '/meals',
  '/analyze',
  '/history',
  '/profile',
  '/ai-summary'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Cache failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('fna-') && name !== STATIC_CACHE && name !== API_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Check if this is an API request
  const isApiRequest = API_PATTERNS.some(pattern => url.pathname.startsWith(pattern));

  if (isApiRequest) {
    // Network-first for API requests
    event.respondWith(networkFirst(event.request));
  } else {
    // Cache-first for static assets
    event.respondWith(cacheFirst(event.request));
  }
});

/**
 * Cache-first strategy for static assets
 * Returns cached version if available, otherwise fetches from network
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // If offline and no cache, return offline page
    console.log('[SW] Network failed, returning offline fallback');
    return createOfflineResponse(request);
  }
}

/**
 * Network-first strategy for API requests
 * Tries network first, falls back to cache if offline
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful API responses
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Try to return cached API response
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('[SW] Returning cached API response');
      return cachedResponse;
    }

    // Return offline JSON response for API requests
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'You are currently offline. Please check your connection.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Create offline fallback response
 */
function createOfflineResponse(request) {
  // For HTML requests, return a simple offline page
  if (request.headers.get('Accept')?.includes('text/html')) {
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>FNA - Offline</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0a0a;
            color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
          }
          .icon { font-size: 4rem; margin-bottom: 20px; }
          h1 { font-size: 1.5rem; margin-bottom: 10px; }
          p { color: #888; font-size: 0.9rem; }
          button {
            margin-top: 20px;
            padding: 12px 24px;
            background: #22c55e;
            color: #000;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="icon">📡</div>
        <h1>You're Offline</h1>
        <p>FNA requires a connection to scan meals and sync data.</p>
        <button onclick="location.reload()">Try Again</button>
      </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }

  // For other requests, return a generic error
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

console.log('[SW] Service worker loaded');
