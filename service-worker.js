/* Summer List — service-worker.js (FULL) */

const CACHE_NAME = "summer-list-cache-v7";
const CORE_ASSETS = [
  "/summer-list-pwa/",
  "/summer-list-pwa/index.html",
  "/summer-list-pwa/styles.css?v=7",
  "/summer-list-pwa/app.js?v=7",
  "/summer-list-pwa/manifest.webmanifest",
  "/summer-list-pwa/icons/icon-192.png",
  "/summer-list-pwa/icons/icon-512.png"
].filter(Boolean);

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        // cache solo roba “safe”
        const url = new URL(req.url);
        if (url.origin === self.location.origin) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch {
        // fallback minimo: se offline e non in cache
        return cached || Response.error();
      }
    })()
  );
});
