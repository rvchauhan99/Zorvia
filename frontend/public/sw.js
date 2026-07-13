/* Intentionally empty — PWA SW disabled to avoid App Router / HMR fights.
   Keep this file so old registrations that still point at /sw.js get a no-op. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
    })()
  );
});
