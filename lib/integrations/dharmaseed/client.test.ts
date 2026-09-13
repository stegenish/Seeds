import { describe, expect, it, vi } from "vitest";
import { DharmaSeedRequestError, requestDharmaSeed } from "./client";

describe("requestDharmaSeed", () => {
  it("builds the bounded form request and returns JSON", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ edition: "current", items: [], x_items: [] }),
    );

    await expect(
      requestDharmaSeed("talks", { edition: "previous", ids: [1, 2] }, { fetcher }),
    ).resolves.toMatchObject({ edition: "current" });

    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://www.dharmaseed.org/api/1/talks/");
    expect(init?.method).toBe("POST");
    expect(init?.cache).toBe("no-store");
    const body = init?.body as FormData;
    expect(Object.fromEntries(body.entries())).toEqual({
      detail: "1",
      edition: "previous",
      items: "1,2",
    });
  });

  it("exposes the response status without including its payload", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ private: "unexpected upstream content" }, { status: 502 }),
    );

    const error = await requestDharmaSeed("teachers", {}, { fetcher }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(DharmaSeedRequestError);
    expect(error).toMatchObject({ status: 502 });
    expect((error as Error).message).not.toContain("unexpected upstream content");
  });
});
