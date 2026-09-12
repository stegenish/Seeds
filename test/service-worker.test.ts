import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

function worker() {
  const handlers: Record<string, (event: unknown) => void> = {};
  const cache = { put: vi.fn(async () => undefined), addAll: vi.fn(async () => undefined) };
  const cacheStorage = {
    match: vi.fn(async (): Promise<Response | undefined> => undefined),
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ["another-app", "stillpoint-shell-v2", "stillpoint-shell-v3"]),
    delete: vi.fn(async () => true),
  };
  const fetcher = vi.fn(
    async () =>
      new Response(
        '<script src="/_next/static/app.js"></script><link href="/_next/static/app.css">',
      ),
  );
  const skipWaiting = vi.fn();
  const claim = vi.fn();
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL,
    Response,
    fetch: fetcher,
    caches: cacheStorage,
    self: {
      location: { origin: "http://localhost:3000" },
      skipWaiting,
      clients: { claim },
      addEventListener(name: string, handler: (event: unknown) => void) {
        handlers[name] = handler;
      },
    },
  });
  async function fire(name: string, path = "/_next/static/app.js", mode = "cors") {
    const background: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    handlers[name]!({
      request: { url: "http://localhost:3000" + path, method: "GET", mode },
      waitUntil(value: Promise<unknown>) {
        background.push(value);
      },
      respondWith(value: Promise<Response>) {
        response = value;
      },
    });
    const result = await response;
    await Promise.all(background);
    return result;
  }
  return { fire, cache, cacheStorage, fetcher, skipWaiting, claim };
}
it("caches fetched Next.js assets (R5)", async () => {
  const { fire, cache } = worker();
  expect((await fire("fetch"))?.ok).toBe(true);
  expect(cache.put).toHaveBeenCalled();
});
it("installs a complete shell before activating", async () => {
  const { fire, cache, skipWaiting } = worker();
  await fire("install");
  expect(cache.addAll).toHaveBeenCalledWith([
    "/manifest.webmanifest",
    "/favicon.svg",
    "/_next/static/app.js",
    "/_next/static/app.css",
  ]);
  expect(cache.addAll.mock.invocationCallOrder[0]).toBeLessThan(
    cache.put.mock.invocationCallOrder[0]!,
  );
  expect(skipWaiting).toHaveBeenCalled();
});
it("removes only obsolete app-owned caches on upgrade", async () => {
  const { fire, cacheStorage, claim } = worker();
  await fire("activate");
  expect(cacheStorage.delete).toHaveBeenCalledExactlyOnceWith("stillpoint-shell-v2");
  expect(claim).toHaveBeenCalled();
});
it("keeps the previous page if the network returns a server error", async () => {
  const { fire, cache, cacheStorage, fetcher } = worker();
  const cached = new Response("cached shell");
  cacheStorage.match.mockResolvedValue(cached);
  fetcher.mockResolvedValue(new Response("failed", { status: 503 }));
  expect(await fire("fetch", "/", "navigate")).toBe(cached);
  expect(cache.put).not.toHaveBeenCalled();
});
it("does not intercept APIs or cache failed assets", async () => {
  const { fire, cache, fetcher } = worker();
  expect(await fire("fetch", "/api/catalog/talks")).toBeUndefined();
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockResolvedValue(new Response("missing", { status: 404 }));
  await fire("fetch");
  expect(cache.put).not.toHaveBeenCalled();
});
it("leaves the old shell untouched if dependencies cannot be cached", async () => {
  const { fire, cache, skipWaiting } = worker();
  cache.addAll.mockRejectedValue(new Error("Quota full"));
  await expect(fire("install")).rejects.toThrow("Quota full");
  expect(cache.put).not.toHaveBeenCalled();
  expect(skipWaiting).not.toHaveBeenCalled();
});
