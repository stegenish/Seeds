import { NextRequest } from "next/server";
import { expect, it, vi } from "vitest";
import { handleRefreshRequest } from "./route";

function request(authorization?: string) {
  return new NextRequest("http://localhost/api/catalog/refresh", {
    headers: authorization ? { authorization } : undefined,
  });
}

it("rejects missing configuration and invalid credentials without refreshing", async () => {
  const refresh = vi.fn();
  expect((await handleRefreshRequest(request(), { secret: undefined, refresh })).status).toBe(503);
  expect((await handleRefreshRequest(request(), { secret: "secret", refresh })).status).toBe(401);
  expect(refresh).not.toHaveBeenCalled();
});

it("runs the forced refresh for Vercel's bearer token", async () => {
  const refresh = vi.fn(async () => ({
    status: "published" as const,
    version: 8,
    changed: true,
    itemCount: 3,
  }));

  const response = await handleRefreshRequest(request("Bearer secret"), {
    secret: "secret",
    refresh,
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toMatchObject({ status: "published", version: 8 });
  expect(refresh).toHaveBeenCalledOnce();
});

it("returns a failing status without exposing refresh errors", async () => {
  const refresh = vi.fn(async () => {
    throw new Error("sensitive internal detail");
  });

  const response = await handleRefreshRequest(request("Bearer secret"), {
    secret: "secret",
    refresh,
  });

  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Catalog refresh failed" });
});
