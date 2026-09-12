# Code review and continuation journal

Review target: `bd0b6012985f79b29fa549bcda6e6d44dc48ec5b` (main).

Historical review: implementation was subsequently authorized. See [the repair journal](repair-progress.md) for current status and commit checkpoints. The opt-in probes below have now been promoted into the normal regression suite; run `pnpm test` and `pnpm test:e2e`, not the retired review configuration.

Scope: bugs, duplication/cohesion/factoring, and meaningful test coverage. The user requested a review, not implementation of fixes. Only review artifacts should change during this task.

## Progress

- [x] Read engineering instructions; confirmed clean starting worktree and recorded revision.
- [x] Review catalog integration, persistence, and synchronization.
- [x] Review domain selection, classification, and user preferences.
- [x] Review playback, component state, refinements, and accessibility.
- [x] Review PWA/offline behavior, configuration, and CI.
- [x] Run existing checks and focused diagnostic reproductions.
- [x] Finalize prioritized findings and proposed repair sequence.

## How to resume

1. Read this file, `AGENTS.md`, and `git status --short`.
2. Compare current HEAD with the review target; preserve all unrelated changes.
3. This review is complete. Continue with the repair sequence below only when implementation is authorized.
4. Run `pnpm exec vitest run --config docs/review/vitest.config.ts` to reproduce findings. At the reviewed revision, **10 probes intentionally fail**, covering eight distinct findings. These are desired-behavior assertions, not passing characterization tests. No remote requests are made.
5. Promote each relevant probe into the normal colocated test suite as its fix is implemented; remove the corresponding review probe to avoid duplicated coverage. Strengthen fixtures/assertions as needed for the chosen design.
6. Do not infer permission to fix application code from this review request. The review changes only this report, its opt-in probes, and a link from the implementation plan.

## Findings

P1 means fix promptly; P2 means a normal-priority correctness/reliability issue. IDs are stable for continuation, not severity order. Recommended priority: R1, R2, R7, R3, then remaining P2 issues.

The following eight findings have deterministic failing reproductions in `docs/review/`:

- **R1 / P1 — Interrupted incremental synchronization can skip changes.** `lib/catalog/sync.ts:97-105` drops the base edition when a pending checkpoint exists, requests a full index, then applies an offset measured against the previous delta. Persist the exact work list/base edition, or restart from zero when switching index modes. Test a 501-item delta interrupted after its first batch against a differently ordered full index.
- **R2 / P1 — Deletions do not reach every catalog representation.** Detail-response `removedIds` are parsed but never applied (`lib/catalog/sync.ts:126-144`). Index removals reach IndexedDB, but progress exposes additions only and the UI only merges them (`components/listener-app.tsx:67-79`). Removed talks can remain selectable in the current session; detail-only removals survive reloads. Test removals through both response types and assert both storage and UI eligibility.
- **R3 / P1 — Development Strict Mode aborts the only synchronization attempt.** `components/listener-app.tsx:50-53,90-92` combines a permanent started ref with effect cleanup that aborts the request. Effect replay cannot restart it. `next.config.ts` explicitly enables Strict Mode. Test the app under React StrictMode with a fetch mock that honors AbortSignal.
- **R4 / P2 — Shuffle exhaustion never actually resets history.** `lib/domain/selection.ts:51-59` reports a reset, but `components/listener-app.tsx:143-148` only adds to existing history. Exhausted small pools subsequently sample with replacement indefinitely. The 2,000-item history cap also means archive-wide no-repeat cycles are not supported. Test two complete cycles, not just the first reset flag.
- **R5 / P2 — The offline shell omits its JavaScript and CSS.** `public/sw.js` handles `/_next/static/` cache misses by fetching without storing the response; installation only caches HTML, manifest, and favicon. Offline startup depends on incidental browser HTTP caching. Test an online visit followed by offline navigation with HTTP cache disabled and Cache Storage retained.
- **R6 / P2 — Optional persistence failures can prevent listening.** Uncaught `localStorage.setItem` calls run before playback (`components/listener-app.tsx:127-128,144-145`; `lib/user/preferences.ts`). Quota or denied-storage errors should not stop in-memory selection/playback. Test throwing storage reads/writes and degraded-mode feedback.
- **R7 / P1 — Cached details can permanently lag the checkpointed edition.** `app/api/catalog/[resource]/route.ts:43-45` permits day-long caching and week-long stale detail responses. Detail request URLs contain only IDs (`lib/catalog/sync.ts:122-124`), and the response edition is never checked before advancing the index edition at line 147. A repeated batch can return old records after a newer index identifies changes; subsequent delta requests consider those records synchronized. The probe returns old-edition details for a new index and observes the new checkpoint being saved. Make caching and checkpoint consistency one explicit protocol: partition/invalidate detail caches by edition and reject/retry stale detail results. The reproduction models a cache response; no live Vercel CDN was exercised.
- **R8 / P2 — Common unaccented topic names are unsearchable.** `components/topic-filter.tsx:15-23` lowercases labels but does not normalize diacritics or search aliases. Typing `metta` removes `Loving-kindness (mettā)` from results; `karuna`, `mudita`, and `upekkha` have the same mismatch. Classification already knows these terms. Share text normalization and add explicit searchable aliases to the taxonomy; do not derive search keywords from regex source strings. Test accented/unaccented terms and synonyms such as `three dharma seals`.

Additional source-confirmed usability/recovery issues:

- **R9 / P2 — Recoverable sync failures have no in-app recovery path.** `components/listener-app.tsx:82-92` terminates initialization on error and never reruns it; `components/catalog-status.tsx:19-22` puts the actual error in a hover title, with no retry action. On an empty device, the quick actions remain disabled and say `Preparing…` even after failure (`components/quick-listen-actions.tsx:72-74`; `components/listener-app.tsx:195`). A transient timeout or returning online requires a page reload. Expose a touch-readable error and retry, with bounded backoff/online recovery. Test failure → retry → ready, abort without retry, and retaining cached listening during failure.
- **R10 / P2 — Active duration/language restrictions disappear from the collapsed summary.** `components/listener-app.tsx:311-320` displays only topic count and teacher. After choosing a short duration and collapsing refinements, the app can say `Any topic · Any teacher` while every quick action says `No matches`. Include all effective restrictions in a concise summary and provide clear removal/reset affordances. Test a duration-only restriction, any-language selection, and clearing after zero results.

## Reproduction evidence

Command: `pnpm exec vitest run --config docs/review/vitest.config.ts`.

| Finding     | Observed result at reviewed revision                                                         |
| ----------- | -------------------------------------------------------------------------------------------- |
| R1          | After interruption and resume, talk 1 still has `Old title`, not `Updated title`.            |
| R2, storage | A detail response removing talk 1 leaves it in IndexedDB.                                    |
| R2, UI      | After a deletion-only sync completes, the removed talk's play button remains enabled.        |
| R3          | Every synchronization call under StrictMode receives an already-aborted signal.              |
| R4          | Two two-item shuffle cycles yield `[1, 2, 1, 1]`, not `[1, 2, 1, 2]`, with a controlled RNG. |
| R5          | Successful fetch of a Next.js chunk never calls Cache Storage `put`.                         |
| R6, writes  | A simulated quota error escapes selection-history persistence.                               |
| R6, reads   | A simulated denied-storage error escapes last-played lookup.                                 |
| R7          | An old detail edition is accepted and the new index edition is checkpointed.                 |
| R8          | Searching `metta` leaves no matching loving-kindness checkbox.                               |

Probes use jsdom, fake IndexedDB, fixture fetchers, and a service-worker event harness. They establish these code paths, not actual Android audio behavior, browser HTTP-cache behavior, or CDN behavior end to end.

## Maintainability: duplication, cohesion, and factoring

The project does not need a rewrite. Its pure domain functions, isolated remote adapter, small presentational components, and injected RNG/fetch/storage are good foundations. The main maintenance weakness is lifecycle/state ownership, not excessive repeated markup.

1. **Give catalog state one application-level owner.** `ListenerApp` currently hydrates IndexedDB, synchronizes, merges records, sorts teachers, handles cancellation, loads preferences, selects talks, initiates playback, and renders the page. Extract a cohesive catalog controller/hook with a typed snapshot/delta protocol, cancellation, retry, and readiness. Keep IndexedDB/network calls below it. R2 and R3 demonstrate why this boundary matters. Do not merely move the existing effect unchanged into another file.
2. **Unify stable internal contracts, not remote and internal representations.** `lib/domain/talk.ts` and `lib/catalog/sync.ts:14-57` separately describe domain records. Adapter response interfaces and client schemas also repeat the index/detail envelope. The `ZodType<Talk>` annotation helps catch type drift, but constraints/defaults still need one authoritative home. Extract shared internal API schemas/types and batch limits; keep permissive remote schemas separately owned by the integration. Avoid a generic repository framework for two resources.
3. **Version derived classifications.** `adapter.ts:62-63` computes `kind` and `topicIds` only when details are fetched. IndexedDB preserves them indefinitely and sync only revisits upstream-changed records. Editing topic/kind rules therefore will not update existing users' unchanged talks. Add a classifier version and deterministic local reclassification/migration using the stored title, description, and recording type. Test an older catalog against changed rules. This is a changeability risk, not evidence that an upstream classification was incorrect today.
4. **Separate shuffle transitions from durable preferences.** A pure transition should return the chosen recording and next history, including exhaustion semantics; a best-effort storage adapter should save it. R4 currently arises because selection reports `historyWasReset` while the UI is responsible for an implicit state transition it never performs. Specify behavior when filters change and when the history cap is reached.
5. **Centralize playback start and lifecycle policy.** `persistent-player.tsx:25-35,47-59` duplicates `play()` handling with different error messages. Share one playback request operation; test media events, seek restoration, errors, close/replacement cleanup, and progress flushing. The player is keyed by talk ID and has no explicit unmount/pagehide progress flush or media-session cleanup. Real-browser validation is needed before claiming overlapping/ghost audio; this review does not establish that symptom.
6. **Keep search semantics with the taxonomy.** A small normalized alias list avoids UI-specific search rules diverging from classification terminology. Teacher search can reuse normalization without coupling it to topic classification. Leave the simple `FilterSelect`, `TopicChip`, and quick-action rendering alone; extracting more generic UI layers would add indirection without clear value.

## Test coverage assessment

The existing suite is useful but insufficient for the app's main reliability claims. It is weighted toward first-run happy paths and pure helper behavior.

| Area                 |     Existing tests | Important missing behaviors                                                                                 |
| -------------------- | -----------------: | ----------------------------------------------------------------------------------------------------------- |
| Classification       |                  7 | Table-driven taxonomy/alias cases, explicit-type conflicts, negative matches, reclassification migration    |
| Filtering/selection  |                  6 | Multiple shuffle cycles, history cap, changed filters, language/null duration boundaries                    |
| Adapter              |                  3 | Malformed details, missing/nullable fields, teacher visibility variants, URL validation, removals           |
| IndexedDB            |                  3 | Upgrade/reclassification path, opening failures, multi-tab interruption/coordination                        |
| Sync                 |                  1 | Delta/resume, changed editions, stale details, deletions, partial batches, malformed payloads, abort, retry |
| Preferences          |                  5 | Denied/quota storage, malformed progress/last-played data, bounded history semantics                        |
| Listener UI          |                  5 | StrictMode, real sync deltas, zero matches/errors/retry, complete filter summary, favorites through UI      |
| Player/API route/PWA | No dedicated tests | Actual media lifecycle; route input bounds/400/404/502/cache headers; offline shell and upgrade behavior    |

`test/setup.ts` globally replaces media `play` with a resolved promise and `pause` with a no-op. Existing component tests prove a playback request and matching `src`, not advancing playback, restoration of playback position, interruption handling, or cleanup. Add dedicated player tests with controlled events/time plus a small production-browser suite for selection → advancing audio → pause/resume → next/close, page reload continuation, and favorites. Use a local permitted audio fixture or intercepted test response; ordinary tests should not stream Dharma Seed recordings.

Add a production offline-shell browser test with browser HTTP caching disabled but service-worker Cache Storage retained; assert JavaScript hydration and access to cached catalog metadata. Offline audio is explicitly out of scope. Check Android backgrounding/media controls on a real device separately.

The live contract script is bounded and separate from CI, which is good. It checks only a few talk fields and does not run the actual adapter or verify teachers/delta semantics. Expand recorded fixtures first; extend the explicitly invoked smoke check only with bounded requests. No live contract request was made during this review.

## Suggested repair sequence, aligned with Git

These are proposed future commits, **not completed implementation work**. Promote probes to ordinary regression tests in each fix commit and record its hash here.

- [ ] `fix: preserve catalog synchronization checkpoints` — R1; exact resumable work-list semantics, crash/retry coverage.
- [ ] `fix: propagate catalog removals to active selection` — R2; shared deletion-aware delta, storage/UI consistency, define current-player behavior on withdrawal.
- [ ] `fix: align catalog caching with edition checkpoints` — R7; route/cache protocol and stale-edition regression tests.
- [ ] `fix: make catalog startup restartable` — R3/R9; cohesive catalog owner, safe effect replay, visible error/retry, preserve cached usability.
- [ ] `fix: preserve shuffle cycles across selections` — R4; pure next-history transition, explicit cap/filter-change semantics.
- [ ] `fix: keep listening available when preference storage fails` — R6; best-effort persistence with in-memory state and feedback.
- [ ] `fix: cache the complete offline application shell` — R5; hashed assets, cache upgrade/failure tests, scope cache cleanup to this app.
- [ ] `fix: make refinements searchable and visible` — R8/R10; normalized aliases and complete compact summaries.
- [ ] `refactor: centralize catalog contracts and classification versions` — versioned migration plus schema ownership, no unrelated UI changes.
- [ ] `test: cover playback and installed-app lifecycle` — dedicated player coverage and production-browser critical paths; separate behavior fixes if failures are discovered.

## Verification and limitations

- `pnpm test`: **30 passed across 7 files**, before adding opt-in probes.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed, including the review artifacts in TypeScript checking.
- Review probes: **10 expected failures across 4 files**, documenting R1–R8 rather than changing application behavior. The normal Vitest include pattern does not match `*.probe.ts(x)`.
- Final recheck with review artifacts present: **30 normal tests passed**; formatting, lint, and type checking passed. The deliberately failing probes remain opt-in and do not change the normal suite's result.
- No fresh browser/device or live CDN/API verification was performed; the reviewed source and deterministic local tests support the findings above. No fixes, deployments, or remote repository writes are part of this review.
