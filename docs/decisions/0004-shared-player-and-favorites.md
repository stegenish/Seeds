# 0004: Shared player and device-local favorites

## Decision

Keep the catalog, playback session, shuffle history, favorite recording IDs, and favorite teacher IDs in a client provider mounted by the root layout. Route pages consume that provider, while the persistent player is rendered beside the routed content.

Favorite recordings and teachers remain separate device-local sets. The Favorites route resolves their IDs against the synchronized catalog and groups recordings by domain kind. Quick-listen teacher choosers reuse the existing deterministic filter and shuffle rules, combining a chosen teacher with the current refinements.

## Rationale

The root provider lets playback survive navigation between Listen and Favorites without duplicating player or catalog state. Keeping only IDs in preferences avoids duplicating public catalog metadata and ensures teacher favorites do not implicitly favorite every recording by that teacher.

## Consequences

Saved IDs can temporarily outlive locally available metadata. The interface reports unresolved recording favorites rather than silently deleting them. Both routes are cached as application-shell pages; audio remains network-streamed from Dharma Seed.
