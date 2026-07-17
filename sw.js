var CACHE = 'litpath-workbench-v3';
var CORE = ['./', './index.html', './styles.css', './script.js', './manifest.webmanifest', './favicon.svg'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (key) { return key === CACHE ? null : caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(function (response) {
      var copy = response.clone();
      caches.open(CACHE).then(function (cache) { cache.put('./', copy); });
      return response;
    }).catch(function () { return caches.match('./'); }));
    return;
  }
  event.respondWith(caches.match(event.request).then(function (cached) {
    var network = fetch(event.request).then(function (response) {
      if (response.ok) caches.open(CACHE).then(function (cache) { cache.put(event.request, response.clone()); });
      return response;
    }).catch(function () { return cached; });
    return cached || network;
  }));
});
