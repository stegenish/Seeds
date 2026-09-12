import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/integrations/dharmaseed/client", () => ({ requestDharmaSeed: vi.fn() }));
import { requestDharmaSeed } from "@/lib/integrations/dharmaseed/client";
import { GET } from "./route";
const request = (query = "", resource = "talks") =>
  GET(new NextRequest(`http://localhost/api/catalog/${resource}${query}`), {
    params: Promise.resolve({ resource }),
  });
beforeEach(() => {
  vi.mocked(requestDharmaSeed).mockResolvedValue({ edition: "1", items: [], x_items: [] });
});

it.each([
  "?ids=",
  "?ids=-1",
  "?ids=1.1",
  `?ids=${Array.from({ length: 501 }, (_, i) => i + 1).join(",")}`,
  `?edition=${"x".repeat(101)}`,
])("rejects invalid input %s without upstream work", async (query) => {
  expect((await request(query)).status).toBe(400);
  expect(requestDharmaSeed).not.toHaveBeenCalled();
});
it("rejects unknown resources", async () =>
  expect((await request("", "unknown")).status).toBe(404));
it("forwards a bounded delta and prevents independent CDN caching", async () => {
  const response = await request("?edition=previous");
  expect(requestDharmaSeed).toHaveBeenCalledWith("talks", { edition: "previous", ids: undefined });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({ edition: "1", ids: [], removedIds: [] });
});
it("does not send the client snapshot as an upstream delta for detail requests", async () => {
  vi.mocked(requestDharmaSeed).mockResolvedValue({ edition: "1", items: {}, x_items: [2] });
  const response = await request("?ids=2,2&snapshot=1&edition=old");
  expect(requestDharmaSeed).toHaveBeenCalledWith("talks", { ids: [2], edition: undefined });
  expect(await response.json()).toEqual({ edition: "1", items: [], removedIds: [2] });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("maps malformed upstream responses and timeouts to recoverable errors", async () => {
  vi.mocked(requestDharmaSeed).mockResolvedValue({ items: "wrong" });
  expect((await request()).status).toBe(502);
  vi.mocked(requestDharmaSeed).mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
  expect((await request()).status).toBe(502);
});
