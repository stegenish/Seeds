# 0001: Use a local-first PWA with a server-side metadata adapter

- Status: accepted
- Date: 2026-09-12

## Context

The primary device is an Android phone, deployment should work on Vercel, and listening preferences should remain private. Dharma Seed exposes the metadata endpoint used by its official Android app, but the endpoint is not documented as a stable third-party API and does not provide cross-origin browser access. The archive is large enough that repeatedly loading or filtering the full catalog remotely would be slow and inconsiderate.

## Decision

Build an installable web app. Route bounded metadata requests through server-side application endpoints and convert remote payloads into stable internal records at that boundary.

Synchronize the public catalog progressively into IndexedDB on the user's device. Store the remote edition identifiers so later synchronization requests retrieve only changes. Keep favorites, selection history, and playback progress on the same device. Stream audio directly from Dharma Seed and never through the application server.

The app remains useful while the full archive is being prepared by synchronizing a recent bounded slice first, then filling older catalog entries in the background. Random-selection controls clearly describe whether the complete archive or only the synchronized portion is available.

## Consequences

- No hosted database, account, or ongoing data service is required.
- Once synchronized, filtering and random selection are fast and private.
- First-device preparation transfers a meaningful amount of metadata and must expose progress, pause safely, and resume.
- Browser storage can be evicted. Recovery is a repeatable catalog synchronization, while user preferences should be exported later if that becomes important.
- The integration adapter and contract fixtures must be maintained if Dharma Seed changes its endpoint.
- Reliable offline audio downloads remain a possible reason to add a native wrapper later; they are not part of this decision.

