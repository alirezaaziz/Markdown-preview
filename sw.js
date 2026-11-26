/* Hamsoo service worker: offline cache for the app's own files only.
 * It never touches cross-origin requests and never sends any data anywhere. */
const VERSION = 'hamsoo-v1.2.1';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'icons/icon.svg',
  'css/app.css', 'css/markdown.css',
  'js/boot.js', 'js/i18n.js', 'js/storage.js', 'js/render.js', 'js/highlight.js', 'js/editor.js', 'js/app.js',
  'vendor/marked.min.js', 'vendor/marked-footnote.js', 'vendor/purify.min.js', 'vendor/hljs/highlight.min.js',
  'fonts/Vazirmatn-var.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // remote images etc. are left alone

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const isRoot = req.mode === 'navigate' && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
    const key = isRoot ? 'index.html' : req;
    const cached = await cache.match(key, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
      return res;
    }).catch(() => cached || (req.mode === 'navigate' ? cache.match('index.html') : Response.error()));
    if (cached) { event.waitUntil(network.catch(() => {})); return cached; }
    return network;
  })());
});
