import { createRef } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { makeTalk } from "@/test/factories";
import { readPlaybackProgress, savePlaybackProgress } from "@/lib/user/preferences";
import { PersistentPlayer, type PersistentPlayerHandle } from "./persistent-player";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function setup() {
  const ref = createRef<PersistentPlayerHandle>();
  const view = render(
    <PersistentPlayer
      ref={ref}
      talk={makeTalk()}
      teacherNames="Teacher"
      onClose={() => undefined}
    />,
  );
  const audio = view.container.querySelector("audio")!;
  Object.defineProperty(audio, "duration", { configurable: true, value: 100 });
  return { ...view, audio, ref };
}
it("restores position only after metadata and saves on pause", () => {
  savePlaybackProgress(1, 24);
  const { audio } = setup();
  expect(audio.currentTime).toBe(0);
  fireEvent.loadedMetadata(audio);
  expect(audio.currentTime).toBe(24);
  audio.currentTime = 32;
  fireEvent.pause(audio);
  expect(readPlaybackProgress(1)).toBe(32);
});
it("flushes unthrottled progress on page hide and unmount and releases audio", () => {
  const pause = vi.spyOn(HTMLMediaElement.prototype, "pause");
  const { audio, unmount } = setup();
  fireEvent.loadedMetadata(audio);
  audio.currentTime = 31;
  fireEvent(window, new Event("pagehide"));
  expect(readPlaybackProgress(1)).toBe(31);
  audio.currentTime = 33;
  unmount();
  expect(readPlaybackProgress(1)).toBe(33);
  expect(pause).toHaveBeenCalled();
  expect(audio).not.toHaveAttribute("src");
});
it("does not overwrite a saved position when closed before metadata loads", () => {
  savePlaybackProgress(1, 24);
  setup().unmount();
  expect(readPlaybackProgress(1)).toBe(24);
});
it("handles buffering, playing, and completion events", () => {
  const { audio } = setup();
  fireEvent.waiting(audio);
  expect(screen.getByText("Loading audio…")).toBeVisible();
  fireEvent.playing(audio);
  expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
  fireEvent.ended(audio);
  expect(screen.getByText("Recording complete")).toBeVisible();
  expect(screen.getByRole("button", { name: "Play" })).toBeVisible();
});
it("uses the same recovery message for imperative and button playback", async () => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
    new DOMException("Denied", "NotAllowedError"),
  );
  const { ref } = setup();
  await act(async () => ref.current?.play());
  expect(screen.getByText("Tap play to start audio")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  await waitFor(() => expect(screen.getByText("Tap play to start audio")).toBeVisible());
});

it("throttles progress while playing but flushes immediately on backgrounding", () => {
  const clock = vi.spyOn(Date, "now").mockReturnValue(6000);
  const { audio } = setup();
  Object.defineProperty(audio, "paused", { configurable: true, value: false });
  fireEvent.loadedMetadata(audio);
  audio.currentTime = 10;
  fireEvent.timeUpdate(audio);
  expect(readPlaybackProgress(1)).toBe(10);
  clock.mockReturnValue(6500);
  audio.currentTime = 12;
  fireEvent.timeUpdate(audio);
  expect(readPlaybackProgress(1)).toBe(10);
  fireEvent(window, new Event("pagehide"));
  expect(readPlaybackProgress(1)).toBe(12);
});

it("seeks backward and forward by 15 seconds and 1 minute without crossing the recording bounds", () => {
  const { audio } = setup();
  audio.currentTime = 70;

  fireEvent.click(screen.getByRole("button", { name: "Back 1 minute" }));
  expect(audio.currentTime).toBe(10);
  fireEvent.click(screen.getByRole("button", { name: "Back 15 seconds" }));
  expect(audio.currentTime).toBe(0);

  fireEvent.click(screen.getByRole("button", { name: "Forward 15 seconds" }));
  expect(audio.currentTime).toBe(15);
  fireEvent.click(screen.getByRole("button", { name: "Forward 1 minute" }));
  expect(audio.currentTime).toBe(75);
  fireEvent.click(screen.getByRole("button", { name: "Forward 1 minute" }));
  expect(audio.currentTime).toBe(100);
});

it("wires media-session controls and clears them when the player closes", async () => {
  const handlers = new Map<string, MediaSessionActionHandler | null>();
  const session = {
    metadata: null as MediaMetadata | null,
    setActionHandler: vi.fn((name: string, handler: MediaSessionActionHandler | null) => {
      handlers.set(name, handler);
    }),
  };
  vi.stubGlobal("navigator", { mediaSession: session });
  vi.stubGlobal(
    "MediaMetadata",
    class {
      constructor(init: MediaMetadataInit) {
        Object.assign(this, init);
      }
    },
  );
  const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const pause = vi.spyOn(HTMLMediaElement.prototype, "pause");
  const { audio, unmount } = setup();
  expect(session.metadata?.title).toBe("A talk about practice");
  await act(async () => {
    handlers.get("play")?.({ action: "play" });
  });
  expect(play).toHaveBeenCalled();
  act(() => handlers.get("pause")?.({ action: "pause" }));
  expect(pause).toHaveBeenCalled();
  audio.currentTime = 50;
  act(() => handlers.get("seekbackward")?.({ action: "seekbackward", seekOffset: 20 }));
  expect(audio.currentTime).toBe(30);
  act(() => handlers.get("seekforward")?.({ action: "seekforward" }));
  expect(audio.currentTime).toBe(45);
  act(() => handlers.get("seekto")?.({ action: "seekto", seekTime: 42 }));
  expect(audio.currentTime).toBe(42);
  unmount();
  expect(session.metadata).toBeNull();
  expect([...handlers.values()]).toEqual([null, null, null, null, null]);
});
