const CACHE_VERSION = "lojanova-pwa-v20260816-compresor500kb";
const APP_SHELL = [
  // Esta versión separada invalida el caché anterior sin depender del archivo histórico.
  "/",
  "/index.html",
  "/offline.html",
  "/css/style.css?v=20260820-noticias",
  "/js/config.js",
  "/js/supabase-client.js?v=20260803-force-floating",
  "/js/noticias-data.js?v=20260820-noticias",
  "/js/main.js?v=20260820-noticias",
  "/noticia.html",
  "/js/noticia.js?v=20260820-noticias",
  "/assets/noticias/taller-loja-emiratos-2026.webp",
  "/js/translator.js?v=20260803-force-floating",
  "/assets/lojanova-app-icon.svg",
  "/assets/lojanova-app-icon-192.png",
  "/assets/lojanova-app-icon-512.png",
  "/assets/logo-prefectura-loja.png"
];

const ACTIVE_CACHE_VERSION = "lojanova-pwa-v20260820-noticias";

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(ACTIVE_CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== ACTIVE_CACHE_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(ACTIVE_CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || (await cache.match("/offline.html"));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ACTIVE_CACHE_VERSION);
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









