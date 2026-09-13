import type { Talk, Teacher } from "@/lib/domain/talk";
import type { CatalogDetails, CatalogIndex, CatalogResource } from "@/lib/catalog/contracts";

export interface HostedCatalogState {
  activeVersion: number;
  sourceEditions: Record<CatalogResource, string | null>;
  lastSuccessfulRefreshAt: Date | null;
  retryAfter: Date | null;
}

export interface RefreshLease extends HostedCatalogState {
  token: string;
}

export interface CatalogUpdate {
  sourceEditions: Record<CatalogResource, string>;
  talks: Talk[];
  teachers: Teacher[];
  removedTalkIds: number[];
  removedTeacherIds: number[];
}

export interface PublishedCatalog {
  version: number;
  changed: boolean;
}

export interface CatalogRepository {
  getState(): Promise<HostedCatalogState>;
  tryAcquireRefresh(now: Date, force: boolean): Promise<RefreshLease | null>;
  publishRefresh(
    lease: RefreshLease,
    update: CatalogUpdate,
    completedAt: Date,
  ): Promise<PublishedCatalog>;
  recordRefreshFailure(
    lease: RefreshLease,
    failedAt: Date,
    retryAt: Date,
    reason: string,
  ): Promise<void>;
  getIndex(resource: CatalogResource, sinceVersion: number | null): Promise<CatalogIndex>;
  getTalkDetails(ids: number[]): Promise<CatalogDetails<Talk>>;
  getTeacherDetails(ids: number[]): Promise<CatalogDetails<Teacher>>;
}
