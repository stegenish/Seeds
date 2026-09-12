import { expect, it } from "vitest";
import { isCompatibleEdition } from "./contracts";
it("accepts newer timestamp details while retaining the older index checkpoint", () => {
  expect(isCompatibleEdition("2026-09-12 12:00:00", "2026-09-12 11:00:00")).toBe(true);
  expect(isCompatibleEdition("2026-09-12 10:00:00", "2026-09-12 11:00:00")).toBe(false);
  expect(isCompatibleEdition("opaque", "opaque")).toBe(true);
  expect(isCompatibleEdition("unknown", "opaque")).toBe(false);
});
