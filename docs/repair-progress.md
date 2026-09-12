# Review repairs

Authorized by the user after review commit `1a54436`. Start here when continuing implementation; preserve unrelated changes and consult `docs/code-review.md` for original evidence.

The proposed sequence is grouped into cohesive increments so shared contracts and their consumers change together:

- [x] Catalog correctness: R1/R2/R7, shared contracts, classification migration, regression/API tests. Commit subject: `fix: make catalog synchronization replay-safe and consistent`. Checks: 53 tests, typecheck, lint, formatting, production build. UI deletion regression is promoted in the catalog-owner increment.
- [x] Restartable catalog owner: R3/R9, deletion-aware UI, cancellation and retry tests. Commit subject: `fix: make catalog startup restartable`. Checks: 59 tests, typecheck, lint, production build. Catalog progress and deletion state now have one owner; retry is bounded to two attempts plus explicit/manual or online recovery.
- [ ] Selection and preferences: R4/R6, pure shuffle transitions, best-effort storage, tests.
- [ ] Refinements: R8/R10, normalized aliases, complete summaries, tests.
- [ ] Offline shell and playback: R5, cache upgrades, player lifecycle, production-browser tests.
- [ ] Full verification, final diff review, documentation, and push to the requested repository.

Each completed increment records its commit subject and checks here. No remote content or audio should be needed for automated tests. Android hardware testing must be reported separately from desktop Chromium emulation.
