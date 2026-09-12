import { expect, it } from "vitest";
import { formatRefinementSummary } from "./refinements";
it("shows all effective filters including individual topic names", () => {
  expect(
    formatRefinementSummary(
      {
        kind: "all",
        topicIds: ["not-self"],
        teacherId: 10,
        maximumDurationMinutes: 15,
        languageId: null,
      },
      "Teacher",
    ),
  ).toBe("Not-self (anatta) · Teacher · Up to 15 min · Any language");
});
