# First-release verification

- Date: 2026-09-12
- Runtime: Node.js 24.18.0, pnpm 11.3.0
- Target: installable Next.js web app, suitable for Vercel and Android Chrome

## Automated checks

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — 7 files and 26 tests passed
- `pnpm build` — production build passed
- `pnpm test:contract` — the bounded live Dharma Seed contract was compatible with edition `2026-09-12 09:38:26`

Ordinary tests use local fixtures and do not contact Dharma Seed. The contract command is deliberately separate and performs only two read-only requests.

## Browser checks

- Exercised progressive synchronization and random selection through the production server.
- Verified a normalized talk through `/api/catalog/talks` end to end.
- Checked the primary layout at 360 × 800 CSS pixels and at 1280 × 720.
- Confirmed no horizontal overflow at the narrow viewport.
- Confirmed the selected-talk card exposes teacher attribution, duration, date, playback, reselection, favorite, and original-source controls.
- Confirmed the browser console contained no warnings or errors during the checked flow.

## Maintainability review

- External payload shapes and URLs remain confined to the integration layer.
- Classification and random-selection rules are deterministic domain functions with focused unit tests.
- Catalog storage, synchronization, device preferences, presentation formatting, and playback have separate ownership.
- Shared filter, status, topic, selection, and player components avoid repeated UI implementations without introducing a generic component framework.
- No debug logging, credentials, downloaded audio, generated build output, or dead duplicate component implementations are included.

## Known boundaries

- Topic classification is intentionally heuristic and explainable; unusual titles may be unclassified or match more than one topic.
- Audio remains online-only and is streamed directly from Dharma Seed.
- Browser storage can be evicted. Catalog metadata can be synchronized again, while preference export is deferred.
- The metadata API is used by Dharma Seed's official Android client but is not documented as a stable third-party contract; the separate contract check detects incompatible changes.
