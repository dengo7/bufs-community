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

  // dev 환경에서는 캐시 로직 전부 건너뜀
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

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

// ── push ──────────────────────────────────────────────────
self.addEventListener('push', event => {
  let title = 'BUFS Community';
  let body = '새 알림이 도착했습니다.';
  let url = '/';
  let tag = 'bufs-push';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
      url = data.url || url;
      tag = data.tag || tag;
    } catch {
      // 파싱 실패 시 기본값 사용
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192x192.png',
      data: { url },
      tag,
      renotify: false,
    })
  );
});

// ── notificationclick ─────────────────────────────────────
self.addEventListener('notificationclick', event => {
  const raw = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';
  const targetUrl = new URL(raw, self.location.origin).href;

  event.notification.close();

  event.waitUntil((async () => {
    console.log('[push click] targetUrl =', targetUrl);

    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = allClients.find(client => client.url === targetUrl);

    if (existing) {
      return existing.focus();
    }

    return clients.openWindow(targetUrl);
  })());
});
