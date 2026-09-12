const HISTORY_KEY = "stillpoint:selection-history";
const FAVORITES_KEY = "stillpoint:favorites";
const PROGRESS_KEY = "stillpoint:playback-progress";
const LAST_PLAYED_KEY = "stillpoint:last-played-talk";
const MAX_HISTORY_LENGTH = 2_000;

interface PlaybackProgress {
  [talkId: string]: number;
}

export function readSelectionHistory(storage: Storage = localStorage): number[] {
  return readNumberArray(storage, HISTORY_KEY);
}

export function addSelectionToHistory(talkId: number, storage: Storage = localStorage): number[] {
  const history = readSelectionHistory(storage).filter((id) => id !== talkId);
  const nextHistory = [talkId, ...history].slice(0, MAX_HISTORY_LENGTH);
  storage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}

export function readFavorites(storage: Storage = localStorage): number[] {
  return readNumberArray(storage, FAVORITES_KEY);
}

export function toggleFavorite(talkId: number, storage: Storage = localStorage): number[] {
  const favorites = new Set(readFavorites(storage));
  if (favorites.has(talkId)) {
    favorites.delete(talkId);
  } else {
    favorites.add(talkId);
  }
  const nextFavorites = [...favorites];
  storage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites));
  return nextFavorites;
}

export function readPlaybackProgress(talkId: number, storage: Storage = localStorage): number {
  return readProgressMap(storage)[talkId] ?? 0;
}

export function savePlaybackProgress(
  talkId: number,
  seconds: number,
  storage: Storage = localStorage,
): void {
  const progress = readProgressMap(storage);
  progress[talkId] = Math.max(0, Math.floor(seconds));
  storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function readLastPlayedTalkId(storage: Storage = localStorage): number | null {
  const value = Number(storage.getItem(LAST_PLAYED_KEY));
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function saveLastPlayedTalkId(talkId: number, storage: Storage = localStorage): void {
  storage.setItem(LAST_PLAYED_KEY, String(talkId));
}

function readNumberArray(storage: Storage, key: string): number[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is number => Number.isInteger(item) && item > 0)
      : [];
  } catch {
    return [];
  }
}

function readProgressMap(storage: Storage): PlaybackProgress {
  try {
    const value: unknown = JSON.parse(storage.getItem(PROGRESS_KEY) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([key, seconds]) => Number.isInteger(Number(key)) && typeof seconds === "number",
      ),
    );
  } catch {
    return {};
  }
}
