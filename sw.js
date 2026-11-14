/* EMPIRE CODE HUB — Service Worker (hors ligne).
 * Données, scripts et pages : réseau d'abord (toujours la version la plus récente quand on est en ligne),
 * cache en secours hors connexion. Images et ressources statiques : cache d'abord. */
const VERSION = 'ec-v4';
const SHELL = ['./', './index.html', './services.html', './formations.html', './robots-trading.html', './paiement.html', './realisations.html', './couverture.html', './rendez-vous.html', './blog.html', './article.html', './produit.html', './mentions-legales.html', './conditions.html', './confidentialite.html', './404.html', './app.js', './i18n.js', './i18n-services.js', './geo.js', './data.js', './donko.png', './manifest.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const NETWORK_FIRST = /\.(html|js|json|php)$|\/$/;
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate' || NETWORK_FIRST.test(url.pathname)) {
    e.respondWith(fetch(req, { cache: 'no-cache' })
      .then((r) => { if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req).then((m) => m || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((m) => m || fetch(req).then((r) => { if (r && r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return r; })));
});
