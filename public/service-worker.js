// frontend-next/public/service-worker.js
const CACHE_PREFIX = 'moviefrost-cache-';

// ✅ Injected at build time by scripts/inject-sw-build-id.js
// (Fallback is fine in dev if it stays as the placeholder.)
const CACHE_VERSION = '__MF_BUILD_ID__';

const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/images/favicon1.png',
  '/manifest.json',
  '/images/MOVIEFROST.png',
  '/images/placeholder.jpg',
  '/images/desktop-icon-192.png',
  '/images/desktop-icon-512.png',
];

const IS_LOCALHOST =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1';

self.addEventListener('install', (event) => {
  // ✅ IMPORTANT:
  // Do NOT call skipWaiting() here.
  // We want user-driven updates via "Update Now".
  if (IS_LOCALHOST) return;

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((c) => c.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // ✅ Never cache API
  if (url.pathname.startsWith('/api/')) return;

  // ✅ In Next dev: don't intercept Next internals/HMR
  if (
    IS_LOCALHOST &&
    (url.pathname.startsWith('/_next/') ||
      url.pathname.startsWith('/__nextjs') ||
      url.pathname.includes('webpack-hmr') ||
      url.pathname.includes('hot-update'))
  ) {
    return;
  }

  // Network-first for navigations
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  // Cache-first for same-origin assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((resp) => {
        if (resp.ok && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(() => {});
        }
        return resp;
      });
    })
  );
});

self.addEventListener('message', (evt) => {
  if (evt.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ===========================
   WEB PUSH NOTIFICATIONS
   =========================== */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'MovieFrost';

  const options = {
    body: data.body || '',
    icon: data.icon || '/images/MOVIEFROST.png',
    badge: data.badge || '/images/MOVIEFROST.png',
    image: data.image,
    tag: data.tag,
    renotify: !!data.renotify,
    requireInteraction: !!data.requireInteraction,
    silent: !!data.silent,
    data: {
      url: data.url || '/',
      ...(typeof data.data === 'object' && data.data ? data.data : {}),
    },
    actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : undefined,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      clients.forEach((c) => c.postMessage({ type: 'PUSH_RECEIVED' }));
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
