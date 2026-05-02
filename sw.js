// ═══════════════════════════════════════════════════════════════
// Palm Farm Field Map — Service Worker v9
//
// ✅ PWABuilder "Enable offline caching" 완전 충족:
//    - 설치 시 핵심 자산 개별 캐싱 (실패해도 다른 자산은 계속)
//    - Fetch: Cache First → Network Fallback → Offline Page
//    - 오프라인 폴백 페이지 내장
// ✅ display_override: tabbed 지원
// ✅ scope_extensions 대응
// ✅ Background Sync / Periodic Sync / Push Notifications
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME   = 'palmmap-v9';
const OFFLINE_URL  = './offline.html';  // 오프라인 폴백

// 반드시 캐싱해야 할 핵심 자산
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 가능하면 캐싱 (실패해도 무방)
const OPTIONAL_ASSETS = [
  './screenshot.png',
  './screenshot-wide.png',
  './sw.js'
];

// ── 설치: 핵심 자산 개별 캐싱 (하나 실패해도 전체 중단 안 됨) ──
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // 핵심 자산: 개별 try-catch로 하나씩 캐싱
    for (const url of CORE_ASSETS) {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
      } catch (err) {
        console.warn('[SW] Core asset cache fail:', url, err.message);
      }
    }

    // 선택 자산: 일괄 시도, 실패 무시
    for (const url of OPTIONAL_ASSETS) {
      try { await cache.add(url); } catch (_) {}
    }

    // 오프라인 폴백 페이지 인라인 생성 & 캐싱
    const offlinePage = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Palm Farm Map — 오프라인</title>
<style>
  body{margin:0;background:#0f1a0f;color:#d4e8c0;font-family:system-ui,sans-serif;
       display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px}
  h2{color:#a3d46e;font-size:18px}
  p{color:#8aaa70;font-size:13px;text-align:center;max-width:280px;line-height:1.6}
  button{background:#7ab450;color:#0f1a0f;border:none;padding:11px 24px;border-radius:8px;
         font-size:13px;font-weight:700;cursor:pointer}
</style>
</head>
<body>
  <div style="font-size:48px">🌴</div>
  <h2>오프라인 상태입니다</h2>
  <p>인터넷 연결이 없습니다. 연결 후 다시 시도하거나,<br>캐시된 지도를 사용하세요.</p>
  <button onclick="location.reload()">다시 시도</button>
</body></html>`;

    await cache.put(
      new Request(OFFLINE_URL),
      new Response(offlinePage, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    );

  })().then(() => self.skipWaiting()));
});

// ── 활성화: 이전 버전 캐시 삭제 ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// ── Fetch: Cache First → Network → Offline Fallback ───────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  // GET 요청만 처리
  if (request.method !== 'GET') return;
  // blob:, data:, chrome-extension: 무시
  if (!url.startsWith('http')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // 1. 캐시 확인
    const cached = await cache.match(request);
    if (cached) {
      // Stale-While-Revalidate: 캐시 반환 + 백그라운드 갱신
      fetch(request).then(res => {
        if (res && res.ok && res.type !== 'opaque') {
          cache.put(request, res.clone());
        }
      }).catch(() => {});
      return cached;
    }

    // 2. 네트워크 요청
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type !== 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      // 3. 오프라인 폴백
      // HTML 요청이면 오프라인 페이지 반환
      if (request.headers.get('Accept')?.includes('text/html')) {
        const offlineCached = await cache.match(OFFLINE_URL);
        if (offlineCached) return offlineCached;
        return new Response('<h1>Offline</h1>', {
          status: 503, headers: { 'Content-Type': 'text/html' }
        });
      }
      return new Response('', { status: 503 });
    }
  })());
});

// ── Background Sync ─────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-memos') {
    event.waitUntil(notifyClients('SYNC_MEMOS'));
  }
  if (event.tag === 'sync-tracks') {
    event.waitUntil(notifyClients('SYNC_TRACKS'));
  }
});

// ── Periodic Background Sync ────────────────────────────────────
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-map-data') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of CORE_ASSETS) {
        try { await cache.add(new Request(url, { cache: 'reload' })); } catch (_) {}
      }
      await notifyClients('MAP_DATA_UPDATED');
    })());
  }
});

// ── Push Notifications ──────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'Palm Farm Map', body: '새 알림이 있습니다.', icon: './icon-192.png' };
  if (event.data) {
    try { Object.assign(data, event.data.json()); } catch (_) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: data.icon || './icon-192.png',
      badge: './icon-192.png', tag: data.tag || 'palmmap',
      data, vibrate: [200, 100, 200],
      actions: [
        { action: 'open',    title: '지도 열기' },
        { action: 'dismiss', title: '닫기' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const win = clients.find(c => c.url.includes('index.html'));
        return win ? win.focus() : self.clients.openWindow('./index.html');
      })
  );
});

// ── 앱 → SW 메시지 ─────────────────────────────────────────────
self.addEventListener('message', event => {
  const type = event.data?.type;
  if (type === 'SKIP_WAITING')       self.skipWaiting();
  if (type === 'REQUEST_SYNC')       self.registration.sync?.register('sync-memos').catch(() => {});
  if (type === 'REQUEST_PERIODIC_SYNC') {
    self.registration.periodicSync?.register('update-map-data', {
      minInterval: 24 * 60 * 60 * 1000
    }).catch(() => {});
  }
});

// ── 헬퍼: 모든 클라이언트에 메시지 전송 ───────────────────────
async function notifyClients(type) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(c => c.postMessage({ type, timestamp: Date.now() }));
}
