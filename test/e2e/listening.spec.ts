import { expect, test, type BrowserContext } from "@playwright/test";
import { makeTalk, makeTeacher } from "../factories";

// Generated silence, not a downloaded/modified Dharma Seed recording.
function silentWav() {
  const bytes = 8_000 * 2 * 60;
  const wav = Buffer.alloc(44 + bytes);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + bytes, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8_000, 24);
  wav.writeUInt32LE(16_000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(bytes, 40);
  return wav;
}
async function fixtures(context: BrowserContext) {
  const talks = [1, 2].map((id) =>
    makeTalk({
      id,
      title: `Fixture teaching ${id}`,
      audioUrl: `http://127.0.0.1:3100/__test_audio/${id}.wav`,
    }),
  );
  const wav = silentWav();
  await context.route("**/api/catalog/**", async (route) => {
    const url = new URL(route.request().url());
    const items = url.pathname.endsWith("teachers") ? [makeTeacher()] : talks;
    const ids = url.searchParams.get("ids");
    const payload = ids
      ? { items: items.filter((item) => ids.split(",").includes(String(item.id))) }
      : { ids: items.map((item) => item.id) };
    await route.fulfill({ json: { ...payload, edition: "2026-09-12 12:00:00", removedIds: [] } });
  });
  await context.route("**/__test_audio/**", async (route) => {
    const range = route
      .request()
      .headers()
      ["range"]?.match(/bytes=(\d+)-(\d*)/);
    const start = Number(range?.[1] ?? 0);
    const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    await route.fulfill({
      status: range ? 206 : 200,
      contentType: "audio/wav",
      body: wav.subarray(start, end + 1),
      headers: {
        "Accept-Ranges": "bytes",
        ...(range ? { "Content-Range": `bytes ${start}-${end}/${wav.length}` } : {}),
      },
    });
  });
  // Failing the test is preferable to silently making a live catalog/audio request.
  await context.route(/https?:\/\/([^/]+\.)?dharmaseed\.org\//, (route) => route.abort());
}

test.beforeEach(async ({ context }) => fixtures(context));

test("one tap plays audio; refine, reload, next, close, and favorites preserve coherent state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Play a Dhamma talk/ })).toBeEnabled();
  await page.getByRole("button", { name: /Play a Dhamma talk/ }).click();
  const audio = page.locator("audio");
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime))
    .toBeGreaterThan(0.1);
  const title = await page.locator("article h2").textContent();
  await page.getByRole("button", { name: "Add to favorites" }).click();
  await page.getByText("Refine the selection").click();
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused))
    .toBe(false);
  await audio.evaluate((element: HTMLAudioElement) => {
    element.currentTime = 12;
  });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: /Continue listening/ }).click();
  await expect(page.locator("article h2")).toHaveText(title!);
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime))
    .toBeGreaterThanOrEqual(12);
  await expect(page.getByRole("button", { name: "Remove from favorites" })).toBeVisible();
  const previousAudio = await audio.elementHandle();
  await page.getByRole("button", { name: "Play another" }).click();
  await expect(page.locator("article h2")).not.toHaveText(title!);
  expect(
    await previousAudio!.evaluate(
      (element: HTMLAudioElement) => element.paused && !element.getAttribute("src"),
    ),
  ).toBe(true);
  const closingAudio = await audio.elementHandle();
  await page.getByRole("button", { name: "Close player" }).click();
  await expect(audio).toHaveCount(0);
  expect(
    await closingAudio!.evaluate(
      (element: HTMLAudioElement) => element.paused && !element.getAttribute("src"),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("offline startup hydrates the cached app without browser HTTP cache", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByText("2 ready")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const session = await context.newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await context.unroute("**/api/catalog/**");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: /Play a Dhamma talk/ })).toBeEnabled();
  await page.getByText("Refine the selection").click();
  await page.getByRole("searchbox", { name: "Search topics" }).fill("metta");
  await expect(page.getByLabel("Loving-kindness (mettā)")).toBeVisible();
});
