/* EMPIRE CODE HUB — moteur du site : langues (9), thème, en-tête, catalogue, utilitaires */
(() => {
  'use strict';
  const I = window.EC_I18N, LANGS = I.LANGS, DICT = I.I18N;
  const SVC = window.EC_SERVICE_I18N || {};
  const GEO = window.EC_GEO || { land: [], pins: {} };
  const BASE = './';
  const DEFAULTS = { settings: {}, services: [], robots: [], payments: [], trainings: [], portfolio: [], blog: [], ads: [], marquee: [], faq: [], coverage: { items: [], note: '' }, booking: {}, legal: {}, products: { manual: [], overrides: {} } };
  let D = Object.assign({}, DEFAULTS, window.EMPIRE_DATA || {});
  try { if (/[?&]preview=1/.test(location.search)) { const d = localStorage.getItem('ec:draft'); if (d) D = Object.assign({}, D, JSON.parse(d)); } } catch (_) { /* aperçu indisponible */ }
  const S = Object.assign({ brand: 'EMPIRE CODE HUB', contact: {}, store: {}, features: {}, seo: {} }, D.settings || {});
  const C = S.contact || {};
  const WA = String(C.whatsapp || '2290196809106').replace(/\D/g, '');
  const MAIL = C.email || 'empiredonko@gmail.com';
  const STORE = String((S.store || {}).origin || 'https://empirecode.mychariow.co').replace(/\/$/, '');
  const RELAY = S.relayUrl || 'relay.php';
  const PAGE = document.body.dataset.page || 'home';
  const FEAT = (k) => (S.features || {})[k] !== false;

  /* ---------- Langue ---------- */
  function detectLang() {
    try { const s = localStorage.getItem('ec:lang'); if (s && DICT[s]) return s; } catch (_) { /* ignoré */ }
    for (const l of (navigator.languages || [navigator.language || 'fr'])) { const c = String(l).slice(0, 2).toLowerCase(); if (DICT[c]) return c; }
    return 'fr';
  }
  let lang = detectLang();
  const meta = () => LANGS.find((l) => l.code === lang) || LANGS[0];
  const idx = () => LANGS.findIndex((l) => l.code === lang);
  function t(key, vars) {
    let s = (DICT[lang] && DICT[lang][key]) || DICT.fr[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  /* Contenus gérés : traduction des services (intégrée), sinon texte français */
  function svcText(s, field) {
    if (lang === 'fr') return s[field];
    const pair = (SVC[s.slug] || [])[idx() - 1];
    return pair ? pair[field === 'title' ? 0 : 1] : s[field];
  }
  const fmtDate = (v, o) => { try { return new Intl.DateTimeFormat(meta().locale, o || { dateStyle: 'long' }).format(new Date(v)); } catch (_) { return String(v || '').slice(0, 10); } };
  const money = (v, cur) => { try { return new Intl.NumberFormat(meta().locale, { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(v); } catch (_) { return v + ' ' + cur; } };

  /* ---------- Outils DOM ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const now = () => Date.now();
  const ts = (v) => { const x = Date.parse(v); return Number.isNaN(x) ? null : x; };
  const live = (x) => !!x && x.active !== false && (!ts(x.start) || now() >= ts(x.start)) && (!ts(x.end) || now() < ts(x.end));
  const sorted = (a) => [...(a || [])].filter((x) => x && x.active !== false).sort((p, q) => (p.order || 0) - (q.order || 0));
  const collapse = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function h(tag, attrs, kids) {
    if (typeof attrs === 'string') attrs = { class: attrs };
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of [].concat(kids == null ? [] : kids)) if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
    return n;
  }
  const ic = (c) => h('i', { class: c, 'aria-hidden': 'true' });
  const safeUrl = (u) => { const s = collapse(u); if (!s) return ''; if (/^(https?:|mailto:|tel:|#)/i.test(s)) return s; if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return ''; return s.replace(/^\.?\//, ''); };
  const safeImg = (u) => { const s = String(u || '').trim(); if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);/i.test(s)) return s; if (/^https:\/\//i.test(s)) return s; if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return ''; return s.replace(/^\.?\//, ''); };
  const linkTo = (p) => BASE + p;
  const sendWA = (text) => window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  const sendMail = (subject, text) => { location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text); };
  async function copyText(txt) {
    try { await navigator.clipboard.writeText(txt); return true; } catch (_) {
      try { const ta = h('textarea', { readonly: '', style: 'position:fixed;top:0;left:0;opacity:0' }); ta.value = txt; document.body.append(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (__) { return false; }
    }
  }

  /* ---------- Drapeaux (SVG intégrés, sans réseau) ---------- */
  function starPoints(cx, cy, r, rot) { const p = []; for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2 + (rot || 0), rr = i % 2 ? r * 0.382 : r; p.push((cx + rr * Math.cos(a)).toFixed(2) + ',' + (cy + rr * Math.sin(a)).toFixed(2)); } return p.join(' '); }
  const FLAGS = {
    fr: ['0 0 30 20', '<rect width="10" height="20" fill="#0055A4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#EF4135"/>'],
    en: ['0 0 60 30', '<rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="2"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/>'],
    de: ['0 0 30 20', '<rect width="30" height="7" fill="#000"/><rect y="6.67" width="30" height="6.67" fill="#DD0000"/><rect y="13.34" width="30" height="6.66" fill="#FFCE00"/>'],
    es: ['0 0 30 20', '<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>'],
    ar: ['0 0 30 20', '<rect width="30" height="20" fill="#006C35"/><rect x="6.5" y="13.6" width="17" height="1.1" rx=".55" fill="#fff"/><path d="M7 7.2c2.2-2 4.2 1.6 6.4-.2s4.2-1.8 6.2 0 2.6.8 3.6-.2" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/>'],
    zh: ['0 0 30 20', '<rect width="30" height="20" fill="#DE2910"/><polygon fill="#FFDE00" points="' + starPoints(5, 5.2, 3) + '"/>' + [[10, 2], [12, 4], [12, 7], [10, 9]].map(([x, y]) => '<polygon fill="#FFDE00" points="' + starPoints(x, y, 1) + '"/>').join('')],
    pt: ['0 0 30 20', '<rect width="30" height="20" fill="#FF0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="3.6" fill="#FFCC00"/><circle cx="12" cy="10" r="2.5" fill="#fff"/>'],
    ru: ['0 0 30 20', '<rect width="30" height="7" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039A6"/><rect y="13.34" width="30" height="6.66" fill="#D52B1E"/>'],
    tr: ['0 0 30 20', '<rect width="30" height="20" fill="#E30A17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.4" cy="10" r="4" fill="#E30A17"/><polygon fill="#fff" points="' + starPoints(16.4, 10, 2.3, Math.PI / 2) + '"/>']
  };
  const flagCache = {};
  const flagSrc = (code) => { if (!flagCache[code]) { const f = FLAGS[code] || FLAGS.fr; flagCache[code] = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + f[0] + '" preserveAspectRatio="xMidYMid slice">' + f[1] + '</svg>'); } return flagCache[code]; };
  const flagImg = (code) => h('img', { src: flagSrc(code), alt: '', width: '24', height: '16', class: 'h-4 w-6 shrink-0 rounded-[3px] object-cover ring-1 ring-black/10' });

  /* ---------- Thème ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', theme === 'light' ? '#ffffff' : '#000000');
  }
  const theme = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  try { applyTheme(localStorage.getItem('ec:theme') === 'light' ? 'light' : 'dark'); } catch (_) { applyTheme('dark'); }

  /* ---------- SEO ---------- */
  function setSEO(o) {
    const title = o.title ? (o.title.includes(S.brand) ? o.title : o.title + ' | ' + S.brand) : S.brand;
    document.title = title;
    const desc = collapse(o.description || (S.seo || {}).defaultDescription || '');
    const set = (name, attr, val) => { let m = $('meta[' + name + ']'); if (!m) { m = h('meta'); const k = name.match(/(name|property)="([^"]+)"/); m.setAttribute(k[1], k[2]); document.head.append(m); } m.setAttribute(attr, val); };
    set('name="description"', 'content', desc);
    set('property="og:title"', 'content', title); set('property="og:description"', 'content', desc);
    set('property="og:type"', 'content', o.type || 'website'); set('property="og:site_name"', 'content', S.brand);
    set('name="twitter:title"', 'content', title); set('name="twitter:description"', 'content', desc);
    set('name="robots"', 'content', o.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    const base = (S.siteUrl || '').replace(/\/$/, '');
    let canon = $('link[rel="canonical"]'); if (!canon) { canon = h('link', { rel: 'canonical' }); document.head.append(canon); }
    canon.setAttribute('href', base ? base + '/' + (o.path || '') : (o.path || ''));
    $$('script[data-ec-ld]').forEach((s) => s.remove());
    (o.jsonld || []).filter(Boolean).forEach((obj) => { const s = h('script', { type: 'application/ld+json', 'data-ec-ld': '1' }); s.textContent = JSON.stringify(obj); document.head.append(s); });
  }
  const orgLd = () => ({ '@context': 'https://schema.org', '@type': 'Organization', name: S.brand, alternateName: S.alternateNames, founder: { '@type': 'Person', name: 'Hassane DONKO' }, sameAs: [C.tiktok, C.github, C.linkedin].filter(Boolean), contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: MAIL, telephone: '+' + WA, availableLanguage: ['French', 'English', 'German', 'Spanish', 'Arabic', 'Chinese', 'Portuguese', 'Russian', 'Turkish'] } });
  const faqLd = () => { const f = sorted(D.faq); return f.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: f.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) } : null; };

  /* ---------- Catalogue (relais serveur d'abord, puis proxys publics) ---------- */
  const CAT_KEY = 'ec:catalogue';
  const FALLBACK = [{ slug: 'sriptnodejs', title: 'DONKO EXCHANGE - Script de Plateforme Crypto-Fiat Automatisée (Node.js)', price: '40 $US', priceValue: 40, cur: 'USD', oldPrice: '600 $US', oldValue: 600, categories: ['scripts'], banner: '' }];
  const PROXIES = [(u) => u, (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u), (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u)];
  async function fetchTimeout(url, ms) { const c = new AbortController(), tm = setTimeout(() => c.abort(), ms); try { const r = await fetch(url, { signal: c.signal, cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); } finally { clearTimeout(tm); } }
  const RESERVED = new Set(['about', 'help', 'contact', 'sitemap', 'legal-notice', 'terms-of-service', 'privacy-policy', 'cart', 'checkout', 'login', 'register', 'account', 'products', 'collections', 'search', 'blog', 'faq', 'order', 'orders', 'store', 'api']);
  const slugOf = (href) => { try { const u = new URL(href, STORE + '/'); if (u.origin !== STORE) return null; const seg = u.pathname.split('/').filter(Boolean); if (seg.length !== 1 || /\./.test(seg[0]) || RESERVED.has(seg[0].toLowerCase())) return null; return seg[0]; } catch (_) { return null; } };
  function parseStore(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html'), out = new Map();
    doc.querySelectorAll('a[href]').forEach((a) => {
      const slug = slugOf(a.getAttribute('href')); if (!slug || out.has(slug)) return;
      let card = a; for (let i = 0; i < 6 && card.parentElement && card.parentElement.tagName !== 'BODY' && ![...card.parentElement.querySelectorAll('a[href]')].some((o) => { const s = slugOf(o.getAttribute('href')); return s && s !== slug; }); i++) card = card.parentElement;
      const text = collapse(card.textContent), title = collapse(a.textContent) || collapse((card.querySelector('img') || {}).alt) || slug.replace(/[-_]+/g, ' ');
      const money = [...text.matchAll(/(\d[\d\s.,]*)\s?(\$\s?US|USD|€|FCFA|XOF|CFA)/gi)].map((m) => ({ raw: collapse(m[0]), v: parseFloat(m[1].replace(/\s/g, '').replace(',', '.')), cur: /\$|USD/i.test(m[2]) ? 'USD' : /€/.test(m[2]) ? 'EUR' : 'XOF' })).filter((m) => Number.isFinite(m.v));
      const img = card.querySelector('img'), banner = img ? safeImg(img.getAttribute('src') || '') : '';
      out.set(slug, { slug, title: title.slice(0, 200), price: money[0] ? money[0].raw : '', priceValue: money[0] ? money[0].v : null, cur: money[0] ? money[0].cur : '', oldPrice: money.length > 1 ? money[money.length - 1].raw : '', oldValue: money.length > 1 ? money[money.length - 1].v : null, banner: /^https:/.test(banner) ? banner : '', categories: [/formation|cours|masterclass/i.test(title) ? 'formations' : /\bia\b|intelligence artificielle|gpt|llm/i.test(title) ? 'ia' : 'scripts'] });
    });
    return [...out.values()];
  }
  function mergeProducts(list) {
    const ov = (D.products || {}).overrides || {};
    const base = list.filter((p) => !(ov[p.slug] && ov[p.slug].hidden)).map((p) => (ov[p.slug] ? Object.assign({}, p, { title: ov[p.slug].title || p.title, categories: ov[p.slug].categories || p.categories, price: ov[p.slug].price || p.price, banner: ov[p.slug].banner || p.banner }) : p));
    return base.concat((D.products || {}).manual || []).filter((p) => p.active !== false);
  }
  let catalog = [], catalogLive = false, catalogTs = 0;
  async function loadCatalog() {
    let cached = null; try { cached = JSON.parse(localStorage.getItem(CAT_KEY) || 'null'); } catch (_) { cached = null; }
    catalog = mergeProducts(cached && cached.items ? cached.items : FALLBACK); catalogTs = cached && cached.ts ? cached.ts : 0;
    let items = [];
    try { const r = JSON.parse(await fetchTimeout(RELAY, 8000)); items = Array.isArray(r.products) ? r.products : []; } catch (_) { items = []; }
    if (!items.length) { for (const p of PROXIES) { try { items = parseStore(await fetchTimeout(p(STORE + '/'), 6000)); if (items.length) break; } catch (_) { /* essai suivant */ } } }
    if (items.length) { catalog = mergeProducts(items); catalogTs = now(); catalogLive = true; try { localStorage.setItem(CAT_KEY, JSON.stringify({ ts: catalogTs, items })); } catch (_) { /* ignoré */ } }
    else catalogLive = false;
    return catalogLive;
  }
  const priceOf = (p) => (p.manual && !p.price ? t('Sur devis') : (p.price || t('Prix sur la boutique')));
  const productUrl = (p) => linkTo('produit.html?s=' + encodeURIComponent(p.slug));
  function productCard(p) {
    const cat = (p.categories || ['scripts'])[0];
    const disc = p.oldValue && p.priceValue && p.oldValue > p.priceValue ? Math.round((1 - p.priceValue / p.oldValue) * 100) : 0;
    const catLabel = cat === 'ia' ? t('Intelligence Artificielle') : cat === 'formations' ? t('Formations') : t('Scripts & Codes');
    return h('article', 'flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel transition hover:border-cyan-400/40', [
      h('a', { href: productUrl(p), class: 'relative block aspect-[16/9] overflow-hidden border-b border-white/10 bg-gradient-to-br from-cyan-500/10 via-black to-blue-600/10', 'aria-label': t('Voir le détail : {title}', { title: p.title }) }, [
        p.banner ? h('img', { src: p.banner, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', class: 'h-full w-full object-cover', onerror: (e) => e.target.remove() }) : h('div', 'grid h-full place-items-center text-cyan-300/50', [ic('fa-solid fa-code text-5xl')]),
        disc ? h('span', 'absolute start-3 top-3 rounded-md bg-cyan-400 px-2 py-1 text-xs font-bold text-black', '-' + disc + '%') : null]),
      h('div', 'flex flex-1 flex-col p-5', [h('span', 'w-fit rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300', catLabel),
        h('h3', 'mt-3 line-clamp-3 font-semibold leading-snug text-white', h('a', { href: productUrl(p), class: 'hover:text-cyan-300' }, p.title)),
        h('div', 'mt-auto flex items-baseline gap-3 pt-5', [h('span', 'text-xl font-extrabold text-cyan-300', priceOf(p)), p.oldPrice ? h('s', 'text-sm text-zinc-500', p.oldPrice) : null]),
        h('a', { href: productUrl(p), class: 'btn-primary mt-4 justify-center' }, [ic('fa-solid fa-cart-shopping'), t('Voir et acheter')])])
    ]);
  }
  function productsGrid(filterKey) {
    const grid = h('div', 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3');
    const bar = h('div', { class: 'mb-8 flex flex-wrap gap-2', role: 'group', 'aria-label': t('Filtrer les produits par catégorie') });
    const draw = (cat) => {
      grid.replaceChildren();
      const list = catalog.filter((p) => cat === 'all' || (p.categories || []).includes(cat));
      if (!list.length) grid.append(h('p', 'col-span-full text-zinc-400', t('Aucun produit dans cette catégorie pour le moment.')));
      list.forEach((p) => grid.append(productCard(p)));
      $$('button', bar).forEach((b) => { const on = b.dataset.cat === cat; b.setAttribute('aria-pressed', String(on)); b.className = 'rounded-full border px-4 py-2 text-sm font-medium transition ' + (on ? 'border-cyan-400 bg-cyan-500 text-black' : 'border-white/15 text-zinc-300 hover:border-cyan-400/50 hover:text-cyan-300'); });
    };
    [['all', t('Tous')], ['ia', t('Intelligence Artificielle')], ['scripts', t('Scripts & Codes')], ['formations', t('Formations')]].forEach(([k, l]) => bar.append(h('button', { type: 'button', 'data-cat': k, onclick: () => draw(k) }, l)));
    draw(filterKey || 'all');
    return h('div', {}, [bar, grid]);
  }
  function syncLabel() {
    const when = catalogTs ? timeAgo(catalogTs) : '';
    if (catalogLive && navigator.onLine !== false) return t('Catalogue synchronisé avec Chariow, {when}', { when });
    if (!catalogLive && navigator.onLine === false) return t('Mode hors connexion : catalogue enregistré, {when}', { when: when || '—' });
    return catalogTs ? t('Boutique injoignable : dernier catalogue enregistré, {when}', { when }) : t('Boutique injoignable : sélection affichée. Réessayez avec le bouton d’actualisation.');
  }
  function timeAgo(ts0) {
    const s = Math.round((now() - ts0) / 1000); let r; try { r = new Intl.RelativeTimeFormat(meta().locale, { numeric: 'auto' }); } catch (_) { return ''; }
    if (s < 45) return r.format(0, 'second'); const m = Math.round(s / 60); if (m < 60) return r.format(-m, 'minute');
    const hh = Math.round(m / 60); return hh < 24 ? r.format(-hh, 'hour') : r.format(-Math.round(hh / 24), 'day');
  }

  /* ---------- Éléments communs : en-tête, langues, bandeau, publicités, pied de page ---------- */
  const NAV = [['index.html', 'Accueil', 'home'], ['services.html', 'Services', 'services'], ['formations.html', 'Formations', 'formations'], ['robots-trading.html', 'Robots de trading', 'robots'], ['realisations.html', 'Réalisations', 'portfolio'], ['couverture.html', 'Couverture', 'coverage'], ['blog.html', 'Blog', 'blog'], ['paiement.html', 'Paiement', 'payments'], ['rendez-vous.html', 'Rendez-vous', 'booking']];
  function langControl() {
    const cur = meta();
    const menu = h('div', { id: 'langMenu', role: 'menu', class: 'absolute end-0 top-full z-[60] mt-2 hidden max-h-[70vh] w-60 overflow-auto rounded-xl border border-white/10 bg-panel p-1 shadow-2xl' }, LANGS.map((l) => h('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(l.code === lang), lang: l.code, class: 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-white/5 ' + (l.code === lang ? 'font-semibold text-cyan-300' : 'text-zinc-200'), onclick: () => setLang(l.code) }, [flagImg(l.code), h('span', 'flex-1 text-start', l.name), l.code === lang ? ic('fa-solid fa-check text-xs') : null])));
    const btn = h('button', { type: 'button', class: 'inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 px-2.5 text-sm font-medium text-zinc-200 hover:border-cyan-400/50', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': t('Langue') + ' : ' + cur.name }, [flagImg(cur.code), h('span', {}, cur.code.toUpperCase()), ic('fa-solid fa-chevron-down text-[10px] opacity-70')]);
    btn.addEventListener('click', (e) => { e.stopPropagation(); const open = menu.classList.toggle('hidden') === false; btn.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('click', (e) => { if (!menu.classList.contains('hidden') && !menu.parentElement.contains(e.target)) { menu.classList.add('hidden'); btn.setAttribute('aria-expanded', 'false'); } });
    return h('div', { class: 'relative' }, [btn, menu]);
  }
  function mobileLangGrid() {
    return h('div', { class: 'grid grid-cols-3 gap-2 px-2 pb-3' }, LANGS.map((l) => h('button', { type: 'button', lang: l.code, 'aria-pressed': String(l.code === lang), class: 'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2 text-xs ' + (l.code === lang ? 'border-cyan-400 text-cyan-300' : 'border-white/10 text-zinc-300'), onclick: () => setLang(l.code) }, [flagImg(l.code), l.name])));
  }
  function header() {
    const links = NAV.map(([href, label, key]) => h('a', { href: linkTo(href), class: 'nav-link' + (PAGE === key ? ' is-active' : ''), 'aria-current': PAGE === key ? 'page' : null }, t(label)));
    const mobile = h('div', { id: 'mobileMenu', class: 'hidden border-t border-white/10 bg-black xl:hidden' }, [h('div', 'flex flex-col px-4 py-2 text-sm', NAV.map(([href, label]) => h('a', { href: linkTo(href), class: 'rounded-md px-2 py-3 text-zinc-200' }, t(label)))), h('div', 'border-t border-white/10 pt-3', [h('p', 'px-4 pb-1 text-xs text-zinc-500', t('Langue')), mobileLangGrid()])]);
    const menuBtn = h('button', { type: 'button', class: 'grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-zinc-200 xl:hidden', 'aria-label': t('Ouvrir le menu'), 'aria-expanded': 'false' }, [ic('fa-solid fa-bars')]);
    menuBtn.addEventListener('click', () => { const open = mobile.classList.toggle('hidden') === false; menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.setAttribute('aria-label', t(open ? 'Fermer le menu' : 'Ouvrir le menu')); });
    const themeBtn = h('button', { type: 'button', class: 'grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-zinc-200 hover:border-cyan-400/50', 'aria-label': t(theme() === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair') }, [ic(theme() === 'light' ? 'fa-solid fa-moon' : 'fa-solid fa-sun')]);
    themeBtn.addEventListener('click', () => { const next = theme() === 'light' ? 'dark' : 'light'; applyTheme(next); try { localStorage.setItem('ec:theme', next); } catch (_) { /* ignoré */ } rebuild(); });
    return h('header', 'sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur', [
      h('nav', 'mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8', [
        h('a', { href: linkTo('index.html'), class: 'flex items-center gap-3' }, [h('img', { src: linkTo('donko.png'), alt: 'Logo ' + S.brand, width: '36', height: '36', class: 'h-9 w-9 rounded-lg object-contain' }), h('span', 'text-sm font-bold tracking-wide text-white sm:text-base', S.brand)]),
        h('div', { class: 'hidden items-center gap-4 xl:flex', 'aria-label': t('Navigation principale') }, links),
        h('div', 'flex items-center gap-2', [langControl(), themeBtn, h('a', { href: STORE, target: '_blank', rel: 'noopener', class: 'btn-primary !px-3 !py-2 text-sm' }, [ic('fa-solid fa-store'), h('span', 'hidden sm:inline', t('Boutique Globale'))]), menuBtn])
      ]), mobile]);
  }
  const WELCOME_LINES = ['fr', 'en', 'de', 'es', 'ar', 'zh', 'pt', 'ru', 'tr'].map((c) => ({ lang: c, text: t('Bienvenue à tous les visiteurs sur {brand}', { brand: S.brand }) }));
  function marquee() {
    if (!FEAT('marquee')) return null;
    const items = WELCOME_LINES.map((w) => ({ text: DICT[w.lang]['Bienvenue à tous les visiteurs sur {brand}'].replace('{brand}', S.brand), lang: w.lang, icon: 'fa-solid fa-door-open' }))
      .concat(sorted(D.marquee).map((m) => ({ text: m.text, link: m.link, icon: 'fa-solid fa-bolt' })))
      .concat([{ text: t('Développeurs, freelances, entrepreneurs, investisseurs :') + ' ' + t('proposez-nous un partenariat'), icon: 'fa-solid fa-handshake', link: linkTo('index.html#partenariat') }]);
    const group = (dup) => h('ul', { class: 'flex shrink-0 items-center gap-12 px-6 py-2.5', 'aria-hidden': dup ? 'true' : null }, items.map((x) => h('li', { class: 'flex items-center gap-2 whitespace-nowrap text-sm text-zinc-200', lang: x.lang || null }, [ic(x.icon + ' text-cyan-400'), x.link ? h('a', { href: safeUrl(x.link), class: 'underline decoration-cyan-400/50 underline-offset-4', tabindex: dup ? '-1' : null }, x.text) : h('span', {}, x.text)])));
    return h('div', { class: 'relative overflow-hidden border-b border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 via-black to-blue-600/10', role: 'region', 'aria-label': t('Message de bienvenue') }, [h('div', 'ec-marquee flex w-max', [group(false), group(true)])]);
  }
  function adCard(ad, dup) {
    const isVideo = ad.type === 'video', link = safeUrl(ad.link), ext = /^https?:/.test(link);
    const media = ad.type === 'image' || ad.poster ? h('img', { src: safeImg(ad.poster || ad.src), alt: ad.title || t('Publicité'), loading: 'lazy', class: 'h-full w-full object-cover' })
      : isVideo ? h('video', { src: safeImg(ad.src), muted: true, loop: true, playsinline: true, autoplay: true, preload: 'none', class: 'h-full w-full object-cover' })
      : h('div', 'grid h-full w-full place-items-center bg-gradient-to-br from-cyan-500/20 to-blue-600/20', [ic('fa-solid fa-bullhorn text-3xl text-cyan-300')]);
    return h(link ? 'a' : 'div', { class: 'ad-card w-72 shrink-0 rounded-2xl border border-white/10 bg-panel p-2', href: link || null, target: ext ? '_blank' : null, rel: ext ? 'noopener sponsored' : null, tabindex: dup ? '-1' : null }, [
      h('div', 'aspect-[16/9] overflow-hidden rounded-xl bg-black', [media]),
      h('div', 'mt-2 flex items-center justify-between gap-2 text-xs', [h('span', 'truncate font-semibold text-white', ad.title || t('Publicité')), h('span', 'shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-cyan-300', t('Publicité'))])]);
  }
  function adsBand() {
    if (!FEAT('ads')) return null;
    const ads = (D.ads || []).filter((a) => live(a) && (a.type !== 'video' || (Number(a.duration) > 0 && Number(a.duration) <= 180)));
    const items = ads.length ? ads : [null];
    const house = (dup) => h('a', { href: linkTo('rendez-vous.html'), class: 'ad-card flex w-72 shrink-0 flex-col justify-center rounded-2xl border border-dashed border-cyan-400/40 bg-panel p-5', tabindex: dup ? '-1' : null }, [ic('fa-solid fa-rectangle-ad text-2xl text-cyan-300'), h('p', 'mt-2 font-semibold text-white', t('Votre publicité ici')), h('p', 'mt-1 text-xs text-zinc-400', t('Contactez-nous pour réserver un emplacement.'))]);
    const group = (dup) => h('div', { class: 'flex shrink-0 gap-4 pe-4', 'aria-hidden': dup ? 'true' : null }, items.map((a) => (a ? adCard(a, dup) : house(dup))));
    return h('section', 'border-b border-white/10 bg-black', [h('div', 'mx-auto flex max-w-7xl items-center justify-between px-4 pt-3 sm:px-6 lg:px-8', [h('span', 'rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-xs text-cyan-300', t('Publicités')), h('a', { href: linkTo('rendez-vous.html'), class: 'text-xs text-zinc-400 hover:text-cyan-300' }, t('Annoncer ici'))]), h('div', 'overflow-hidden px-4 py-3', [h('div', 'ec-ads flex w-max', [group(false), group(true)])])]);
  }
  function footer() {
    const cols = [[t('Navigation'), NAV.map(([href, label]) => [t(label), href])], [t('Informations légales'), [[t('Mentions légales'), 'mentions-legales.html'], [t('Conditions d\'utilisation'), 'conditions.html'], [t('Politique de confidentialité'), 'confidentialite.html'], [t('Rendez-vous'), 'rendez-vous.html']]]];
    const contact = [['WhatsApp', '+' + WA, 'https://wa.me/' + WA, 'fa-brands fa-whatsapp'], [t('Email'), MAIL, 'mailto:' + MAIL, 'fa-solid fa-envelope'], C.tiktok && ['TikTok', '@donkodeutsch', C.tiktok, 'fa-brands fa-tiktok'], C.github && ['GitHub', 'Donko-dev', C.github, 'fa-brands fa-github'], C.linkedin && ['LinkedIn', 'Profil', C.linkedin, 'fa-brands fa-linkedin'], [t('Boutique'), 'EMPIRE CODE STORE', STORE, 'fa-solid fa-store']].filter(Boolean);
    return h('footer', 'border-t border-white/10 bg-black', [
      h('div', 'mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-8', [
        h('div', 'lg:col-span-4', [h('div', 'flex items-center gap-4', [h('img', { src: linkTo('donko.png'), alt: 'Logo ' + S.brand, width: '72', height: '72', class: 'h-18 w-18 rounded-2xl object-contain ring-1 ring-cyan-400/30' }), h('div', {}, [h('p', 'text-lg font-bold text-white', 'Hassane DONKO'), h('p', 'text-sm text-cyan-400', t('Créateur d\'EMPIRE CODE HUB'))])]), h('p', 'mt-4 text-sm leading-relaxed text-zinc-400', t('Scripts Node.js/PHP, utilitaires HTML autonomes, formations en intelligence artificielle et cours d\'informatique, conçus pour les développeurs et les entrepreneurs.'))]),
        h('div', 'grid grid-cols-2 gap-8 lg:col-span-4', cols.map(([title, items]) => h('div', {}, [h('h3', 'text-sm font-semibold text-white', title), h('ul', 'mt-4 space-y-2.5 text-sm text-zinc-400', items.map(([l, u]) => h('li', {}, h('a', { href: linkTo(u), class: 'hover:text-cyan-300' }, l))))]))),
        h('div', 'lg:col-span-4', [h('h3', 'text-sm font-semibold text-white', t('Contact direct')), h('ul', 'mt-4 grid gap-2.5', contact.map(([label, value, url, icon]) => h('li', {}, h('a', { href: url, target: /^https?:/.test(url) ? '_blank' : null, rel: 'noopener', class: 'flex items-center gap-3 rounded-xl border border-white/10 bg-panel px-3 py-2.5 transition hover:border-cyan-400/50' }, [h('span', 'grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-cyan-300', [ic(icon)]), h('span', 'min-w-0', [h('span', 'block text-xs text-zinc-500', label), h('span', 'block truncate text-sm font-semibold text-white', value)])]))))])
      ]),
      h('div', 'border-t border-white/10 py-6 text-center text-xs text-zinc-500', '© ' + new Date().getFullYear() + ' ' + S.brand + ' — ' + t('EMPIRE CODE HUB. Édité par TransTech Dynamic. Tous droits réservés.').replace(/^EMPIRE CODE HUB\.\s*/, '') + ' ' + t('Paiements et livraisons gérés par Chariow. Les informations présentes sur ce site sont fournies à titre informatif et ne constituent pas un conseil professionnel ou financier.'))
    ]);
  }

  /* ---------- Blocs partagés ---------- */
  const section = (cls, kids) => h('section', 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ' + (cls || 'py-14 lg:py-20'), kids);
  const heading = (title, sub) => h('div', 'mb-8 max-w-3xl', [h('h2', 'text-2xl font-bold tracking-tight text-white sm:text-3xl', title), sub ? h('p', 'mt-2 text-zinc-400', sub) : null]);
  function pageHeader(title, lead, crumbs) {
    return h('header', 'relative overflow-hidden border-b border-white/10 bg-grid', [h('div', 'mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8', [
      h('nav', { class: 'mb-4 text-sm text-zinc-500', 'aria-label': t('Fil d’Ariane') }, [h('a', { href: linkTo('index.html'), class: 'hover:text-cyan-300' }, t('Accueil')), ...(crumbs || []).map((c) => [' / ', c]).flat()]),
      h('h1', 'text-3xl font-extrabold tracking-tight text-white sm:text-5xl', title), lead ? h('p', 'mt-4 max-w-3xl text-base text-zinc-400 sm:text-lg', lead) : null])]);
  }
  const ctaBand = () => section('pb-20', [h('div', 'flex flex-col items-start justify-between gap-6 rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-8 sm:p-10 lg:flex-row lg:items-center', [h('div', {}, [h('h2', 'text-2xl font-bold text-white sm:text-3xl', t('Un projet en tête ?')), h('p', 'mt-2 max-w-xl text-zinc-400', t('Devis gratuit, réponse rapide, accompagnement de A à Z.'))]), h('div', 'flex flex-wrap gap-3', [h('a', { href: linkTo('rendez-vous.html'), class: 'btn-primary' }, [ic('fa-regular fa-calendar-check'), t('Prendre rendez-vous')]), h('a', { href: 'https://wa.me/' + WA, target: '_blank', rel: 'noopener', class: 'btn-wa' }, [ic('fa-brands fa-whatsapp'), 'WhatsApp'])])])]);
  function faqBlock(limit) {
    const items = sorted(D.faq).slice(0, limit || 99); if (!items.length) return null;
    return section('py-14', [heading(t('Questions fréquentes')), h('div', 'divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-panel', items.map((f) => h('details', 'group p-5', [h('summary', 'flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white', [h('span', {}, f.q), ic('fa-solid fa-chevron-down text-xs text-zinc-400 transition group-open:rotate-180')]), h('p', 'mt-3 leading-relaxed text-zinc-400', f.a)])))]);
  }
  function serviceCard(s) {
    return h('article', 'flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel transition hover:border-cyan-400/40', [
      h('img', { src: safeImg(s.image), alt: svcText(s, 'title'), width: '800', height: '500', loading: 'lazy', class: 'aspect-[16/10] w-full border-b border-white/10 object-cover' }),
      h('div', 'flex flex-1 flex-col p-5', [h('h3', 'text-lg font-semibold text-white', svcText(s, 'title')), h('p', 'mt-2 flex-1 text-sm leading-relaxed text-zinc-400', svcText(s, 'description')),
        h('div', 'mt-4 flex flex-wrap gap-1.5', (s.tags || []).map((x) => h('span', 'rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-zinc-300', x))),
        h('a', { href: linkTo('rendez-vous.html?sujet=' + encodeURIComponent(s.slug)), class: 'btn-ghost mt-5 justify-center text-sm' }, [ic('fa-solid fa-file-signature'), t('Demander un devis')])])]);
  }
  const countCovered = () => (D.coverage.items || []).filter((c) => c.status !== 'excluded').length;
  function latestPosts(n) {
    const posts = (D.blog || []).filter((p) => p.active !== false && ts(p.publishAt) <= now()).sort((a, b) => ts(b.publishAt) - ts(a.publishAt)).slice(0, n);
    if (!posts.length) return null;
    return section('py-14', [heading(t('Blog tech & innovation'), t('Informatique, Web3, fintech : un nouvel article est publié automatiquement tous les 30 jours.')), h('div', 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3', posts.map(postCard)), h('div', 'mt-8 text-center', h('a', { href: linkTo('blog.html'), class: 'btn-ghost' }, t('Tous les articles')))]);
  }
  function postCard(p) {
    const url = linkTo('article.html?s=' + encodeURIComponent(p.slug));
    return h('article', 'flex flex-col rounded-2xl border border-white/10 bg-panel p-6 transition hover:border-cyan-400/40', [
      h('div', 'flex flex-wrap items-center gap-3 text-xs text-zinc-400', [h('span', 'rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-cyan-300', p.category || 'Tech'), h('time', { datetime: String(p.publishAt).slice(0, 10) }, fmtDate(p.publishAt)), h('span', {}, t('Lecture : {min} min', { min: p.readMin || 4 }))]),
      h('h3', 'mt-4 text-lg font-semibold leading-snug text-white', h('a', { href: url, class: 'hover:text-cyan-300' }, p.title)),
      h('p', 'mt-2 flex-1 text-sm leading-relaxed text-zinc-400', p.excerpt),
      h('a', { href: url, class: 'mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:underline' }, [t('Lire l’article'), ic('fa-solid fa-arrow-right rtl:rotate-180')])]);
  }

  /* ---------- Carte du monde (points de terre, pays prioritaires animés) ---------- */
  const px = (lon) => ((lon + 180) / 360) * 1000, py = (lat) => ((84 - lat) / 142) * 394;
  const REGION_VB = { all: [0, 0, 1000, 394], africa: [px(-20), py(38), px(55) - px(-20), py(-37) - py(38)], europe: [px(-12), py(72), px(45) - px(-12), py(34) - py(72)], americas: [px(-170), py(75), px(-35) - px(-170), py(-56) - py(75)], asia: [px(25), py(60), px(150) - px(25), py(-11) - py(60)], oceania: [px(110), py(0), px(180) - px(110), py(-48) - py(0)] };
  const CONT_OF = (region) => (/Afrique/.test(region) ? 'africa' : region === 'Europe' ? 'europe' : /Amérique/.test(region) ? 'americas' : region === 'Asie' ? 'asia' : region === 'Océanie' ? 'oceania' : 'all');
  function worldMap(items, focus) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs, kids) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v); (kids || []).forEach((c) => n.append(c)); return n; };
    const vb = REGION_VB[focus || 'all'];
    const dots = GEO.land.map(([la, [a, b]]) => { const out = []; for (let lo = a; lo <= b; lo += 5) out.push(el('circle', { cx: px(lo).toFixed(1), cy: py(la).toFixed(1), r: '2.6', class: 'map-land' })); return out; }).flat();
    const pins = items.filter((c) => GEO.pins[c.country] && c.status !== 'excluded').map((c) => {
      const [la, lo] = GEO.pins[c.country], col = c.status === 'priority' ? '#22d3ee' : '#3b82f6';
      const g = el('g', { class: 'map-pin', 'data-country': c.country });
      g.append(el('circle', { cx: px(lo).toFixed(1), cy: py(la).toFixed(1), r: '6', fill: col, class: 'map-pulse' }), el('circle', { cx: px(lo).toFixed(1), cy: py(la).toFixed(1), r: '3', fill: col }));
      const tt = el('title'); tt.textContent = c.country; g.append(tt); return g;
    });
    const svg = el('svg', { viewBox: vb.map((v) => v.toFixed(1)).join(' '), class: 'w-full h-auto', role: 'img', 'aria-label': t('Carte des pays couverts'), preserveAspectRatio: 'xMidYMid meet' }, [...dots, ...pins]);
    return svg;
  }

  /* ---------- Formulaire de partenariat (accueil) ---------- */
  function partnershipBlock() {
    const fields = {};
    const field = (id, label, node) => h('div', {}, [h('label', { for: id, class: 'mb-1.5 block text-sm font-medium text-zinc-300' }, label), node]);
    const sel = (id, opts) => { fields[id] = h('select', { id, class: 'field', required: true }, [h('option', { value: '', disabled: true, selected: true }, t('Choisir un profil'))].concat(opts.map((o) => h('option', { value: o }, t(o))))); return fields[id]; };
    const inp = (id, ph, req, type) => { fields[id] = h('input', { id, class: 'field', placeholder: ph, required: req !== false, type: type || 'text', maxlength: 120 }); return fields[id]; };
    const profiles = ['Développeur informatique', 'Freelance', 'Entrepreneur', 'Investisseur', 'Entreprise ou agence', 'Formateur ou créateur de contenu', 'Autre'];
    const kinds = ['Collaboration technique', 'Co-développement d\'un produit', 'Investissement', 'Distribution ou revente', 'Formation ou contenu', 'Autre'];
    const profileSel = sel('pf-profile', profiles);
    const kindSel = h('select', { id: 'pf-kind', class: 'field', required: true }, [h('option', { value: '', disabled: true, selected: true }, t('Choisir un type'))].concat(kinds.map((o) => h('option', { value: o }, t(o)))));
    fields['pf-kind'] = kindSel;
    const name = inp('pf-name', t('Prénom et nom'));
    const contact = inp('pf-contact', t('nom@exemple.com ou +229 …'));
    const org = h('input', { id: 'pf-org', class: 'field', placeholder: t('Nom de votre structure'), maxlength: 120 });
    const msg = h('textarea', { id: 'pf-msg', class: 'field', rows: 5, required: true, minlength: 20, maxlength: 1200, placeholder: t('Présentez votre projet, votre objectif et ce que vous attendez de ce partenariat.') });
    const status = h('p', { class: 'text-sm text-cyan-300', role: 'status', 'aria-live': 'polite' });
    const compose = () => ['Demande de partenariat — ' + S.brand, '', 'Profil : ' + profileSel.value, 'Type de partenariat : ' + kindSel.value, 'Nom : ' + collapse(name.value), 'Contact : ' + collapse(contact.value), org.value.trim() ? 'Organisation : ' + collapse(org.value) : null, '', 'Message :', msg.value.trim(), '', 'Langue : ' + meta().name, 'Envoyé depuis ' + (S.siteUrl || location.origin)].filter((x) => x !== null).join('\n');
    const valid = (f) => { const ok = f.reportValidity(); if (!ok) status.textContent = t('Tous les champs sont obligatoires, sauf l\'organisation.'); return ok; };
    const form = h('form', 'rounded-2xl border border-white/10 bg-panel p-6 sm:p-8', [
      h('h3', 'text-lg font-semibold text-white', t('Votre proposition')), h('p', 'mb-6 mt-1 text-sm text-zinc-500', t('Tous les champs sont obligatoires, sauf l\'organisation.')),
      h('div', 'grid gap-5 sm:grid-cols-2', [field('pf-profile', t('Votre profil'), profileSel), field('pf-kind', t('Type de partenariat'), kindSel), field('pf-name', t('Nom complet'), name), field('pf-contact', t('Email ou numéro WhatsApp'), contact), h('div', 'sm:col-span-2', field('pf-org', t('Entreprise ou organisation (facultatif)'), org)), h('div', 'sm:col-span-2', field('pf-msg', t('Votre message'), msg))]),
      h('div', 'mt-6 flex flex-col gap-3 sm:flex-row', [
        h('button', { type: 'button', class: 'btn-wa flex-1 justify-center', onclick: () => { if (valid(form)) { sendWA(compose()); status.textContent = t('WhatsApp s’ouvre avec le message prêt : il ne reste qu’à l’envoyer.'); } } }, [ic('fa-brands fa-whatsapp text-lg'), t('Envoyer par WhatsApp')]),
        h('button', { type: 'button', class: 'btn-ghost flex-1 justify-center', onclick: () => { if (valid(form)) { sendMail('Demande de partenariat — ' + profileSel.value, compose()); status.textContent = t('Votre application email s’ouvre avec le message prêt : il ne reste qu’à l’envoyer.'); } } }, [ic('fa-solid fa-envelope'), t('Envoyer par email')])]),
      h('div', 'mt-4 flex flex-wrap items-center justify-between gap-3 text-sm', [h('button', { type: 'button', class: 'inline-flex items-center gap-2 text-zinc-400 hover:text-cyan-300', onclick: async () => { if (!valid(form)) return; status.textContent = (await copyText(compose())) ? t('Message copié. Collez-le dans l’application de votre choix.') : t('Copie impossible sur ce navigateur : utilisez WhatsApp ou l’email.'); } }, [ic('fa-regular fa-copy'), t('Copier le message')]), status]),
      h('p', 'mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-zinc-500', t('Aucune donnée n\'est enregistrée sur ce site. Votre message s\'ouvre dans votre application WhatsApp ou email et n\'est envoyé que lorsque vous appuyez sur « envoyer » dans cette application.'))
    ]);
    form.addEventListener('submit', (e) => e.preventDefault());
    return form;
  }

  /* ---------- Pages ---------- */
  const ptsOK = () => true;
  function renderHome(main) {
    const hero = h('section', 'relative overflow-hidden border-b border-white/10 bg-grid', [h('div', 'mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-24', [
      h('div', 'lg:col-span-7', [h('h1', 'text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl', [t('Des codes Node.js premium, sécurisés.'), h('span', 'mt-2 block text-cyan-400', t('Des outils autonomes, légers, hors ligne.'))]),
        h('p', 'mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg', t('Codes sources audités, utilitaires HTML qui tournent sans connexion, formations en intelligence artificielle et cours d\'informatique. Chaque solution est livrée avec sa documentation.')),
        h('div', 'mt-8 flex flex-wrap gap-3', [h('a', { href: '#produits', class: 'btn-primary' }, [ic('fa-solid fa-terminal'), t('Explorer le catalogue')]), h('a', { href: 'https://wa.me/' + WA, target: '_blank', rel: 'noopener', class: 'btn-ghost' }, [ic('fa-brands fa-whatsapp'), t('Poser une question')])])]),
      h('div', 'lg:col-span-5', [h('div', 'overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#050507] shadow-2xl', [h('div', 'flex items-center gap-2 border-b border-white/10 px-4 py-3', [h('span', 'h-3 w-3 rounded-full bg-zinc-700'), h('span', 'h-3 w-3 rounded-full bg-zinc-700'), h('span', 'h-3 w-3 rounded-full bg-cyan-500'), h('span', 'ms-3 text-xs text-zinc-500', 'empire-code-hub — bash')]), h('pre', { id: 'terminal', class: 'h-52 overflow-hidden whitespace-pre-wrap p-5 font-mono text-sm leading-7 text-zinc-300', 'aria-hidden': 'true' })])])
    ])]);
    const prod = h('section', { id: 'produits', class: 'mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8' }, [h('div', 'mb-8 flex flex-wrap items-end justify-between gap-4', [h('div', 'max-w-2xl', [h('h2', 'text-2xl font-bold tracking-tight text-white sm:text-3xl', t('Catalogue')), h('p', 'mt-2 text-zinc-400', t('Les produits sont lus directement depuis la boutique EMPIRE CODE. Un nouveau produit publié sur Chariow apparaît ici sans aucune mise à jour manuelle.'))]), h('span', { id: 'syncStatus', class: 'text-sm text-zinc-500', role: 'status' }, t('Synchronisation avec la boutique…'))]), h('div', { id: 'productsMount' })]);
    const robots = FEAT('robots') && sorted(D.robots).length ? section('py-14', [h('div', 'rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-8 sm:p-10', [ic('fa-solid fa-robot text-3xl text-cyan-300'), h('h2', 'mt-3 text-2xl font-bold text-white sm:text-3xl', t('Robots de trading sur mesure')), h('p', 'mt-2 max-w-2xl text-zinc-400', t('Robots de trading sur mesure')), h('a', { href: linkTo('robots-trading.html'), class: 'btn-primary mt-6' }, t('Découvrir les robots'))])]) : null;
    const cov = FEAT('coverage') ? section('py-14', [h('div', 'grid items-center gap-8 rounded-3xl border border-white/10 bg-panel p-8 sm:p-10 lg:grid-cols-2', [h('div', {}, [ic('fa-solid fa-earth-africa text-3xl text-cyan-300'), h('h2', 'mt-3 text-2xl font-bold text-white sm:text-3xl', t('Couverture mondiale')), h('p', 'mt-2 text-zinc-400', t('Clients sur les six continents, avec une priorité pour l’Afrique de l’Ouest, l’Europe, l’Amérique du Nord et l’Asie-Pacifique.')), h('a', { href: linkTo('couverture.html'), class: 'btn-primary mt-6' }, t('Voir la couverture'))]), h('div', 'grid grid-cols-3 gap-3 text-center', [[countCovered(), t('pays desservis')], [6, t('continents')], ['24/7', t('Support 24/7')]].map(([n, l]) => h('div', 'rounded-2xl border border-white/10 bg-black/30 p-4', [h('p', 'text-3xl font-extrabold text-cyan-300', String(n)), h('p', 'mt-1 text-xs text-zinc-400', l)])))])]) : null;
    const services = section('py-14', [heading(t('Nos services'), t('Du site web à la blockchain : chaque projet est conçu, testé et livré avec sa documentation.')), h('div', 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3', sorted(D.services).slice(0, 6).map(serviceCard)), h('div', 'mt-8 text-center', h('a', { href: linkTo('services.html'), class: 'btn-ghost' }, t('Voir tous les services')))]);
    const partner = h('section', { id: 'partenariat', class: 'mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8' }, [h('div', 'grid gap-12 lg:grid-cols-12', [
      h('div', 'lg:col-span-5', [h('h2', 'text-3xl font-bold tracking-tight text-white sm:text-4xl', t('Demande de partenariat')), h('p', 'mt-3 max-w-md text-zinc-400', t('Vous développez, travaillez en freelance, entreprenez ou investissez ? Présentez-nous votre projet en quelques lignes, puis choisissez comment nous l\'envoyer.')),
        h('ul', 'mt-8 space-y-5', [['fa-laptop-code', 'Développeurs informatiques', 'Collaborer sur des scripts, des outils et des formations.'], ['fa-briefcase', 'Freelances', 'Unir vos compétences aux nôtres sur des projets concrets.'], ['fa-lightbulb', 'Entrepreneurs', 'Transformer une idée en solution numérique concrète.'], ['fa-chart-line', 'Investisseurs', 'Participer à la croissance d\'EMPIRE CODE HUB.'], ['fa-building', 'Entreprises et agences', 'Intégrer nos solutions à vos propres projets.']].map(([ico, title, txt]) => h('li', 'flex gap-4', [h('span', 'grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300', [ic('fa-solid ' + ico)]), h('div', {}, [h('h3', 'font-semibold text-white', t(title)), h('p', 'mt-1 text-sm leading-relaxed text-zinc-400', t(txt))])])))]),
      h('div', 'lg:col-span-7', [partnershipBlock()])])]);
    main.replaceChildren(hero, services, prod, robots, cov, latestPosts(3), partner, faqBlock(5), ctaBand());
    startTerminal();
    productsMountRender();
    setSEO({ title: S.brand + ' — Scripts Node.js premium, outils HTML hors ligne & formations IA', description: (S.seo || {}).defaultDescription, path: 'index.html', jsonld: [orgLd(), faqLd()] });
  }
  function productsMountRender() {
    const m = $('#productsMount'); if (!m) return;
    m.replaceChildren(productsGrid('all'));
    const st = $('#syncStatus'); if (st) st.textContent = syncLabel();
  }
  function renderServices(main) {
    main.replaceChildren(pageHeader(t('Nos services'), t('Du site web à la blockchain : chaque projet est conçu, testé et livré avec sa documentation.'), [t('Services')]), section('py-12', [h('div', 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3', sorted(D.services).map(serviceCard))]), faqBlock(8), ctaBand());
    setSEO({ title: t('Services'), description: t('Du site web à la blockchain : chaque projet est conçu, testé et livré avec sa documentation.'), path: 'services.html', jsonld: [orgLd()] });
  }
  function renderFormations(main) {
    const list = catalog.filter((p) => (p.categories || []).includes('formations')).concat(sorted(D.trainings).map((x) => ({ slug: x.slug, title: x.title, description: x.description, price: x.price, banner: safeImg(x.image), serviceSlug: x.serviceSlug, manual: true })));
    const svcTitle = (slug) => { const s = D.services.find((v) => v.slug === slug); return s ? svcText(s, 'title') : t('Autres formations'); };
    const groups = {}; list.forEach((x) => { const k = x.serviceSlug || 'autres'; (groups[k] = groups[k] || []).push(x); });
    main.replaceChildren(pageHeader(t('Formations'), t('Une formation pour chaque service. Les formations publiées dans la boutique apparaissent ici, avec leur tarif.'), [t('Formations')]),
      section('py-12', list.length ? Object.keys(groups).map((k) => h('div', 'mb-12', [h('h2', 'mb-5 text-xl font-bold text-white', svcTitle(k)), h('div', 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3', groups[k].map(productCard))])) : [h('div', 'rounded-2xl border border-dashed border-white/15 p-10 text-center', [ic('fa-solid fa-graduation-cap text-4xl text-cyan-300'), h('h2', 'mt-4 text-xl font-semibold text-white', t('Les formations arrivent bientôt')), h('p', 'mt-2 text-zinc-400', t('Chaque nouvelle formation publiée dans la boutique apparaît ici automatiquement.'))])]),
      ctaBand());
    setSEO({ title: t('Formations'), description: t('Une formation pour chaque service. Les formations publiées dans la boutique apparaissent ici, avec leur tarif.'), path: 'formations.html' });
  }
  function renderRobots(main) {
    const list = sorted(D.robots);
    const riskKey = { Faible: 'Faible', Moyen: 'Moyen', 'Élevé': 'Élevé' };
    main.replaceChildren(pageHeader(t('Robots de trading'), t('Bots de trading et d’arbitrage sur mesure : stratégie, gestion du risque, backtests et alertes. Code source livré et documenté.'), [t('Robots de trading')]),
      section('pt-10', [h('div', 'flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100', [ic('fa-solid fa-triangle-exclamation mt-0.5 text-amber-300'), h('p', {}, t('Avertissement : le trading comporte un risque de perte en capital. Aucun robot ne garantit de gains. Nos solutions automatisent une stratégie que vous définissez ; elles ne constituent pas un conseil en investissement.'))])]),
      section('py-10', [list.length ? h('div', 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3', list.map((r) => h('article', 'flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel', [r.image ? h('img', { src: safeImg(r.image), alt: r.title, loading: 'lazy', class: 'aspect-[16/10] w-full object-cover' }) : null, h('div', 'flex flex-1 flex-col p-5', [h('h3', 'text-lg font-semibold text-white', r.title), h('p', 'mt-2 text-sm text-zinc-400', r.summary), h('span', 'mt-3 w-fit rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-zinc-300', t('Risque') + ' : ' + t(riskKey[r.risk] || 'Moyen')), h('div', 'mt-auto flex items-center justify-between pt-5', [h('span', 'font-bold text-cyan-300', r.price || t('Sur devis')), r.url ? h('a', { href: safeUrl(r.url), class: 'btn-primary !px-4 !py-2 text-sm' }, t('Acheter maintenant')) : h('a', { href: linkTo('rendez-vous.html?sujet=robot'), class: 'btn-primary !px-4 !py-2 text-sm' }, t('Demander un devis'))])])]))) : h('p', 'text-zinc-400', t('Les modèles de robots seront publiés ici prochainement.'))]),
      ctaBand());
    setSEO({ title: t('Robots de trading sur mesure'), description: t('Bots de trading et d’arbitrage sur mesure : stratégie, gestion du risque, backtests et alertes. Code source livré et documenté.'), path: 'robots-trading.html' });
  }
  function renderPayments(main) {
    const methods = sorted(D.payments);
    const groups = {}; methods.forEach((m) => { const k = m.type || 'Autre'; (groups[k] = groups[k] || []).push(m); });
    const copyBtn = (value) => { const b = h('button', { type: 'button', class: 'shrink-0 rounded-md border border-white/15 px-2.5 py-1 text-xs text-zinc-300 hover:border-cyan-400/50 hover:text-cyan-300' }, t('Copier')); b.addEventListener('click', async () => { const ok = await copyText(value); b.textContent = ok ? t('Copié') : t('Copier'); setTimeout(() => { b.textContent = t('Copier'); }, 1500); }); return b; };
    const card = (m) => h('article', 'rounded-2xl border border-white/10 bg-panel p-6', [
      h('h3', 'font-semibold text-white', m.name),
      h('p', 'mt-1 text-xs text-zinc-500', [m.country, m.holder ? t('Titulaire') + ' : ' + m.holder : null].filter(Boolean).join(' · ')),
      h('div', 'mt-4 space-y-3', (m.rows || []).map(([label, value]) => h('div', 'flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2', [h('div', 'min-w-0', [h('p', 'text-xs text-zinc-500', label), h('code', { class: 'block break-all font-mono text-sm text-white', dir: 'ltr' }, value)]), copyBtn(value)]))),
      m.instructions ? h('p', 'mt-4 rounded-lg bg-amber-400/10 p-3 text-xs text-amber-200', m.instructions) : null
    ]);
    const TYPE_ORDER = ['Virement bancaire', 'Crypto-monnaie', 'Mobile Money'];
    const keys = Object.keys(groups).sort((a, b) => (TYPE_ORDER.indexOf(a) < 0 ? 99 : TYPE_ORDER.indexOf(a)) - (TYPE_ORDER.indexOf(b) < 0 ? 99 : TYPE_ORDER.indexOf(b)));
    main.replaceChildren(
      pageHeader(t('Coordonnées de paiement'), t('Voici l’ensemble de mes coordonnées de paiement, disponibles pour toute prestation de développement, de documentation ou de conseil en intelligence artificielle. Vous pouvez choisir librement le moyen qui vous convient le mieux.'), [t('Paiement')]),
      section('pt-10', [h('div', 'flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100', [ic('fa-solid fa-shield-halved mt-0.5 text-amber-300'), h('p', {}, t('Ne payez que vers les coordonnées affichées sur cette page. En cas de doute, contactez-nous avant de payer. Nous ne demandons jamais votre phrase secrète ni vos clés privées.'))]),
        h('div', 'mt-6 grid gap-3 sm:grid-cols-3', [h('div', 'rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-5 sm:col-span-3', [h('p', 'flex items-center gap-2 font-semibold text-white', [ic('fa-solid fa-lock text-cyan-300'), t('Paiement sécurisé via Chariow')]), h('p', 'mt-2 text-sm text-zinc-300', t('Les paiements par carte et Mobile Money sont traités par Chariow. Votre achat est livré automatiquement après paiement.')), h('a', { href: STORE, target: '_blank', rel: 'noopener', class: 'btn-primary mt-4 inline-flex' }, [ic('fa-solid fa-cart-shopping'), t('Aller à la boutique')])])])]),
      ...keys.map((k) => section('py-8', [h('h2', 'mb-5 text-xl font-bold text-white', t(k)), h('div', 'grid gap-5 md:grid-cols-2 xl:grid-cols-3', groups[k].map(card))])),
      methods.length ? null : section('py-8', [h('p', 'text-zinc-400', t('Aucun autre moyen de paiement n’est affiché pour le moment. Utilisez la boutique sécurisée ou contactez-nous.'))]),
      section('py-10', [h('div', 'text-center', [h('p', 'font-semibold text-white', t('Une question avant de payer ?')), h('div', 'mt-5 flex flex-wrap justify-center gap-3', [h('a', { href: 'https://wa.me/' + WA, target: '_blank', rel: 'noopener', class: 'btn-wa' }, [ic('fa-brands fa-whatsapp'), 'WhatsApp']), h('a', { href: 'mailto:' + MAIL, class: 'btn-ghost' }, [ic('fa-solid fa-envelope'), t('Email')])])])]),
      ctaBand()
    );
    setSEO({ title: t('Coordonnées de paiement'), description: t('Payez en toute sécurité : par la boutique Chariow, ou avec les moyens officiels listés ci-dessous.'), path: 'paiement.html' });
  }
  function renderPortfolio(main) {
    const all = sorted(D.portfolio); let tab = 'done';
    const labels = { done: t('Réalisés'), progress: t('En cours'), planned: t('À venir') };
    const grid = h('div', 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3'), bar = h('div', 'mb-8 flex flex-wrap gap-2');
    const draw = () => {
      grid.replaceChildren();
      const list = all.filter((p) => p.status === tab);
      if (!list.length) grid.append(h('p', 'col-span-full text-zinc-400', t('Rien à afficher dans cette catégorie pour le moment.')));
      list.forEach((p) => grid.append(h('article', 'rounded-2xl border border-white/10 bg-panel p-6', [h('span', 'text-xs text-cyan-300', labels[p.status] + (p.year ? ' · ' + p.year : '')), h('h3', 'mt-2 text-lg font-semibold text-white', p.title), h('p', 'mt-2 text-sm text-zinc-400', p.description), p.link ? h('a', { href: safeUrl(p.link), target: /^https?:/.test(p.link) ? '_blank' : null, rel: 'noopener', class: 'mt-4 inline-flex text-sm text-cyan-300 hover:underline' }, t('Voir le projet')) : null])));
      $$('button', bar).forEach((b) => { const on = b.dataset.t === tab; b.setAttribute('aria-pressed', String(on)); b.className = 'rounded-full border px-4 py-2 text-sm ' + (on ? 'border-cyan-400 bg-cyan-500 text-black' : 'border-white/15 text-zinc-300'); });
    };
    Object.keys(labels).forEach((k) => bar.append(h('button', { type: 'button', 'data-t': k, onclick: () => { tab = k; draw(); } }, labels[k])));
    main.replaceChildren(pageHeader(t('Réalisations et projets'), t('Ce que nous avons livré, ce que nous construisons et ce qui arrive.'), [t('Réalisations')]), section('py-12', [bar, grid]), ctaBand());
    draw();
    setSEO({ title: t('Réalisations et projets'), description: t('Ce que nous avons livré, ce que nous construisons et ce qui arrive.'), path: 'realisations.html' });
  }
  function renderCoverage(main) {
    const items = (D.coverage && D.coverage.items) || [];
    const regions = [...new Set(items.map((i) => i.region))];
    const CONT = { all: t('Couverture mondiale'), africa: t('Afrique de l’Ouest'), europe: t('Europe'), americas: t('Amérique du Nord'), asia: t('Asie'), oceania: t('Océanie') };
    const stat = (n, l) => h('div', 'rounded-2xl border border-white/10 bg-panel p-5', [h('p', 'text-3xl font-extrabold text-cyan-300', String(n)), h('p', 'mt-1 text-sm text-zinc-400', l)]);
    const mapBox = h('div', 'overflow-hidden rounded-2xl border border-white/10 bg-black p-4');
    const tabs = h('div', 'mb-5 flex flex-wrap gap-2', [['all', t('Couverture mondiale')], ['africa', t('Afrique de l’Ouest')], ['europe', t('Europe')], ['americas', t('Amérique du Nord')], ['asia', t('Asie')], ['oceania', t('Océanie')]].map(([k, l]) => h('button', { type: 'button', 'data-k': k, class: 'rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:border-cyan-400/50', onclick: () => { mapBox.replaceChildren(worldMap(items, k)); $$('button', tabs).forEach((b) => b.className = 'rounded-full border px-4 py-2 text-sm ' + (b.dataset.k === k ? 'border-cyan-400 bg-cyan-500 text-black' : 'border-white/15 text-zinc-300 hover:border-cyan-400/50')); } }, l)));
    mapBox.append(worldMap(items, 'all'));
    const LBL = { priority: t('Prioritaire'), covered: t('Desservi'), excluded: t('Non desservi') };
    const CLS = { priority: 'border-cyan-400/50 text-cyan-300', covered: 'border-blue-400/40 text-blue-300', excluded: 'border-zinc-700 text-zinc-500 line-through' };
    const legend = h('div', 'mb-6 flex flex-wrap gap-4 text-sm text-zinc-300', [['bg-cyan-400', 'priority'], ['bg-blue-500', 'covered'], ['bg-zinc-600', 'excluded']].map(([c, k]) => h('span', 'flex items-center gap-2', [h('span', 'h-3 w-3 rounded-full ' + c), LBL[k]])));
    main.replaceChildren(pageHeader(t('Couverture mondiale'), t('Clients sur les six continents, avec une priorité pour l’Afrique de l’Ouest, l’Europe, l’Amérique du Nord et l’Asie-Pacifique.'), [t('Couverture')]),
      section('pt-10', [h('div', 'grid gap-4 sm:grid-cols-4', [stat(items.filter((i) => i.status === 'priority').length, t('pays prioritaires')), stat(items.filter((i) => i.status === 'covered').length, t('pays desservis')), stat(regions.length, t('régions')), stat(items.filter((i) => i.status === 'excluded').length, t('Non desservi'))])]),
      section('py-10', [tabs, mapBox, h('div', 'mt-6', legend), ...regions.map((r) => h('div', 'mb-8', [h('h2', 'mb-3 text-lg font-semibold text-white', t(r) === r ? r : t(r)), h('div', 'flex flex-wrap gap-2', items.filter((i) => i.region === r).map((i) => h('span', { class: 'rounded-full border bg-black/30 px-3 py-1 text-sm ' + (CLS[i.status] || '') }, i.country + (i.status ? ' · ' + LBL[i.status] : ''))))])), h('p', 'mt-6 rounded-xl border border-white/10 bg-panel p-4 text-sm text-zinc-400', t('Certains pays sont exclus pour cause de conflit armé ou de sanctions internationales. Liste revue régulièrement.') + (D.coverage.note ? ' ' + D.coverage.note : ''))]),
      ctaBand());
    setSEO({ title: t('Couverture mondiale'), description: t('Clients sur les six continents, avec une priorité pour l’Afrique de l’Ouest, l’Europe, l’Amérique du Nord et l’Asie-Pacifique.'), path: 'couverture.html' });
  }
  function renderBooking(main) {
    const B = D.booking || {}, len = Number(B.slotMinutes) || 30, week = B.week || {}, blocked = new Set(B.blocked || []);
    const offset = Number(B.utcOffset != null ? B.utcOffset : 1);
    const zone = B.timezone || 'Africa/Porto-Novo';
    const minMs = now() + (Number(B.minNoticeHours) || 12) * 3600000;
    const maxMs = now() + (Number(B.maxDaysAhead) || 45) * 86400000;
    const ymd = (dt) => [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-');
    const slotsFor = (ds) => {
      const [y, m, d] = ds.split('-').map(Number), dow = new Date(y, m - 1, d).getDay(), out = [];
      if (blocked.has(ds)) return out;
      (week[dow] || []).forEach(([a, b]) => {
        let c = +a.slice(0, 2) * 60 + +a.slice(3, 5); const e = +b.slice(0, 2) * 60 + +b.slice(3, 5);
        while (c + len <= e) { const ms = Date.UTC(y, m - 1, d, Math.floor(c / 60) - offset, c % 60); if (ms >= minMs && ms <= maxMs) out.push(ms); c += len; }
      });
      return out;
    };
    const days = [];
    for (let i = 0; i < 46; i++) { const dt = new Date(); dt.setDate(dt.getDate() + i); const s0 = ymd(dt), sl = slotsFor(s0); if (sl.length) days.push({ s: s0, sl }); }
    const timeLabel = (ms) => new Date(ms).toLocaleTimeString(meta().locale, { hour: '2-digit', minute: '2-digit' });
    let pick = null, time = null;
    const dayList = h('div', 'grid grid-cols-2 gap-2 sm:grid-cols-3');
    const timeList = h('div', 'mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4');
    const out = h('div', 'mt-6');
    const timeBox = h('div', { id: 'bookTimes' }, [h('p', 'text-zinc-400', t('Sélectionnez d’abord un jour.'))]);
    const types = B.meetingTypes || ['Appel WhatsApp'];
    const reveal = (el) => { try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) { /* ignoré */ } };
    const drawOut = () => {
      out.replaceChildren();
      if (!pick || time === null) return;
      const when = fmtDate(time, { dateStyle: 'full', timeStyle: 'short' });
      const ownerWhen = new Intl.DateTimeFormat(meta().locale, { dateStyle: 'full', timeStyle: 'short', timeZone: zone }).format(new Date(time));
      const sel = h('select', { class: 'field mb-3' }, types.map((x) => h('option', { value: x }, x)));
      const name = h('input', { class: 'field mb-3', placeholder: t('Nom complet'), required: true });
      const contact = h('input', { class: 'field mb-3', placeholder: t('nom@exemple.com ou +229 …'), required: true });
      const note = h('textarea', { class: 'field', rows: 3, placeholder: t('Sujet de votre projet (facultatif)') });
      const msg = () => ['Demande de rendez-vous — ' + S.brand, '', t('Date et heure') + ' : ' + when, t('Heure du propriétaire') + ' (' + zone + ') : ' + ownerWhen, 'Type : ' + sel.value, 'Durée : ' + len + ' min', 'Nom : ' + name.value.trim(), 'Contact : ' + contact.value.trim(), '', note.value.trim()].join('\n');
      const ok = () => { if (name.value.trim() && contact.value.trim()) return true; window.alert(t('Renseignez votre nom et votre contact.')); return false; };
      out.append(h('p', 'mb-3 font-semibold text-white', when), sel, name, contact, note,
        h('div', 'mt-4 flex flex-col gap-3 sm:flex-row', [
          h('button', { type: 'button', class: 'btn-wa flex-1 justify-center', onclick: () => { if (ok()) sendWA(msg()); } }, [ic('fa-brands fa-whatsapp'), t('Confirmer par WhatsApp')]),
          h('button', { type: 'button', class: 'btn-ghost flex-1 justify-center', onclick: () => { if (ok()) sendMail('Demande de rendez-vous', msg()); } }, [ic('fa-solid fa-envelope'), t('Confirmer par email')])]),
        h('p', 'mt-3 text-xs text-zinc-500', t('Le rendez-vous est confirmé après réponse de notre part.')));
    };
    const drawTimes = () => {
      timeList.replaceChildren();
      if (!pick) { timeBox.replaceChildren(h('p', 'text-zinc-400', t('Sélectionnez d’abord un jour.'))); return; }
      pick.sl.forEach((ms) => timeList.append(h('button', { type: 'button', 'aria-pressed': String(time === ms), class: 'rounded-lg border px-2 py-2 text-sm ' + (time === ms ? 'border-cyan-400 bg-cyan-500 text-black' : 'border-white/15 text-zinc-200'), onclick: () => { time = ms; drawTimes(); drawOut(); reveal(out); } }, timeLabel(ms))));
      timeBox.replaceChildren(h('p', 'mb-1 text-sm text-zinc-400', fmtDate(pick.s + 'T12:00:00', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + pick.sl.length + ' ' + t('créneaux')), timeList, out);
    };
    const drawDays = () => {
      dayList.replaceChildren();
      days.forEach((d) => dayList.append(h('button', { type: 'button', 'aria-pressed': String(!!pick && pick.s === d.s), class: 'rounded-xl border px-3 py-3 text-start text-sm ' + (pick && pick.s === d.s ? 'border-cyan-400 bg-cyan-500 text-black' : 'border-white/15 text-zinc-200'), onclick: () => { pick = d; time = null; drawDays(); drawTimes(); drawOut(); reveal(timeBox); } }, [h('span', 'block font-semibold', fmtDate(d.s + 'T12:00:00', { weekday: 'short', day: 'numeric', month: 'short' })), h('span', 'block text-xs opacity-70', d.sl.length + ' ' + t('créneaux'))])));
    };
    drawDays();
    const sujet = new URLSearchParams(location.search).get('sujet') || '';
    const body = h('div', 'grid gap-8 lg:grid-cols-2', [
      h('div', {}, [h('h2', 'mb-4 text-lg font-semibold text-white', t('1. Choisissez un jour')), days.length ? dayList : h('p', 'text-zinc-400', t('Aucun créneau disponible pour le moment.'))]),
      h('div', {}, [h('h2', 'mb-4 text-lg font-semibold text-white', t('2. Choisissez une heure')), timeBox])]);
    main.replaceChildren(pageHeader(t('Prendre rendez-vous'), t('Réservez un créneau pour parler de votre projet : site, application, blockchain, robot de trading ou formation.'), [t('Rendez-vous')]),
      section('py-12', [sujet ? h('p', 'mb-6 rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-200', t('Demande de devis') + ' — ' + sujet) : null, body]),
      section('pb-16', [heading(t('Nos contacts')), h('div', 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4', [['WhatsApp', '+' + WA, 'https://wa.me/' + WA], [t('Email'), MAIL, 'mailto:' + MAIL], ['TikTok', '@donkodeutsch', C.tiktok], ['GitHub', 'Donko-dev', C.github]].filter((c) => c[2]).map(([l, v, u]) => h('a', { href: u, target: /^https?:/.test(u) ? '_blank' : null, rel: 'noopener', class: 'rounded-2xl border border-white/10 bg-panel p-4 transition hover:border-cyan-400/40' }, [h('span', 'block text-xs text-zinc-500', l), h('span', 'block truncate font-semibold text-white', v)])))]));
    setSEO({ title: t('Prendre rendez-vous'), description: t('Réservez un créneau pour parler de votre projet : site, application, blockchain, robot de trading ou formation.'), path: 'rendez-vous.html' });
  }
  function renderBlog(main) {
    const posts = (D.blog || []).filter((p) => p.active !== false && ts(p.publishAt) <= now()).sort((a, b) => ts(b.publishAt) - ts(a.publishAt));
    const next = (D.blog || []).filter((p) => p.active !== false && ts(p.publishAt) > now()).sort((a, b) => ts(a.publishAt) - ts(b.publishAt))[0];
    main.replaceChildren(pageHeader(t('Blog tech & innovation'), t('Informatique, Web3, fintech : un nouvel article est publié automatiquement tous les 30 jours.'), [t('Blog')]),
      section('py-12', [posts.length ? h('div', 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3', posts.map(postCard)) : h('p', 'text-zinc-400', t('Aucun article pour le moment.')), next ? h('p', 'mt-10 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-zinc-300', t('Prochain article prévu le {date}.', { date: fmtDate(next.publishAt) })) : null]), ctaBand());
    setSEO({ title: t('Blog tech & innovation'), description: t('Informatique, Web3, fintech : un nouvel article est publié automatiquement tous les 30 jours.'), path: 'blog.html' });
  }
  function sanitize(html) {
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html'), root = doc.body.firstChild;
    root.querySelectorAll('script,iframe,object,embed,style,link,meta,form,base').forEach((n) => n.remove());
    root.querySelectorAll('*').forEach((n) => [...n.attributes].forEach((a) => { if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*(javascript|data|vbscript):/i.test(a.value))) n.removeAttribute(a.name); }));
    return root.innerHTML;
  }
  function renderArticle(main) {
    const slug = new URLSearchParams(location.search).get('s') || '';
    const p = (D.blog || []).find((x) => x.slug === slug && x.active !== false);
    if (!p || ts(p.publishAt) > now()) return renderNotFound(main);
    const body = h('div', 'prose-ec'); body.innerHTML = sanitize(p.body || '');
    main.replaceChildren(pageHeader(p.title, p.excerpt, [t('Blog'), p.title]), section('py-12', [h('article', 'mx-auto max-w-3xl', [h('div', 'mb-8 flex flex-wrap gap-3 text-sm text-zinc-400', [h('span', 'rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-cyan-300', p.category || 'Tech'), h('time', { datetime: String(p.publishAt).slice(0, 10) }, fmtDate(p.publishAt)), h('span', {}, t('Lecture : {min} min', { min: p.readMin || 4 }))]), body, h('div', 'mt-10 flex items-center gap-4 rounded-2xl border border-white/10 bg-panel p-5', [h('img', { src: linkTo('donko.png'), alt: '', width: '56', height: '56', class: 'h-14 w-14 rounded-xl object-contain' }), h('div', {}, [h('p', 'font-semibold text-white', 'Hassane DONKO'), h('p', 'text-sm text-zinc-400', t('Créateur d\'EMPIRE CODE HUB'))])])])]), ctaBand());
    setSEO({ title: p.seoTitle || p.title, description: p.seoDescription || p.excerpt, path: 'article.html?s=' + slug, type: 'article', jsonld: [orgLd(), { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.excerpt, datePublished: p.publishAt, author: { '@type': 'Person', name: 'Hassane DONKO' }, inLanguage: 'fr', keywords: (p.tags || []).join(', ') }] });
  }
  function renderProduct(main) {
    const slug = new URLSearchParams(location.search).get('s') || '';
    const p = catalog.find((x) => x.slug === slug);
    if (!p) return renderNotFound(main);
    const url = STORE + '/' + p.slug;
    main.replaceChildren(pageHeader(p.title, null, [t('Produits'), p.title]), section('py-12', [h('div', 'grid gap-8 lg:grid-cols-5', [
      h('div', 'lg:col-span-3', [h('div', 'aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10', [p.banner ? h('img', { src: p.banner, alt: p.title, class: 'h-full w-full object-cover', referrerpolicy: 'no-referrer', onerror: (e) => e.target.remove() }) : null]), h('h2', 'mt-8 text-xl font-bold text-white', t('Description')), h('div', 'mt-3 leading-relaxed text-zinc-300', p.description || t('Solution EMPIRE CODE livrée avec son code source, sa documentation (README) et un support technique.'))]),
      h('aside', 'lg:col-span-2', [h('div', 'sticky top-24 rounded-2xl border border-white/10 bg-panel p-6', [h('p', 'text-4xl font-extrabold text-cyan-300', priceOf(p)), p.oldPrice ? h('s', 'text-lg text-zinc-500', p.oldPrice) : null, h('a', { href: url, target: '_blank', rel: 'noopener', class: 'btn-primary mt-6 w-full justify-center' }, [ic('fa-solid fa-cart-shopping'), t('Acheter maintenant')]), h('p', 'mt-4 text-xs leading-relaxed text-zinc-500', t('Le paiement est traité par la boutique Chariow. Livraison automatique après paiement.')), h('a', { href: 'https://wa.me/' + WA + '?text=' + encodeURIComponent(t('Poser une question') + ' : ' + p.title), target: '_blank', rel: 'noopener', class: 'btn-ghost mt-4 w-full justify-center' }, [ic('fa-brands fa-whatsapp'), t('Poser une question')])])])])]));
    setSEO({ title: p.title, description: (p.description || p.title).slice(0, 155), path: 'produit.html?s=' + p.slug, type: 'product', image: p.banner || undefined, jsonld: [orgLd(), p.priceValue && p.cur ? { '@context': 'https://schema.org', '@type': 'Product', name: p.title, sku: p.slug, offers: { '@type': 'Offer', url, price: String(p.priceValue), priceCurrency: p.cur, availability: 'https://schema.org/InStock' } } : null] });
  }
  const LEGAL = {
    mentions: ['Mentions légales', (L) => [['Éditeur', S.brand + ' — édité par ' + (L.company || 'TransTech Dynamic') + '. Responsable de publication : Hassane DONKO.' + (L.address ? ' Adresse : ' + L.address + '.' : '') + (L.registration ? ' Immatriculation : ' + L.registration + '.' : '')], ['Contact', 'Email : ' + MAIL + ' — WhatsApp : +' + WA + '.'], ['Hébergement', L.host || 'Site hébergé sur une infrastructure professionnelle.'], ['Propriété intellectuelle', 'Textes, visuels, codes et marques sont protégés. Toute reproduction sans autorisation écrite est interdite.']]],
    conditions: ['Conditions d\'utilisation', () => [['Commandes et paiement', 'Les produits numériques sont réglés via la plateforme Chariow. Les autres moyens de paiement sont listés sur la page Paiement.'], ['Livraison', 'Les produits numériques sont livrés après confirmation du paiement. Les services sur mesure font l\'objet d\'un devis préalable.'], ['Licence', 'Sauf mention contraire, la licence est personnelle, non exclusive et non transférable. La revente du code source est interdite sans accord écrit.'], ['Responsabilité', 'Les solutions sont fournies en l\'état. L\'utilisateur reste responsable de leur usage, notamment financier, fiscal et réglementaire.']]],
    confidentialite: ['Politique de confidentialité', () => [['Données', 'Ce site ne crée pas de compte et ne stocke pas vos messages. Les messages envoyés par WhatsApp ou email passent par l\'application que vous choisissez.'], ['Stockage local', 'Votre navigateur conserve votre thème, votre langue et une copie du catalogue pour le mode hors connexion. Vous pouvez les effacer à tout moment.'], ['Paiements', 'Les données de paiement sont traitées par Chariow selon sa propre politique de confidentialité. Nous ne conservons pas vos données bancaires.'], ['Vos droits', 'Vous pouvez demander l\'accès, la rectification ou la suppression de vos données en écrivant à ' + MAIL + '.']]]
  };
  function renderLegal(main) {
    const kind = document.body.dataset.kind || 'mentions', [title, build] = LEGAL[kind] || LEGAL.mentions, L = D.legal || {};
    main.replaceChildren(pageHeader(title, null, [title]), section('py-12', [h('div', 'mx-auto max-w-3xl space-y-8', build(L).map(([tt, p]) => h('section', {}, [h('h2', 'text-xl font-semibold text-white', tt), h('p', 'mt-3 leading-relaxed text-zinc-300', p)]))), h('p', 'mx-auto mt-10 max-w-3xl text-sm text-zinc-500', 'Dernière mise à jour : ' + fmtDate(D.updatedAt || now()))]));
    setSEO({ title, description: title + ' — ' + S.brand, path: kind + '.html' });
  }
  function renderNotFound(main) {
    main.replaceChildren(pageHeader(t('Page introuvable'), t('Cette page n’existe pas ou a été déplacée.'), [t('404')]), section('py-12', [h('div', 'flex flex-wrap gap-3', [h('a', { href: linkTo('index.html'), class: 'btn-primary' }, t('Retour à l’accueil')), h('a', { href: linkTo('services.html'), class: 'btn-ghost' }, t('Services'))])]));
    setSEO({ title: t('Page introuvable'), description: t('Cette page n’existe pas ou a été déplacée.'), noindex: true });
  }

  /* ---------- Terminal du hero : écriture en boucle continue ---------- */
  function startTerminal() {
    const out = $('#terminal'); if (!out) return;
    const scenes = [['$ npm run verify', '✔ dépendances vérifiées', '✔ README.md présent', '✔ licence activée', '✔ prêt à déployer'], ['$ python main.py', '✔ environnement prêt', '✔ tests réussis', '✔ script exécuté'], ['$ cargo build --release', '✔ compilation terminée', '✔ binaire optimisé'], ['$ sqlite3 data.db', '✔ base de données connectée', '✔ requêtes validées']];
    const keyOf = (l) => (l.startsWith('$') ? l : t(l));
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { scenes[0].forEach((l) => out.append(h('div', {}, keyOf(l)))); return; }
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      for (let i = 0; out.isConnected; i = (i + 1) % scenes.length) {
        out.replaceChildren();
        for (const line of scenes[i]) {
          const text = keyOf(line), row = h('div', {}); out.append(row);
          for (let n = 1; n <= text.length; n++) { if (!out.isConnected) return; row.textContent = text.slice(0, n); await sleep(line.startsWith('$') ? 50 : 22); }
          await sleep(line.startsWith('$') ? 380 : 220);
        }
        await sleep(2200);
      }
    })();
  }

  /* ---------- Construction de la page et langues ---------- */
  const ROUTES = { home: renderHome, services: renderServices, formations: renderFormations, robots: renderRobots, payments: renderPayments, portfolio: renderPortfolio, coverage: renderCoverage, booking: renderBooking, blog: renderBlog, article: renderArticle, product: renderProduct, legal: renderLegal, notfound: renderNotFound };
  function build() {
    applyDir();
    const main = h('main', { id: 'app', class: 'min-h-[60vh]' });
    const wa = h('a', { href: 'https://wa.me/' + WA, target: '_blank', rel: 'noopener', class: 'fixed bottom-5 end-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-black shadow-2xl', 'aria-label': t('Écrire sur WhatsApp') }, [ic('fa-brands fa-whatsapp text-2xl')]);
    const syntix = h('a', { href: 'https://donko-dev.github.io/donkoquantsyntix/', target: '_blank', rel: 'noopener', class: 'ec-syntix', 'aria-label': 'DONKO SYNTIX — ' + t('Robots de trading') }, [h('span', { class: 'ec-syntix-dot' }), ic('fa-solid fa-robot'), h('span', {}, 'DONKO SYNTIX')]);
    return { top: [header(), marquee(), adsBand()].filter(Boolean), main, bottom: [footer(), wa, syntix], wa };
  }
  function applyDir() { document.documentElement.setAttribute('lang', lang); document.documentElement.setAttribute('dir', meta().dir); }
  let scripts = [];
  function rebuild() {
    if (!scripts.length) scripts = [...document.body.querySelectorAll('script')];
    const parts = build();
    document.body.replaceChildren(...parts.top, parts.main, ...parts.bottom, ...scripts);
    const route = ROUTES[PAGE] || renderNotFound;
    if (PAGE === 'legal') route(parts.main); else route(parts.main);
    if (PAGE === 'home') { productsMountRender(); }
    if (PAGE === 'product') { /* rendu déjà fait */ }
    if (PAGE === 'coverage' || PAGE === 'formations' || PAGE === 'article' || PAGE === 'product') { /* ok */ }
    setLang_ui();
  }
  function setLang_ui() { /* réservé : mise à jour des libellés d'état */ const st = $('#syncStatus'); if (st) st.textContent = syncLabel(); }
  function setLang(code) {
    if (!DICT[code]) return;
    lang = code; try { localStorage.setItem('ec:lang', code); } catch (_) { /* ignoré */ }
    rebuild();
  }
  window.EC = { setLang, t, lang: () => lang };

  /* ---------- Démarrage ---------- */
  function boot() {
    rebuild();
    loadCatalog().then((ok) => { if (PAGE === 'home') productsMountRender(); if (PAGE === 'formations') rebuild(); if (PAGE === 'product') rebuild(); if (ok) { /* synchronisé */ } });
    window.addEventListener('offline', () => { const st = $('#syncStatus'); if (st) st.textContent = syncLabel(); });
    window.addEventListener('online', () => { loadCatalog().then(() => { const st = $('#syncStatus'); if (st) st.textContent = syncLabel(); }); });
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
