// 国試 Planner 用。スコープは /cbt-planner/kokushi/ なので CBT Planner のキャッシュとは別。
const CACHE = 'kokushi-planner-v1';
const PRECACHE = [
  '/cbt-planner/kokushi/',
  '/cbt-planner/kokushi/index.html',
  '/cbt-planner/kokushi/manifest.json',
  '/cbt-planner/kokushi/icon-192.png',
  '/cbt-planner/kokushi/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('kokushi-') && k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ネットワーク優先（オフライン時はキャッシュ）。Firestore 通信はキャッシュしない。
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (event.request.method !== 'GET' || url.includes('googleapis.com') || url.includes('firestore')) return;
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(event.request, clone)); }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
