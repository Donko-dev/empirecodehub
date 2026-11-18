/* EMPIRE CODE HUB — Service Worker (fonctionnement hors connexion) */
const VERSION = 'ec-v6';
const CDN = 'ec-cdn-v5';
const SHELL = ['./', './index.html', './services.html', './formations.html', './robots-trading.html', './paiement.html', './realisations.html', './couverture.html', './rendez-vous.html', './blog.html', './article.html', './produit.html', './mentions-legales.html', './conditions.html', './confidentialite.html', './404.html', './site.css', './app.js', './i18n.js', './i18n-services.js', './geo.js', './data.js', './donko.png', './syntix-logo.jpg', './manifest.json'];
const CDN_URLS = ['https://cdn.tailwindcss.com/', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const shell = await caches.open(VERSION);
    await Promise.allSettled(SHELL.map((u) => shell.add(u)));
    const cdn = await caches.open(CDN);
    await Promise.allSettled(CDN_URLS.map((u) => fetch(u, { mode: 'no-cors' }).then((r) => cdn.put(u, r))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = [VERSION, CDN];
    const ks = await caches.keys();
    await Promise.all(ks.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'CACHE_IMAGES' && Array.isArray(e.data.urls)) {
    caches.open(VERSION).then((c) => Promise.allSettled(e.data.urls.map((u) => fetch(u, { mode: 'no-cors' }).then((r) => c.put(u, r)))));
  }
});
const NETWORK_FIRST = /\.(html|js|json|php)$|\/$/;
const putIn = (name, req, res) => { if (res && (res.ok || res.type === 'opaque')) caches.open(name).then((c) => c.put(req, res.clone())); return res; };

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Ressources externes (Tailwind, Font Awesome, polices) : cache d'abord, mise à jour en arrière-plan */
  if (url.origin !== self.location.origin) {
    if (!CDN_HOSTS.includes(url.hostname)) return;
    e.respondWith((async () => {
      const cache = await caches.open(CDN);
      const cached = await cache.match(req);
      const net = fetch(req).then((r) => putIn(CDN, req, r)).catch(() => null);
      if (cached) { e.waitUntil(net); return cached; }
      return (await net) || Response.error();
    })());
    return;
  }

  /* Pages et données : réseau d'abord, cache en secours (ignore les paramètres ?s=…) */
  if (req.mode === 'navigate' || NETWORK_FIRST.test(url.pathname)) {
    e.respondWith((async () => {
      try {
        const r = await fetch(req, { cache: 'no-cache' });
        putIn(VERSION, req, r);
        return r;
      } catch (_) {
        const m = await caches.match(req, { ignoreSearch: true });
        if (m) return m;
        if (req.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
        return Response.error();
      }
    })());
    return;
  }

  /* Images, styles, SVG du site : cache d'abord */
  e.respondWith((async () => {
    const m = await caches.match(req, { ignoreSearch: true });
    if (m) return m;
    try { const r = await fetch(req); return putIn(VERSION, req, r); } catch (_) { return Response.error(); }
  })());
});
