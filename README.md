# Stillpoint

Stillpoint is an unofficial, noncommercial, mobile-first listener for the public [Dharma Seed](https://dharmaseed.org/) archive. It creates a random listening pool from recording kind, fine-grained topics, teacher, language, and duration, then chooses without repeating recordings until that pool is exhausted.

The web app is designed to be installed from Chrome on Android and deployed to Vercel.

## What it does

- Separates Dhamma talks from guided meditations.
- Classifies overlapping topics using deterministic English, Pali, and Sanskrit terms.
- Combines kind, teacher, language, and duration filters; selected topics use OR semantics.
- Synchronizes public metadata progressively into IndexedDB and applies later updates incrementally.
- Stores selection history, favorites, and playback progress only on the device.
- Streams original, unmodified audio directly from Dharma Seed.
- Preserves teacher attribution, original-source links, and license information.

The first synchronization prepares teachers and recent recordings before proceeding through the archive. A partial synchronized catalog remains usable if the network becomes unavailable, and synchronization resumes on the next visit.

## Development

Requirements: Node.js 22 or newer and pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The app is available at `http://localhost:3000`.

Standard checks:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The optional live contract check makes two bounded, read-only requests to Dharma Seed and is intentionally separate from ordinary tests:

```sh
pnpm test:contract
```

## Architecture

- `app/api/catalog/` is the only server-side boundary that knows the remote endpoint. It validates and converts remote payloads into stable internal records.
- `lib/catalog/` owns on-device storage and resumable synchronization.
- `lib/domain/` owns recording kinds, topic taxonomy, classification, filters, and random selection.
- `lib/user/` owns private device-local preferences.
- `components/` owns presentation and playback behavior.

See [the implementation plan](docs/implementation-plan.md) and [architecture decision 0001](docs/decisions/0001-local-first-pwa.md) for the rationale and milestone history.
The [first-release verification record](docs/release-verification.md) captures the checks performed against the initial implementation.

## Deploying to Vercel

Import the repository into Vercel as a Next.js project. The build requires no environment variables or hosted database. Keep the deployment noncommercial and clearly unofficial.

The server-side catalog routes must remain enabled; a static export cannot contact the Dharma Seed metadata endpoint because it does not allow arbitrary browser origins. Audio does not pass through Vercel.

## Content and licensing

Dharma Seed describes its content as [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) and permits unmodified, attributed, noncommercial sharing in its [FAQ](https://dharmaseed.org/about/faq/). This project:

- accesses only public recordings;
- excludes retreatant-only access mechanisms;
- does not edit, clip, transcribe, monetize, or rehost recordings; and
- does not claim endorsement by Dharma Seed or any teacher.

The application source code and third-party dependencies are separate from the licenses attached to Dharma Seed content.
