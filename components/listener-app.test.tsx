import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
];

describe("ListenerApp", () => {
  beforeEach(() => {
    vi.mocked(getAllTalks).mockResolvedValue(talks);
    vi.mocked(getAllTeachers).mockResolvedValue([makeTeacher()]);
  });

  it("links to Dharma Seed's official donation page", async () => {
    render(<ListenerApp />);

    expect(screen.getByRole("link", { name: "Donate to DharmaSeed" })).toHaveAttribute(
      "href",
      "https://dharmaseed.org/about/donation/",
    );
  });

  it("selects from the Dhamma-talk pool and shows attribution", async () => {
    const user = userEvent.setup();
    render(<ListenerApp />);

    await user.click(await screen.findByLabelText("Dhamma talk"));
    await user.click(screen.getByRole("button", { name: "Choose a teaching" }));

    const heading = await screen.findByRole("heading", { name: "The nature of not-self" });
    const selection = heading.closest("article");
    expect(selection).not.toBeNull();
    expect(within(selection!).getByText("Test Teacher")).toBeVisible();
    expect(
      within(selection!).getByRole("link", { name: /Original on Dharma Seed/ }),
    ).toHaveAttribute("href", "https://www.dharmaseed.org/talks/1/");
  });

  it("allows topic and teacher filters to be combined", async () => {
    const user = userEvent.setup();
    render(<ListenerApp />);

    const notSelfTopics = await screen.findAllByLabelText("Not-self (anatta)");
    await user.click(notSelfTopics[0]!);
    await user.selectOptions(screen.getByLabelText("Teacher"), "10");

    expect(screen.getByText("1 synchronized recordings in this pool")).toBeVisible();
  });
});
