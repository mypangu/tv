// ===============================
// PANGU TV SERVICE WORKER
// Safe for streaming (no JSON, no video caching)
// ===============================

// Change this whenever you update UI files
const CACHE_VERSION = "1311252249";
const STATIC_CACHE = "pangu-static-" + CACHE_VERSION;

// Static assets ONLY (never include JSON or video files)
const STATIC_FILES = [
  "./",
  "./index.html",
  "./player.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  // Add CSS / JS if you create separate files
];

// File types NEVER cached (streaming-sensitive)
const BLOCKED_EXTENSIONS = [
  "json", "m3u8", "mpd", "ts", "m4s", "cmf", "cmfa",
  "cmfv", "cmft", "mp4", "aac", "webm"
];

// ===============================
// INSTALL – Cache static files
// ===============================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_FILES))
  );
  self.skipWaiting();
});

// ===============================
// ACTIVATE – Remove old caches
// ===============================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// ===============================
// FETCH – Streaming-safe handling
// ===============================
self.addEventListener("fetch", (event) => {
  const url = event.request.url.toLowerCase();

  // Block caching of streaming URLs by extension
  const ext = url.split(".").pop().split("?")[0];
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return event.respondWith(fetch(event.request)); // Always fresh
  }

  // Block caching if URL contains cookies or tokens
  if (url.includes("__hdnea__") || url.includes("cookie")) {
    return event.respondWith(fetch(event.request));
  }

  // Block caching of JSON always (channel list updates often)
  if (url.endsWith(".json")) {
    return event.respondWith(fetch(event.request));
  }

  // Default: static cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          // Cache only static assets
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
      );
    })
  );
});
