# 0003: Publish a shared catalog from Neon

- Status: accepted
- Date: 2026-09-12
- Amends: 0001, 0002

## Context

The local-first catalog makes filtering and random selection fast and private,
but every new browser currently rebuilds that catalog through the Dharma Seed
API. That repeats substantial metadata traffic, makes first use dependent on a
long upstream synchronization, and exposes users to upstream availability.

Vercel Functions limit ordinary response bodies to 4.5 MB. Neon Free also has a
small network-transfer allowance, so an unbounded response or a database query
for every play would be fragile and wasteful.

## Decision

Store the normalized public talk and teacher catalog in Neon Postgres. The
browser never receives database credentials. Next.js route handlers read Neon
through the pooled runtime connection and continue exposing the existing
bounded index/detail protocol to clients.

IndexedDB remains the authoritative on-device metadata cache. A new device
downloads bounded catalog pages; a returning device sends its local edition and
receives only changed IDs, current details, and removal tombstones. Listening
history, favorites, playback progress, and preferences remain on the device.

A catalog version becomes visible only after both Dharma Seed resources have
been fetched and validated and their database changes have committed in one
transaction. The current tables retain each row's latest catalog version;
removal tombstones retain the version at which an absent row was removed. This
allows clients to jump directly from any older version to current state without
retaining duplicate full snapshots.

Refreshes use Dharma Seed's edition delta protocol and sequential, bounded
detail batches. A database lease permits one refresh at a time. Vercel invokes a
protected refresh endpoint once daily. A normal catalog request that observes a
last successful refresh older than 24 hours schedules the same refresh after
returning the last known-good catalog. Failed refreshes never replace the active
version and set a retry delay so traffic cannot produce an upstream retry storm.

Index responses have a short shared-cache lifetime because their answer changes
when a new version is published. Detail responses include the requested catalog
version in their URL and receive a long shared-cache lifetime. Responses remain
bounded below platform limits, and queries select only fields required by the
stable client contract.

Audio continues to stream directly from Dharma Seed and is never copied through
Neon or Vercel.

## Consequences

- A new device depends on Neon and Vercel rather than a large fan-out of Dharma
  Seed requests; an already prepared device remains usable offline.
- Neon storage holds one current normalized copy plus small tombstones, not a
  full copy per daily edition.
- The initial import is an explicit operator command. Daily and request-triggered
  runs normally fetch only upstream changes.
- Schema migrations are version-controlled and tested on an expiring Neon branch
  before production.
- The Vercel project requires pooled `DATABASE_URL` and `CRON_SECRET` variables;
  migrations use `DATABASE_URL_UNPOOLED` outside request handlers.
- If the hosted catalog is empty or unavailable, the app can still use an
  existing IndexedDB catalog but cannot prepare a new device until service
  returns.
