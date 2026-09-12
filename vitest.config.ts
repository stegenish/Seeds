import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
  test: {
    include: ["{app,components,lib,test}/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    environmentOptions: {
      jsdom: { url: "http://localhost:3000/" },
    },
    setupFiles: ["./test/setup.ts"],
    clearMocks: true,
  },
});
