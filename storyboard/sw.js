// ApeChit web app. Network-first so an update arrives when online, cache fallback so a reload still opens offline.
const C = 'apechit-web-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './tokens.css', './sb.css', './sw.js',
  './logic/store.js', './sb.js', './board.js', './fullanalysis.js',
  './assets/logo/icon-orange.png', './assets/mock-ex.js', './assets/musclemap.js', './assets/swaptags.js', './assets/mock-board.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))));
});
