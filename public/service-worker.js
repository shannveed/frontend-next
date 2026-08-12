// frontend-next/public/service-worker.js
const CACHE_PREFIX = 'flixmovo-cache-';

// Replaced automatically during every build.
const CACHE_VERSION = 'dev-1786576093735';

const CACHE_NAME =
  `${CACHE_PREFIX}${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/images/FLIXMOVO.png',
  '/images/placeholder.jpg',
  '/images/desktop-icon-192.png',
  '/images/desktop-icon-512.png',
];

const IS_LOCALHOST =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1';

const isCacheableStaticAsset = (url) => {
  const path = url.pathname;

  if (path.startsWith('/_next/static/')) {
    return true;
  }

  if (path.startsWith('/images/')) {
    return true;
  }

  return [
    '/favicon.ico',
    '/manifest.json',
  ].includes(path);
};

const cacheInitialAsset = async (
  cache,
  asset
) => {
  try {
    const response = await fetch(asset, {
      cache: 'reload',
    });

    if (response.ok) {
      await cache.put(asset, response);
    }
  } catch {
    // A single missing asset must not fail SW installation.
  }
};

self.addEventListener('install', (event) => {
  if (IS_LOCALHOST) return;

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          STATIC_ASSETS.map((asset) =>
            cacheInitialAsset(cache, asset)
          )
        )
      )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    return;
  }

  if (
    IS_LOCALHOST &&
    (url.pathname.startsWith('/_next/') ||
      url.pathname.startsWith('/__nextjs') ||
      url.pathname.includes('webpack-hmr') ||
      url.pathname.includes('hot-update'))
  ) {
    return;
  }

  // Always use the network first for page navigations.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cachedHome =
            await caches.match('/');

          if (cachedHome) return cachedHome;

          return new Response('Offline', {
            status: 503,
            statusText: 'Offline',
            headers: {
              'Content-Type':
                'text/plain; charset=utf-8',
            },
          });
        }
      })()
    );

    return;
  }

  // Do not cache RSC payloads, movie pages, dashboard data,
  // authenticated responses, or arbitrary same-origin requests.
  if (!isCacheableStaticAsset(url)) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (
            response.ok &&
            response.type === 'basic'
          ) {
            const clone = response.clone();

            caches
              .open(CACHE_NAME)
              .then((cache) =>
                cache.put(request, clone)
              )
              .catch(() => { });
          }

          return response;
        })
        .catch(
          () =>
            new Response('', {
              status: 504,
              statusText:
                'Asset unavailable',
            })
        );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ===========================
   WEB PUSH NOTIFICATIONS
   =========================== */

self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data
      ? event.data.json()
      : {};
  } catch {
    data = {
      body: event.data
        ? event.data.text()
        : '',
    };
  }

  const title = data.title || 'Flixmovo';

  const options = {
    body: data.body || '',
    icon:
      data.icon ||
      '/images/desktop-icon-192.png',
    badge:
      data.badge ||
      '/images/desktop-icon-192.png',
    image: data.image,
    tag: data.tag,
    renotify: !!data.renotify,
    requireInteraction:
      !!data.requireInteraction,
    silent: !!data.silent,

    data: {
      url: data.url || '/',
      ...(typeof data.data === 'object' &&
        data.data
        ? data.data
        : {}),
    },

    actions: Array.isArray(data.actions)
      ? data.actions.slice(0, 2)
      : undefined,
  };

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(async () => {
        const clients =
          await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
          });

        clients.forEach((client) =>
          client.postMessage({
            type: 'PUSH_RECEIVED',
          })
        );
      })
  );
});

const resolveNotificationUrl = (
  value = '/'
) => {
  try {
    const target = new URL(
      String(value || '/'),
      self.location.origin
    );

    if (
      target.protocol !== 'http:' &&
      target.protocol !== 'https:'
    ) {
      return self.location.origin;
    }

    return target.toString();
  } catch {
    return self.location.origin;
  }
};

self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close();

    const targetUrl =
      resolveNotificationUrl(
        event.notification?.data?.url
      );

    event.waitUntil(
      self.clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then((clientList) => {
          for (const client of clientList) {
            if ('focus' in client) {
              client.navigate(targetUrl);
              return client.focus();
            }
          }

          if (self.clients.openWindow) {
            return self.clients.openWindow(
              targetUrl
            );
          }

          return undefined;
        })
    );
  }
);
