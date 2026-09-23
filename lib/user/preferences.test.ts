import { describe, expect, it } from "vitest";
import {
  saveSelectionHistory,
  readFavorites,
  readLastPlayedTalkId,
  readPlaybackProgress,
  readSelectionHistory,
  saveLastPlayedTalkId,
  savePlaybackProgress,
  toggleFavorite,
  readFavoriteTeachers,
  toggleFavoriteTeacher,
  readListeningHistory,
  recordListening,
} from "./preferences";

describe("local preferences", () => {
  it("keeps newest selections first without duplicates", () => {
    saveSelectionHistory([1, 2, 1]);
    expect(readSelectionHistory()).toEqual([1, 2]);
  });

  it("toggles favorites", () => {
    expect(toggleFavorite(7)).toEqual([7]);
    expect(toggleFavorite(7)).toEqual([]);
    expect(readFavorites()).toEqual([]);
  });

  it("stores favorite teachers separately from favorite recordings", () => {
    expect(toggleFavoriteTeacher(12)).toEqual([12]);
    expect(readFavoriteTeachers()).toEqual([12]);
    expect(readFavorites()).toEqual([]);
    expect(toggleFavoriteTeacher(12)).toEqual([]);
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

  it("keeps the 50 most recent playback events in chronological order", () => {
    for (let id = 1; id <= 55; id += 1) recordListening(id, id * 1_000);

    const history = readListeningHistory();
    expect(history).toHaveLength(50);
    expect(history[0]).toEqual({ talkId: 55, listenedAt: 55_000 });
    expect(history[49]).toEqual({ talkId: 6, listenedAt: 6_000 });
  });

  it("recovers from malformed storage", () => {
    localStorage.setItem("stillpoint:selection-history", "not-json");
    expect(readSelectionHistory()).toEqual([]);
    localStorage.setItem("stillpoint:listening-history", '[null,{"talkId":0,"listenedAt":3}]');
    expect(readListeningHistory()).toEqual([]);
  });
  it("rejects malformed progress values and ignores non-finite writes", () => {
    localStorage.setItem("stillpoint:playback-progress", '{"1":-5,"2":"12","3":12}');
    expect(readPlaybackProgress(1)).toBe(0);
    expect(readPlaybackProgress(2)).toBe(0);
    savePlaybackProgress(3, Number.NaN);
    expect(readPlaybackProgress(3)).toBe(12);
  });
});
