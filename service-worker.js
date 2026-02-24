/* Summer List — service-worker.js (FULL)
   - Network-first per HTML (aggiornamenti rapidi)
   - Cache-first per assets (offline veloce)
   - Cache versionata per forzare update
*/

const VERSION = "v9";
const CACHE_STATIC = `summer-list-static-${VERSION}`;
const CACHE_PAGES  = `summer-list-pages-${VERSION}`;

// Se la tua app sta in /summer-list-pwa/ su GitHub Pages:
const SCOPE = "/summer-list-pwa/";

// Metti qui i file core (aggiungi/togli se serve)
const CORE = [
  `${SCOPE}`,
  `${SCOPE}index.html`,
  `${SCOPE}manifest.webmanifest`,
  `${SCOPE}icons/icon-192.png`,
  `${SCOPE}icons/icon-512.png`,

  // Se usi cache-bust in HTML tipo styles.css?v=9 e app.js?v=9:
  `${SCOPE}styles.css?v=9`,
  `${SCOPE}app.js?v=9`,

  // Se in futuro userai theme param, verranno gestiti comunque (vedi fetch)
];

// Utility: prova a mettere in cache senza far fallire tutto se un file manca
async function cacheAddAllSafe(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const req = new Request(url, { cache: "reload" });
        const res = await fetch(req);
        if (res && res.ok) await cache.put(req, res.clone());
      } catch {
        // ignora
      }
    })
  );
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(cacheAddAllSafe(CACHE_STATIC, CORE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k !== CACHE_STATIC && k !== CACHE_PAGES) return caches.delete(k);
          return null;
        })
      );
      await self.clients.claim();
    })()
  );
});

// Helpers
function isHTMLRequest(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}
function isSameOrigin(url) {
  return url.origin === self.location.origin;
}
function isAsset(url) {
  // asset statici: css/js/png/svg/webp/woff2 ecc
  return (
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".ttf") ||
    url.pathname.endsWith(".webmanifest")
  );
}

// Strategie:
// - HTML: network-first (così vede subito le modifiche), fallback cache, fallback index
// - Assets: cache-first, fallback network
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Non toccare risorse esterne (font Google ecc)
  if (!isSameOrigin(url)) return;

  // Dentro la tua app scope
  if (!url.pathname.startsWith(SCOPE)) return;

  // ✅ HTML: network-first
  if (isHTMLRequest(req)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_PAGES);
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;

          // fallback finale: index
          const fallback = await caches.match(`${SCOPE}index.html`);
          return fallback || Response.error();
        }
      })()
    );
    return;
  }

  // ✅ Assets: cache-first
  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;

        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_STATIC);
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Default: network-first leggero
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_STATIC);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
