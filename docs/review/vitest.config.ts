import { mergeConfig } from "vitest/config";
import base from "../../vitest.config.js";

// Explicitly invoked review probes; deliberately excluded from the normal suite.
export default mergeConfig(base, {
  test: { include: ["docs/review/*.probe.{ts,tsx}"] },
});
