import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { makeTalk, makeTeacher } from "@/test/factories";
import { selectRandomTalk } from "@/lib/domain/selection";
import { addSelectionToHistory } from "@/lib/user/preferences";
import type { SelectionFilters } from "@/lib/domain/talk";

vi.mock("@/lib/catalog/database", () => ({ getAllTalks: vi.fn(), getAllTeachers: vi.fn() }));
vi.mock("@/lib/catalog/sync", () => ({ syncCatalog: vi.fn() }));
import { getAllTalks, getAllTeachers } from "@/lib/catalog/database";
import { syncCatalog } from "@/lib/catalog/sync";
import { TopicFilter } from "@/components/topic-filter";

beforeEach(() => {
  vi.mocked(getAllTalks).mockResolvedValue([makeTalk()]);
  vi.mocked(getAllTeachers).mockResolvedValue([makeTeacher()]);
  vi.mocked(syncCatalog).mockResolvedValue();
});
afterEach(() => vi.restoreAllMocks());

it("R4: avoids repeats during the second shuffle cycle", () => {
  const talks = [makeTalk({ id: 1 }), makeTalk({ id: 2 })];
  const filters: SelectionFilters = {
    kind: "all",
    topicIds: [],
    teacherId: null,
    languageId: null,
    maximumDurationMinutes: null,
  };
  let history: number[] = [];
  const selected = Array.from({ length: 4 }, () => {
    const result = selectRandomTalk(talks, filters, new Set(history), () => 0);
    history = addSelectionToHistory(result.talk!.id);
    return result.talk!.id;
  });
  expect(selected).toEqual([1, 2, 1, 2]);
});

it("R8: finds metta without requiring a diacritic keyboard", async () => {
  const user = userEvent.setup();
  render(<TopicFilter selectedIds={[]} onToggle={() => undefined} />);
  await user.type(screen.getByLabelText("Search topics"), "metta");
  expect(screen.queryByLabelText("Loving-kindness (mettā)")).toBeInTheDocument();
});
