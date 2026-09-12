# Review repairs

Authorized by the user after review commit `1a54436`. Start here when continuing implementation; preserve unrelated changes and consult `docs/code-review.md` for original evidence.

The proposed sequence is grouped into cohesive increments so shared contracts and their consumers change together:

- [x] Catalog correctness: R1/R2/R7, shared contracts, classification migration, regression/API tests. Commit subject: `fix: make catalog synchronization replay-safe and consistent`. Checks: 53 tests, typecheck, lint, formatting, production build. UI deletion regression is promoted in the catalog-owner increment.
- [x] Restartable catalog owner: R3/R9, deletion-aware UI, cancellation and retry tests. Commit subject: `fix: make catalog startup restartable`. Checks: 59 tests, typecheck, lint, production build. Catalog progress and deletion state now have one owner; retry is bounded to two attempts plus explicit/manual or online recovery.
- [x] Selection and preferences: R4/R6, pure shuffle transitions, best-effort storage, tests. Commit subject: `fix: preserve shuffle cycles and tolerate storage failures`. Checks: 66 tests, typecheck, lint, production build. History is bounded by live catalog IDs rather than 2,000 selections; pool exhaustion clears only that pool's history. Failed preference writes remain readable in session memory with visible feedback.
- [x] Refinements: R8/R10, normalized aliases, complete summaries, tests. Commit subject: `fix: make refinements searchable and visible`. Checks: 76 tests, typecheck, lint, production build. Topic/teacher search share normalization; topic aliases and every active filter appear without featured subsets.
- [x] Offline shell and playback: R5, cache upgrades, player lifecycle, production-browser tests. Commit subject: `fix: cache the offline shell and release playback cleanly`. Checks: 89 unit/component/integration tests, typecheck, lint, production build, and 2 production-browser tests. Startup dependencies are cached before HTML; old app-owned caches are removed without touching other caches. Playback flushes on pause/background/close and releases sources/media controls. Browser tests use Edge/Chromium with a phone viewport and generated silent WAV fixtures; no live audio or metadata is required.
- [ ] Full verification, final diff review, documentation, and push to the requested repository.

Each completed increment records its commit subject and checks here. No remote content or audio should be needed for automated tests. Android hardware testing must be reported separately from desktop Chromium emulation.
