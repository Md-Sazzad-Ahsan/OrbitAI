// Empty service worker file
// This file exists to prevent 404 errors in the console
// It doesn't implement any actual service worker functionality

self.addEventListener('install', (event) => {
  // Skip the waiting phase
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all pages under this service worker's scope immediately
  event.waitUntil(self.clients.claim());
});

// Basic fetch handler that falls back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // If fetch fails, return a simple response
      return new Response('Offline', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});
