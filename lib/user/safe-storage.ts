// Durable preferences are best-effort. A failed write must still be readable for
// this session, including when reads work but the browser's quota is exhausted.
interface Session {
  values: Map<string, string>;
  dirty: Set<string>;
}
let sessions = new WeakMap<Storage, Session>();
let unavailableSession: Session = { values: new Map(), dirty: new Set() };
let unavailable = false;
const subscribers = new Set<() => void>();
export const getStorageUnavailable = () => unavailable;
export const subscribeStorage = (listener: () => void) => {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};
function reportFailure() {
  if (unavailable) return;
  unavailable = true;
  for (const listener of subscribers) listener();
}
function resolve(provided?: Storage): { storage?: Storage; session: Session } {
  try {
    const storage = provided ?? window.localStorage;
    let session = sessions.get(storage);
    if (!session) {
      session = { values: new Map(), dirty: new Set() };
      sessions.set(storage, session);
    }
    return { storage, session };
  } catch {
    reportFailure();
    return { session: unavailableSession };
  }
}
export function readStoredValue(key: string, provided?: Storage): string | null {
  const { storage, session } = resolve(provided);
  if (session.dirty.has(key)) return session.values.get(key) ?? null;
  try {
    if (!storage) return session.values.get(key) ?? null;
    const value = storage.getItem(key);
    if (value === null) session.values.delete(key);
    else session.values.set(key, value);
    return value;
  } catch {
    reportFailure();
    return session.values.get(key) ?? null;
  }
}
export function writeStoredValue(key: string, value: string, provided?: Storage): void {
  const { storage, session } = resolve(provided);
  session.values.set(key, value);
  session.dirty.add(key);
  try {
    if (!storage) return;
    storage.setItem(key, value);
    session.dirty.delete(key);
  } catch {
    reportFailure();
  }
}
export function resetPreferenceSessionForTests(): void {
  sessions = new WeakMap();
  unavailableSession = { values: new Map(), dirty: new Set() };
  unavailable = false;
}
