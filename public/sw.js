const CACHE_NAME = 'chegueii-v1';
const STATIC_ASSETS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('twilio') ||
    url.hostname.includes('lovable') ||
    url.protocol === 'chrome-extension:'
  ) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => { caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone())); return res; })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (['script', 'style', 'font', 'image'].includes(event.request.destination)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
        caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone()));
        return res;
      }))
    );
  }
});