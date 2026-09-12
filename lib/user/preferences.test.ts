import { describe, expect, it } from "vitest";
import {
  addSelectionToHistory,
  readFavorites,
  readLastPlayedTalkId,
  readPlaybackProgress,
  readSelectionHistory,
  saveLastPlayedTalkId,
  savePlaybackProgress,
  toggleFavorite,
} from "./preferences";

describe("local preferences", () => {
  it("keeps newest selections first without duplicates", () => {
    addSelectionToHistory(1);
    addSelectionToHistory(2);
    addSelectionToHistory(1);
    expect(readSelectionHistory()).toEqual([1, 2]);
  });

  it("toggles favorites", () => {
    expect(toggleFavorite(7)).toEqual([7]);
    expect(toggleFavorite(7)).toEqual([]);
    expect(readFavorites()).toEqual([]);
  });

  it("stores non-negative whole-second playback progress", () => {
    savePlaybackProgress(3, 18.9);
    expect(readPlaybackProgress(3)).toBe(18);
    savePlaybackProgress(3, -2);
    expect(readPlaybackProgress(3)).toBe(0);
  });

  it("remembers the most recently played talk", () => {
    expect(readLastPlayedTalkId()).toBeNull();

    saveLastPlayedTalkId(42);

    expect(readLastPlayedTalkId()).toBe(42);
  });

  it("recovers from malformed storage", () => {
    localStorage.setItem("stillpoint:selection-history", "not-json");
    expect(readSelectionHistory()).toEqual([]);
  });
});
