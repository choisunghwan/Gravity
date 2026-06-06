const CACHE = 'gravity-v1';
const STATIC = [
    '/css/common.css',
    '/css/dashboard.css',
    '/css/feed.css',
    '/css/mypage.css',
    '/css/responsive.css',
    '/css/notifications.css',
    '/css/planet.css',
    '/css/landing.css',
    '/js/dashboard.js',
    '/manifest.json',
    '/icon.svg',
    '/favicon.svg'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // API / 동적 요청 → 네트워크 우선
    if (e.request.method !== 'GET' ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/auth/') ||
        url.pathname.startsWith('/payment/') ||
        url.pathname.startsWith('/admin/')) {
        return;
    }

    // 정적 자산 (CSS/JS/이미지) → 캐시 우선
    if (url.pathname.match(/\.(css|js|svg|png|jpg|ico|woff2?)$/)) {
        e.respondWith(
            caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            }))
        );
        return;
    }

    // HTML 페이지 → 네트워크 우선, 실패 시 캐시
    e.respondWith(
        fetch(e.request).then(res => {
            if (res.ok) {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
            }
            return res;
        }).catch(() => caches.match(e.request))
    );
});
