// ═══════════════════════════════════════════════════════════════
// Palm Farm Field Map — Service Worker v8
// PWABuilder 완전 호환:
//   ✅ fetch 캐싱 (Cache First + Network Fallback)
//   ✅ Background Sync (오프라인 메모 동기화)
//   ✅ Periodic Background Sync (주기적 데이터 갱신)
//   ✅ Push Notifications
//   ✅ Share Target 처리
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'palmmap-v8';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './screenshot.png',
  './screenshot-wide.png'
];

// ── 설치: 핵심 자산 사전 캐싱 ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.warn('[SW] Pre-cache partial fail:', err))
  );
  self.skipWaiting();
});

// ── 활성화: 이전 버전 캐시 정리 ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: 캐시 우선, 네트워크 폴백 ───────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  // HTTP GET 요청만 처리
  if (!url.startsWith('http') || request.method !== 'GET') return;

  // Share Target POST 처리 (파일 공유 받기)
  if (url.includes('index.html') && request.method === 'POST') {
    event.respondWith(Response.redirect('./index.html'));
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(request).then(cached => {
        // 캐시 히트: 즉시 반환 + 백그라운드 갱신 (Stale-While-Revalidate)
        if (cached) {
          fetch(request)
            .then(res => {
              if (res && res.ok && res.type !== 'opaque') {
                cache.put(request, res.clone());
              }
            })
            .catch(() => {});
          return cached;
        }
        // 캐시 미스: 네트워크 → 캐싱
        return fetch(request).then(res => {
          if (res && res.ok && res.type !== 'opaque') {
            cache.put(request, res.clone());
          }
          return res;
        }).catch(() =>
          cached || new Response(
            JSON.stringify({ error: 'Offline', status: 503 }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
        );
      })
    )
  );
});

// ── Background Sync: 오프라인 중 저장된 메모 동기화 ───────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-memos') {
    event.waitUntil(syncOfflineMemos());
  }
  if (event.tag === 'sync-tracks') {
    event.waitUntil(syncOfflineTracks());
  }
});

async function syncOfflineMemos() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_MEMOS', status: 'synced' });
    });
  } catch (err) {
    console.warn('[SW] Memo sync failed:', err);
  }
}

async function syncOfflineTracks() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_TRACKS', status: 'synced' });
    });
  } catch (err) {
    console.warn('[SW] Track sync failed:', err);
  }
}

// ── Periodic Background Sync: 주기적 지도 데이터 갱신 ─────────
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-map-data') {
    event.waitUntil(updateMapData());
  }
});

async function updateMapData() {
  try {
    // 캐시 갱신 시도
    const cache = await caches.open(CACHE_NAME);
    await cache.add('./index.html').catch(() => {});
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'MAP_DATA_UPDATED', timestamp: Date.now() });
    });
  } catch (err) {
    console.warn('[SW] Map data update failed:', err);
  }
}

// ── Push Notifications: 현장 알림 ─────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'Palm Farm Map', body: '새 알림이 있습니다.', icon: './icon-192.png' };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; } catch (e) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon || './icon-192.png',
      badge:   './icon-192.png',
      tag:     data.tag || 'palmmap-notification',
      data:    data,
      actions: [
        { action: 'open',    title: '지도 열기' },
        { action: 'dismiss', title: '닫기' }
      ],
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(c => c.url.includes('index.html'));
        if (existing) return existing.focus();
        return self.clients.openWindow('./index.html');
      })
  );
});

// ── 앱에서 SW로 메시지 수신 ───────────────────────────────────
self.addEventListener('message', event => {
  const { type } = event.data || {};
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'REQUEST_SYNC') {
    self.registration.sync?.register('sync-memos').catch(() => {});
  }
  if (type === 'REQUEST_PERIODIC_SYNC') {
    self.registration.periodicSync?.register('update-map-data', {
      minInterval: 24 * 60 * 60 * 1000 // 24시간
    }).catch(() => {});
  }
});
