import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { TopicFilter } from "@/components/topic-filter";

it("finds metta without requiring a diacritic keyboard (R8)", async () => {
  const user = userEvent.setup();
  render(<TopicFilter selectedIds={[]} onToggle={() => undefined} />);
  await user.type(screen.getByLabelText("Search topics"), "metta");
  expect(screen.queryByLabelText("Loving-kindness (mettā)")).toBeInTheDocument();
});
