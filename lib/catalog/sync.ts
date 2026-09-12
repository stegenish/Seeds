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

const DETAIL_BATCH_SIZE = 500;

const indexSchema = z.object({
  edition: z.string(),
  ids: z.array(z.number().int().positive()),
  removedIds: z.array(z.number().int().positive()),
});

const talkSchema: z.ZodType<Talk> = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  recordedAt: z.string().nullable(),
  durationMinutes: z.number().nullable(),
  recordingType: z.string(),
  kind: z.enum(["talk", "guided-meditation", "other"]),
  topicIds: z.array(z.string()),
  teacherIds: z.array(z.number().int().positive()),
  venueId: z.number().nullable(),
  retreatId: z.number().nullable(),
  languageId: z.number().nullable(),
  audioUrl: z.string().url(),
  sourceUrl: z.string().url(),
});

const teacherSchema: z.ZodType<Teacher> = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  bio: z.string(),
  website: z.string().nullable(),
  donationUrl: z.string().nullable(),
  photoUrl: z.string().nullable(),
  isPublic: z.boolean(),
});

const talkDetailsSchema = z.object({
  edition: z.string(),
  items: z.array(talkSchema),
  removedIds: z.array(z.number().int().positive()),
});

const teacherDetailsSchema = z.object({
  edition: z.string(),
  items: z.array(teacherSchema),
  removedIds: z.array(z.number().int().positive()),
});

type CatalogResource = "talks" | "teachers";

interface PendingSync {
  edition: string;
  completed: number;
}

export interface CatalogProgress {
  resource: CatalogResource;
  completed: number;
  total: number;
  addedTalks: Talk[];
  addedTeachers: Teacher[];
}

export interface SyncCatalogOptions {
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  onProgress?: (progress: CatalogProgress) => void;
}

export async function syncCatalog(options: SyncCatalogOptions = {}): Promise<void> {
  const fetcher = options.fetcher ?? fetch;
  await syncResource("teachers", fetcher, options);
  await syncResource("talks", fetcher, options);
}

async function syncResource(
  resource: CatalogResource,
  fetcher: typeof fetch,
  options: SyncCatalogOptions,
): Promise<void> {
  const editionKey = `${resource}:edition`;
  const pendingKey = `${resource}:pending`;
  const currentEdition = await getMetadata<string>(editionKey);
  const pending = await getMetadata<PendingSync>(pendingKey);
  const indexUrl = new URL(`/api/catalog/${resource}`, window.location.origin);

  if (currentEdition && !pending) {
    indexUrl.searchParams.set("edition", currentEdition);
  }

  const index = indexSchema.parse(await fetchJson(indexUrl, fetcher, options.signal));
  await deleteCatalogItems(resource, index.removedIds);

  const resumeAt = pending?.edition === index.edition ? pending.completed : 0;
  const ids = index.ids;

  if (ids.length === 0) {
    await setMetadata(editionKey, index.edition);
    await deleteMetadata(pendingKey);
    options.onProgress?.({
      resource,
      completed: 0,
      total: 0,
      addedTalks: [],
      addedTeachers: [],
    });
    return;
  }

  for (let offset = resumeAt; offset < ids.length; offset += DETAIL_BATCH_SIZE) {
    const batch = ids.slice(offset, offset + DETAIL_BATCH_SIZE);
    const detailsUrl = new URL(`/api/catalog/${resource}`, window.location.origin);
    detailsUrl.searchParams.set("ids", batch.join(","));
    const rawDetails = await fetchJson(detailsUrl, fetcher, options.signal);

    const talkDetails = resource === "talks" ? talkDetailsSchema.parse(rawDetails) : null;
    const teacherDetails = resource === "teachers" ? teacherDetailsSchema.parse(rawDetails) : null;

    if (talkDetails) {
      await putTalks(talkDetails.items);
    }
    if (teacherDetails) {
      await putTeachers(teacherDetails.items);
    }

    const completed = Math.min(offset + batch.length, ids.length);
    await setMetadata(pendingKey, { edition: index.edition, completed } satisfies PendingSync);
    options.onProgress?.({
      resource,
      completed,
      total: ids.length,
      addedTalks: talkDetails?.items ?? [],
      addedTeachers: teacherDetails?.items ?? [],
    });
  }

  await setMetadata(editionKey, index.edition);
  await deleteMetadata(pendingKey);
}

async function fetchJson(url: URL, fetcher: typeof fetch, signal?: AbortSignal): Promise<unknown> {
  const response = await fetcher(url, { signal });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `Catalog request failed with ${response.status}`);
  }
  return response.json();
}
