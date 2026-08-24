const STATIC_CACHE = 'dosecerta-static-v2';
const RUNTIME_CACHE = 'dosecerta-runtime-v2';

const LOCAL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

const REMOTE_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone@7.29.7/babel.min.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
    'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,600;14..32,700;14..32,800;14..32,900&display=swap'
];

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(LOCAL_ASSETS);

        await Promise.allSettled(REMOTE_ASSETS.map(async assetUrl => {
            const request = new Request(assetUrl, { mode: 'no-cors', cache: 'reload' });
            const response = await fetch(request);
            await cache.put(assetUrl, response);
        }));

        await self.skipWaiting();
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter(cacheName => cacheName.startsWith('dosecerta-') && ![STATIC_CACHE, RUNTIME_CACHE].includes(cacheName))
            .map(cacheName => caches.delete(cacheName)));
        await self.clients.claim();
    })());
});

const networkFirstNavigation = async request => {
    try {
        const response = await fetch(request);
        if (response && response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return (await caches.match(request)) ||
            (await caches.match('./index.html')) ||
            (await caches.match('./'));
    }
};

const cacheFirstStaticAsset = async request => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, response.clone());
    }
    return response;
};

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstNavigation(request));
        return;
    }

    const staticDestinations = ['script', 'style', 'font', 'image'];
    if (new URL(request.url).origin === self.location.origin || staticDestinations.includes(request.destination)) {
        event.respondWith(cacheFirstStaticAsset(request));
    }
});
