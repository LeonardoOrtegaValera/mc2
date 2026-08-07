// MC2 - Service Worker (version de archivo unico)
// Cachea solo la pagina y los iconos. Todo el codigo va dentro de index.html.
const VERSION = "mc2-v7";
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

// =====================================================================
//  NOTIFICACIONES  (agregado el 7 de agosto de 2026)
//
//  Esto es lo que hace que le llegue el aviso al contratista aunque
//  tenga la app cerrada. El navegador despierta este archivo solo,
//  sin que la app este abierta.
// =====================================================================

self.addEventListener("push", (ev) => {
  let d = { titulo: "MC2", cuerpo: "Tienes algo nuevo", url: "/", etiqueta: "mc2" };
  try { if (ev.data) d = { ...d, ...ev.data.json() }; } catch (e) {}

  ev.waitUntil(
    self.registration.showNotification(d.titulo, {
      body: d.cuerpo,
      icon: "./iconos/icono-192.png",
      badge: "./iconos/icono-192.png",
      // La etiqueta hace que dos avisos del MISMO trabajo se reemplacen
      // en vez de acumularse. Sin esto, cinco actualizaciones dejan
      // cinco notificaciones apiladas.
      tag: d.etiqueta,
      renotify: true,
      requireInteraction: true,   // no se va sola: es trabajo, no un "me gusta"
      vibrate: [200, 100, 200],
      data: { url: d.url },
    })
  );
});

self.addEventListener("notificationclick", (ev) => {
  ev.notification.close();
  const destino = (ev.notification.data && ev.notification.data.url) || "/";

  ev.waitUntil((async () => {
    const abiertas = await clients.matchAll({ type: "window", includeUncontrolled: true });
    // Si la app ya esta abierta, se trae al frente en vez de abrir otra.
    for (const c of abiertas) {
      if (c.url.includes(self.registration.scope) && "focus" in c) {
        try { await c.navigate(self.registration.scope + destino.replace(/^\//, "")); }
        catch (e) {}
        return c.focus();
      }
    }
    if (clients.openWindow) {
      return clients.openWindow(self.registration.scope + destino.replace(/^\//, ""));
    }
  })());
});
