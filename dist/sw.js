const CACHE='reaction-stable-click-v3';
const FILES=['./','./index.html','./style.css?v=1.0.2','./app.js?v=1.0.2','./core.js','./fit.js','./analytics.js','./worker.js','./renderer.js','./storage.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('reaction-stable-click-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).catch(async()=>{const found=await caches.match(e.request);if(found)return found;throw Error('离线资源不可用');}));});
