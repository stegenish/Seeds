import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  parseIndexResponse,
  parseTalkDetails,
  parseTeacherDetails,
  type DharmaSeedResource,
} from "@/lib/integrations/dharmaseed/adapter";
import { requestDharmaSeed } from "@/lib/integrations/dharmaseed/client";

const RESOURCES = new Set<DharmaSeedResource>(["talks", "teachers"]);
const MAX_DETAIL_IDS = 500;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ resource: string }> },
) {
  const { resource: rawResource } = await context.params;
  if (!RESOURCES.has(rawResource as DharmaSeedResource)) {
    return NextResponse.json({ error: "Unknown catalog resource" }, { status: 404 });
  }

  const resource = rawResource as DharmaSeedResource;
  const idsResult = parseIds(request.nextUrl.searchParams.get("ids"));
  if (idsResult.error) {
    return NextResponse.json({ error: idsResult.error }, { status: 400 });
  }

  try {
    const payload = await requestDharmaSeed(resource, {
      edition: request.nextUrl.searchParams.get("edition") || undefined,
      ids: idsResult.ids,
    });

    const result = idsResult.ids
      ? resource === "talks"
        ? parseTalkDetails(payload)
        : parseTeacherDetails(payload)
      : parseIndexResponse(payload);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": idsResult.ids
          ? "public, s-maxage=86400, stale-while-revalidate=604800"
          : "public, s-maxage=300, stale-while-revalidate=1800",
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
    ids.length > MAX_DETAIL_IDS ||
    ids.some((id) => !Number.isInteger(id) || id <= 0)
  ) {
    return { error: `ids must contain 1–${MAX_DETAIL_IDS} positive integers` };
  }

  return { ids: [...new Set(ids)] };
}
