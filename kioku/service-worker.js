// Kioku 用。スコープは /cbt-planner/kioku/。ネットワーク優先（オフライン時はキャッシュ）。
const CACHE = 'kioku-v2';
const PRECACHE = [
  '/cbt-planner/kioku/',
  '/cbt-planner/kioku/index.html',
  '/cbt-planner/kioku/qbank.js',
  '/cbt-planner/kioku/planner.js',
  '/cbt-planner/kioku/game.js',
  '/cbt-planner/kioku/pixel.js',
  '/cbt-planner/kioku/manifest.json',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('kioku-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (e.request.method !== 'GET' || url.includes('googleapis.com') || url.includes('firestore')) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && url.startsWith(self.location.origin)) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
