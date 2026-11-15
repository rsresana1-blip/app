// Service worker: tiene in memoria i file dell'app per aprirla anche senza rete.
// Cambia il numero di versione a ogni aggiornamento pubblicato.
const V = 'scout-v1';
const FILES = ['./', 'index.html', 'config.js', 'css/style.css', 'js/app.js', 'js/store.js', 'js/schema.js', 'js/ui.js', 'js/views.js', 'icons/icon.svg', 'icons/icon-192.png', 'manifest.webmanifest', 'esempi/carta-di-clan-esempio.pdf', 'esempi/progetto-di-branca-esempio.pdf'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // Prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata.
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(V).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
