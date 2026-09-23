import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { makeTalk, makeTeacher } from "@/test/factories";

vi.mock("next/navigation", () => ({ usePathname: () => "/history" }));
vi.mock("@/lib/catalog/database", () => ({ getAllTalks: vi.fn(), getAllTeachers: vi.fn() }));
vi.mock("@/lib/catalog/sync", () => ({ syncCatalog: vi.fn(async () => undefined) }));

import { getAllTalks, getAllTeachers } from "@/lib/catalog/database";
import { HistoryPage } from "./history-page";
import { SiteShell } from "./site-shell";
import { StillpointProvider } from "./stillpoint-provider";

beforeEach(() => {
  vi.mocked(getAllTalks).mockResolvedValue([
    makeTalk({ id: 1, title: "Earlier listen" }),
    makeTalk({ id: 2, title: "Latest listen" }),
  ]);
  vi.mocked(getAllTeachers).mockResolvedValue([makeTeacher()]);
  localStorage.setItem(
    "stillpoint:listening-history",
    JSON.stringify([
      { talkId: 2, listenedAt: 2_000 },
      { talkId: 999, listenedAt: 1_500 },
      { talkId: 1, listenedAt: 1_000 },
    ]),
  );
});

it("shows the newest listens first and can favorite and replay them", async () => {
  const user = userEvent.setup();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  render(
    <StillpointProvider>
      <SiteShell>
        <HistoryPage />
      </SiteShell>
    </StillpointProvider>,
  );

  const rows = await screen.findAllByRole("article");
  expect(within(rows[0]!).getByText("Latest listen")).toBeVisible();
  expect(within(rows[1]!).getByText("Earlier listen")).toBeVisible();
  expect(screen.getByText("1 history entry is waiting for catalog metadata.")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Add Latest listen to favorites" }));
  expect(screen.getByRole("button", { name: "Remove Latest listen from favorites" })).toBeVisible();
  await user.click(rows[0]!.querySelector(".favorite-talk-main")!);
  expect(screen.getByLabelText("Now playing")).toBeVisible();
});
