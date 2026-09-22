const CACHE_NAME = "stillpoint-shell-v4";
const SHELL = ["/manifest.webmanifest", "/favicon.svg"];
const PAGES = ["/", "/favorites"];

async function cachePages(entries) {
  if (entries.some(([, response]) => !response.ok))
    throw new Error("Cannot cache an unsuccessful page");
  const html = (await Promise.all(entries.map(([, response]) => response.clone().text()))).join(
    "\n",
  );
  const assets = [
    ...new Set(
      Array.from(html.matchAll(/(?:src|href)=["'](\/_next\/static\/[^"']+)["']/g), (match) =>
        match[1].replaceAll("&amp;", "&"),
      ),
    ),
  ];
  const cache = await caches.open(CACHE_NAME);
  // Commit HTML only after all its startup dependencies have been cached.
  await cache.addAll([...SHELL, ...assets]);
  await Promise.all(entries.map(([path, response]) => cache.put(path, response.clone())));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all(PAGES.map(async (path) => [path, await fetch(path, { cache: "reload" })]))
      .then(cachePages)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("stillpoint-shell-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (event.request.mode === "navigate" && PAGES.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok)
            event.waitUntil(
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(url.pathname, response.clone()))
                .catch(() => undefined),
            );
          else if (response.status >= 500) return (await caches.match(url.pathname)) || response;
          return response;
        })
        .catch(async () => (await caches.match(url.pathname)) || Response.error()),
    );
    return;
  }
  if (SHELL.includes(url.pathname) || url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then(async (cached) => {
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
              .catch(() => undefined),
          );
        }
        return response;
      }),
    );
  }
});
