const CACHE_NAME = 'med-app-cache-v4';
self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(['./', './index.html', './manifest.json', './med.png']);
    }));
});
self.addEventListener('fetch', (e) => {
    e.respondWith(caches.match(e.request).then((response) => response || fetch(e.request)));
});
