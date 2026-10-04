/* ============================================
   SW.JS — Service Worker do Drops
============================================ */

const CACHE_NAME = 'drops-v1';

const ARQUIVOS_BASE = [
  './',
  './index.html',
  './onboarding.html',
  './manifest.json',
  './assets/drops-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARQUIVOS_BASE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) =>
        Promise.all(
          nomes
            .filter((n) => n !== CACHE_NAME)
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  const url = req.url;

  if (
    url.includes('supabase.co') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('cdnjs.cloudflare.com') ||
    url.includes('unpkg.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((resposta) => {
        if (resposta && resposta.status === 200) {
          const clone = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return resposta;
      })
      .catch(() => caches.match(req))
  );
});