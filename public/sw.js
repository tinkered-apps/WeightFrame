"use strict";

// Caches the whole app so it installs and opens without a network. Files are
// network-first, so a deploy shows up at once and the cache is the offline
// fallback. CACHE carries APP_VERSION from js/ui/app.js; bump both together
// (see AGENTS.md). tests/pwa.test.js keeps SHELL in step with public/.
const CACHE = "weightframe-v1.02";
const SHELL = [
  "./",
  "index.html",
  "privacy.html",
  "manifest.webmanifest",
  "screenshots/narrow.png",
  "screenshots/wide.png",
  "css/styles.css",
  "assets/weightframe-mark.svg",
  "assets/fonts/hanken-grotesk-italic-latin-ext.woff2",
  "assets/fonts/hanken-grotesk-italic-latin.woff2",
  "assets/fonts/hanken-grotesk-latin-ext.woff2",
  "assets/fonts/hanken-grotesk-latin.woff2",
  "assets/fonts/jetbrains-mono-latin-ext.woff2",
  "assets/fonts/jetbrains-mono-latin.woff2",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "js/data/growth-refs.js",
  "js/core/refs.js",
  "js/core/i18n-text.js",
  "js/core/stats.js",
  "js/core/anthro.js",
  "js/core/growth.js",
  "js/core/energy.js",
  "js/core/hall.js",
  "js/core/assess.js",
  "js/ui/theme-init.js",
  "js/ui/icons.js",
  "js/ui/format.js",
  "js/ui/i18n.js",
  "js/ui/charts.js",
  "js/ui/methods.js",
  "js/ui/board.js",
  "js/ui/app.js",
  "js/ui/privacy.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (new URL(request.url).pathname === "/sw.js") return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then((hit) => hit || (request.mode === "navigate" ? caches.match("index.html") : undefined))
      )
  );
});
