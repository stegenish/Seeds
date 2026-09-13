# Shared catalog release verification

Verified on 2026-09-13.

## Neon

- Applied `0000_hosted_catalog` and `0001_prune_initial_tombstones` first to the expiring `dev-shared-catalog` branch, then to `production`.
- Completed an atomic full import on each branch.
- Both branches report catalog version 1 with 48,750 talks, 1,229 teachers, and zero historical removal tombstones.
- A second production refresh used the stored Dharma Seed editions, published zero changed records, and retained version 1.
- The workspace was returned to `dev-shared-catalog` after production setup; `neon deploy` reports that branch matches `neon.ts`.

## Vercel

- Linked project: `stegenishs-projects/seeds`.
- Production deployment: `dpl_qwA4RQWzVtCo4T2dCuMWBQQR72na` (`Ready`).
- Production alias: <https://seeds-smoky.vercel.app>.
- Production secrets are configured for `DATABASE_URL` and `CRON_SECRET`; values were never printed or committed.
- `vercel.json` registers the protected `/api/catalog/refresh` route once daily.
- A repeated version-1 talk index request changed from `MISS` to `HIT`; a repeated versioned detail request was also a CDN `HIT`.
- The complete 48,750-talk index was 285,611 bytes. A maximum 500-talk detail batch was 269,090 bytes, comfortably below Vercel's 4.5 MB payload limit.
- The deployed homepage, incremental index, and versioned talk-detail route all returned HTTP 200. The donation link was present.

## Quality suite

- `pnpm test`: 20 files and 109 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with zero warnings.
- `pnpm format:check`: passed.
- `pnpm build`: passed with both catalog routes emitted as dynamic functions.
- `pnpm test:e2e`: all three Pixel-sized browser flows passed, covering responsive refinements, one-tap playback and persistence, and offline startup. On this Windows host, the completed Playwright run required its port-3100 Next.js test server to be terminated before the runner printed its final summary.

The live Dharma Seed contract check was not repeated separately: the two real full imports and the incremental checks exercised the same bounded integration more thoroughly, and avoiding another request was more considerate of the upstream service.
