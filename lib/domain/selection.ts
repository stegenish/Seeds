import type { SelectionFilters, Talk } from "./talk";

export interface RandomSelection {
  talk: Talk | null;
  eligibleCount: number;
  historyWasReset: boolean;
  nextHistory: number[];
}

export function filterTalks(talks: Talk[], filters: SelectionFilters): Talk[] {
  return talks.filter((talk) => {
    if (filters.kind !== "all" && talk.kind !== filters.kind) {
      return false;
    }

    if (filters.teacherId !== null && !talk.teacherIds.includes(filters.teacherId)) {
      return false;
    }

    if (filters.languageId !== null && talk.languageId !== filters.languageId) {
      return false;
    }

    if (
      filters.maximumDurationMinutes !== null &&
      (talk.durationMinutes === null || talk.durationMinutes > filters.maximumDurationMinutes)
    ) {
      return false;
    }

    if (
      filters.topicIds.length > 0 &&
      !filters.topicIds.some((topicId) => talk.topicIds.includes(topicId))
    ) {
      return false;
    }

    return true;
  });
}

export function selectRandomTalk(
  talks: Talk[],
  filters: SelectionFilters,
  recentIds: ReadonlySet<number>,
  random: () => number = Math.random,
): RandomSelection {
  const eligible = filterTalks(talks, filters);
  if (eligible.length === 0) {
    return { talk: null, eligibleCount: 0, historyWasReset: false, nextHistory: [...recentIds] };
  }

  const unseen = eligible.filter((talk) => !recentIds.has(talk.id));
  const pool = unseen.length > 0 ? unseen : eligible;
  const rawIndex = Math.floor(random() * pool.length);
  const index = Math.min(Math.max(rawIndex, 0), pool.length - 1);

  const talk = pool[index] ?? null;
  const catalogIds = new Set(talks.map((item) => item.id));
  const resetIds =
    unseen.length === 0 ? new Set(eligible.map((item) => item.id)) : new Set<number>();
  const retained = [...recentIds].filter(
    (id) => catalogIds.has(id) && !resetIds.has(id) && id !== talk?.id,
  );
  return {
    talk,
    eligibleCount: eligible.length,
    historyWasReset: unseen.length === 0,
    nextHistory: talk ? [talk.id, ...retained] : retained,
  };
}
