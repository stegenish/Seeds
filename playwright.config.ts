import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    ...devices["Pixel 7"],
    baseURL: "http://127.0.0.1:3100",
    channel:
      process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined),
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
  },
});
