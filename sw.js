const CACHE_VERSION = "lojanova-pwa-v20260802";
const APP_SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/css/style.css?v=20260802-pwa",
  "/js/config.js",
  "/js/supabase-client.js?v=20260802-pwa",
  "/js/main.js?v=20260802-pwa",
  "/js/translator.js?v=20260802-pwa",
  "/assets/lojanova-app-icon.svg",
  "/assets/logo-prefectura-loja.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || (await cache.match("/offline.html"));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.hostname.includes("supabase.co")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
