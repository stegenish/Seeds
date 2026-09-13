import { NextRequest, NextResponse } from "next/server";
import { refreshCatalog, type CatalogRefreshResult } from "@/lib/server/catalog/refresh";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface RefreshRouteDependencies {
  secret: string | undefined;
  refresh: () => Promise<CatalogRefreshResult>;
}

const defaultDependencies: RefreshRouteDependencies = {
  secret: process.env.CRON_SECRET,
  refresh: () => refreshCatalog({ force: true }),
};

export async function GET(request: NextRequest) {
  return handleRefreshRequest(request, defaultDependencies);
}

export async function handleRefreshRequest(
  request: NextRequest,
  dependencies: RefreshRouteDependencies,
) {
  if (!dependencies.secret) {
    return NextResponse.json(
      { error: "Catalog refresh is not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${dependencies.secret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    return NextResponse.json(await dependencies.refresh(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error(`Scheduled catalog refresh failed (${name}).`);
    return NextResponse.json(
      { error: "Catalog refresh failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
