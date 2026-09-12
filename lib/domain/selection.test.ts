import { describe, expect, it } from "vitest";
import { makeTalk } from "@/test/factories";
import type { SelectionFilters } from "./talk";
import { filterTalks, selectRandomTalk } from "./selection";

const filters: SelectionFilters = {
  kind: "all",
  topicIds: [],
  teacherId: null,
  languageId: 1,
  maximumDurationMinutes: null,
};

describe("filterTalks", () => {
  const talks = [
    makeTalk({ id: 1, kind: "talk", topicIds: ["not-self"], teacherIds: [10] }),
    makeTalk({
      id: 2,
      kind: "guided-meditation",
      topicIds: ["loving-kindness"],
      teacherIds: [20],
      durationMinutes: 20,
    }),
    makeTalk({ id: 3, kind: "other", topicIds: ["dependent-origination"], teacherIds: [10] }),
  ];

  it("combines kind, teacher, and duration with AND semantics", () => {
    expect(
      filterTalks(talks, {
        ...filters,
        kind: "guided-meditation",
        teacherId: 20,
        maximumDurationMinutes: 30,
      }).map((talk) => talk.id),
    ).toEqual([2]);
  });

  it("combines selected topics with OR semantics", () => {
    expect(
      filterTalks(talks, {
        ...filters,
        topicIds: ["not-self", "loving-kindness"],
      }).map((talk) => talk.id),
    ).toEqual([1, 2]);
  });

  it("excludes guided meditations and other recordings from Dhamma talks", () => {
    expect(filterTalks(talks, { ...filters, kind: "talk" }).map((talk) => talk.id)).toEqual([1]);
  });
});

describe("selectRandomTalk", () => {
  const talks = [makeTalk({ id: 1 }), makeTalk({ id: 2 }), makeTalk({ id: 3 })];

  it("R4: produces two complete shuffle cycles without repeats within either", () => {
    let history: number[] = [];
    const selected = Array.from({ length: 6 }, () => {
      const result = selectRandomTalk(talks, filters, new Set(history), () => 0);
      history = result.nextHistory;
      return result.talk?.id;
    });
    expect(selected).toEqual([1, 2, 3, 1, 2, 3]);
  });
  it("resets only the exhausted filter pool and discards removed catalog IDs", () => {
    const result = selectRandomTalk(
      talks,
      { ...filters, teacherId: 20 },
      new Set([1, 999]),
      () => 0,
    );
    expect(result.talk).toBeNull();
    const narrow = [makeTalk({ id: 1, teacherIds: [20] }), makeTalk({ id: 2 })];
    expect(
      selectRandomTalk(narrow, { ...filters, teacherId: 20 }, new Set([1, 2, 999]), () => 0)
        .nextHistory,
    ).toEqual([1, 2]);
  });
  it("continues a pool larger than the old 2,000-record cap", () => {
    const largePool = Array.from({ length: 2002 }, (_, id) => makeTalk({ id: id + 1 }));
    const history = new Set(largePool.slice(0, 2001).map((talk) => talk.id));
    const result = selectRandomTalk(largePool, filters, history, () => 0);
    expect(result.talk?.id).toBe(2002);
    expect(result.nextHistory).toHaveLength(2002);
  });

  it("selects uniformly by index from unseen eligible talks", () => {
    expect(selectRandomTalk(talks, filters, new Set([1]), () => 0.99).talk?.id).toBe(3);
  });

  it("resets the pool only after all eligible talks have been seen", () => {
    const result = selectRandomTalk(talks, filters, new Set([1, 2, 3]), () => 0);
    expect(result.talk?.id).toBe(1);
    expect(result.historyWasReset).toBe(true);
  });

  it("reports an empty pool without calling into undefined items", () => {
    expect(selectRandomTalk([], filters, new Set(), () => 0)).toEqual({
      talk: null,
      eligibleCount: 0,
      historyWasReset: false,
      nextHistory: [],
    });
  });
});
