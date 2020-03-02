self.addEventListener('install', e=>
  e.waitUntil( caches.open('netspeedtester-v2').then( cache=> cache.addAll(['/index.html','/webworker.js','/arc.js']) ) )
)

self.addEventListener('fetch', e=>
  e.respondWith( caches.match(e.request).then( response=> response || fetch(e.request) ) )
)
