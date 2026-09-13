# Stillpoint

Stillpoint is an unofficial, noncommercial, mobile-first listener for the public [Dharma Seed](https://dharmaseed.org/) archive. It creates a random listening pool from recording kind, fine-grained topics, teacher, language, and duration, then chooses without repeating recordings until that pool is exhausted.

The web app is designed to be installed from Chrome on Android and deployed to Vercel.

## What it does

- Separates Dhamma talks from guided meditations.
- Starts a Dhamma talk, guided meditation, or any recording with one tap.
- Classifies overlapping topics using deterministic English, Pali, and Sanskrit terms.
- Gives every topic equal placement in one searchable, alphabetical list.
- Combines kind, teacher, language, and duration filters; selected topics use OR semantics.
- Downloads public metadata from a shared Neon catalog into IndexedDB and applies later updates incrementally.
- Stores selection history, favorites, and playback progress only on the device.
- Offers a direct continuation of the most recently played recording.
- Streams original, unmodified audio directly from Dharma Seed.
- Preserves teacher attribution, original-source links, and license information.

The first device synchronization downloads the shared catalog in replay-safe batches. A partially downloaded catalog remains usable if the network becomes unavailable, and synchronization resumes on the next visit. Returning devices normally receive only the records changed since their local version.

Synchronization errors offer a visible retry action and two bounded automatic retries. The installed app caches its interface and catalog for offline selection; audio still requires a connection. If preference storage fails, listening and session-local preferences continue with a warning. Shuffle history resets only the exhausted filter pool and retains the other pools' recent selections; it is no longer limited to 2,000 recordings.

## Development

Requirements: Node.js 24 and pnpm 11 (the exact pnpm release is pinned in `package.json`).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Copy `.env.example` to `.env.local` and provide a pooled Neon `DATABASE_URL` plus a direct `DATABASE_URL_UNPOOLED`. The Neon CLI can manage those values after linking this directory and checking out a non-production development branch. Apply migrations and prepare that branch before starting the app:

```sh
pnpm db:migrate
pnpm catalog:refresh
pnpm catalog:check
pnpm dev
```

The full first catalog refresh is an explicit workstation/admin operation because it can outlast a serverless request. Subsequent refreshes use Dharma Seed editions and normally make only two index requests plus detail requests for changed records. The app is available at `http://localhost:3000`.

Standard checks:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Production-browser regression tests (run after `pnpm build`):

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

The tests start a temporary production server on port 3100 and use generated silent audio and fixture metadata, never Dharma Seed recordings. On Windows they default to installed Microsoft Edge; elsewhere they use Playwright Chromium. Set `PLAYWRIGHT_CHANNEL` to override the browser channel. CI installs Chromium and runs these checks. Physical Android background/lock-screen behavior remains a separate device check.

The optional live contract check makes two bounded, read-only requests to Dharma Seed and is intentionally separate from ordinary tests:

```sh
pnpm test:contract
```

## Architecture

- `app/api/catalog/` serves the public, versioned catalog from Neon and exposes the protected scheduled-refresh entry point.
- `lib/server/catalog/` owns refresh orchestration, atomic publication, and bounded database reads.
- `lib/integrations/dharmaseed/` is the only boundary that knows the Dharma Seed endpoint and payload shapes.
- `lib/catalog/` owns on-device IndexedDB storage and replay-safe synchronization from the shared catalog.
- `lib/domain/` owns recording kinds, topic taxonomy, classification, filters, and random selection.
- `lib/user/` owns private device-local preferences.
- `components/` owns presentation and playback behavior.

See [the implementation plan](docs/implementation-plan.md), [architecture decision 0001](docs/decisions/0001-local-first-pwa.md), and [architecture decision 0003](docs/decisions/0003-shared-neon-catalog.md) for the rationale and milestone history.
The [first-release verification record](docs/release-verification.md) captures the checks performed against the initial implementation.
The [repair journal](docs/repair-progress.md) tracks review fixes and verification. [Decision 0002](docs/decisions/0002-catalog-consistency.md) explains replay-safe synchronization, metadata cache ownership, and classification migrations.

## Deploying to Vercel

Import the repository into Vercel as a Next.js project and configure these production environment variables:

- `DATABASE_URL`: the pooled Neon production connection string used by route handlers.
- `CRON_SECRET`: a strong random secret that Vercel sends as the refresh route's bearer token.

Keep `DATABASE_URL_UNPOOLED` on a trusted development/admin machine for Drizzle migrations; the running app does not need it. Before the first deployment, check out the Neon production branch locally, run `pnpm db:migrate`, then run `pnpm catalog:refresh` and `pnpm catalog:check`. Never use an expiring development branch URL in production.

`vercel.json` invokes the protected refresh endpoint once per day. A catalog request that sees data older than 24 hours also schedules a leased refresh after returning the last known-good version. Failed refreshes retain that version and back off for an hour. Index responses have a short CDN lifetime; version-addressed detail batches have a long CDN lifetime.

The server-side catalog routes must remain enabled; a static export cannot read Neon securely. Audio continues to stream directly from Dharma Seed and does not pass through Neon or Vercel.

## Content and licensing

Dharma Seed describes its content as [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) and permits unmodified, attributed, noncommercial sharing in its [FAQ](https://dharmaseed.org/about/faq/). This project:

- accesses only public recordings;
- excludes retreatant-only access mechanisms;
- does not edit, clip, transcribe, monetize, or rehost recordings; and
- does not claim endorsement by Dharma Seed or any teacher.

The application source code and third-party dependencies are separate from the licenses attached to Dharma Seed content.
