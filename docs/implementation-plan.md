# Implementation plan

This plan is intentionally aligned with the Git history. Each milestone has one expected commit subject; a clean checkout at any completed milestone should be usable by the next agent without reconstructing unfinished work.

## Product outcome

Deliver an installable, mobile-first web app that selects a random public Dharma Seed recording from a user-defined pool. The pool can be narrowed by recording kind, fine-grained topic, and teacher. Guided meditations are excluded from the Dhamma-talk kind and included in the all-recordings kind.

## Milestones

- [x] `docs: establish project engineering standards`
  - Define maintainability, testing, review, content, privacy, and Git requirements.

- [x] `docs: plan the local-first archive architecture`
  - Record the product semantics, integration boundary, synchronization model, and delivery plan.

- [x] `build: scaffold the tested installable web app`
  - Add the application shell, pinned toolchain, PWA metadata, formatting, linting, type checking, unit-test setup, and CI.

- [x] `feat: add the Dharma Seed catalog domain`
  - Add validated external payload adapters, topic classification, recording-kind classification, random selection, local catalog persistence, incremental synchronization, and unit/integration tests.

- [x] `feat: build the mobile random-listening experience`
  - Add the filter workflow, teacher/topic combinations, no-repeat shuffle behavior, selected-talk presentation, persistent player, local playback progress, and component tests.

- [x] `docs: verify and document the first release`
  - Complete accessibility/responsive review, live read-only contract check, full quality suite, production build, setup/deployment documentation, and final review.

- [x] `feat: make listening a one-tap mobile flow`
  - Put compact play actions first, remove editorially featured topics, make topic and teacher refinements searchable, keep the displayed and playing talk aligned, and offer continuation of the latest recording.

## Shared catalog milestones

These milestones replace direct per-device Dharma Seed synchronization with one
polite, shared metadata copy while preserving IndexedDB as the on-device cache.

- [x] `docs: plan the shared catalog architecture`
  - Record cache ownership, refresh triggering, atomic publication, recovery,
    pagination, and privacy decisions.

- [x] `feat: add the hosted catalog schema`
  - Add a migration-managed Neon schema, pooled runtime connection, direct
    migration connection, refresh lease, catalog versions, normalized records,
    and removal tombstones.

- [ ] `feat: synchronize the shared catalog atomically`
  - Fetch bounded upstream deltas, validate every payload, serialize refreshes,
    apply a complete update transactionally, retain the last good edition on
    failure, and expose a local bootstrap command.

- [ ] `feat: serve the versioned shared catalog`
  - Serve bounded full and incremental indexes and detail pages from Neon,
    trigger stale refreshes after the response, add a protected daily refresh
    route, and cache version-addressed detail responses at the CDN.

- [ ] `feat: hydrate devices from the shared catalog`
  - Keep the existing replay-safe IndexedDB synchronization, switch its source
    entirely to the hosted catalog, and preserve offline and retry behavior.

- [ ] `ops: release the shared catalog`
  - Validate migrations and synchronization on the development branch, apply
    the migration and bootstrap to production, configure Vercel secrets and the
    daily cron, run the complete quality suite, and verify the deployed path.

## Product semantics

### Recording kinds

- **Any recording** includes public Dhamma talks and guided meditations.
- **Dhamma talk** excludes recordings classified as guided meditations.
- **Guided meditation** includes recordings explicitly identified as meditation or instruction practice by the source data or high-confidence title/description rules.
- Ambiguous recordings remain eligible for **Any recording** but are not forced into a narrower kind.

### Filters

- Kind, topic, and teacher filters combine using AND semantics.
- Multiple selected topics combine using OR semantics within the topic dimension. This makes a selection such as “anatta or dependent origination, by this teacher” useful rather than unexpectedly narrow.
- Topics overlap and preserve their finer-grained meanings. For example, a talk can match both `three-characteristics` and `not-self`.
- English is the default language when language metadata is available. The interface permits all languages.
- Duration is optional and unconstrained by default.

### Randomness and repetition

- Selection is uniform over the talks in the eligible pool.
- Recently selected talks are excluded while alternatives exist.
- The on-device history behaves like a shuffle bag: it resets only when the current filter pool has been exhausted.
- Each explicit quick-listen action selects a recording and requests playback in the same tap.
- A future “broader teacher variety” mode may sample teachers first, but it is outside the first release.

### Classification

- Prefer explicit source recording-type metadata.
- Supplement it with deterministic, testable topic and kind rules over normalized titles and descriptions.
- Include alternate terminology, Pali/Sanskrit terms, spelling variants, and common compound forms.
- Keep classification explainable: the interface can report the matching topics, and rules remain inspectable in source.
- Do not use hosted AI classification in the first release. It would add cost, non-determinism, and another data-processing boundary without being necessary for a useful result.

## Delivery checks

Each feature milestone must pass:

1. Unit and relevant component/integration tests.
2. Type checking.
3. Linting and formatting checks.
4. A production build.
5. Diff review for duplication, cohesion, factoring, and accidental external-contract leakage.

The final milestone additionally checks the primary flow at narrow Android and desktop viewport sizes and confirms that the live external contract still matches its recorded fixtures.

## Review and continuation

The [2026-09-12 code review](code-review.md) records historical findings against commit `bd0b601`. The subsequently authorized fixes are implemented; the [repair journal](repair-progress.md) maps them to Git checkpoints and records final verification. Former opt-in reproductions are now normal regression tests.
