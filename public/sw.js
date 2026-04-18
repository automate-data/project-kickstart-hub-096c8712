const CACHE_NAME = 'chegueii-v3';
const STATIC_ASSETS = ['/', '/index.html'];

const FALLBACK_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="1"><title>Chegueii</title></head><body style="font-family:sans-serif;padding:20px;text-align:center;">Carregando...</body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
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
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached || new Response(FALLBACK_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  if (['script', 'style'].includes(event.request.destination)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (['font', 'image'].includes(event.request.destination)) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          return res;
        })
      )
    );
  }
});
