// Tagihku Service Worker — v5
// Strategi: network-first untuk semua file lokal, skip Supabase sepenuhnya.

const CACHE = 'tagihku-v5';

self.addEventListener('install', e => {
  self.skipWaiting(); // langsung aktif
});

self.addEventListener('activate', e => {
  // Hapus semua cache lama
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if(e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  // ❌ Jangan intercept Supabase — biarkan langsung ke network
  if(url.hostname.includes('supabase.co') || url.hostname.includes('supabase.io')) return;

  // ❌ Jangan intercept CDN Supabase JS
  if(url.hostname.includes('jsdelivr.net')) return;

  // ✅ File lokal (index.html, sw.js, manifest.json): network-first
  // Selalu ambil versi terbaru, fallback ke cache kalau offline
  if(url.origin === self.location.origin) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          // Simpan ke cache sebagai fallback offline
          if(res.ok) {
            caches.open(CACHE).then(c => c.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(req)) // offline fallback
    );
    return;
  }

  // ✅ Font & aset CDN eksternal: cache-first (jarang berubah)
  e.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;
      return fetch(req).then(res => {
        if(res.ok || res.type === 'opaque') {
          caches.open(CACHE).then(c => c.put(req, res.clone()));
        }
        return res;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});
