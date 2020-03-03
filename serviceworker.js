self.addEventListener('install', e=>
  e.waitUntil( caches.open('netspeedtester-v3').then( cache=> cache.addAll(['/index.html','/webworker.js','/arc.js']) ) )
)

self.addEventListener('fetch', e=> {
  if ( e.request.url.match( 'api\/index\.js' ) ) return false
  e.respondWith( caches.match(e.request).then( response=> response || fetch(e.request) ) )
})
