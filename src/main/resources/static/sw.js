const CACHE = 'gravity-v12';

// 앱 셸 (오프라인 폴백용) — JS/CSS는 HTML 버전 파라미터로 관리, SW 불개입
const STATIC = [
    '/css/common.css',
    '/css/responsive.css',
    '/css/bottom-nav.css',
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

    // JS / CSS → SW 개입하지 않음
    // HTML의 ?v=N 버전 파라미터가 HTTP 캐시를 정확히 제어하므로 SW 불필요
    // SW가 개입하면 구 버전이 캐시에 남아 Ctrl+Shift+R 없이는 갱신 안 되는 문제 발생
    if (url.pathname.match(/\.(js|css)$/)) {
        return;
    }

    // 이미지·폰트·아이콘 → 캐시 우선
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
