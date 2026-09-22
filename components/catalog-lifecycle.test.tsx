import { StrictMode } from "react";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { makeTalk, makeTeacher } from "@/test/factories";
vi.mock("@/lib/catalog/database", () => ({ getAllTalks: vi.fn(), getAllTeachers: vi.fn() }));
vi.mock("@/lib/catalog/sync", () => ({ syncCatalog: vi.fn() }));
import { getAllTalks, getAllTeachers } from "@/lib/catalog/database";
import { syncCatalog } from "@/lib/catalog/sync";
import { useCatalog } from "@/lib/catalog/use-catalog";
import { ListenerApp } from "./listener-app";
import { SiteShell } from "./site-shell";
import { StillpointProvider } from "./stillpoint-provider";
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

function App() {
  return (
    <StillpointProvider>
      <SiteShell>
        <ListenerApp />
      </SiteShell>
    </StillpointProvider>
  );
}

beforeEach(() => {
  vi.mocked(getAllTalks).mockResolvedValue([makeTalk()]);
  vi.mocked(getAllTeachers).mockResolvedValue([makeTeacher()]);
  vi.mocked(syncCatalog).mockImplementation(async (options) => options?.signal?.throwIfAborted());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("R3: synchronizes under StrictMode using an active signal", async () => {
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  await screen.findByText(/ready$/);
  expect(vi.mocked(syncCatalog).mock.calls.some(([options]) => !options?.signal?.aborted)).toBe(
    true,
  );
});
it("R2: removes withdrawn recordings from UI eligibility", async () => {
  vi.mocked(syncCatalog).mockImplementation(async (options) => {
    options?.onProgress?.({
      resource: "talks",
      completed: 0,
      total: 0,
      addedTalks: [],
      addedTeachers: [],
      removedIds: [1],
    });
  });
  render(<App />);
  await screen.findByText(/ready$/);
  expect(screen.getByRole("button", { name: /Play a Dhamma talk/ })).toBeDisabled();
});
it("R9: exposes an error and retries without discarding cached listening", async () => {
  const user = userEvent.setup();
  vi.mocked(syncCatalog).mockRejectedValueOnce(new Error("Connection interrupted"));
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Connection interrupted");
  expect(screen.getByRole("button", { name: /Play a Dhamma talk/ })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Retry archive sync" }));
  await screen.findByText(/ready$/);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
it("stops claiming to prepare after an empty-device failure", async () => {
  vi.mocked(getAllTalks).mockResolvedValue([]);
  vi.mocked(syncCatalog).mockRejectedValue(new Error("Offline"));
  render(<App />);
  await screen.findByRole("alert");
  expect(screen.queryByText("Preparing…")).not.toBeInTheDocument();
});
it("aborts on unmount and ignores late progress", async () => {
  let publish: Parameters<typeof syncCatalog>[0];
  vi.mocked(syncCatalog).mockImplementation(async (options) => {
    publish = options;
  });
  const { result, unmount } = renderHook(useCatalog);
  await waitFor(() => expect(result.current.state.status).toBe("ready"));
  unmount();
  expect(publish?.signal?.aborted).toBe(true);
  act(() =>
    publish?.onProgress?.({
      resource: "talks",
      completed: 1,
      total: 1,
      addedTalks: [makeTalk({ id: 2 })],
      addedTeachers: [],
      removedIds: [],
    }),
  );
  expect(result.current.talks.map((talk) => talk.id)).toEqual([1]);
});
it("bounds automatic retries and permits recovery on reconnection", async () => {
  vi.useFakeTimers();
  vi.mocked(syncCatalog).mockRejectedValue(new Error("Timeout"));
  const { result } = renderHook(useCatalog);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000);
  });
  expect(syncCatalog).toHaveBeenCalledTimes(3);
  expect(result.current.state.status).toBe("error");
  vi.mocked(syncCatalog).mockResolvedValue();
  await act(async () => {
    window.dispatchEvent(new Event("online"));
  });
  expect(result.current.state.status).toBe("ready");
});
