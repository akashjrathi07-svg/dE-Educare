/* DE Educare service worker: makes the portal installable and shows an offline page.
   Pages and data are always fetched live (tests, scores and payments must never come from a cache);
   only the app icons and the offline page are cached. */
const CACHE = 'de-shell-v1';
const SHELL = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }
  const url = new URL(req.url);
  if (url.origin === location.origin && url.pathname.startsWith('/icons/')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req)));
  }
});
