const CACHE='reaction-stable-click-v4';
const FILES=['./','./index.html','./style.css?v=1.0.3','./app.js?v=1.0.3','./core.js?v=1.0.3','./fit.js','./analytics.js?v=1.0.3','./worker.js?v=1.0.3','./renderer.js?v=1.0.3','./storage.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('reaction-stable-click-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).catch(async()=>{const found=await caches.match(e.request);if(found)return found;throw Error('离线资源不可用');}));});
