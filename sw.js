/* ============================================
   SW.JS — Service Worker do Drops
============================================ */

const CACHE_NAME = 'drops-v27';

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

// 👇 NOVO BLOCO — força atualização imediata quando o cliente pedir
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
// ============================================
// PUSH — notificações com app fechado
// ============================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let dados = {};

  try {
    dados = event.data.json();
  } catch (e) {
    dados = {
      titulo: 'Drops',
      corpo: event.data.text()
    };
  }

  const titulo = dados.titulo || 'Nova mensagem';
  const corpo = dados.corpo || 'Você tem uma novidade';
  const url = dados.url || './';
  const tag = dados.tag || 'drops-push';

  const opcoes = {
    body: corpo,
    icon: './assets/drops-icon.png',
    badge: './assets/drops-icon.png',
    tag: tag,
    renotify: true,
    data: { url: url }
  };

  event.waitUntil(
    self.registration.showNotification(titulo, opcoes)
  );
});

// ============================================
// CLIQUE NA NOTIFICAÇÃO — abre o app
// ============================================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      // Se já tem uma aba do app aberta, foca nela
      for (const client of lista) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }

      // Senão, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});