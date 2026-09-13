import { describe, expect, it, vi } from "vitest";
import { DharmaSeedRequestError } from "@/lib/integrations/dharmaseed/client";
import { makeTalk } from "@/test/factories";
import { isCatalogRefreshDue, refreshCatalog, type DharmaSeedRequester } from "./refresh";
import type { CatalogRepository, HostedCatalogState, RefreshLease } from "./types";

const STARTED_AT = new Date("2026-09-13T08:00:00Z");

describe("refreshCatalog", () => {
  it("validates both resources and publishes one atomic update", async () => {
    const repository = makeRepository();
    const request = fixtureRequester();

    const result = await refreshCatalog({
      repository,
      request,
      now: () => STARTED_AT,
      sleep: async () => undefined,
    });

    expect(result).toEqual({ status: "published", version: 1, changed: true, itemCount: 2 });
    expect(repository.publishRefresh).toHaveBeenCalledOnce();
    const update = vi.mocked(repository.publishRefresh).mock.calls[0][1];
    expect(update.sourceEditions).toEqual({
      teachers: "2026-09-13 08:00:00",
      talks: "2026-09-13 08:00:00",
    });
    expect(update.teachers).toMatchObject([{ id: 10, name: "Test Teacher" }]);
    expect(update.talks).toMatchObject([{ id: 1, title: "A talk about practice" }]);
    expect(repository.recordRefreshFailure).not.toHaveBeenCalled();
  });

  it("does no upstream work when another refresh owns the lease", async () => {
    const repository = makeRepository({ lease: null });
    const request = vi.fn<DharmaSeedRequester>();

    await expect(refreshCatalog({ repository, request })).resolves.toEqual({ status: "skipped" });

    expect(request).not.toHaveBeenCalled();
    expect(repository.publishRefresh).not.toHaveBeenCalled();
  });

  it("retains the last good catalog when a detail batch is incomplete", async () => {
    const repository = makeRepository();
    const request: DharmaSeedRequester = async (resource, payload) => {
      if (resource === "teachers") return emptyResponse(payload.ids);
      if (!payload.ids) return indexResponse([1]);
      return { edition: edition(), items: {}, x_items: [] };
    };

    await expect(refreshCatalog({ repository, request, now: () => STARTED_AT })).rejects.toThrow(
      "incomplete talks batch",
    );

    expect(repository.publishRefresh).not.toHaveBeenCalled();
    expect(repository.recordRefreshFailure).toHaveBeenCalledWith(
      expect.objectContaining({ token: "refresh-token" }),
      STARTED_AT,
      new Date("2026-09-13T09:00:00Z"),
      "Dharma Seed returned an incomplete talks batch",
    );
  });

  it("lets removals win over contradictory detail records", async () => {
    const repository = makeRepository({ activeVersion: 1 });
    const talk = makeTalk();
    const request: DharmaSeedRequester = async (resource, payload) => {
      if (resource === "teachers") return emptyResponse(payload.ids);
      if (!payload.ids) return indexResponse([1], [1]);
      return talkDetails(talk.id);
    };

    await refreshCatalog({ repository, request, now: () => STARTED_AT });

    const update = vi.mocked(repository.publishRefresh).mock.calls[0][1];
    expect(update.talks).toEqual([]);
    expect(update.removedTalkIds).toEqual([1]);
  });

  it("does not retain historical removal tombstones in the initial catalog", async () => {
    const repository = makeRepository();
    const request: DharmaSeedRequester = async (resource, payload) =>
      payload.ids
        ? { edition: edition(), items: {}, x_items: [] }
        : indexResponse([], [resource === "talks" ? 99 : 98]);

    await refreshCatalog({ repository, request, now: () => STARTED_AT });

    const update = vi.mocked(repository.publishRefresh).mock.calls[0][1];
    expect(update.removedTalkIds).toEqual([]);
    expect(update.removedTeacherIds).toEqual([]);
  });

  it("retries transient failures with bounded exponential delays", async () => {
    const repository = makeRepository();
    const sleep = vi.fn(async () => undefined);
    const stable = fixtureRequester();
    let failures = 2;
    const request = vi.fn<DharmaSeedRequester>(async (resource, payload) => {
      if (failures > 0) {
        failures -= 1;
        throw new DharmaSeedRequestError(502, resource);
      }
      return stable(resource, payload);
    });

    await refreshCatalog({ repository, request, now: () => STARTED_AT, sleep });

    expect(sleep.mock.calls).toEqual([[250], [500]]);
    expect(request).toHaveBeenCalledTimes(6);
  });

  it("does not retry invalid upstream payloads", async () => {
    const repository = makeRepository();
    const sleep = vi.fn(async () => undefined);
    const request = vi.fn<DharmaSeedRequester>(async () => ({ broken: true }));

    await expect(
      refreshCatalog({ repository, request, now: () => STARTED_AT, sleep }),
    ).rejects.toThrow();

    expect(request).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
    expect(repository.recordRefreshFailure).toHaveBeenCalledWith(
      expect.anything(),
      STARTED_AT,
      expect.any(Date),
      "Dharma Seed returned an invalid response",
    );
  });
});

describe("isCatalogRefreshDue", () => {
  it("honors both the 24-hour interval and failure backoff", () => {
    expect(isCatalogRefreshDue(state({ lastSuccessfulRefreshAt: null }), STARTED_AT)).toBe(true);
    expect(
      isCatalogRefreshDue(
        state({ lastSuccessfulRefreshAt: new Date("2026-09-12T08:00:00Z") }),
        STARTED_AT,
      ),
    ).toBe(true);
    expect(
      isCatalogRefreshDue(
        state({
          lastSuccessfulRefreshAt: new Date("2026-09-12T07:00:00Z"),
          retryAfter: new Date("2026-09-13T08:30:00Z"),
        }),
        STARTED_AT,
      ),
    ).toBe(false);
  });
});

function makeRepository(
  options: { lease?: RefreshLease | null; activeVersion?: number } = {},
): CatalogRepository {
  const lease =
    options.lease === undefined
      ? {
          ...state({ activeVersion: options.activeVersion ?? 0 }),
          token: "refresh-token",
        }
      : options.lease;
  return {
    getState: vi.fn(async () => state()),
    tryAcquireRefresh: vi.fn(async () => lease),
    publishRefresh: vi.fn(async () => ({
      version: 1,
      changed: true,
    })),
    recordRefreshFailure: vi.fn(async () => undefined),
    getIndex: vi.fn(),
    getTalkDetails: vi.fn(),
    getTeacherDetails: vi.fn(),
  };
}

function state(overrides: Partial<HostedCatalogState> = {}): HostedCatalogState {
  return {
    activeVersion: 0,
    sourceEditions: { talks: null, teachers: null },
    lastSuccessfulRefreshAt: null,
    retryAfter: null,
    ...overrides,
  };
}

function fixtureRequester(): ReturnType<typeof vi.fn<DharmaSeedRequester>> {
  return vi.fn<DharmaSeedRequester>(async (resource, payload) => {
    if (!payload.ids) return indexResponse([resource === "talks" ? 1 : 10]);
    if (resource === "talks") return talkDetails(1);
    return {
      edition: edition(),
      items: { 10: { id: 10, name: "Test Teacher", bio: "" } },
      x_items: [],
    };
  });
}

function edition(): string {
  return "2026-09-13 08:00:00";
}

function indexResponse(items: number[], removed: number[] = []) {
  return { edition: edition(), items, x_items: removed };
}

function emptyResponse(ids: number[] | undefined) {
  return ids ? { edition: edition(), items: {}, x_items: [] } : indexResponse([]);
}

function talkDetails(id: number) {
  return {
    edition: edition(),
    items: {
      [id]: {
        id,
        title: "A talk about practice",
        description: "A useful description.",
        rec_date: "2026-01-02 19:30:00",
        duration_in_minutes: 42,
        recording_type: "Talk",
        teachers: [10],
        audio_url: `/talks/${id}/talk.mp3`,
      },
    },
    x_items: [],
  };
}
