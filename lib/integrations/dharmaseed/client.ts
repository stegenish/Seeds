import type { DharmaSeedResource } from "./adapter";

const API_ROOT = "https://www.dharmaseed.org/api/1";
const REQUEST_TIMEOUT_MS = 20_000;

interface RemoteRequest {
  edition?: string;
  ids?: number[];
}

export async function requestDharmaSeed(
  resource: DharmaSeedResource,
  request: RemoteRequest,
): Promise<unknown> {
  const body = new FormData();
  const wantsDetails = request.ids !== undefined;
  body.set("detail", wantsDetails ? "1" : "0");

  if (request.edition) {
    body.set("edition", request.edition);
  }

  if (request.ids) {
    body.set("items", request.ids.join(","));
  }

  const response = await fetch(`${API_ROOT}/${resource}/`, {
    method: "POST",
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": "Stillpoint/0.1 (unofficial personal Dharma Seed client)",
    },
  });

  if (!response.ok) {
    throw new Error(`Dharma Seed returned ${response.status} for ${resource}`);
  }

  return response.json();
}
