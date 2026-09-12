import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

it("R5: stores successfully fetched Next.js assets for offline startup", async () => {
  let handleFetch: (event: unknown) => void = () => undefined;
  const put = vi.fn();
  const response = new Response("/* application code */");
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL,
    self: {
      location: { origin: "http://localhost:3000" },
      addEventListener(name: string, handler: typeof handleFetch) {
        if (name === "fetch") handleFetch = handler;
      },
    },
    caches: {
      match: vi.fn(async () => undefined),
      open: vi.fn(async () => ({ put })),
    },
    fetch: vi.fn(async () => response),
  });
  let result: Promise<Response> | undefined;
  const background: Promise<unknown>[] = [];
  handleFetch({
    request: {
      url: "http://localhost:3000/_next/static/chunks/app.js",
      method: "GET",
      mode: "cors",
    },
    respondWith(value: Promise<Response>) {
      result = value;
    },
    waitUntil(value: Promise<unknown>) {
      background.push(value);
    },
  });
  expect(await result).toBe(response);
  await Promise.all(background);
  expect(put).toHaveBeenCalled();
});
