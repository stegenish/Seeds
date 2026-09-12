# Dharma Seed Frontend — Agent Instructions

## Purpose

Build and maintain an unofficial, noncommercial, mobile-first frontend for the public Dharma Seed archive. The primary target is an installable web app that works well on Android and can be hosted on Vercel. Preserve a path to a native wrapper or app if browser limitations later justify it.

This project will be implemented mostly by coding agents. Make routine technical decisions autonomously, document consequential assumptions, and keep the project runnable and understandable after every completed increment. Ask the user only when a choice materially changes product behavior, cost, legal exposure, privacy, or an irreversible external state.

## Product and content constraints

- Treat this as an unofficial client. Do not imply endorsement by or affiliation with Dharma Seed.
- Use only publicly available talks. Do not attempt to access retreatant-only content or bypass access controls.
- Keep recordings complete and unmodified. Do not create or distribute clips, edited audio, generated transcripts, or other adaptations without separately confirming permission.
- Keep the service noncommercial. Do not add advertisements, paywalls, affiliate links, or monetization.
- Display appropriate attribution with each talk, including the teacher, a link to the original Dharma Seed page when available, and a link to the CC BY-NC-ND 4.0 license.
- Prefer streaming audio from Dharma Seed. Do not mirror or proxy audio files unless there is a documented technical need and the licensing and infrastructure implications have been reviewed.
- Isolate all Dharma Seed-specific endpoints, payloads, and URL construction behind a typed integration boundary. The API used by the official app is not a guaranteed public contract and may change.
- Be considerate of Dharma Seed's infrastructure: cache metadata, synchronize incrementally, avoid unnecessary requests, and never run unbounded crawls from request handlers.

## Engineering priorities

In order of importance:

1. Correct behavior and respect for content restrictions.
2. A simple, accessible mobile listening experience.
3. Maintainable boundaries and clear domain concepts.
4. Automated tests that protect behavior and integration assumptions.
5. Operational simplicity and low ongoing cost.
6. Performance improvements supported by measurement.

Prefer boring, well-supported technology over novel abstractions. Add dependencies only when they remove meaningful complexity or risk. Record significant architectural decisions in short files under `docs/decisions/`.

## Architecture and factoring

- Keep presentation, application/domain logic, external integrations, and persistence separate.
- Presentational components must not know Dharma Seed endpoint formats or perform ad hoc network requests.
- Put parsing and validation at system boundaries. Convert remote payloads into stable internal types before the rest of the application uses them.
- Keep domain logic deterministic and side-effect-free where practical.
- Use dependency injection at integration boundaries so tests can replace network, clock, and storage behavior.
- Maintain one authoritative implementation for each rule. Search for existing helpers and patterns before adding another.
- Prefer small cohesive modules with names that describe product concepts. Split files when they contain unrelated reasons to change, not merely because they are long.
- Avoid both copy-and-paste duplication and premature generic frameworks. Extract shared code when the common concept is clear and the resulting API is simpler than the duplication.
- Keep state ownership explicit. Avoid multiple caches or stores representing the same state unless synchronization rules are documented and tested.
- Validate external data and handle missing, malformed, or newly added fields without crashing the listening experience.
- Preserve playback state across navigation. Treat player lifetime separately from page/component lifetime.

## Implementation workflow

For every non-trivial change:

1. Inspect the current code, tests, documentation, and Git status before editing.
2. Define the smallest coherent user-visible or architectural increment.
3. Identify affected boundaries and test cases before implementation.
4. Implement the simplest design that satisfies the current requirement.
5. Add or update automated tests in the same change.
6. Run the narrowest relevant checks while iterating, then the full required check suite before completion.
7. Review the diff for duplication, cohesion, factoring, naming, accessibility, failure handling, and accidental scope growth.
8. Update documentation when behavior, setup, architecture, or an external contract changes.
9. Commit the verified increment as one coherent Git commit.

Do not leave the main branch knowingly broken between completed increments. Temporary local breakage while actively implementing is acceptable, but do not present or commit it as finished work.

## Testing policy

Automated tests are part of the implementation, not a follow-up task.

- Write unit tests for parsers, URL construction, transformations, search/filter rules, synchronization logic, reducers/state machines, and other deterministic behavior.
- Write integration tests for repository/storage behavior and the boundary between the application and the Dharma Seed adapter.
- Use recorded, minimal, sanitized fixtures for external API payloads. Ordinary test runs must not depend on live Dharma Seed or other remote services.
- Keep a small, explicitly invoked contract/smoke check for the live external API when useful. It must be read-only, bounded, polite, and must not run automatically on every unit-test invocation.
- Write component tests around user behavior rather than component internals.
- Add end-to-end coverage for critical flows once the UI exists: discover a talk, start playback, retain playback across navigation, resume progress, and manage a favorite or queue item.
- Every bug fix should first add a focused failing regression test when reasonably possible.
- Test success, empty, loading, malformed-data, timeout, and recoverable-error states where applicable.
- Prefer meaningful branch and behavior coverage over chasing a numerical coverage target. New core logic should not be left untested without a written reason.
- Keep tests deterministic. Control time, randomness, network, and storage explicitly.

Expose standard project commands as the project takes shape. Prefer a single obvious command for each concern, such as `test`, `lint`, `typecheck`, `format:check`, and `build`. CI and local development should use the same commands.

## Review checklist

Before declaring work complete, inspect the complete diff and answer these questions:

- Is any logic duplicated or nearly duplicated elsewhere?
- Does each changed module have one coherent responsibility?
- Are abstractions located at the correct boundary, or are transport/storage details leaking into UI code?
- Is the factoring understandable without following many tiny indirections?
- Are names based on domain meaning rather than implementation accidents?
- Can dependencies be removed or replaced with a small local implementation?
- Are external payloads validated and errors converted into useful application states?
- Are loading, empty, offline, timeout, and retry behaviors appropriate?
- Does the change preserve playback during navigation and common Android lifecycle events where relevant?
- Is the mobile layout touch-friendly and keyboard/screen-reader accessible?
- Are attribution, licensing, and original-source links still visible and correct?
- Are logs free of personal listening history, secrets, full remote payloads, and unnecessary noise?
- Did the change add dead code, commented-out code, generated artifacts, or unrelated formatting churn?
- Do the tests assert behavior strongly enough to catch a plausible regression?

Fix issues found during this review before committing. If a deliberate tradeoff remains, document it in the commit body or an architectural decision record.

## Git discipline

A readable Git history is a project deliverable.

- Check `git status` before and after each increment. Preserve user changes and unrelated work.
- Make small, atomic commits that each build and pass their relevant tests.
- Do not combine unrelated refactors, dependency upgrades, formatting sweeps, and product behavior in one commit.
- Use Conventional Commit-style subjects: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `build:`, `ci:`, or `chore:`.
- Write subjects in the imperative mood, keep them concise, and describe the outcome rather than the editing activity.
- Use the commit body for motivation, non-obvious tradeoffs, migration notes, and important verification details.
- Do not create vague commits such as `updates`, `changes`, `fix stuff`, or `WIP` in the maintained history.
- Do not commit secrets, local environment files, dependency directories, build output, test artifacts, large downloaded media, or editor-specific files.
- Do not rewrite, squash, amend, reset, or otherwise alter commits made by the user or another contributor unless explicitly asked.
- Prefer a preparatory refactor commit followed by a behavior commit when that separation makes both easier to review, but do not manufacture meaningless granularity.

## Documentation

- Keep the root README focused on setup, development commands, architecture at a glance, deployment, and licensing/attribution obligations.
- Document required environment variables in an example file with safe placeholder values.
- Document external API assumptions, synchronization behavior, caching, and recovery procedures.
- Add a short decision record when choosing or replacing the framework, persistence layer, offline strategy, deployment architecture, or native packaging approach.
- Comments should explain why a constraint or workaround exists. Prefer expressive code over comments that restate what the code does.

## Security, privacy, and operations

- Collect no personal data by default. Keep favorites, listening history, and progress on-device unless synchronization is explicitly requested.
- Never log listening history or stable device identifiers to hosted services without explicit user approval.
- Keep secrets server-side and validate all server inputs even for a personal deployment.
- Bound request sizes, pagination, retries, concurrency, and timeouts.
- Use exponential backoff for transient remote failures and avoid retry storms.
- Cache remote metadata with a documented invalidation or edition-based synchronization strategy.
- Do not make the audio path transit Vercel functions; this wastes bandwidth and can break seeking or long-lived playback.
- Pin important runtime/toolchain versions and review dependency updates intentionally.

## Definition of done

A change is done only when:

- The requested behavior works through its intended user path.
- Relevant unit and integration tests have been added or updated and pass.
- Linting, type checking, and the production build pass when those tools exist.
- The diff has been reviewed using the checklist above and resulting issues have been addressed.
- Documentation and decision records are current.
- No secrets, generated clutter, debug code, or unrelated changes are included.
- The work is captured in one or more coherent, well-described commits.
- Remaining risks or intentionally deferred work are clearly reported to the user.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
