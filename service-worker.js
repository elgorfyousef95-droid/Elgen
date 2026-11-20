
"use strict";

const CACHE_VERSION = "elgen-offline-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./login.html",
  "./register.html",
  "./platform.html",
  "./assets.css",
  "./app.js",
  "./auth.js",
  "./supabase-config.js",
  "./85.jpg",
  "./86.jpg",
  "./login-bg.jpg",
  "./1795124002624.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) =>
            key.startsWith("elgen-offline-") &&
            key !== CACHE_VERSION
          )
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // طلبات قاعدة البيانات لا تُخزّن كصفحات
  if (url.hostname.includes("supabase.co")) return;

  // صفحات الموقع
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          const file = url.pathname.split("/").pop() || "index.html";
          const fallback = new URL(file, self.registration.scope);

          return (
            await caches.match(fallback.href)
          ) || (
            await caches.match(
              new URL("index.html", self.registration.scope).href
            )
          );
        })
    );
    return;
  }

  // ملفات المشروع وصوره
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // الخطوط والصور الخارجية التي سبق تحميلها
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com" ||
    url.hostname === "images.unsplash.com"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (response && (response.ok || response.type === "opaque")) {
            const copy = response.clone();
            caches.open(CACHE_VERSION)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
