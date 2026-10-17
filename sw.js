/* ============================================
   SW.JS — Service Worker do Drops
============================================ */

const CACHE_NAME = 'drops-v37';

const ARQUIVOS_BASE = [
  './',
  './index.html',
  './onboarding.html',
  './manifest.json',
  './assets/drops-icon.png',

  // CSS
  './css/00-base.css',
  './css/01-topbar.css',
  './css/02-mydrops.css',
  './css/03-nearby.css',
  './css/04-nex.css',
  './css/05-chat.css',
  './css/06-msg.css',
  './css/07-viewer.css',
  './css/08-perfil.css',
  './css/09-conectados.css',
  './css/10-nearby-viewer.css',
  './css/11-mydrops-viewer.css',
  './css/12-editor.css',
  './css/13-modais.css',
  './css/14-utils.css',
  './css/15-mural.css',
  './css/16-notas.css',
  './css/17-foto.css',
  './css/18-video.css',
  './css/19-tutorial.css',
  './css/20-onboarding-viewers.css',

  // JS — principais
  './js/00-config.js',
  './js/01-auth.js',
  './js/02-ui.js',
  './js/03-utils.js',
  './js/04-conversas.js',
  './js/05-nex-chat.js',
  './js/06-nex-midia.js',
  './js/07-nex-album.js',
  './js/08-perfil.js',
  './js/09-conectados.js',
  './js/10-adeptos.js',
  './js/11-nearby.js',
  './js/12-mydrops.js',
  './js/13-editor.js',
  './js/14-init.js',
  './js/15-reacoes.js',
  './js/16-visitas.js',
  './js/17-adapters.js',
  './js/18-sobre.js',
  './js/19-mural.js',
  './js/20-supabase.js',
  './js/21-perfil-supabase.js',
  './js/22-publicacoes-supabase.js',
  './js/23-reacoes-supabase.js',
  './js/24-visualizacoes-supabase.js',
  './js/25-nex-supabase.js',
  './js/26-reacoes-midia-supabase.js',
  './js/27-feedback.js',
  './js/28-history.js',
  './js/29-notas.js',
  './js/30-foto.js',
  './js/31-video.js',
  './js/32-notificacoes-tabs.js',
  './js/33-notificacoes-realtime.js',
  './js/34-notificacoes-cards.js',
  './js/35-tutorial.js',
  './js/36-push.js',
  './js/37-onboarding-viewers.js',
  './js/38-nearby-scroll-continuo.js',
  './js/40-realtime-compartilhamentos.js',
  './js/41-drops-vistos.js',
  './js/selos.js'
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