import { ZodError } from "zod";
import { DETAIL_BATCH_SIZE, isCompatibleEdition } from "@/lib/catalog/contracts";
import type { CatalogResource } from "@/lib/catalog/contracts";
import type { Talk, Teacher } from "@/lib/domain/talk";
import {
  parseIndexResponse,
  parseTalkDetails,
  parseTeacherDetails,
} from "@/lib/integrations/dharmaseed/adapter";
import {
  DharmaSeedRequestError,
  requestDharmaSeed,
  type DharmaSeedRequest,
} from "@/lib/integrations/dharmaseed/client";
import { PostgresCatalogRepository } from "./postgres-repository";
import type { CatalogRepository, CatalogUpdate, HostedCatalogState, RefreshLease } from "./types";

const MAX_RESOURCE_ITEMS = 100_000;
const MAX_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 250;
const FAILURE_BACKOFF_MS = 60 * 60 * 1_000;
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1_000;

export type DharmaSeedRequester = (
  resource: CatalogResource,
  request: DharmaSeedRequest,
) => Promise<unknown>;

export interface RefreshCatalogOptions {
  force?: boolean;
  now?: () => Date;
  repository?: CatalogRepository;
  request?: DharmaSeedRequester;
  sleep?: (milliseconds: number) => Promise<void>;
}

export type CatalogRefreshResult =
  | { status: "skipped" }
  | { status: "published"; version: number; changed: boolean; itemCount: number };

export function isCatalogRefreshDue(state: HostedCatalogState, now: Date): boolean {
  if (state.retryAfter && state.retryAfter > now) return false;
  return (
    !state.lastSuccessfulRefreshAt ||
    state.lastSuccessfulRefreshAt.getTime() <= now.getTime() - REFRESH_INTERVAL_MS
  );
}

export async function refreshCatalog(
  options: RefreshCatalogOptions = {},
): Promise<CatalogRefreshResult> {
  const now = options.now ?? (() => new Date());
  const repository = options.repository ?? new PostgresCatalogRepository();
  const request = options.request ?? requestDharmaSeed;
  const sleep = options.sleep ?? delay;
  const lease = await repository.tryAcquireRefresh(now(), options.force ?? false);
  if (!lease) return { status: "skipped" };

  try {
    const update = await collectUpdate(lease, request, sleep);
    const published = await repository.publishRefresh(lease, update, now());
    return {
      status: "published",
      ...published,
      itemCount:
        update.talks.length +
        update.teachers.length +
        update.removedTalkIds.length +
        update.removedTeacherIds.length,
    };
  } catch (error) {
    const failedAt = now();
    await repository.recordRefreshFailure(
      lease,
      failedAt,
      new Date(failedAt.getTime() + FAILURE_BACKOFF_MS),
      safeFailureReason(error),
    );
    throw error;
  }
}

async function collectUpdate(
  lease: RefreshLease,
  request: DharmaSeedRequester,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<CatalogUpdate> {
  const teachers = await collectResource("teachers", lease.sourceEditions.teachers, request, sleep);
  const talks = await collectResource("talks", lease.sourceEditions.talks, request, sleep);
  return {
    sourceEditions: { teachers: teachers.edition, talks: talks.edition },
    teachers: teachers.items,
    talks: talks.items,
    removedTeacherIds: teachers.removedIds,
    removedTalkIds: talks.removedIds,
  };
}

async function collectResource(
  resource: "talks",
  previousEdition: string | null,
  request: DharmaSeedRequester,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<{ edition: string; items: Talk[]; removedIds: number[] }>;
async function collectResource(
  resource: "teachers",
  previousEdition: string | null,
  request: DharmaSeedRequester,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<{ edition: string; items: Teacher[]; removedIds: number[] }>;
async function collectResource(
  resource: CatalogResource,
  previousEdition: string | null,
  request: DharmaSeedRequester,
  sleep: (milliseconds: number) => Promise<void>,
) {
  const payload = await requestWithRetry(
    request,
    resource,
    { edition: previousEdition ?? undefined },
    sleep,
  );
  const index = parseIndexResponse(payload);
  if (previousEdition && !isCompatibleEdition(index.edition, previousEdition)) {
    throw new Error(`Dharma Seed returned an older ${resource} edition`);
  }
  const ids = [...new Set(index.ids)];
  if (ids.length > MAX_RESOURCE_ITEMS) {
    throw new Error(`Dharma Seed returned too many ${resource} records`);
  }

  const items: (Talk | Teacher)[] = [];
  const removedIds = new Set(index.removedIds);
  for (let offset = 0; offset < ids.length; offset += DETAIL_BATCH_SIZE) {
    const batch = ids.slice(offset, offset + DETAIL_BATCH_SIZE);
    const detailsPayload = await requestWithRetry(request, resource, { ids: batch }, sleep);
    const details =
      resource === "talks" ? parseTalkDetails(detailsPayload) : parseTeacherDetails(detailsPayload);
    if (!isCompatibleEdition(details.edition, index.edition)) {
      throw new Error(`Dharma Seed returned stale ${resource} details`);
    }
    const accountedFor = new Set([...details.items.map((item) => item.id), ...details.removedIds]);
    if (batch.some((id) => !accountedFor.has(id))) {
      throw new Error(`Dharma Seed returned an incomplete ${resource} batch`);
    }
    details.removedIds.forEach((id) => removedIds.add(id));
    items.push(...details.items);
  }

  return {
    edition: index.edition,
    items: items.filter((item) => !removedIds.has(item.id)),
    removedIds: [...removedIds],
  };
}

async function requestWithRetry(
  request: DharmaSeedRequester,
  resource: CatalogResource,
  payload: DharmaSeedRequest,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await request(resource, payload);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS - 1 || !isTransient(error)) throw error;
      await sleep(INITIAL_RETRY_DELAY_MS * 2 ** attempt);
    }
  }
  throw lastError;
}

function isTransient(error: unknown): boolean {
  if (error instanceof DharmaSeedRequestError) {
    return (
      error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500
    );
  }
  return error instanceof TypeError || (error instanceof Error && error.name === "TimeoutError");
}

function safeFailureReason(error: unknown): string {
  if (error instanceof ZodError) return "Dharma Seed returned an invalid response";
  if (error instanceof DharmaSeedRequestError)
    return `Dharma Seed request failed (${error.status})`;
  if (error instanceof Error) return error.message;
  return "Unknown catalog refresh failure";
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
