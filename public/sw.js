const CACHE_NAME = "stillpoint-shell-v3";
const SHELL = ["/manifest.webmanifest", "/favicon.svg"];

async function cachePage(response) {
  if (!response.ok) throw new Error("Cannot cache an unsuccessful page");
  const html = await response.clone().text();
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
  await cache.put("/", response.clone());
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    fetch("/", { cache: "reload" })
      .then(cachePage)
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
  if (event.request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) event.waitUntil(cachePage(response).catch(() => undefined));
          else if (response.status >= 500) return (await caches.match("/")) || response;
          return response;
        })
        .catch(async () => (await caches.match("/")) || Response.error()),
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
