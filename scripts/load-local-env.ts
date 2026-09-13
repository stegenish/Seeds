import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadLocalEnvironment(directory = process.cwd()): void {
  const path = resolve(directory, ".env.local");
  if (existsSync(path)) process.loadEnvFile(path);
}
