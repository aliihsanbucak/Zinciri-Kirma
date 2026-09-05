const CACHE='zinciri-product-v2-i18n';
const FILES=['./','./index.html','./native-bridge.bundle.js','./product.css','./product-i18n.js','./locales/en.js','./product-validation.js','./product.js','./product-modules.js','./manifest.webmanifest','./assets/Manrope.ttf','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('zinciri-product-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  const allowed=new Set(FILES.map(file=>new URL(file,self.registration.scope).href));
  if(!allowed.has(event.request.url))return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))}return response}).catch(()=>caches.match(event.request)));
});
