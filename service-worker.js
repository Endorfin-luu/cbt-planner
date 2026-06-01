const CACHE = 'cbt-planner-v1';
const PRECACHE = [
  '/cbt-planner/',
  '/cbt-planner/index.html',
  '/cbt-planner/manifest.json',
  '/cbt-planner/icon-192.png',
  '/cbt-planner/icon-512.png',
];

// インストール時にキャッシュを作成
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ネットワーク優先（オフライン時はキャッシュを使用）
self.addEventListener('fetch', event => {
  // Supabase API リクエストはキャッシュしない
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 成功したレスポンスをキャッシュに更新
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
