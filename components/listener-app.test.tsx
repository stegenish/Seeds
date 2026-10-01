import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveLastPlayedTalkId, toggleFavoriteTeacher } from "@/lib/user/preferences";
import { makeTalk, makeTeacher } from "@/test/factories";
import { SiteShell } from "./site-shell";
import { StillpointProvider } from "./stillpoint-provider";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

vi.mock("@/lib/catalog/database", () => ({
  getAllTalks: vi.fn(),
  getAllTeachers: vi.fn(),
}));

vi.mock("@/lib/catalog/sync", () => ({
  syncCatalog: vi.fn(async () => undefined),
}));

import { getAllTalks, getAllTeachers } from "@/lib/catalog/database";
import { ListenerApp } from "./listener-app";

const talks = [
  makeTalk({ id: 1, title: "The nature of not-self", topicIds: ["not-self"] }),
  makeTalk({ id: 2, title: "A guided breath meditation", kind: "guided-meditation" }),
  makeTalk({ id: 3, title: "A second Dhamma talk" }),
];

function renderApp() {
  return render(
    <StillpointProvider>
      <SiteShell>
        <ListenerApp />
      </SiteShell>
    </StillpointProvider>,
  );
}

describe("ListenerApp", () => {
  beforeEach(() => {
    vi.mocked(getAllTalks).mockResolvedValue(talks);
    vi.mocked(getAllTeachers).mockResolvedValue([makeTeacher()]);
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("links to Dharma Seed's official donation page", async () => {
    renderApp();

    expect(screen.getByRole("link", { name: "Donate" })).toHaveAttribute(
      "href",
      "https://dharmaseed.org/about/donation/",
    );
  });

  it("R6: keeps one-tap playback and favorites working when storage is full", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    renderApp();
    await user.click(await screen.findByRole("button", { name: /Play a Dhamma talk/ }));
    expect(playSpy).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Listening still works");
    await user.click(screen.getByRole("button", { name: "Add to favorites" }));
    expect(screen.getByRole("button", { name: "Remove from favorites" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Remove from favorites" }));
    expect(screen.getByRole("button", { name: "Add to favorites" })).toBeVisible();
  });

  it("starts a random Dhamma talk with one tap and keeps the card aligned with audio", async () => {
    const user = userEvent.setup();
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    renderApp();

    await user.click(await screen.findByRole("button", { name: /Play a Dhamma talk/ }));

    const heading = await screen.findByRole("heading", { name: "The nature of not-self" });
    const selection = heading.closest("article");
    expect(selection).not.toBeNull();
    expect(within(selection!).getByText("Test Teacher")).toBeVisible();
    expect(
      within(selection!).getByRole("link", { name: /Original on Dharma Seed/ }),
    ).toHaveAttribute("href", "https://www.dharmaseed.org/talks/1/");
    expect(screen.getByLabelText("Now playing").querySelector("audio")).toHaveAttribute(
      "src",
      talks[0]!.audioUrl,
    );
    expect(playSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Play another" }));

    expect(await screen.findByRole("heading", { name: "A second Dhamma talk" })).toBeVisible();
    expect(screen.getByLabelText("Now playing").querySelector("audio")).toHaveAttribute(
      "src",
      talks[2]!.audioUrl,
    );
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it("favorites a teacher from the quick-listen chooser and starts that teacher", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    renderApp();

    const chooser = await screen.findByRole("button", {
      name: /Choose a favorite teacher for play a Dhamma talk/i,
    });
    await user.click(chooser);
    expect(screen.getByText("No favorite teachers yet.")).toBeVisible();
    await user.type(screen.getByRole("searchbox", { name: "Find teachers to favorite" }), "Test");
    await user.click(screen.getByRole("button", { name: "Add Test Teacher to favorite teachers" }));
    expect(
      screen.getByRole("button", { name: "Remove Test Teacher from favorite teachers" }),
    ).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(chooser).toHaveFocus();
    await user.click(chooser);
    await user.click(screen.getByRole("button", { name: /Test Teacher.*matching/i }));

    expect(await screen.findByRole("heading", { name: "The nature of not-self" })).toBeVisible();
    expect(localStorage.getItem("stillpoint:favorite-teachers")).toBe("[10]");
  });

  it("plays across favorite teachers, keeps the pool for next, and can return to one teacher", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    toggleFavoriteTeacher(10);
    toggleFavoriteTeacher(20);
    vi.mocked(getAllTeachers).mockResolvedValue([
      makeTeacher(),
      makeTeacher({ id: 20, name: "Other Teacher" }),
    ]);
    vi.mocked(getAllTalks).mockResolvedValue([
      ...talks.slice(0, 2),
      makeTalk({ id: 3, title: "Other teacher's talk", teacherIds: [20] }),
      makeTalk({ id: 4, title: "Not a favorite teacher", teacherIds: [30] }),
    ]);
    renderApp();
    const chooser = await screen.findByRole("button", {
      name: /Choose a favorite teacher for play a Dhamma talk/i,
    });
    await user.click(chooser);
    const combined = screen.getByRole("button", { name: /All favorite teachers/ });
    expect(combined).toHaveTextContent("2 matching");
    await user.click(combined);
    expect(await screen.findByRole("heading", { name: "The nature of not-self" })).toBeVisible();
    expect(screen.getByText(/Any topic · All favorite teachers · English/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Play another" }));
    expect(await screen.findByRole("heading", { name: "Other teacher's talk" })).toBeVisible();
    await user.click(chooser);
    await user.click(screen.getByRole("button", { name: /Test Teacher.*matching/i }));
    expect(await screen.findByRole("heading", { name: "The nature of not-self" })).toBeVisible();
    expect(screen.getByText(/Any topic · Test Teacher · English/)).toBeVisible();
    // The combined option overrides the previously selected individual teacher.
    await user.click(chooser);
    expect(screen.getByRole("button", { name: /All favorite teachers/ })).toHaveTextContent(
      "2 matching",
    );
    await user.click(screen.getByRole("button", { name: /All favorite teachers/ }));
    expect(await screen.findByRole("heading", { name: "The nature of not-self" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Play another" }));
    expect(await screen.findByRole("heading", { name: "Other teacher's talk" })).toBeVisible();
    // Removing a favorite immediately narrows the active pool, without stopping playback.
    await user.click(
      screen.getByRole("button", { name: "Remove Other Teacher from favorite teachers" }),
    );
    await user.click(screen.getByRole("button", { name: "Play another" }));
    expect(await screen.findByRole("heading", { name: "The nature of not-self" })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Remove Test Teacher from favorite teachers" }),
    );
    expect(screen.getByRole("button", { name: /Play a Dhamma talk/ })).toBeDisabled();
    await user.click(screen.getByText("Refine the selection"));
    await user.click(screen.getByRole("button", { name: "Remove all favorite teachers filter" }));
    expect(screen.getByRole("button", { name: /Play a Dhamma talk/ })).toHaveTextContent(
      "3 available",
    );
  });

  it("offers the combined pool for each recording kind and disables zero matches", async () => {
    const user = userEvent.setup();
    toggleFavoriteTeacher(10);
    renderApp();
    for (const [label, count] of [
      ["a guided meditation", 1],
      ["anything", 3],
    ] as const) {
      await user.click(
        await screen.findByRole("button", {
          name: new RegExp(`Choose a favorite teacher for play ${label}`, "i"),
        }),
      );
      expect(screen.getByRole("button", { name: /All favorite teachers/ })).toHaveTextContent(
        `${count} matching`,
      );
      await user.click(screen.getByRole("button", { name: "Close teacher chooser" }));
    }
    await user.click(screen.getByText("Refine the selection"));
    await user.click(screen.getByText("Duration and language"));
    await user.selectOptions(screen.getByLabelText("Duration"), "15");
    await user.click(
      screen.getByRole("button", { name: /Choose a favorite teacher for play a Dhamma talk/i }),
    );
    expect(screen.getByRole("button", { name: /All favorite teachers/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /All favorite teachers/ })).toHaveTextContent(
      "No matches with current refinements",
    );
  });

  it("treats every topic equally and combines searchable topic and teacher refinements", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByText("Refine the selection"));
    expect(await screen.findByLabelText("Four Noble Truths")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Four Noble Truths")).toHaveLength(1);
    expect(screen.queryByText(/Browse all/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Search topics"), "anatta");
    await user.click(screen.getByLabelText("Not-self (anatta)"));
    await user.type(screen.getByLabelText("Teacher"), "Test");
    await user.click(screen.getByRole("button", { name: "Test Teacher" }));
    await user.click(screen.getByRole("button", { name: "Add Test Teacher to favorite teachers" }));
    expect(
      screen.getByRole("button", { name: "Remove Test Teacher from favorite teachers" }),
    ).toBeVisible();

    const dhammaButton = screen.getByRole("button", { name: /Play a Dhamma talk/ });
    expect(within(dhammaButton).getByText("1 available")).toBeVisible();
  });

  it("offers a one-tap continuation for the most recently played talk", async () => {
    const user = userEvent.setup();
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    saveLastPlayedTalkId(1);
    renderApp();

    await user.click(await screen.findByRole("button", { name: /Continue listening/ }));

    expect(await screen.findByRole("heading", { name: "The nature of not-self" })).toBeVisible();
    expect(screen.getByLabelText("Now playing").querySelector("audio")).toHaveAttribute(
      "src",
      talks[0]!.audioUrl,
    );
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it("R10: exposes hidden restrictions and clears a zero-result refinement", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByText("Refine the selection"));
    await user.click(screen.getByText("Duration and language"));
    await user.selectOptions(screen.getByLabelText("Duration"), "15");
    await user.selectOptions(screen.getByLabelText("Language"), "");
    await user.click(screen.getByText("Refine the selection"));
    expect(screen.getByText(/Any topic · Any teacher · Up to 15 min · Any language/)).toBeVisible();
    expect(screen.getByRole("button", { name: /Play a Dhamma talk/ })).toBeDisabled();
    await user.click(screen.getByText("Refine the selection"));
    await user.click(screen.getByRole("button", { name: "Clear refinements" }));
    expect(screen.getByRole("button", { name: /Play a Dhamma talk/ })).toBeEnabled();
  });

  it("explains how to recover when the browser blocks the first playback request", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("Playback blocked", "NotAllowedError"),
    );
    renderApp();

    await user.click(await screen.findByRole("button", { name: /Play a Dhamma talk/ }));

    expect(await screen.findByText("Tap play to start audio")).toBeVisible();
  });
});
