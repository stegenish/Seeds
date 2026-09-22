import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { makeTalk, makeTeacher } from "@/test/factories";

vi.mock("next/navigation", () => ({ usePathname: () => "/favorites" }));
vi.mock("@/lib/catalog/database", () => ({ getAllTalks: vi.fn(), getAllTeachers: vi.fn() }));
vi.mock("@/lib/catalog/sync", () => ({ syncCatalog: vi.fn(async () => undefined) }));

import { getAllTalks, getAllTeachers } from "@/lib/catalog/database";
import { FavoritesPage } from "./favorites-page";
import { SiteShell } from "./site-shell";
import { StillpointProvider } from "./stillpoint-provider";

beforeEach(() => {
  vi.mocked(getAllTalks).mockResolvedValue([
    makeTalk({ id: 1, title: "Favorite Dhamma", kind: "talk", languageId: 2 }),
    makeTalk({ id: 2, title: "Favorite meditation", kind: "guided-meditation", languageId: 2 }),
  ]);
  vi.mocked(getAllTeachers).mockResolvedValue([makeTeacher()]);
  localStorage.setItem("stillpoint:favorites", "[1,2]");
  localStorage.setItem("stillpoint:favorite-teachers", "[10,999]");
});

it("groups favorite recordings and keeps favorite teachers in a separate view", async () => {
  const user = userEvent.setup();
  render(
    <StillpointProvider>
      <SiteShell>
        <FavoritesPage />
      </SiteShell>
    </StillpointProvider>,
  );

  expect(await screen.findByRole("heading", { name: /Dhamma talks/ })).toBeVisible();
  expect(screen.getByRole("heading", { name: /Guided meditations/ })).toBeVisible();
  expect(screen.getByText("Favorite Dhamma")).toBeVisible();
  expect(screen.getByText("Favorite meditation")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Remove Favorite Dhamma from favorites" }));
  expect(screen.getByRole("status")).toHaveTextContent("Favorite Dhamma removed");
  await user.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.getByText("Favorite Dhamma")).toBeVisible();

  await user.click(screen.getByRole("tab", { name: /Teachers/ }));
  expect(screen.getByRole("heading", { name: "Test Teacher" })).toBeVisible();
  expect(screen.getByText("1 saved teacher is waiting for catalog metadata.")).toBeVisible();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  await user.click(screen.getByRole("button", { name: "Play anything" }));
  expect(screen.getByLabelText("Now playing")).toBeVisible();
});
