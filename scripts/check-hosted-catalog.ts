import { loadLocalEnvironment } from "./load-local-env";

loadLocalEnvironment();

const { PostgresCatalogRepository } = await import("../lib/server/catalog/postgres-repository");
const { getCatalogDatabase } = await import("../lib/server/database/client");
const { catalogRemovals } = await import("../lib/server/database/schema");
const { count } = await import("drizzle-orm");

try {
  const repository = new PostgresCatalogRepository();
  const state = await repository.getState();
  const [talks, teachers] = await Promise.all([
    repository.getIndex("talks", null),
    repository.getIndex("teachers", null),
  ]);
  const [removals] = await getCatalogDatabase().select({ count: count() }).from(catalogRemovals);
  console.info(
    `Catalog version ${state.activeVersion} is readable with ${talks.ids.length} talks, ${teachers.ids.length} teachers, and ${removals.count} removal tombstones.`,
  );
  process.exitCode = 0;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
