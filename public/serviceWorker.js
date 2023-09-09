const PRECACHE = 'precache-v1';

// A list of local resources we always want to be cached.
const PRECACHE_URLS = [
    /*
    'index.html',
    'style.css',
    'templates.js',
    'pages.js',
    */
    'media/crown-coin.svg',
    'media/CyberwayRiders.woff',
    'media/CyberwayRiders.woff2',
    'media/game-console.svg',
    'media/processor.svg',
    'media/shopping-cart.svg',
    'media/smartphone.svg',
    'media/splogo.svg',
    'media/two-shadows.svg',
    'media/wallet.svg',
    'lib/quagga.min.js',
    /*
    'classes/DbAsset.js',
    'classes/Inventory.js',
    'classes/Page.js',
    'classes/Rest.js',
    'classes/Scanner.js',
    'classes/ShopItem.js',
    'classes/User.js',
    */
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(PRECACHE)
        .then(cache => cache.addAll(PRECACHE_URLS))
        .then(self.skipWaiting())
    );
});


// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
    
    const currentCaches = [PRECACHE];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
        }).then(cachesToDelete => {
            return Promise.all(cachesToDelete.map(cacheToDelete => {
                return caches.delete(cacheToDelete);
            }));
        }).then(() => self.clients.claim())
    );

});

// The fetch handler serves responses for same-origin resources from a cache.
// from the network before returning it to the page.
self.addEventListener('fetch', event => {
    
    // Skip cross-origin requests, like those for Google Analytics.
    if( event.request.url.startsWith(self.location.origin) ){

        event.respondWith(

            (async function () {
                
                try{
                    
                    return await fetch(event.request);

                }
                catch( err ){
                    return await caches.match(event.request);
                }

            })()

        );
    }
});

