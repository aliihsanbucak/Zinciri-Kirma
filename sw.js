const CACHE='zinciri-product-v4-notifications';
const FILES=['./','./index.html','./native-bridge.bundle.js','./product.css','./product-i18n.js','./locales/en.js','./product-validation.js','./product.js','./product-modules.js','./product-practices.js','./product-notifications.js','./manifest.webmanifest','./assets/Manrope.ttf','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('zinciri-product-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  const allowed=new Set(FILES.map(file=>new URL(file,self.registration.scope).href));
  if(!allowed.has(event.request.url))return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))}return response}).catch(()=>caches.match(event.request)));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const allowed=['today','settings','planner','tasks','routine','sport','calorie','practices','journal','budget','invest','events'];
  const page=allowed.includes(event.notification.data?.page)?event.notification.data.page:'today';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
    const client=clients.find(c=>c.url.startsWith(self.registration.scope));
    if(client){await client.focus();client.postMessage({type:'zk-notification-open',page});return}
    return self.clients.openWindow(new URL('./index.html?notification='+page,self.registration.scope).href);
  }));
});
