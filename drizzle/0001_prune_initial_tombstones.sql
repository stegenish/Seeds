DELETE FROM "catalog_removals"
WHERE "catalog_version" = 1
  AND EXISTS (
    SELECT 1
    FROM "catalog_state"
    WHERE "id" = 1 AND "active_version" = 1
  );
