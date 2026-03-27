// Tagihku Service Worker
// Versi ini menggunakan strategi network-first untuk index.html
// sehingga update selalu langsung didapat tanpa clear cache.

const CACHE_NAME = 'tagihku-v3';

// Hanya cache aset statis eksternal (font, dll) — BUKAN index.html
const PRECACHE = [
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap',
];

// Install: precache font saja
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => Promise.allSettled(
        PRECACHE.map(url => c.add(new Request(url, {mode:'no-cors',cache:'default'})))
      ))
  );
  // Aktif langsung tanpa tunggu tab lain tutup
  self.skipWaiting();
});

// Activate: hapus cache lama
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Terima perintah SKIP_WAITING dari halaman
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  // JANGAN intercept:
  // 1. Supabase API calls (auth refresh, database queries)
  // 2. CDN Supabase JS
  if(
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.io') ||
    url.hostname.includes('jsdelivr.net')
  ) return;

  // index.html dan file same-origin: selalu network-first
  // Kalau network gagal, fallback ke cache
  if(
    url.origin === self.location.origin ||
    req.mode === 'navigate'
  ){
    e.respondWith(
      fetch(req).then(res => {
        // Update cache dengan versi terbaru
        if(res.ok){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Aset eksternal (font, dll): cache-first, update di background
  e.respondWith(
    caches.match(req).then(cached => {
      const networkFetch = fetch(req).then(res => {
        if(res && (res.ok || res.type === 'opaque')){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => null);

      return cached || networkFetch;
    })
  );
});
