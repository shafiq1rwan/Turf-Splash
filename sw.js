/* Turf Splash service worker — caches the app shell for offline play + PWA install.
   Bump CACHE when shipping new assets so clients refresh. */
const CACHE = "turf-splash-v7";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/painter.png",
  "./assets/painter-se.png",
  "./assets/painter-e.png",
  "./assets/painter-ne.png",
  "./assets/painter-n.png",
  "./assets/cover-block.png",
  "./assets/splat-decal.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // Cache-first; fall back to network, and to index.html for navigations when offline.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => (req.mode === "navigate" ? caches.match("./index.html") : undefined))
    )
  );
});
