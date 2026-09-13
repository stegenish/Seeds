import { loadLocalEnvironment } from "./load-local-env";

loadLocalEnvironment();

const { refreshCatalog } = await import("../lib/server/catalog/refresh");

try {
  const result = await refreshCatalog({ force: true });
  if (result.status === "skipped") {
    console.info("Catalog refresh skipped because another refresh owns the lease.");
  } else {
    console.info(
      `Catalog version ${result.version} published (${result.itemCount} changed records).`,
    );
  }
  process.exitCode = 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Catalog refresh failed.");
  process.exitCode = 1;
}
