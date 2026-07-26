var CACHE_PREFIX = 'litpath-workbench-';
var CACHE = CACHE_PREFIX + 'v9';
var CORE = ['./', './index.html', './styles.css', './cost-policy.js', './literature-core.js', './workspace-core.js', './account-core.js', './script.js', './manifest.webmanifest', './favicon.svg'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (key) {
      return key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE ? caches.delete(key) : null;
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(function (response) {
      if (response && response.ok) return response;
      return caches.match('./index.html').then(function (cached) { return cached || response; });
    }).catch(function () {
      return caches.match('./index.html').then(function (cached) { return cached || caches.match('./'); });
    }));
    return;
  }
  event.respondWith(fetch(event.request).then(function (response) {
    if (!response || !response.ok) {
      return caches.match(event.request).then(function (cached) { return cached || response; });
    }
    if (response.headers.get('Cache-Control') !== 'no-store') {
      caches.open(CACHE).then(function (cache) { cache.put(event.request, response.clone()); });
    }
    return response;
  }).catch(function () { return caches.match(event.request); }));
});
