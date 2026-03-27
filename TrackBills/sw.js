// Tagihku SW — versi definitif
// Strategi: JANGAN cache file app lokal sama sekali.
// Hanya cache font eksternal (CDN).
// Ini memastikan user selalu dapat versi HTML/JS terbaru tanpa perlu clear cache.

const CACHE = 'tagihku-v4';
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap';

self.addEventListener('install', e => {
  // Langsung aktif, jangan tunggu tab lama tutup
  self.skipWaiting();
  // Cache font saja
  e.waitUntil(
    caches.open(CACHE).then(c =>
      c.add(new Request(FONT_URL, {mode:'no-cors'})).catch(()=>{})
    )
  );
});

self.addEventListener('activate', e => {
  // Hapus SEMUA cache lama (v1, v2, v3, dst)
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

  // ❌ JANGAN intercept request ke Supabase — biarkan langsung ke network
  if(url.hostname.includes('supabase.co') ||
     url.hostname.includes('supabase.io') ||
     url.hostname.includes('jsdelivr.net')){
    return; // browser handle sendiri
  }

  // ❌ JANGAN cache file lokal app (index.html, sw.js, manifest.json)
  // Selalu ambil dari network agar selalu dapat versi terbaru
  if(url.origin === self.location.origin){
    e.respondWith(
      fetch(req, {cache:'no-store'}).catch(()=>
        // Fallback ke cache hanya jika benar-benar offline
        caches.match(req)
      )
    );
    return;
  }

  // ✅ Untuk CDN eksternal (font, dll): cache-first
  e.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;
      return fetch(req).then(res => {
        if(res.ok || res.type === 'opaque'){
          caches.open(CACHE).then(c => c.put(req, res.clone()));
        }
        return res;
      }).catch(()=> new Response('', {status:503}));
    })
  );
});
