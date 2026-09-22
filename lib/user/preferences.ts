import { readStoredValue, writeStoredValue } from "./safe-storage";

const HISTORY_KEY = "stillpoint:selection-history";
const FAVORITES_KEY = "stillpoint:favorites";
const FAVORITE_TEACHERS_KEY = "stillpoint:favorite-teachers";
const PROGRESS_KEY = "stillpoint:playback-progress";
const LAST_PLAYED_KEY = "stillpoint:last-played-talk";

interface PlaybackProgress {
  [talkId: string]: number;
}

export function readSelectionHistory(storage?: Storage): number[] {
  return readNumberArray(storage, HISTORY_KEY);
}

export function saveSelectionHistory(history: number[], storage?: Storage): void {
  writeStoredValue(HISTORY_KEY, JSON.stringify([...new Set(history)]), storage);
}

export function readFavorites(storage?: Storage): number[] {
  return readNumberArray(storage, FAVORITES_KEY);
}

export function toggleFavorite(talkId: number, storage?: Storage): number[] {
  const favorites = new Set(readFavorites(storage));
  if (favorites.has(talkId)) {
    favorites.delete(talkId);
  } else {
    favorites.add(talkId);
  }
  const nextFavorites = [...favorites];
  writeStoredValue(FAVORITES_KEY, JSON.stringify(nextFavorites), storage);
  return nextFavorites;
}

export function readFavoriteTeachers(storage?: Storage): number[] {
  return readNumberArray(storage, FAVORITE_TEACHERS_KEY);
}

export function toggleFavoriteTeacher(teacherId: number, storage?: Storage): number[] {
  const favorites = new Set(readFavoriteTeachers(storage));
  if (favorites.has(teacherId)) favorites.delete(teacherId);
  else favorites.add(teacherId);
  const nextFavorites = [...favorites];
  writeStoredValue(FAVORITE_TEACHERS_KEY, JSON.stringify(nextFavorites), storage);
  return nextFavorites;
}

export function readPlaybackProgress(talkId: number, storage?: Storage): number {
  return readProgressMap(storage)[talkId] ?? 0;
}

export function savePlaybackProgress(talkId: number, seconds: number, storage?: Storage): void {
  const progress = readProgressMap(storage);
  if (!Number.isFinite(seconds)) return;
  progress[talkId] = Math.max(0, Math.floor(seconds));
  writeStoredValue(PROGRESS_KEY, JSON.stringify(progress), storage);
}

export function readLastPlayedTalkId(storage?: Storage): number | null {
  const value = Number(readStoredValue(LAST_PLAYED_KEY, storage));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function saveLastPlayedTalkId(talkId: number, storage?: Storage): void {
  writeStoredValue(LAST_PLAYED_KEY, String(talkId), storage);
}

function readNumberArray(storage: Storage | undefined, key: string): number[] {
  try {
    const value: unknown = JSON.parse(readStoredValue(key, storage) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is number => Number.isInteger(item) && item > 0)
      : [];
  } catch {
    return [];
  }
}

function readProgressMap(storage?: Storage): PlaybackProgress {
  try {
    const value: unknown = JSON.parse(readStoredValue(PROGRESS_KEY, storage) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([key, seconds]) =>
          Number.isInteger(Number(key)) &&
          Number(key) > 0 &&
          typeof seconds === "number" &&
          Number.isFinite(seconds) &&
          seconds >= 0,
      ),
    );
  } catch {
    return {};
  }
}
