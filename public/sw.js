const CACHE = 'dw-v2';
const ASSETS = ['/', '/script.js', '/sw.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/ContentsEditor.html', '/push.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        await cache.addAll(ASSETS);
      } catch (e) {
        // ignore missing assets during dev
        console.warn('Cache addAll warning:', e);
      }
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : undefined)));
      self.clients.claim();
    })()
  );
});


// Network-first strategy specifically for the troubleshooting data file
async function networkFirstForData(request) {
  const cache = await caches.open(CACHE);
  try {
    // Bypass HTTP cache to ensure fresh content when online
    const freshReq = new Request(request.url, { cache: 'no-store' });
    const networkResp = await fetch(freshReq);
    // Cache a clone for offline use
    cache.put(request, networkResp.clone());
    return networkResp;
  } catch (e) {
    // Offline or network error → fall back to any cached copy
    const cached = await cache.match(request);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('/app_data.json')) {
    event.respondWith(networkFirstForData(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((r) => r || fetch(event.request))
  );
});
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {}

  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-512.png',
    data: data.url || '/'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data;
  if (target) {
    event.waitUntil(clients.openWindow(target));
  }
});
