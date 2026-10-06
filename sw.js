/* EMPIRE CODE HUB — Service Worker
 * Stratégies :
 *  - Pages (navigation)        : réseau d'abord, repli sur le cache (mode hors ligne)
 *  - Fichiers du site + CDN    : cache d'abord, mise à jour en arrière-plan
 *  - API / proxys / Chariow    : jamais interceptés (toujours le réseau)
 */

const VERSION = 'v1.0.0';
const STATIC_CACHE = 'empire-static-' + VERSION;
const RUNTIME_CACHE = 'empire-runtime-' + VERSION;

const PRECACHE_LOCAL = ['./', './index.html', './manifest.json', './donko.png'];
const PRECACHE_CDN = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'
];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const staticCache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(
      PRECACHE_LOCAL.map((url) => staticCache.add(new Request(url, { cache: 'reload' })))
    );
    const runtimeCache = await caches.open(RUNTIME_CACHE);
    await Promise.allSettled(
      PRECACHE_CDN.map((url) => runtimeCache.add(new Request(url, { mode: 'no-cors' })))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [STATIC_CACHE, RUNTIME_CACHE];
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith('empire-') && !keep.includes(name))
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* Événement fetch : obligatoire pour les critères d'installation Android Chrome */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(event, request, STATIC_CACHE));
    return;
  }

  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(event, request, RUNTIME_CACHE));
    return;
  }
  /* Autres origines (Chariow, proxys CORS, images distantes) : réseau normal. */
});

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (_) {
    const cached =
      (await caches.match(request)) ||
      (await caches.match('./index.html')) ||
      (await caches.match('./'));
    if (cached) return cached;
    return new Response('Vous êtes hors ligne et la page n\u2019est pas encore en cache.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function staleWhileRevalidate(event, request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }

  const response = await network;
  return response || Response.error();
}
