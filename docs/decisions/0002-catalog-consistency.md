# 0002: One metadata cache and replay-safe synchronization

- Status: accepted
- Date: 2026-09-12

IndexedDB plus upstream edition deltas is the metadata cache. Catalog HTTP responses now use `no-store`: two small index requests per visit are preferable to independent CDN lifetimes that can checkpoint stale details. Detail URLs include a snapshot parameter to bypass pre-existing first-release CDN entries. Audio remains streamed directly from Dharma Seed.

A checkpoint contains the exact index IDs, base edition, target edition, and completed offset. Resume is allowed only when all match a freshly fetched index. Changed or legacy work lists replay from zero; writes and deletions are idempotent. Detail batches must account for every requested ID. Older editions are rejected; newer upstream timestamp editions are safe because only the older index edition is checkpointed, leaving newer changes for the next delta. Unknown unequal edition formats fail closed. Web Locks serialize sync across tabs where supported.

Index and detail removals are explicit UI deltas. Withdrawn recordings are removed from selection and a currently selected withdrawn recording is closed. Derived kind/topic classifications are versioned locally and migrated transactionally from stored text, without network requests. Bump `CLASSIFICATION_VERSION` whenever classification rules change.
