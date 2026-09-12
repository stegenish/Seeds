import { expect, it, vi } from "vitest";
import {
  addSelectionToHistory,
  readLastPlayedTalkId,
  saveLastPlayedTalkId,
} from "@/lib/user/preferences";

it("R6: permits in-memory history updates when durable storage is full", () => {
  const storage: Storage = {
    length: 0,
    clear: vi.fn(),
    key: () => null,
    getItem: () => null,
    removeItem: vi.fn(),
    setItem: () => {
      throw new DOMException("Quota full", "QuotaExceededError");
    },
  };
  expect(() => addSelectionToHistory(1, storage)).not.toThrow();
  expect(() => saveLastPlayedTalkId(1, storage)).not.toThrow();
});

it("R6: handles denied last-played storage like the other preference reads", () => {
  const storage: Storage = {
    length: 0,
    clear: vi.fn(),
    key: () => null,
    getItem: () => {
      throw new DOMException("Storage denied", "SecurityError");
    },
    removeItem: vi.fn(),
    setItem: vi.fn(),
  };
  expect(() => readLastPlayedTalkId(storage)).not.toThrow();
});
