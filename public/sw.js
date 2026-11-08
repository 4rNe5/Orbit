/* Orbit Rating service worker.
 * - /_next/static: content-hashed → cache first
 * - jackets, emblems, icons: cache first, refreshed in the background after 7 days
 * - page navigations: network first, cached copy when offline
 * - everything else (RSC payloads, Supabase, other origins): untouched
 */
const VERSION = "orbit-v1";
const STATIC = `${VERSION}-static`;
const ASSETS = `${VERSION}-assets`;
const PAGES = `${VERSION}-pages`;
const ASSET_MAX_AGE = 7 * 24 * 3600 * 1000;
const STATIC_MAX = 400;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.add("/")).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(req, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const refresh = () =>
    fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        const headers = new Headers(copy.headers);
        headers.set("x-sw-cached-at", String(Date.now()));
        copy.blob().then((body) => cache.put(req, new Response(body, { status: res.status, headers })));
      }
      return res;
    });
  if (hit) {
    const at = Number(hit.headers.get("x-sw-cached-at") || 0);
    if (maxAge && Date.now() - at > maxAge) refresh().catch(() => {});
    return hit;
  }
  const res = await refresh();
  if (cacheName === STATIC) trim(STATIC, STATIC_MAX).catch(() => {});
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await cache.match("/")) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC, 0));
  } else if (/^\/(jackets|tiers|icons)\//.test(url.pathname)) {
    event.respondWith(cacheFirst(req, ASSETS, ASSET_MAX_AGE));
  } else if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
  }
});
