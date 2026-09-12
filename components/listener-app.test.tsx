import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveLastPlayedTalkId } from "@/lib/user/preferences";
import { makeTalk, makeTeacher } from "@/test/factories";

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
    render(<ListenerApp />);

    expect(screen.getByRole("link", { name: "Donate to DharmaSeed" })).toHaveAttribute(
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
    render(<ListenerApp />);
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
    render(<ListenerApp />);

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

  it("treats every topic equally and combines searchable topic and teacher refinements", async () => {
    const user = userEvent.setup();
    render(<ListenerApp />);

    await user.click(screen.getByText("Refine the selection"));
    expect(await screen.findByLabelText("Four Noble Truths")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Four Noble Truths")).toHaveLength(1);
    expect(screen.queryByText(/Browse all/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Search topics"), "anatta");
    await user.click(screen.getByLabelText("Not-self (anatta)"));
    await user.type(screen.getByLabelText("Teacher"), "Test");
    await user.click(screen.getByRole("button", { name: "Test Teacher" }));

    const dhammaButton = screen.getByRole("button", { name: /Play a Dhamma talk/ });
    expect(within(dhammaButton).getByText("1 available")).toBeVisible();
  });

  it("offers a one-tap continuation for the most recently played talk", async () => {
    const user = userEvent.setup();
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    saveLastPlayedTalkId(1);
    render(<ListenerApp />);

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
    render(<ListenerApp />);
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
    render(<ListenerApp />);

    await user.click(await screen.findByRole("button", { name: /Play a Dhamma talk/ }));

    expect(await screen.findByText("Tap play to start audio")).toBeVisible();
  });
});
