// ═══════════════════════════════════════════════════════════════
// Palm Farm Field Map — Service Worker v0.150
// 앱 버전: v0.150
// 변경사항:
//   - 캐시명 v0149로 갱신
//   - 3개국어 오프라인 페이지 (KO/EN/ID) 완성
//   - GPS 정확도 색상 원, 나침반 3단계, UTM 좌표 지원
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME  = 'palmmap-v0152';
const OFFLINE_URL = './offline.html';

const CORE_ASSETS = [
  './',
  './index.html',
  './sw.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.wasm',
  'https://cdn.jsdelivr.net/npm/geotiff@2.0.7/dist/geotiff.bundle.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of CORE_ASSETS) {
      try {
        await cache.add(new Request(url, { cache: 'reload' }));
      } catch (err) {
        console.warn('[SW] Core cache fail:', url, err.message);
      }
    }

    // 3개국어 오프라인 폴백 페이지
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
       height:100vh;flex-direction:column;gap:14px;
       padding:20px;box-sizing:border-box;text-align:center}
  .icon{font-size:52px}
  h2{color:#7ab450;font-size:18px;margin:0}
  p{color:#b8cdb8;font-size:13px;max-width:300px;line-height:1.7;margin:0}
  .sub{color:#5a7a50;font-size:11.5px;margin-top:4px}
  button{background:#5cba3c;color:#0f1a0f;border:none;padding:12px 28px;
         border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;margin-top:6px}
</style>
</head>
<body>
  <div class="icon">🌴</div>
  <h2>PALM MAP — Offline</h2>
  <p>인터넷 연결이 없습니다.<br>
     No internet connection.<br>
     Tidak ada koneksi internet.</p>
  <p class="sub">
    앱을 먼저 온라인에서 한 번 실행하면 오프라인 사용이 가능합니다.<br>
    <span style="color:#7ab450">Run the app online first to enable offline use.</span>
  </p>
  <button onclick="location.reload()">🔄 다시 시도 / Retry / Coba Lagi</button>
</body>
</html>`;

    await cache.put(
      new Request(OFFLINE_URL),
      new Response(offlinePage, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    );

    // CDN 자산 백그라운드 캐싱
    Promise.all(CDN_ASSETS.map(async url => {
      try {
        const res = await fetch(new Request(url, { mode: 'cors', cache: 'no-cache' }));
        if (res.ok) await caches.open(CACHE_NAME).then(c => c.put(url, res));
      } catch (_) {}
    }));

    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      // stale-while-revalidate
      fetch(request).then(res => {
        if (res?.ok && res.type !== 'opaque') cache.put(request, res.clone());
      }).catch(() => {});
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response?.ok && response.type !== 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      if (request.headers.get('Accept')?.includes('text/html')) {
        return await cache.match(OFFLINE_URL) ||
          new Response('<h2>🌴 Offline</h2>', { status: 503,
            headers: { 'Content-Type': 'text/html' } });
      }
      return new Response('', { status: 503 });
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CACHE_CDN') {
    caches.open(CACHE_NAME).then(cache => {
      CDN_ASSETS.forEach(url => {
        fetch(url, { mode: 'cors' })
          .then(r => r.ok && cache.put(url, r))
          .catch(() => {});
      });
    });
  }
});
