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
    });
  });
});
