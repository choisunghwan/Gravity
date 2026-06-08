const CACHE = 'gravity-v11';

// 앱 셸 (오프라인 폴백용) — CSS/JS는 HTML이 버전 파라미터로 관리하므로 여기선 제외
const STATIC = [
    '/css/common.css',
    '/css/feed.css',
    '/css/mypage.css',
    '/css/responsive.css',
    '/css/notifications.css',
    '/css/planet.css',
    '/css/landing.css',
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

    // API / 동적 요청 → 네트워크 전용
    if (e.request.method !== 'GET' ||
        url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/auth/') ||
        url.pathname.startsWith('/payment/') ||
        url.pathname.startsWith('/admin/')) {
        return;
    }

    // JS / CSS → 항상 네트워크 우선 (버전 파라미터로 캐시 무효화 보장)
    // 배포 즉시 최신 코드 반영, 오프라인 시에만 캐시 폴백
    if (url.pathname.match(/\.(js|css)$/)) {
        e.respondWith(
            fetch(e.request).then(res => {
                if (res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, clone));
                }
                return res;
            }).catch(() => caches.match(e.request))
        );
        return;
    }

    // 이미지·폰트·아이콘 → 캐시 우선 (자주 변경되지 않음)
    if (url.pathname.match(/\.(svg|png|jpg|ico|woff2?)$/)) {
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
