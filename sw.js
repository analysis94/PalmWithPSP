// Palm Farm Field Map — Service Worker
// 캐싱 전략: Cache First (오프라인 우선)
const CACHE_NAME = 'palmmap-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './screenshot.png'
];

// 설치: 핵심 파일 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(() => {}) // 일부 실패해도 설치 계속
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: 캐시 우선, 네트워크 폴백
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // blob:, data:, chrome-extension: 요청 무시
  if (!url.startsWith('http') || event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        // 캐시 히트: 즉시 반환 + 백그라운드 업데이트
        if (cached) {
          fetch(event.request)
            .then(res => { if (res && res.ok) cache.put(event.request, res.clone()); })
            .catch(() => {});
          return cached;
        }
        // 캐시 미스: 네트워크 요청 후 캐싱
        return fetch(event.request).then(res => {
          if (res && res.ok && res.type !== 'opaque') {
            cache.put(event.request, res.clone());
          }
          return res;
        }).catch(() =>
          new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
        );
      })
    )
  );
});
