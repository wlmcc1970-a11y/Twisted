// Twisted Companion — Service Worker
// Caches the app shell for offline use and caches Google Fonts so they survive network loss.
// Bump CACHE version when deploying significant updates to force a refresh.

const CACHE='twisted-v3';
const FONT_CACHE='twisted-fonts-v1';
const ASSETS=['./','./index.html'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(
    keys.filter(k=>k!==CACHE&&k!==FONT_CACHE).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  // Only handle GET requests — ignore POST/PUT/etc.
  if(e.request.method!=='GET')return;

  const url=new URL(e.request.url);

  // Google Fonts: cache-first, fall back to empty stylesheet if network fails
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(FONT_CACHE).then(c=>c.match(e.request).then(r=>{
      if(r)return r;
      return fetch(e.request).then(res=>{
        if(res&&res.status===200)c.put(e.request,res.clone());
        return res;
      }).catch(()=>new Response('',{status:200,headers:{'Content-Type':'text/css'}}));
    })));
    return;
  }

  // Everything else: cache-first, update cache in background on success, fall back to app shell on failure
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      if(res&&res.status===200&&res.type==='basic'){
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
      }
      return res;
    }).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))))
  );
});
