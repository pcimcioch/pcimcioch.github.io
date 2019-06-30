/* jshint esversion: 6 */
/* jshint node: true */

const DATA_CACHE_NAME = 'crawler-data-v2';
const SHELL_CACHE_NAME = 'crawler-shell-v2';
const DATA_URL = 'https://vader.joemonster.org';
const filesToCache = [
  '/',
  '/index.html',
  '/scripts/app.js',
  '/scripts/bootstrap.min.js',
  '/scripts/jquery.min.js',
  '/styles/style.css',
  '/styles/bootstrap.css',
  '/styles/bootstrap-theme.css',
  '/fonts/glyphicons-halflings-regular.eot',
  '/fonts/glyphicons-halflings-regular.svg',
  '/fonts/glyphicons-halflings-regular.ttf',
  '/fonts/glyphicons-halflings-regular.woff',
  '/fonts/glyphicons-halflings-regular.woff2',
  '/images/icons/icon-16x16.png',
  '/images/icons/icon-20x20.png',
  '/images/icons/icon-24x24.png',
  '/images/icons/icon-32x32.png',
  '/images/icons/icon-48x48.png',
  '/images/icons/icon-64x64.png',
  '/images/icons/icon-128x128.png',
  '/images/icons/icon-256x256.png',
  '/images/icons/icon-512x512.png',
];

self.addEventListener('install', function(e) {
  'use strict';

  console.log('[ServiceWorker] Install');
  e.waitUntil(
    caches.open(SHELL_CACHE_NAME).then(function(cache) {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener('activate', function(e) {
  'use strict';

  console.log('[ServiceWorker] Activate');
  e.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        if (key !== SHELL_CACHE_NAME && key !== DATA_CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );

  return self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  'use strict';

  if (e.request.url.startsWith(DATA_URL)) {
    e.respondWith(
      caches.open(DATA_CACHE_NAME).then(function(cache) {
        return cache.match(e.request).then(function(response) {
          return response || fetch(e.request).then(function(response) {
            cache.put(e.request.url, response.clone());
            return response;
          });
        });
      })
    );
  } else if (e.request.url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then(function(response) {
        return response || fetch(e.request);
      })
    );
  }
});
