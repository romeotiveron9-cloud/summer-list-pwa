/* service-worker.js
   Summer List PWA - OFFLINE serio + aggiornamenti
   Funziona bene su GitHub Pages usando percorsi RELATIVI (./)
*/

const CACHE_VERSION = "v1.0.0"; // <-- cambia questo (v1.0.1, v1.0.2...) quando aggiorni file
const PRECACHE = `summerlist-precache-${CACHE_VERSION}`;
const RUNTIME = `summerlist-runtime-${CACHE_VERSION}`;

// File da tenere sempre offline (stessa cartella di index.html)
const PRECACHE_URLS = [
  "./", // importante: copre la root della PWA
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Install: precache + attiva subito la nuova versione
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

// Activate: pulizia cache vecchie + prendi controllo subito
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => {
          if (k !== PRECACHE && k !== RUNTIME) return caches.delete(k);
        })
      );
      await self.clients.claim();
    })()
  );
});

// Opzionale: permette alla pagina di chiedere "aggiorna ora"
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch strategy:
// - Navigazioni (pagine): network-first, fallback cache (così anche offline apre l’app)
// - Asset (css/js/img): stale-while-revalidate (apre subito, aggiorna in background)
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Solo same-origin (evita problemi con google fonts, ecc.)
  if (url.origin !== self.location.origin) return;

  // 1) NAVIGAZIONE (apertura pagine / refresh)
  // In molte webview/Chrome, questo è il pezzo che decide se diventa "app" vera.
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  // 2) STATIC ASSETS (css/js/img…)
  event.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(request) {
  const runtime = await caches.open(RUNTIME);
  try {
    const fresh = await fetch(request, { cache: "no-store" });
    // Salva una copia aggiornata
    runtime.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    // Offline: prova cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback importante: index.html (app shell)
    const fallback = await caches.match("./index.html");
    return fallback || new Response("Offline", { status: 503, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(request) {
  const runtime = await caches.open(RUNTIME);
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((fresh) => {
      runtime.put(request, fresh.clone());
      return fresh;
    })
    .catch(() => null);

  // Se ho cache, rispondo subito e aggiorno in background
  if (cached) {
    eventWait(fetchPromise); // non blocca la risposta
    return cached;
  }

  // Altrimenti provo rete
  const fresh = await fetchPromise;
  return fresh || new Response("", { status: 504, statusText: "No cached response" });
}

// Piccolo helper per non far crashare su alcune versioni
function eventWait(promise) {
  try {
    self.registration && promise && promise.catch(() => {});
  } catch {}
}
