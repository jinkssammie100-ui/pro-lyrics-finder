// Change this version number every time you update your app!
const CACHE_NAME = 'lyrics-finder-v2'; 

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon.png'
];

// 1. Install Event: Download the new files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching App Shell v2');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting(); 
});

// 2. Activate Event: Delete the old v1 cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Fetch Event: Network-First Strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // Try the network first to get the freshest data
    fetch(event.request).catch(() => {
      // If the network fails (offline), fall back to the cache
      return caches.match(event.request);
    })
  );
});