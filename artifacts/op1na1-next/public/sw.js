// OP1NA1 Service Worker
// Strategy:
//   /_next/static/* + /icons/*  → cache-first (immutable hashed assets)
//   /api/*                       → network-first (no caching of POST; GET cached)
//   navigate (HTML)              → network-first, fallback /offline.html
//   everything else              → network-first

const CACHE_NAME = "op1na1-v1";

const PRECACHE = ["/offline.html", "/citizen-portal"];

// ─── Install ──────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
  );
  // Take control immediately without waiting for old SW to be released
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Immutable hashed static assets → cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API → network-first (only cache safe GET responses)
  if (url.pathname.startsWith("/api/")) {
    if (request.method === "GET") {
      event.respondWith(networkFirstApi(request));
    }
    // POST/PATCH/DELETE: let through unmodified (offline queue handled in app layer)
    return;
  }

  // HTML navigation → network-first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNav(request));
    return;
  }
});

// ─── Strategies ───────────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "offline", cached: false }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function networkFirstNav(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    return offline ?? new Response("Offline", { status: 503 });
  }
}

// ─── Background Sync ──────────────────────────────────────────────
// Triggered by the browser when connectivity is restored and the app
// registered a sync via ServiceWorkerRegistration.sync.register()
self.addEventListener("sync", (event) => {
  if (event.tag === "op1na1-offline-queue") {
    event.waitUntil(notifyClientsToFlushQueue());
  }
});

async function notifyClientsToFlushQueue() {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "FLUSH_OFFLINE_QUEUE" });
  }
}

// ─── Push notifications (future) ─────────────────────────────────
// self.addEventListener("push", (event) => { ... });
