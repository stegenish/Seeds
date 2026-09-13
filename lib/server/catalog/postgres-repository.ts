import { and, eq, gt, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import type { Talk, Teacher } from "@/lib/domain/talk";
import type { CatalogDetails, CatalogIndex, CatalogResource } from "@/lib/catalog/contracts";
import { getCatalogDatabase, type CatalogDatabase } from "@/lib/server/database/client";
import {
  catalogRemovals,
  catalogState,
  catalogTalks,
  catalogTeachers,
} from "@/lib/server/database/schema";
import type {
  CatalogRepository,
  CatalogUpdate,
  HostedCatalogState,
  PublishedCatalog,
  RefreshLease,
} from "./types";

const STATE_ID = 1;
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1_000;
const LEASE_DURATION_MS = 30 * 60 * 1_000;
const WRITE_BATCH_SIZE = 250;

export class CatalogUnavailableError extends Error {
  constructor() {
    super("The hosted catalog has not been prepared yet");
    this.name = "CatalogUnavailableError";
  }
}

export class PostgresCatalogRepository implements CatalogRepository {
  constructor(private readonly database: CatalogDatabase = getCatalogDatabase()) {}

  async getState(): Promise<HostedCatalogState> {
    const state = await this.readState(this.database);
    return toHostedState(state);
  }

  async tryAcquireRefresh(now: Date, force: boolean): Promise<RefreshLease | null> {
    const token = crypto.randomUUID();
    const staleBefore = new Date(now.getTime() - REFRESH_INTERVAL_MS);
    const abandonedBefore = new Date(now.getTime() - LEASE_DURATION_MS);
    const due = force
      ? undefined
      : and(
          or(
            isNull(catalogState.lastSuccessfulRefreshAt),
            lte(catalogState.lastSuccessfulRefreshAt, staleBefore),
          ),
          or(isNull(catalogState.retryAfter), lte(catalogState.retryAfter, now)),
        );
    const rows = await this.database
      .update(catalogState)
      .set({ refreshToken: token, refreshStartedAt: now })
      .where(
        and(
          eq(catalogState.id, STATE_ID),
          or(isNull(catalogState.refreshToken), lt(catalogState.refreshStartedAt, abandonedBefore)),
          due,
        ),
      )
      .returning();
    const state = rows[0];
    return state ? { ...toHostedState(state), token } : null;
  }

  async publishRefresh(
    lease: RefreshLease,
    update: CatalogUpdate,
    completedAt: Date,
  ): Promise<PublishedCatalog> {
    return this.database.transaction(async (transaction) => {
      const [state] = await transaction
        .select()
        .from(catalogState)
        .where(eq(catalogState.id, STATE_ID))
        .for("update");
      if (!state || state.refreshToken !== lease.token) {
        throw new Error("The catalog refresh lease is no longer active");
      }

      const changed = hasChanges(update);
      const version = state.activeVersion + (changed ? 1 : 0);
      if (changed) {
        await writeTalks(transaction, update.talks, version);
        await writeTeachers(transaction, update.teachers, version);
        await removeItems(transaction, "talks", update.removedTalkIds, version);
        await removeItems(transaction, "teachers", update.removedTeacherIds, version);
      }

      await transaction
        .update(catalogState)
        .set({
          activeVersion: version,
          talksEdition: update.sourceEditions.talks,
          teachersEdition: update.sourceEditions.teachers,
          lastSuccessfulRefreshAt: completedAt,
          refreshToken: null,
          refreshStartedAt: null,
          retryAfter: null,
          lastFailureAt: null,
          lastFailureReason: null,
        })
        .where(and(eq(catalogState.id, STATE_ID), eq(catalogState.refreshToken, lease.token)));

      return { version, changed };
    });
  }

  async recordRefreshFailure(
    lease: RefreshLease,
    failedAt: Date,
    retryAt: Date,
    reason: string,
  ): Promise<void> {
    await this.database
      .update(catalogState)
      .set({
        refreshToken: null,
        refreshStartedAt: null,
        retryAfter: retryAt,
        lastFailureAt: failedAt,
        lastFailureReason: reason.slice(0, 500),
      })
      .where(and(eq(catalogState.id, STATE_ID), eq(catalogState.refreshToken, lease.token)));
  }

  async getIndex(resource: CatalogResource, sinceVersion: number | null): Promise<CatalogIndex> {
    return this.database.transaction(async (transaction) => {
      const state = await this.readState(transaction);
      if (state.activeVersion === 0) throw new CatalogUnavailableError();
      const useDelta =
        sinceVersion !== null && sinceVersion >= 0 && sinceVersion <= state.activeVersion;
      const source = resource === "talks" ? catalogTalks : catalogTeachers;
      const rows = await transaction
        .select({ id: source.id })
        .from(source)
        .where(useDelta ? gt(source.catalogVersion, sinceVersion) : undefined)
        .orderBy(source.id);
      const removals = useDelta
        ? await transaction
            .select({ id: catalogRemovals.itemId })
            .from(catalogRemovals)
            .where(
              and(
                eq(catalogRemovals.resource, resource),
                gt(catalogRemovals.catalogVersion, sinceVersion),
              ),
            )
            .orderBy(catalogRemovals.itemId)
        : [];
      return {
        edition: String(state.activeVersion),
        ids: rows.map((row) => row.id),
        removedIds: removals.map((row) => row.id),
      };
    });
  }

  async getTalkDetails(ids: number[]): Promise<CatalogDetails<Talk>> {
    return this.database.transaction(async (transaction) => {
      const state = await this.readState(transaction);
      if (state.activeVersion === 0) throw new CatalogUnavailableError();
      const rows = await transaction
        .select({
          id: catalogTalks.id,
          title: catalogTalks.title,
          description: catalogTalks.description,
          recordedAt: catalogTalks.recordedAt,
          durationMinutes: catalogTalks.durationMinutes,
          recordingType: catalogTalks.recordingType,
          kind: catalogTalks.kind,
          topicIds: catalogTalks.topicIds,
          teacherIds: catalogTalks.teacherIds,
          venueId: catalogTalks.venueId,
          retreatId: catalogTalks.retreatId,
          languageId: catalogTalks.languageId,
          audioUrl: catalogTalks.audioUrl,
          sourceUrl: catalogTalks.sourceUrl,
        })
        .from(catalogTalks)
        .where(inArray(catalogTalks.id, ids));
      return details(String(state.activeVersion), ids, rows);
    });
  }

  async getTeacherDetails(ids: number[]): Promise<CatalogDetails<Teacher>> {
    return this.database.transaction(async (transaction) => {
      const state = await this.readState(transaction);
      if (state.activeVersion === 0) throw new CatalogUnavailableError();
      const rows = await transaction
        .select({
          id: catalogTeachers.id,
          name: catalogTeachers.name,
          bio: catalogTeachers.bio,
          website: catalogTeachers.website,
          donationUrl: catalogTeachers.donationUrl,
          photoUrl: catalogTeachers.photoUrl,
          isPublic: catalogTeachers.isPublic,
        })
        .from(catalogTeachers)
        .where(inArray(catalogTeachers.id, ids));
      return details(String(state.activeVersion), ids, rows);
    });
  }

  private async readState(database: Pick<CatalogDatabase, "select">) {
    const [state] = await database.select().from(catalogState).where(eq(catalogState.id, STATE_ID));
    if (!state) throw new Error("The catalog_state singleton is missing; run database migrations");
    return state;
  }
}

function toHostedState(state: typeof catalogState.$inferSelect): HostedCatalogState {
  return {
    activeVersion: state.activeVersion,
    sourceEditions: { talks: state.talksEdition, teachers: state.teachersEdition },
    lastSuccessfulRefreshAt: state.lastSuccessfulRefreshAt,
    retryAfter: state.retryAfter,
  };
}

function hasChanges(update: CatalogUpdate): boolean {
  return (
    update.talks.length > 0 ||
    update.teachers.length > 0 ||
    update.removedTalkIds.length > 0 ||
    update.removedTeacherIds.length > 0
  );
}

type CatalogTransaction = Parameters<Parameters<CatalogDatabase["transaction"]>[0]>[0];

async function writeTalks(transaction: CatalogTransaction, talks: Talk[], version: number) {
  for (const batch of batches(talks)) {
    const values = batch.map((talk) => ({ ...talk, catalogVersion: version }));
    await transaction
      .insert(catalogTalks)
      .values(values)
      .onConflictDoUpdate({
        target: catalogTalks.id,
        set: {
          title: sql.raw(`excluded.${catalogTalks.title.name}`),
          description: sql.raw(`excluded.${catalogTalks.description.name}`),
          recordedAt: sql.raw(`excluded.${catalogTalks.recordedAt.name}`),
          durationMinutes: sql.raw(`excluded.${catalogTalks.durationMinutes.name}`),
          recordingType: sql.raw(`excluded.${catalogTalks.recordingType.name}`),
          kind: sql.raw(`excluded.${catalogTalks.kind.name}`),
          topicIds: sql.raw(`excluded.${catalogTalks.topicIds.name}`),
          teacherIds: sql.raw(`excluded.${catalogTalks.teacherIds.name}`),
          venueId: sql.raw(`excluded.${catalogTalks.venueId.name}`),
          retreatId: sql.raw(`excluded.${catalogTalks.retreatId.name}`),
          languageId: sql.raw(`excluded.${catalogTalks.languageId.name}`),
          audioUrl: sql.raw(`excluded.${catalogTalks.audioUrl.name}`),
          sourceUrl: sql.raw(`excluded.${catalogTalks.sourceUrl.name}`),
          catalogVersion: version,
        },
      });
    await transaction.delete(catalogRemovals).where(
      and(
        eq(catalogRemovals.resource, "talks"),
        inArray(
          catalogRemovals.itemId,
          batch.map((talk) => talk.id),
        ),
      ),
    );
  }
}

async function writeTeachers(
  transaction: CatalogTransaction,
  teachers: Teacher[],
  version: number,
) {
  for (const batch of batches(teachers)) {
    const values = batch.map((teacher) => ({ ...teacher, catalogVersion: version }));
    await transaction
      .insert(catalogTeachers)
      .values(values)
      .onConflictDoUpdate({
        target: catalogTeachers.id,
        set: {
          name: sql.raw(`excluded.${catalogTeachers.name.name}`),
          bio: sql.raw(`excluded.${catalogTeachers.bio.name}`),
          website: sql.raw(`excluded.${catalogTeachers.website.name}`),
          donationUrl: sql.raw(`excluded.${catalogTeachers.donationUrl.name}`),
          photoUrl: sql.raw(`excluded.${catalogTeachers.photoUrl.name}`),
          isPublic: sql.raw(`excluded.${catalogTeachers.isPublic.name}`),
          catalogVersion: version,
        },
      });
    await transaction.delete(catalogRemovals).where(
      and(
        eq(catalogRemovals.resource, "teachers"),
        inArray(
          catalogRemovals.itemId,
          batch.map((teacher) => teacher.id),
        ),
      ),
    );
  }
}

async function removeItems(
  transaction: CatalogTransaction,
  resource: CatalogResource,
  ids: number[],
  version: number,
) {
  for (const batch of batches(ids)) {
    if (resource === "talks") {
      await transaction.delete(catalogTalks).where(inArray(catalogTalks.id, batch));
    } else {
      await transaction.delete(catalogTeachers).where(inArray(catalogTeachers.id, batch));
    }
    await transaction
      .insert(catalogRemovals)
      .values(batch.map((itemId) => ({ resource, itemId, catalogVersion: version })))
      .onConflictDoUpdate({
        target: [catalogRemovals.resource, catalogRemovals.itemId],
        set: { catalogVersion: version },
      });
  }
}

function batches<T>(items: T[]): T[][] {
  const result: T[][] = [];
  for (let offset = 0; offset < items.length; offset += WRITE_BATCH_SIZE) {
    result.push(items.slice(offset, offset + WRITE_BATCH_SIZE));
  }
  return result;
}

function details<T extends { id: number }>(
  edition: string,
  requestedIds: number[],
  items: T[],
): CatalogDetails<T> {
  const returnedIds = new Set(items.map((item) => item.id));
  return {
    edition,
    items,
    removedIds: requestedIds.filter((id) => !returnedIds.has(id)),
  };
}
