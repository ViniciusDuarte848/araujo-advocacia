// sw.js — Service Worker Araujo Advocacia
const CACHE_NAME = 'araujo-adv-v1';
const URLS_TO_CACHE = [
  '/araujo-advocacia/',
  '/araujo-advocacia/index.html',
  '/araujo-advocacia/manifest.json'
];

// ── Instalação: cache dos arquivos principais ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

// ── Ativação: limpa caches antigos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: serve do cache quando offline ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Atualizar cache com resposta mais recente
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push recebido (notificação nativa) ──
self.addEventListener('push', event => {
  let data = { title: 'Araujo Advocacia', body: 'Você tem um compromisso pendente.' };
  try { data = event.data.json(); } catch(_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/araujo-advocacia/icon-192.png',
      badge: '/araujo-advocacia/icon-192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'araujo-notif',
      renotify: true,
      data: { url: '/araujo-advocacia/' }
    })
  );
});

// ── Clique na notificação: abre o app ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('araujo-advocacia') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/araujo-advocacia/');
      }
    })
  );
});

// ── Agendamento de notificações periódicas (verificação a cada 1h) ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SCHEDULE_CHECK') {
    // Recebe lista de compromissos do app para agendar notificações locais
    const { compromissos } = event.data;
    if (!compromissos) return;

    const hoje = new Date().toISOString().split('T')[0];
    const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().split('T')[0];
    const em2 = new Date(); em2.setDate(em2.getDate() + 2);
    const em2Str = em2.toISOString().split('T')[0];
    const em3 = new Date(); em3.setDate(em3.getDate() + 3);
    const em3Str = em3.toISOString().split('T')[0];

    compromissos.forEach(c => {
      if (c.data === hoje) {
        self.registration.showNotification('📅 Compromisso HOJE', {
          body: c.titulo + (c.horario ? ' às ' + c.horario.substring(0,5) : ''),
          icon: '/araujo-advocacia/icon-192.png',
          tag: 'hoje_' + c.id,
          data: { url: '/araujo-advocacia/' }
        });
      } else if (c.data === amanhaStr) {
        self.registration.showNotification('⏰ Compromisso AMANHÃ', {
          body: c.titulo + (c.horario ? ' às ' + c.horario.substring(0,5) : ''),
          icon: '/araujo-advocacia/icon-192.png',
          tag: 'amanha_' + c.id,
          data: { url: '/araujo-advocacia/' }
        });
      } else if (c.data === em2Str || c.data === em3Str) {
        const dias = c.data === em2Str ? 2 : 3;
        self.registration.showNotification('📌 Compromisso em ' + dias + ' dias', {
          body: c.titulo + ' — ' + new Date(c.data + 'T12:00:00').toLocaleDateString('pt-BR'),
          icon: '/araujo-advocacia/icon-192.png',
          tag: 'aviso_' + c.id,
          data: { url: '/araujo-advocacia/' }
        });
      }
    });
  }
});
