/* Mentrixa service worker — static cache-first, API network-first, offline navigation fallback. */
const VERSION = "mentrixa-sw-v2";
const STATIC_CACHE = `${VERSION}-static`;
const API_CACHE = `${VERSION}-api`;

const PRECACHE_URLS = ["/offline", "/icons/icon-192.png", "/mentrixa-checkout-logo.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isStaticAsset(url) {
  const p = url.pathname;
  return (
    p.startsWith("/_next/static/") ||
    p.startsWith("/icons/") ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|gif|webp|svg|ico)$/i.test(p)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match("/offline").then((r) => r || new Response("Offline", { status: 503 })))
    );
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok || res.status === 304) {
            const copy = res.clone();
            caches.open(API_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || new Response(JSON.stringify({ offline: true }), { status: 503 }))
        )
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
  }
});

/** Ask open tabs to flush the client-side XP queue (IndexedDB + POST /api/pwa/xp-sync) */
self.addEventListener("sync", (event) => {
  if (event.tag === "mentrixa-xp-sync") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: "MENTRIXA_FLUSH_XP_QUEUE" });
        }
      })
    );
  }
});
