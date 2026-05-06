// ═══════════════════════════════════════════════════════════════
// Palm Farm Field Map — Service Worker v0.062
// 앱 버전과 일치: v0.062
// 변경사항:
//   - CACHE_NAME을 앱 버전 v0.062에 맞게 갱신
//   - GeoPDF/GeoTIFF/GPKG 통합 레이어 관리 지원
//   - GPS 트래킹 중 WakeLock 자동 유지 지원
//   - TFW World File 좌표 지원
//   - 3개국어 번역 완성 (KO/EN/ID)
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME  = 'palmmap-v0062';
const OFFLINE_URL = './offline.html';

// ── CORE_ASSETS: 반드시 존재하는 파일만 ────────────────────────
const CORE_ASSETS = [
  './',
  './index.html',
  './sw.js',
];

// CDN 라이브러리 (온라인 첫 실행 시 캐싱, 실패해도 무방)
const CDN_ASSETS = [
  // PDF.js (~5MB) - 지도 열기에 필수
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  // sql.js (~2MB) - GPKG 레이어에 사용
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm',
  // geotiff.js (~2MB) - GeoTIFF 베이스맵에 사용
  'https://cdn.jsdelivr.net/npm/geotiff@2.0.7/dist/geotiff.bundle.min.js',
];

// ── Install: 핵심 자산만 캐싱 ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // 핵심 자산: 반드시 성공해야 함
    for (const url of CORE_ASSETS) {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
        console.log('[SW] Cached:', url);
      } catch (err) {
        console.warn('[SW] Core cache fail (non-fatal):', url, err.message);
      }
    }

    // 오프라인 폴백 페이지 생성 (3개국어)
    const offlinePage = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Palm Farm Map — Offline</title>
<style>
  body{margin:0;background:#0f1a0f;color:#f0f4f0;
       font-family:system-ui,sans-serif;
       display:flex;align-items:center;justify-content:center;
       height:100vh;flex-direction:column;gap:14px;padding:20px;box-sizing:border-box}
  .icon{font-size:52px}
  h2{color:#7ab450;font-size:18px;margin:0}
  p{color:#b8cdb8;font-size:13px;text-align:center;max-width:300px;
    line-height:1.7;margin:0}
  .sub{color:#5a7a50;font-size:11.5px;margin-top:4px}
  button{background:#5cba3c;color:#0f1a0f;border:none;padding:12px 28px;
         border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:6px}
  button:active{opacity:.8}
</style>
</head>
<body>
  <div class="icon">🌴</div>
  <h2>Tidak Ada Koneksi Internet</h2>
  <p>인터넷 연결이 없습니다.<br>Periksa koneksi internet Anda.</p>
  <p class="sub">앱을 한 번이라도 온라인에서 실행하면<br>
  이후 오프라인에서도 사용 가능합니다.<br>
  <span style="color:#7ab450">Buka aplikasi saat online terlebih dahulu.</span></p>
  <button onclick="location.reload()">🔄 Coba Lagi / 다시 시도</button>
</body>
</html>`;

    await cache.put(
      new Request(OFFLINE_URL),
      new Response(offlinePage, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    );

    // CDN 자산: 백그라운드에서 시도 (실패해도 install 계속)
    Promise.all(CDN_ASSETS.map(async url => {
      try {
        const req = new Request(url, { mode: 'cors', cache: 'no-cache' });
        const res = await fetch(req);
        if (res.ok) {
          await cache.put(req, res);
          console.log('[SW] CDN cached:', url.split('/').pop());
        }
      } catch (err) {
        console.warn('[SW] CDN cache skip:', url.split('/').pop(), '-', err.message);
      }
    })).then(() => console.log('[SW] CDN caching complete'));

    self.skipWaiting();
  })());
});

// ── Activate: 이전 캐시 삭제 ───────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      })
    );
    await self.clients.claim();
    console.log('[SW] Activated, cache:', CACHE_NAME);
  })());
});

// ── Fetch: Cache First → Network → Offline Fallback ───────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = request.url;

  if (request.method !== 'GET') return;
  if (!url.startsWith('http')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // 1. 캐시 우선
    const cached = await cache.match(request);
    if (cached) {
      // 백그라운드 갱신 (stale-while-revalidate)
      fetch(request).then(res => {
        if (res?.ok && res.type !== 'opaque') {
          cache.put(request, res.clone());
        }
      }).catch(() => {});
      return cached;
    }

    // 2. 네트워크
    try {
      const response = await fetch(request);
      if (response?.ok && response.type !== 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      // 3. 오프라인 폴백
      if (request.headers.get('Accept')?.includes('text/html')) {
        const fallback = await cache.match(OFFLINE_URL);
        return fallback || new Response(
          '<body style="background:#0f1a0f;color:#f0f4f0;font-family:sans-serif;padding:40px;text-align:center">'
          + '<h2>🌴 Offline</h2><p>Please connect to internet first.<br>먼저 온라인에서 앱을 실행하세요.</p>'
          + '</body>',
          { status: 503, headers: { 'Content-Type': 'text/html' } }
        );
      }
      return new Response('', { status: 503 });
    }
  })());
});

// ── 앱 → SW 메시지 ─────────────────────────────────────────────
self.addEventListener('message', event => {
  const type = event.data?.type;
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'CACHE_CDN') {
    // 앱에서 요청 시 CDN 재캐싱
    caches.open(CACHE_NAME).then(cache => {
      CDN_ASSETS.forEach(url => {
        fetch(url, { mode: 'cors' })
          .then(r => r.ok && cache.put(url, r))
          .catch(() => {});
      });
    });
  }
});
