/*
 * Palm Farm Field Map - Service Worker
 * v0.367
 *
 * 전략:
 *  - 앱 셸(index.html, manifest, icons)은 precache
 *  - 동일 출처 GET 요청은 stale-while-revalidate
 *  - CDN(https) 자원은 cache-first 폴백
 *  - 네트워크 실패 시 캐시 → 그래도 없으면 503
 *  - v0.367: share_target POST 처리 — 카카오톡/공유 시트 → PalmMap 파일 import
 */

const CACHE_VERSION = 'palmmap-v0367';
const SHARE_CACHE = 'palmmap-share-inbox';  // v0.367: 공유받은 파일 임시 보관용
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

  // v0.367: share_target POST 처리 — 카카오톡 등에서 파일 공유 시
  //   manifest.json의 share_target.action = "./index.html?share-target=1"
  //   이 URL로 POST 요청이 오면 SW가 가로채 파일을 임시 캐시에 저장 후
  //   index.html로 리다이렉트. JS가 진입 시 URL 파라미터 감지 → 캐시에서 파일 꺼내 처리.
  const url = new URL(req.url);
  if (req.method === 'POST' && url.searchParams.has('share-target')) {
    event.respondWith((async () => {
      try {
        const formData = await req.formData();
        const files = formData.getAll('files');
        // 텍스트/URL도 받을 수 있지만 우선 파일만 처리
        const fileList = [];
        for (const f of files) {
          if (f && f.name && f.size > 0) {
            fileList.push({
              name: f.name,
              type: f.type || '',
              size: f.size,
              blob: f
            });
          }
        }
        // 임시 캐시에 파일들을 저장 (각 파일을 Response로 래핑)
        const cache = await caches.open(SHARE_CACHE);
        // 기존 공유 캐시 정리 (이전 공유 잔재 제거)
        const oldKeys = await cache.keys();
        await Promise.all(oldKeys.map(k => cache.delete(k)));
        // 새 파일들 저장 — 키는 share-file-<index>-<filename>
        const fileMeta = [];
        for (let i = 0; i < fileList.length; i++) {
          const f = fileList[i];
          const key = `/__share/${i}/${encodeURIComponent(f.name)}`;
          const response = new Response(f.blob, {
            headers: {
              'Content-Type': f.type || 'application/octet-stream',
              'X-File-Name': f.name,
              'X-File-Size': String(f.size)
            }
          });
          await cache.put(key, response);
          fileMeta.push({ key, name: f.name, type: f.type, size: f.size });
        }
        // 메타데이터도 캐시에 저장 (JSON)
        await cache.put('/__share/meta', new Response(JSON.stringify(fileMeta), {
          headers: { 'Content-Type': 'application/json' }
        }));
        // 진입 페이지로 리다이렉트 — JS가 share-inbox 플래그를 보고 처리
        return Response.redirect('./index.html?share-inbox=1', 303);
      } catch (err) {
        // 에러 시 일반 페이지로 리다이렉트 (조용히 실패)
        return Response.redirect('./index.html?share-error=1', 303);
      }
    })());
    return;
  }

  // GET 요청만 캐싱 처리, http(s) 스킴만 캐싱
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
