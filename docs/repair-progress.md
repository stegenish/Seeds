# Review repairs

Authorized by the user after review commit `1a54436`. Start here when continuing implementation; preserve unrelated changes and consult `docs/code-review.md` for original evidence.

The proposed sequence is grouped into cohesive increments so shared contracts and their consumers change together:

- [x] Catalog correctness: R1/R2/R7, shared contracts, classification migration, regression/API tests. Commit subject: `fix: make catalog synchronization replay-safe and consistent`. Checks: 53 tests, typecheck, lint, formatting, production build. UI deletion regression is promoted in the catalog-owner increment.
- [x] Restartable catalog owner: R3/R9, deletion-aware UI, cancellation and retry tests. Commit subject: `fix: make catalog startup restartable`. Checks: 59 tests, typecheck, lint, production build. Catalog progress and deletion state now have one owner; retry is bounded to two attempts plus explicit/manual or online recovery.
- [x] Selection and preferences: R4/R6, pure shuffle transitions, best-effort storage, tests. Commit subject: `fix: preserve shuffle cycles and tolerate storage failures`. Checks: 66 tests, typecheck, lint, production build. History is bounded by live catalog IDs rather than 2,000 selections; pool exhaustion clears only that pool's history. Failed preference writes remain readable in session memory with visible feedback.
- [x] Refinements: R8/R10, normalized aliases, complete summaries, tests. Commit subject: `fix: make refinements searchable and visible`. Checks: 76 tests, typecheck, lint, production build. Topic/teacher search share normalization; topic aliases and every active filter appear without featured subsets.
- [x] Offline shell and playback: R5, cache upgrades, player lifecycle, production-browser tests. Commit subject: `fix: cache the offline shell and release playback cleanly`. Checks: 89 unit/component/integration tests, typecheck, lint, production build, and 2 production-browser tests. Startup dependencies are cached before HTML; old app-owned caches are removed without touching other caches. Playback flushes on pause/background/close and releases sources/media controls. Browser tests use Edge/Chromium with a phone viewport and generated silent WAV fixtures; no live audio or metadata is required.
- [x] Full verification, final diff review, and documentation. Final checks: 89 tests across 17 files, 3 production-browser tests, format, lint, typecheck, and build. A final phone-width regression exposed summary truncation, repaired in `fix: keep active refinements readable on narrow phones`. The 360-pixel screenshot was inspected for readability and overflow.

Each completed increment records its commit subject and checks here. No remote content or audio should be needed for automated tests. Android hardware testing must be reported separately from desktop Chromium emulation.

## Git checkpoints and delivery

- `1640076`: catalog consistency, shared schemas, classification migration (R1/R2/R7).
- `09a37b0`: catalog owner and restartable recovery (R3/R9; UI side of R2).
- `baebfcc`: shuffle history and storage fallback (R4/R6).
- `4e55171`: searchable refinements and complete summaries (R8/R10).
- `98fbdc9`: offline shell, player lifecycle, browser tests and CI (R5).
- Final phone-width regression: find `fix: keep active refinements readable on narrow phones` in the Git log.

Delivery target: `origin/main` at `https://github.com/stegenish/Seeds`. The earlier review commit is included in the delivery history. All temporary review probes have been promoted into normal tests; no failing opt-in harness remains.

Remaining verification boundary: production tests used local Microsoft Edge (Chromium) with a phone viewport, fixture metadata, and generated silence. Physical Android background/lock-screen playback and live upstream contract checks were not performed. No recordings were downloaded, edited, or mirrored.
