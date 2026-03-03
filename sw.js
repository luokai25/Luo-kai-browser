// Luo Desktop Service Worker - Offline Support + Caching
const CACHE_NAME = 'luo-desktop-v1';
const ASSETS = [
    '/',
    '/desktop.html',
    '/index.html',
    '/pages/home.html',
    '/pages/search.html',
    '/pages/agents.html',
    '/pages/chat.html',
    '/pages/calendar.html',
    '/pages/notes.html'
];

// Install - cache all assets
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching assets...');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', e => {
    e.respondWith(
        fetch(e.request)
            .then(response => {
                // Clone and cache successful responses
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(e.request).then(cached => {
                    return cached || caches.match('/desktop.html');
                });
            })
    );
});

// Activate - clean old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => 
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Background sync for data
self.addEventListener('sync', e => {
    if (e.tag === 'sync-data') {
        console.log('[SW] Background sync...');
    }
});

// Push notifications
self.addEventListener('push', e => {
    const data = e.data?.json() || { title: 'Luo Desktop', body: 'Notification' };
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><text y="32">🦁</text></svg>'
    });
});
