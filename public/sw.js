/**
 * Service Worker - Manajemen Desa Rungkang PWA
 * 
 * Strategi: Network First dengan fallback offline page.
 * - Halaman app selalu mengambil dari network (data real-time Firebase)
 * - Asset statis (font, icon, css) di-cache agar loading cepat
 */

const CACHE_NAME = 'rungkang-v1';
const OFFLINE_URL = '/offline.html';

// Asset statis yang di-cache saat install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/favicon.ico',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Jika offline.html belum ada, abaikan
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch (Network First) ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Abaikan request non-HTTP (chrome-extension, dll)
  if (!request.url.startsWith('http')) return;

  // Abaikan Firebase, Google API, Apps Script (butuh network langsung)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    return;
  }

  // Untuk navigasi halaman: Network First, fallback ke cache, lalu offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache response navigasi yang sukses
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          // Offline: coba dari cache, kalau tidak ada tampilkan offline page
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Untuk asset statis (_next/static, gambar, icon): Cache First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/android-chrome') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        });
      })
    );
    return;
  }
});
