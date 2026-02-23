const CACHE="highlight-contact-v11";
const ASSETS=["./","./index.html","./styles.css","./app.js","./employees.csv","./manifest.webmanifest",
"./assets/icon-192.png","./assets/icon-512.png","./assets/header.png","./assets/hero.png"];
self.addEventListener("install",(e)=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",(e)=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",(e)=>{e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});
