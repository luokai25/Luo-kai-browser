// Luo Browser Service Worker - PWA + Caching
const CACHE_NAME = 'luo-browser-v2';
const urls = [
    '/',
    '/index.html',
    '/pages/home.html',
    '/pages/search.html',
    '/pages/agents.html',
    '/pages/chat.html',
    '/pages/mail.html',
    '/pages/cloud.html',
    '/pages/calendar.html',
    '/pages/notes.html',
    '/pages/bookmarks.html',
    '/pages/history.html',
    '/pages/settings.html'
];

// Install - cache essential pages
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urls))
    );
    self.skipWaiting();
});

// Fetch - cache first, then network
self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request).then(fetchRes => {
                return caches.open(CACHE_NAME).then(cache => {
                    if (e.request.url.startsWith('http')) {
                        cache.put(e.request, fetchRes.clone());
                    }
                    return fetchRes;
                });
            });
        }).catch(() => caches.match('/index.html'))
    );
});

// Activate - clean old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => 
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// ZSTD-like compression for cache (simplified)
const compress = data => {
    if (typeof data === 'object') data = JSON.stringify(data);
    const dict = {};
    let result = '';
    let seq = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data[i];
        const key = seq + char;
        if (dict[key] !== undefined) {
            seq = dict[key];
        } else {
            if (seq > 0) result += String.fromCharCode(128 + (seq % 128));
            result += char;
            dict[key] = ++seq;
        }
    }
    return result;
};

const decompress = data => {
    try {
        let result = '';
        let seq = 0;
        for (let i = 0; i < data.length; i++) {
            const code = data.charCodeAt(i);
            if (code >= 128) {
                seq = code - 128;
            } else {
                result += (seq > 0 ? String.fromCharCode(seq) : '') + data[i];
                seq = 0;
            }
        }
        return result;
    } catch { return data; }
};
