import { expect, it } from "vitest";
import { searchTopics, TOPICS } from "./topics";
it.each([
  ["metta", "loving-kindness"],
  ["karuna", "compassion"],
  ["mudita", "appreciative-joy"],
  ["upekkha", "equanimity"],
  ["three dharma seals", "three-characteristics"],
  ["paṭicca samuppāda", "dependent-origination"],
])("finds %s by normalized alias", (query, id) => {
  expect(searchTopics(query).map((topic) => topic.id)).toContain(id);
});
it("lists every topic once in alphabetical order without featured subsets", () => {
  const topics = searchTopics("");
  expect(topics).toHaveLength(TOPICS.length);
  expect(new Set(topics.map((topic) => topic.id)).size).toBe(TOPICS.length);
  expect(topics.map((topic) => topic.label)).toEqual(
    TOPICS.map((topic) => topic.label).sort((a, b) => a.localeCompare(b, "en")),
  );
});
