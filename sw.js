/* Service worker — rend ChantierQuest disponible hors ligne.
   Au premier chargement, il met en cache tous les fichiers de l'app.
   Ensuite, l'app se lance sans réseau, exactement comme une app native. */

const CACHE = "chantierquest-v4";
const ASSETS = [
  "index.html",
  "app.js",
  "data.js",
  "style.css",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

// Installation : on télécharge et met en cache tout le contenu de l'app.
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

// Activation : on supprime les anciens caches d'une version précédente.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Requêtes : on sert d'abord depuis le cache (donc hors ligne), le réseau en secours.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("index.html")))
  );
});
