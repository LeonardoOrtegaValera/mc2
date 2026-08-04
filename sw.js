// MC2 - Service Worker (version de archivo unico)
// Cachea solo la pagina y los iconos. Todo el codigo va dentro de index.html.
const VERSION = "mc2-v5";
const BASICOS = ["./", "./index.html", "./manifest.json",
                 "./iconos/icono-192.png", "./iconos/icono-512.png"];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(VERSION).then(c => c.addAll(BASICOS))
    .catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== VERSION).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;   // datos siempre frescos
  if (url.origin !== location.origin) return;
  ev.respondWith(
    fetch(req).then(res => {
      const copia = res.clone();
      caches.open(VERSION).then(c => c.put(req, copia)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
