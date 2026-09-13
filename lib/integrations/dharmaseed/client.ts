import type { DharmaSeedResource } from "./adapter";

const API_ROOT = "https://www.dharmaseed.org/api/1";
const REQUEST_TIMEOUT_MS = 20_000;

export interface DharmaSeedRequest {
  edition?: string;
  ids?: number[];
}

export interface DharmaSeedRequestOptions {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}

export class DharmaSeedRequestError extends Error {
  constructor(
    readonly status: number,
    resource: DharmaSeedResource,
  ) {
    super(`Dharma Seed returned ${status} for ${resource}`);
    this.name = "DharmaSeedRequestError";
  }
}

export async function requestDharmaSeed(
  resource: DharmaSeedResource,
  request: DharmaSeedRequest,
  options: DharmaSeedRequestOptions = {},
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

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await (options.fetcher ?? fetch)(`${API_ROOT}/${resource}/`, {
    method: "POST",
    body,
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "Stillpoint/0.1 (unofficial personal Dharma Seed client)",
    },
  });

  if (!response.ok) {
    throw new DharmaSeedRequestError(response.status, resource);
  }

  return response.json();
}
