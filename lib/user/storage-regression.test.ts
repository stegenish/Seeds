import { expect, it, vi } from "vitest";
import {
  saveSelectionHistory,
  readLastPlayedTalkId,
  saveLastPlayedTalkId,
  readSelectionHistory,
  toggleFavorite,
  readFavorites,
  savePlaybackProgress,
  readPlaybackProgress,
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
  expect(() => saveSelectionHistory([1], storage)).not.toThrow();
  expect(() => saveLastPlayedTalkId(1, storage)).not.toThrow();
  expect(readSelectionHistory(storage)).toEqual([1]);
  expect(readLastPlayedTalkId(storage)).toBe(1);
  toggleFavorite(1, storage);
  expect(readFavorites(storage)).toEqual([1]);
  expect(toggleFavorite(1, storage)).toEqual([]);
  savePlaybackProgress(1, 37, storage);
  expect(readPlaybackProgress(1, storage)).toBe(37);
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
