import { afterEach, expect, it, vi } from "vitest";
import {
  getAllTalks,
  getMetadata,
  putTalks,
  resetDatabaseForTests,
  setMetadata,
} from "@/lib/catalog/database";
import { syncCatalog } from "@/lib/catalog/sync";
import { makeTalk } from "@/test/factories";

afterEach(resetDatabaseForTests);

it("R1: retains the unfinished delta when resuming an interrupted update", async () => {
  await putTalks([makeTalk({ id: 1, title: "Old title" })]);
  await setMetadata("talks:edition", "old");
  const firstBatch = Array.from({ length: 500 }, (_, i) => i + 501);
  let interrupted = false;
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("teachers")) {
      return Response.json({ edition: "teachers", ids: [], removedIds: [] });
    }
    const ids = url.searchParams.get("ids");
    if (!ids) {
      return Response.json({
        edition: "new",
        ids: url.searchParams.has("edition")
          ? [...firstBatch, 1]
          : Array.from({ length: 1000 }, (_, i) => i + 1),
        removedIds: [],
      });
    }
    if (ids === "1" && !interrupted) {
      interrupted = true;
      throw new Error("Simulated connection loss");
    }
    return Response.json({
      edition: "new",
      items: ids
        .split(",")
        .map(Number)
        .map((id) => makeTalk({ id, title: "Updated title" })),
      removedIds: [],
    });
  });
  await expect(syncCatalog({ fetcher })).rejects.toThrow("Simulated connection loss");
  expect(await getMetadata("talks:pending")).toMatchObject({ edition: "new", completed: 500 });
  await syncCatalog({ fetcher });
  expect((await getAllTalks()).find((talk) => talk.id === 1)?.title).toBe("Updated title");
});

it("R2: applies removals delivered in detail responses", async () => {
  await putTalks([makeTalk()]);
  const responses = [
    { edition: "teachers", ids: [], removedIds: [] },
    { edition: "talks", ids: [1], removedIds: [] },
    { edition: "talks", items: [], removedIds: [1] },
  ];
  await syncCatalog({ fetcher: vi.fn(async () => Response.json(responses.shift())) });
  expect(await getAllTalks()).toEqual([]);
});

it("R7: does not checkpoint a new edition using stale cached details", async () => {
  await putTalks([makeTalk({ title: "Old title" })]);
  await setMetadata("talks:edition", "old");
  const responses = [
    { edition: "teachers", ids: [], removedIds: [] },
    { edition: "new", ids: [1], removedIds: [] },
    { edition: "old", items: [makeTalk({ title: "Old title" })], removedIds: [] },
  ];
  await syncCatalog({ fetcher: vi.fn(async () => Response.json(responses.shift())) }).catch(
    () => undefined,
  );
  expect(await getMetadata("talks:edition")).not.toBe("new");
});

it("rejects incomplete batches without advancing the edition", async () => {
  const responses = [
    { edition: "1", ids: [], removedIds: [] },
    { edition: "1", ids: [1, 2], removedIds: [] },
    { edition: "1", items: [makeTalk()], removedIds: [] },
  ];
  await expect(
    syncCatalog({ fetcher: vi.fn(async () => Response.json(responses.shift())) }),
  ).rejects.toThrow("incomplete batch");
  expect(await getMetadata("talks:edition")).toBeNull();
});

it("reports deletion-only indexes even when there are no detail requests", async () => {
  await putTalks([makeTalk()]);
  const onProgress = vi.fn();
  const responses = [
    { edition: "1", ids: [], removedIds: [] },
    { edition: "1", ids: [], removedIds: [1] },
  ];
  await syncCatalog({ onProgress, fetcher: vi.fn(async () => Response.json(responses.shift())) });
  expect(await getAllTalks()).toEqual([]);
  expect(onProgress).toHaveBeenLastCalledWith(
    expect.objectContaining({ resource: "talks", removedIds: [1] }),
  );
});

it("does not fetch for an already-aborted run", async () => {
  const controller = new AbortController();
  controller.abort();
  const fetcher = vi.fn();
  await expect(syncCatalog({ signal: controller.signal, fetcher })).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});

it("replays legacy checkpoints instead of applying their offsets to an unknown list", async () => {
  await setMetadata("talks:pending", { edition: "1", completed: 500 });
  const responses = [
    { edition: "1", ids: [], removedIds: [] },
    { edition: "1", ids: [1], removedIds: [] },
    { edition: "1", items: [makeTalk()], removedIds: [] },
  ];
  await syncCatalog({ fetcher: vi.fn(async () => Response.json(responses.shift())) });
  expect(await getAllTalks()).toHaveLength(1);
});
