// sw.js: Lumen's service worker. It makes lessons start fast and lets Lumen open without internet.
//
//   - Lumen's own files: network first (always the newest version), the saved copy when offline.
//   - MediaPipe (the camera models, ~10 MB) and other files with a version in the address:
//     cache first. They never change, so after the first time they load instantly from this computer.
//   - Fonts and the Supabase library: the saved copy at once, refreshed in the background.
//   - Data (Supabase API), the AI and anything that isn't a GET request are never cached.
const CACHE = 'lumen-v1';
const IMMUTABLE = [/^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\//, /^https:\/\/storage\.googleapis\.com\/mediapipe-models\//];
const REFRESH = [/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, /^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\//];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

async function put(req, res) {
  if (!res || !(res.ok || res.type === 'opaque')) return;
  const cache = await caches.open(CACHE);
  const url = new URL(req.url);
  // keep only the newest version of each of our own files (style.css?v=1 replaces style.css?v=0)
  if (url.origin === self.location.origin && url.search) {
    for (const old of await cache.keys()) {
      const o = new URL(old.url);
      if (o.origin === url.origin && o.pathname === url.pathname && o.search !== url.search) await cache.delete(old);
    }
  }
  await cache.put(req, res);
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    throw e;
  }
}

async function staleWhileRevalidate(req, wait) {
  const hit = await caches.match(req);
  const fresh = fetch(req).then((res) => { put(req, res.clone()); return res; }).catch(() => null);
  if (hit) { wait(fresh); return hit; }
  return (await fresh) || Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (IMMUTABLE.some((r) => r.test(url))) { e.respondWith(cacheFirst(req)); return; }
  if (REFRESH.some((r) => r.test(url))) { e.respondWith(staleWhileRevalidate(req, (p) => e.waitUntil(p))); return; }
  if (new URL(url).origin === self.location.origin) e.respondWith(networkFirst(req));
});

// The page asks to save the camera models in the background on the first visit,
// so even the very first lesson starts fast.
self.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'warm' || !Array.isArray(e.data.urls)) return;
  e.waitUntil((async () => {
    for (const u of e.data.urls) {
      if (!IMMUTABLE.some((r) => r.test(u)) || await caches.match(u)) continue;
      try { await put(new Request(u), await fetch(u)); } catch { /* offline: next time */ }
    }
  })());
});
