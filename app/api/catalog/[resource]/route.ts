import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  parseIndexResponse,
  parseTalkDetails,
  parseTeacherDetails,
  type DharmaSeedResource,
} from "@/lib/integrations/dharmaseed/adapter";
import { requestDharmaSeed } from "@/lib/integrations/dharmaseed/client";
import { DETAIL_BATCH_SIZE } from "@/lib/catalog/contracts";

const RESOURCES = new Set<DharmaSeedResource>(["talks", "teachers"]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  const { resource: rawResource } = await context.params;
  if (!RESOURCES.has(rawResource as DharmaSeedResource)) {
    return NextResponse.json({ error: "Unknown catalog resource" }, { status: 404 });
  }

  const resource = rawResource as DharmaSeedResource;
  const edition = request.nextUrl.searchParams.get("edition") || undefined;
  const snapshot = request.nextUrl.searchParams.get("snapshot");
  if ((edition?.length ?? 0) > 100 || (snapshot?.length ?? 0) > 100) {
    return NextResponse.json({ error: "Edition is too long" }, { status: 400 });
  }
  const idsResult = parseIds(request.nextUrl.searchParams.get("ids"));
  if (idsResult.error) {
    return NextResponse.json({ error: idsResult.error }, { status: 400 });
  }

  try {
    const payload = await requestDharmaSeed(resource, {
      edition: idsResult.ids ? undefined : edition,
      ids: idsResult.ids,
    });

    const result = idsResult.ids
      ? resource === "talks"
        ? parseTalkDetails(payload)
        : parseTeacherDetails(payload)
      : parseIndexResponse(payload);

    return NextResponse.json(result, {
      headers: {
        // IndexedDB and edition deltas own caching; independent CDN lifetimes
        // cannot safely describe a synchronized catalog snapshot.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof ZodError
        ? "Dharma Seed returned an unexpected response"
        : "Dharma Seed is temporarily unavailable";

    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function parseIds(rawIds: string | null): { ids?: number[]; error?: string } {
  if (rawIds === null) {
    return {};
  }

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
