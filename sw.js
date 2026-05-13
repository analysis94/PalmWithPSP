/*
 * Palm Farm Field Map - Service Worker
 * v0.348
 *
 * 전략:
 *  - 앱 셸(index.html, manifest, icons)은 precache
 *  - 동일 출처 GET 요청은 stale-while-revalidate
 *  - CDN(https) 자원은 cache-first 폴백
 *  - 네트워크 실패 시 캐시 → 그래도 없으면 503
 */

const CACHE_VERSION = 'palmmap-v0348';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── install: 앱 셸 precache ─────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // 일부 아이콘 파일이 아직 없어도 install이 실패하지 않도록 개별 처리
      Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch(() => { /* ignore missing */ })
        )
      )
    )
  );
});

// ── activate: 이전 버전 캐시 제거 ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── fetch: stale-while-revalidate ───────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET 요청만 처리, http(s) 스킴만 캐싱
  if (req.method !== 'GET') return;
  if (!req.url.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            // 정상 응답만 캐시에 저장 (opaque 제외)
            if (res && res.ok && res.type !== 'opaque') {
              cache.put(req, res.clone());
            }
            return res;
          })
          .catch(() => cached || new Response('Offline', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain' }
          }));

        // 캐시가 있으면 즉시 반환하고, 백그라운드에서 갱신
        return cached || networkFetch;
      })
    )
  );
});

// ── 앱에서 CDN 자원 사전 캐싱 요청 시 처리 ──────────────────
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'CACHE_CDN' && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(CACHE_VERSION).then((cache) =>
        Promise.all(
          data.urls.map((url) =>
            fetch(url, { mode: 'no-cors' })
              .then((res) => cache.put(url, res))
              .catch(() => {})
          )
        )
      )
    );
  }
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Background Sync (선택) ──────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-memos') {
    // 클라이언트에 알림만 전달
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'SYNC_COMPLETE', tag: event.tag }));
      })
    );
  }
});

// ── Periodic Background Sync (선택) ─────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-map-data') {
    event.waitUntil(
      caches.open(CACHE_VERSION).then((cache) =>
        fetch('./index.html').then((res) => res.ok && cache.put('./index.html', res)).catch(() => {})
      )
    );
  }
});
