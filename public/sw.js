const STATIC_CACHE = 'bufs-static-v1';

const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|svg|gif|webp|woff2?|ttf|ico)$/;

// ── install ──────────────────────────────────────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ── activate ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── fetch ─────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase / API 요청은 절대 캐시하지 않음
  if (
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/api/')
  ) {
    return; // 기본 네트워크 동작에 맡김
  }

  // 정적 에셋: cache-first
  if (STATIC_EXTENSIONS.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // 네비게이션(HTML): network-first, 오프라인일 때만 캐시 폴백
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(cached => cached ?? Response.error())
      )
    );
    return;
  }

  // 그 외(JS/CSS 등): network-first, 캐시 없음
});
