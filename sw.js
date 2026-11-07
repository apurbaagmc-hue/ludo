// Ludo service worker: the whole app is stored on the phone, so it opens instantly
// and works without internet for games against the computer.
// Files are served from storage first and refreshed in the background, so an update
// you upload shows up on the next launch. Online rooms (Apps Script) are not touched.
const CACHE = 'ludo-v2';
const FILES = [
  './', './index.html', './engine.js', './manifest.webmanifest', './fonts/baloo-da-2.woff2',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const nav = req.mode === 'navigate';
  const key = nav ? './index.html' : req;          // room links (?room=ABCD) use the same page
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(nav ? new Request('./index.html', { cache: 'no-cache' }) : new Request(req, { cache: 'no-cache' }))
      .then(res => { if (res.ok) cache.put(key, res.clone()); return res; });
    if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh.catch(() => new Response('Offline', { status: 503 }));
  }));
});
