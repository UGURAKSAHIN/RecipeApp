const APP_SHELL_CACHE = "recipe-app-shell-v2";
const RUNTIME_CACHE = "recipe-app-runtime-v2";
const APP_SHELL_ASSETS = [
    "./",
    "./favicon.svg",
    "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS))
    );

    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys
                .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
                .map((key) => caches.delete(key))
        ))
    );

    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(event.request.url);

    if (requestUrl.origin === self.location.origin) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const networkFetch = fetch(event.request).then((response) => {
                    const responseClone = response.clone();

                    caches.open(APP_SHELL_CACHE).then((cache) => {
                        cache.put(event.request, responseClone);
                    });

                    return response;
                }).catch(() => cachedResponse);

                return cachedResponse || networkFetch;
            })
        );

        return;
    }

    if (requestUrl.origin === "https://www.themealdb.com") {
        event.respondWith(
            fetch(event.request).then((response) => {
                const responseClone = response.clone();

                caches.open(RUNTIME_CACHE).then((cache) => {
                    cache.put(event.request, responseClone);
                });

                return response;
            }).catch(() => caches.match(event.request))
        );
    }
});
