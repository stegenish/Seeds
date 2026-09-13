import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogUnavailableError } from "@/lib/server/catalog/postgres-repository";
import type { CatalogRepository, HostedCatalogState } from "@/lib/server/catalog/types";
import { makeTalk } from "@/test/factories";
import { handleCatalogRequest, parseCatalogVersion } from "./route";

const NOW = new Date("2026-09-13T08:00:00Z");
let repository: CatalogRepository;
let scheduleRefresh: () => void;

beforeEach(() => {
  repository = makeRepository();
  scheduleRefresh = vi.fn();
});

const request = (query = "", resource = "talks") =>
  handleCatalogRequest(
    new NextRequest(`http://localhost/api/catalog/${resource}${query}`),
    { params: Promise.resolve({ resource }) },
    { repository, scheduleRefresh, now: () => NOW },
  );

it.each([
  "?ids=",
  "?ids=-1",
  "?ids=1.1",
  `?ids=${Array.from({ length: 501 }, (_, i) => i + 1).join(",")}`,
  `?edition=${"x".repeat(101)}`,
])("rejects invalid input %s without database work", async (query) => {
  expect((await request(query)).status).toBe(400);
  expect(repository.getState).not.toHaveBeenCalled();
});

it("rejects unknown resources", async () => {
  expect((await request("", "unknown")).status).toBe(404);
  expect(repository.getState).not.toHaveBeenCalled();
});

it("serves numeric deltas from Neon with a short CDN lifetime", async () => {
  const response = await request("?edition=6");

  expect(repository.getIndex).toHaveBeenCalledWith("talks", 6);
  expect(response.headers.get("cache-control")).toBe(
    "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
  );
  expect(await response.json()).toEqual({ edition: "7", ids: [], removedIds: [] });
});

it("treats legacy source editions as a full synchronization", async () => {
  await request("?edition=2026-09-12%2012:00:00");
  expect(repository.getIndex).toHaveBeenCalledWith("talks", null);
});

it("deduplicates details and caches version-addressed batches", async () => {
  vi.mocked(repository.getTalkDetails).mockResolvedValue({
    edition: "7",
    items: [makeTalk({ id: 2 })],
    removedIds: [],
  });

  const response = await request("?ids=2,2&snapshot=7&edition=old");

  expect(repository.getTalkDetails).toHaveBeenCalledWith([2]);
  expect(await response.json()).toMatchObject({ edition: "7", items: [{ id: 2 }] });
  expect(response.headers.get("cache-control")).toBe(
    "public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400",
  );
});

it("uses short caching for legacy detail snapshots", async () => {
  const response = await request("?ids=2&snapshot=2026-09-12%2012:00:00");
  expect(response.headers.get("cache-control")).toContain("s-maxage=300");
});

it("uses short caching for detail snapshots newer than the active catalog", async () => {
  const response = await request("?ids=2&snapshot=8");
  expect(response.headers.get("cache-control")).toContain("s-maxage=300");
});

it("returns the current catalog and schedules stale refresh after the response", async () => {
  vi.mocked(repository.getState).mockResolvedValue(
    state({ lastSuccessfulRefreshAt: new Date("2026-09-12T08:00:00Z") }),
  );

  expect((await request()).status).toBe(200);
  expect(scheduleRefresh).toHaveBeenCalledOnce();
});

it("does not schedule refresh during failure backoff", async () => {
  vi.mocked(repository.getState).mockResolvedValue(
    state({
      lastSuccessfulRefreshAt: new Date("2026-09-12T07:00:00Z"),
      retryAfter: new Date("2026-09-13T09:00:00Z"),
    }),
  );

  expect((await request()).status).toBe(200);
  expect(scheduleRefresh).not.toHaveBeenCalled();
});

it("maps an uninitialized or failed database to recoverable responses", async () => {
  vi.mocked(repository.getIndex).mockRejectedValueOnce(new CatalogUnavailableError());
  const uninitialized = await request();
  expect(uninitialized.status).toBe(503);
  expect(uninitialized.headers.get("retry-after")).toBe("60");

  vi.mocked(repository.getIndex).mockRejectedValueOnce(new Error("database offline"));
  const failed = await request();
  expect(failed.status).toBe(503);
  expect(failed.headers.get("cache-control")).toBe("no-store");
});

describe("parseCatalogVersion", () => {
  it("accepts safe nonnegative integers only", () => {
    expect(parseCatalogVersion("0")).toBe(0);
    expect(parseCatalogVersion("42")).toBe(42);
    expect(parseCatalogVersion("01")).toBeNull();
    expect(parseCatalogVersion("-1")).toBeNull();
    expect(parseCatalogVersion("9007199254740992")).toBeNull();
    expect(parseCatalogVersion("2026-09-12 12:00:00")).toBeNull();
  });
});

function makeRepository(): CatalogRepository {
  return {
    getState: vi.fn(async () => state()),
    tryAcquireRefresh: vi.fn(),
    publishRefresh: vi.fn(),
    recordRefreshFailure: vi.fn(),
    getIndex: vi.fn(async () => ({ edition: "7", ids: [], removedIds: [] })),
    getTalkDetails: vi.fn(async () => ({ edition: "7", items: [], removedIds: [] })),
    getTeacherDetails: vi.fn(async () => ({ edition: "7", items: [], removedIds: [] })),
  };
}

function state(overrides: Partial<HostedCatalogState> = {}): HostedCatalogState {
  return {
    activeVersion: 7,
    sourceEditions: { talks: "source-talks", teachers: "source-teachers" },
    lastSuccessfulRefreshAt: NOW,
    retryAfter: null,
    ...overrides,
  };
}
