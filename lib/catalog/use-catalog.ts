"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import type { Talk, Teacher } from "@/lib/domain/talk";
import { getAllTalks, getAllTeachers } from "./database";
import { syncCatalog, type CatalogProgress } from "./sync";

export type CatalogSyncState =
  | { status: "loading" }
  | { status: "syncing"; progress: CatalogProgress }
  | { status: "ready" }
  | { status: "error"; message: string };

interface Snapshot {
  talks: Talk[];
  teachers: Teacher[];
  state: CatalogSyncState;
}
type Action =
  | { type: "hydrate"; talks: Talk[]; teachers: Teacher[] }
  | { type: "progress"; progress: CatalogProgress }
  | { type: "state"; state: CatalogSyncState };

function applyDelta<T extends { id: number }>(
  current: T[],
  incoming: T[],
  removedIds: number[],
): T[] {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) merged.set(item.id, item);
  for (const id of removedIds) merged.delete(id);
  return [...merged.values()];
}

function reducer(snapshot: Snapshot, action: Action): Snapshot {
  if (action.type === "hydrate")
    return { ...snapshot, talks: action.talks, teachers: action.teachers };
  if (action.type === "state") return { ...snapshot, state: action.state };
  const progress = action.progress;
  return {
    talks:
      progress.resource === "talks"
        ? applyDelta(snapshot.talks, progress.addedTalks, progress.removedIds)
        : snapshot.talks,
    teachers:
      progress.resource === "teachers"
        ? applyDelta(snapshot.teachers, progress.addedTeachers, progress.removedIds)
            .filter((teacher) => teacher.isPublic)
            .sort((a, b) => a.name.localeCompare(b.name))
        : snapshot.teachers,
    state: { status: "syncing", progress },
  };
}

export function useCatalog() {
  const [snapshot, dispatch] = useReducer(reducer, {
    talks: [],
    teachers: [],
    state: { status: "loading" },
  });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let running = false;
    const active = () => !controller.signal.aborted;
    async function run() {
      if (!active() || running) return;
      running = true;
      clearTimeout(timer);
      dispatch({ type: "state", state: { status: "loading" } });
      try {
        const [talks, teachers] = await Promise.all([getAllTalks(), getAllTeachers()]);
        if (!active()) return;
        dispatch({ type: "hydrate", talks, teachers });
        await syncCatalog({
          signal: controller.signal,
          onProgress(progress) {
            if (active()) dispatch({ type: "progress", progress });
          },
        });
        if (active()) dispatch({ type: "state", state: { status: "ready" } });
        failures = 0;
      } catch (error) {
        if (!active()) return;
        dispatch({
          type: "state",
          state: {
            status: "error",
            message: error instanceof Error ? error.message : "The archive could not be prepared.",
          },
        });
        // Two retries only. Further attempts require user action or reconnection.
        if (failures < 2 && navigator.onLine)
          timer = setTimeout(() => void run(), 1000 * 2 ** failures++);
      } finally {
        running = false;
      }
    }
    function onOnline() {
      if (!running) {
        failures = 0;
        void run();
      }
    }
    void run();
    window.addEventListener("online", onOnline);
    return () => {
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [attempt]);

  return { ...snapshot, retry };
}
