import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const { PostgresCatalogRepository } = await import("../lib/server/catalog/postgres-repository");

try {
  const repository = new PostgresCatalogRepository();
  const state = await repository.getState();
  const [talks, teachers] = await Promise.all([
    repository.getIndex("talks", state.activeVersion),
    repository.getIndex("teachers", state.activeVersion),
  ]);
  console.info(
    `Catalog version ${state.activeVersion} is readable; current deltas contain ${talks.ids.length} talks and ${teachers.ids.length} teachers.`,
  );
  process.exitCode = 0;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
