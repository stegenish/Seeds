import { after, NextRequest, NextResponse } from "next/server";
import { DETAIL_BATCH_SIZE, catalogResourceSchema } from "@/lib/catalog/contracts";
import {
  CatalogUnavailableError,
  PostgresCatalogRepository,
} from "@/lib/server/catalog/postgres-repository";
import { isCatalogRefreshDue, refreshCatalog } from "@/lib/server/catalog/refresh";
import type { CatalogRepository } from "@/lib/server/catalog/types";

const INDEX_CACHE_CONTROL = "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";
const VERSIONED_CACHE_CONTROL =
  "public, max-age=0, s-maxage=31536000, stale-while-revalidate=86400";

export const maxDuration = 300;

interface CatalogRouteDependencies {
  repository: CatalogRepository;
  now: () => Date;
  scheduleRefresh: () => void;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  return handleCatalogRequest(request, context, {
    repository: new PostgresCatalogRepository(),
    now: () => new Date(),
    scheduleRefresh: scheduleBackgroundRefresh,
  });
}

export async function handleCatalogRequest(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
  dependencies: CatalogRouteDependencies,
) {
  const { resource: rawResource } = await context.params;
  const parsedResource = catalogResourceSchema.safeParse(rawResource);
  if (!parsedResource.success) {
    return NextResponse.json({ error: "Unknown catalog resource" }, { status: 404 });
  }

  const edition = request.nextUrl.searchParams.get("edition");
  const snapshot = request.nextUrl.searchParams.get("snapshot");
  if ((edition?.length ?? 0) > 100 || (snapshot?.length ?? 0) > 100) {
    return NextResponse.json({ error: "Edition is too long" }, { status: 400 });
  }
  const idsResult = parseIds(request.nextUrl.searchParams.get("ids"));
  if (idsResult.error) {
    return NextResponse.json({ error: idsResult.error }, { status: 400 });
  }

  try {
    const state = await dependencies.repository.getState();
    const result = idsResult.ids
      ? parsedResource.data === "talks"
        ? await dependencies.repository.getTalkDetails(idsResult.ids)
        : await dependencies.repository.getTeacherDetails(idsResult.ids)
      : await dependencies.repository.getIndex(parsedResource.data, parseCatalogVersion(edition));
    if (isCatalogRefreshDue(state, dependencies.now())) {
      dependencies.scheduleRefresh();
    }
    const snapshotVersion = parseCatalogVersion(snapshot);
    const versionedDetails =
      idsResult.ids !== undefined &&
      snapshotVersion !== null &&
      snapshotVersion <= state.activeVersion;
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": versionedDetails ? VERSIONED_CACHE_CONTROL : INDEX_CACHE_CONTROL,
      },
    });
  } catch (error) {
    if (error instanceof CatalogUnavailableError) {
      return NextResponse.json(
        { error: "The shared catalog is being prepared. Please retry shortly." },
        { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
      );
    }
    reportServerError("catalog query", error);
    return NextResponse.json(
      { error: "The shared catalog is temporarily unavailable. Please retry." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function parseCatalogVersion(raw: string | null): number | null {
  if (!raw || !/^(0|[1-9]\d*)$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function parseIds(rawIds: string | null): { ids?: number[]; error?: string } {
  if (rawIds === null) return {};
  const ids = rawIds.split(",").filter(Boolean).map(Number);
  if (
    ids.length === 0 ||
    ids.length > DETAIL_BATCH_SIZE ||
    ids.some((id) => !Number.isInteger(id) || id <= 0)
  ) {
    return { error: `ids must contain 1–${DETAIL_BATCH_SIZE} positive integers` };
  }
  return { ids: [...new Set(ids)] };
}

function reportServerError(operation: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  console.error(`Catalog ${operation} failed (${name}).`);
}

function scheduleBackgroundRefresh(): void {
  after(async () => {
    try {
      await refreshCatalog();
    } catch (error) {
      reportServerError("background refresh", error);
    }
  });
}
