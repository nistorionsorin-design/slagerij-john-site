// /sw.js: the retiring worker (row 11k, 12.11.2026). Keep this file here for good.
//
// The previous site on this domain registered a service worker at this address (scope /) that answered requests
// from its own caches. Browsers that visited that site still run it, and it showed them stored copies of this site:
// pages, /api/ask, the shop's order list. A browser asks this address for a newer worker on each visit; while it
// answered 404, every check failed and the old worker stayed.
//
// This file is that newer worker. It takes over at once, deletes every cache of the origin, unregisters itself and
// reloads, from the network, the pages it took over. It has no fetch handler, so it never answers a request.
// The site registers no worker anywhere: only a browser that still carries the old registration ever runs this.
// Without this file those browsers would keep the old worker. vercel.json serves it with Cache-Control: no-store.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {}
      try {
        await self.registration.unregister();
      } catch {}
      const pages = await self.clients.matchAll({ type: 'window' });
      await Promise.all(
        pages.map(async (page) => {
          try {
            await page.navigate(page.url);
          } catch {}
        }),
      );
    })(),
  );
});
