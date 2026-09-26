// Caches the app shell so ANURAG VIRTUAL COMPUTER's own UI loads instantly on
// repeat visits. This does NOT make external sites (YouTube, Gmail, etc.)
// work offline - those are rendered by the remote Chromium instance and
// require a live connection to it.
const CACHE_NAME = 'avc-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isApiOrWs = url.pathname.startsWith('/api') || url.pathname.startsWith('/ws');
  if (event.request.method !== 'GET' || isApiOrWs) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
