import { z } from "zod";
import type { Talk, Teacher } from "@/lib/domain/talk";
import {
  deleteCatalogItems,
  deleteMetadata,
  getMetadata,
  putTalks,
  putTeachers,
  setMetadata,
} from "./database";
import {
  DETAIL_BATCH_SIZE,
  indexSchema,
  isCompatibleEdition,
  talkDetailsSchema,
  teacherDetailsSchema,
  type CatalogResource,
} from "./contracts";

const pendingSchema = z.object({
  edition: z.string(),
  baseEdition: z.string().nullable(),
  ids: z.array(z.number().int().positive()),
  completed: z.number().int().nonnegative(),
});

export interface CatalogProgress {
  resource: CatalogResource;
  completed: number;
  total: number;
  addedTalks: Talk[];
  addedTeachers: Teacher[];
  removedIds: number[];
}

export interface SyncCatalogOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  onProgress?: (progress: CatalogProgress) => void;
}

export async function syncCatalog(options: SyncCatalogOptions = {}): Promise<void> {
  // Serialize across tabs where Web Locks is available. Checkpoints are replay-safe.
  const synchronize = async () => {
    const fetcher = options.fetcher ?? fetch;
    await syncResource("teachers", fetcher, options);
    await syncResource("talks", fetcher, options);
  };
  if (navigator.locks) {
    await navigator.locks.request(
      "stillpoint-catalog-sync",
      { signal: options.signal },
      synchronize,
    );
  } else {
    await synchronize();
  }
}

async function syncResource(
  resource: CatalogResource,
  fetcher: typeof fetch,
  options: SyncCatalogOptions,
): Promise<void> {
  options.signal?.throwIfAborted();
  const editionKey = `${resource}:edition`;
  const pendingKey = `${resource}:pending`;
  const currentEdition = await getMetadata<string>(editionKey);
  const parsedPending = pendingSchema.safeParse(await getMetadata(pendingKey));
  const pending = parsedPending.success ? parsedPending.data : null;
  const indexUrl = new URL(`/api/catalog/${resource}`, window.location.origin);
  if (currentEdition) indexUrl.searchParams.set("edition", currentEdition);
  const index = indexSchema.parse(await fetchJson(indexUrl, fetcher, options.signal));
  // Legacy checkpoints lack a work list and are deliberately replayed from zero.
  const sameWork =
    pending?.baseEdition === currentEdition &&
    pending?.edition === index.edition &&
    pending.ids.length === index.ids.length &&
    pending.ids.every((id, i) => id === index.ids[i]);
  const resumeAt = sameWork ? Math.min(pending.completed, index.ids.length) : 0;
  const report = (
    completed: number,
    removedIds: number[],
    addedTalks: Talk[] = [],
    addedTeachers: Teacher[] = [],
  ) => {
    options.signal?.throwIfAborted();
    options.onProgress?.({
      resource,
      completed,
      total: index.ids.length,
      removedIds,
      addedTalks,
      addedTeachers,
    });
  };
  options.signal?.throwIfAborted();
  await deleteCatalogItems(resource, index.removedIds);
  report(resumeAt, index.removedIds);

  for (let offset = resumeAt; offset < index.ids.length; offset += DETAIL_BATCH_SIZE) {
    options.signal?.throwIfAborted();
    const batch = index.ids.slice(offset, offset + DETAIL_BATCH_SIZE);
    const detailsUrl = new URL(`/api/catalog/${resource}`, window.location.origin);
    detailsUrl.searchParams.set("ids", batch.join(","));
    // Bypass old, long-lived CDN entries from the first release.
    detailsUrl.searchParams.set("snapshot", index.edition);
    const raw = await fetchJson(detailsUrl, fetcher, options.signal);
    const details =
      resource === "talks" ? talkDetailsSchema.parse(raw) : teacherDetailsSchema.parse(raw);
    if (!isCompatibleEdition(details.edition, index.edition)) {
      throw new Error("Archive details are out of date. Retry synchronization.");
    }
    const returned = new Set([...details.items.map((item) => item.id), ...details.removedIds]);
    if (batch.some((id) => !returned.has(id))) {
      throw new Error("The archive returned an incomplete batch. Retry synchronization.");
    }
    options.signal?.throwIfAborted();
    const removed = new Set(details.removedIds);
    // Deletions win if an inconsistent response contains both forms of a record.
    const talks =
      resource === "talks" ? (details.items as Talk[]).filter((item) => !removed.has(item.id)) : [];
    const teachers =
      resource === "teachers"
        ? (details.items as Teacher[]).filter((item) => !removed.has(item.id))
        : [];
    await putTalks(talks);
    await putTeachers(teachers);
    await deleteCatalogItems(resource, details.removedIds);
    const completed = offset + batch.length;
    await setMetadata(pendingKey, {
      edition: index.edition,
      baseEdition: currentEdition,
      ids: index.ids,
      completed,
    });
    report(completed, details.removedIds, talks, teachers);
  }
  options.signal?.throwIfAborted();
  await setMetadata(editionKey, index.edition);
  await deleteMetadata(pendingKey);
}

async function fetchJson(url: URL, fetcher: typeof fetch, signal?: AbortSignal): Promise<unknown> {
  signal?.throwIfAborted();
  const response = await fetcher(url, { signal });
  signal?.throwIfAborted();
  if (!response.ok) throw new Error(`Archive request failed (${response.status}). Please retry.`);
  return response.json();
}
