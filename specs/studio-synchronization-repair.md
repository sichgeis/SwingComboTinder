# Dance Card Studio synchronization repair

- Status: Approved
- Approved: 2026-07-18
- Goal: Make every completed Studio mutation visible immediately without a browser refresh while preserving unsaved Content drafts.

## Requirements

- Give mutable figure media a content-versioned URL so teaching-pose swaps, first-pose uploads, and candidate promotions cannot reuse stale browser pixels.
- Coalesce overlapping local and live-event catalog refreshes into an ordered single-flight cycle whose final pass observes the latest filesystem state.
- Refresh the active Content preview when its figure changes. Reload clean Content state, but retain unsaved fields and only rebuild their preview when a draft is dirty.
- Broadcast transcript imports like other figure-scoped mutations and prevent cached API/static Studio responses from masking current state.
- Preserve selection, generation markers, open dialogs, publication/content conflict rules, and all image-generation behavior.

## Non-goals

- Do not add filesystem watching, multi-user editing, optimistic mutation schemas, dependencies, or automatic conflict resolution.
- Do not run paid image generation as validation.

## Acceptance

- A pose upload or swap updates the pose dialog, Image Queue card, and active Content preview without reloading the page.
- Promotion updates current artwork everywhere immediately; notes, approval, and transcript changes remain synchronized through the same refresh path.
- Approving a card consumes its current **new** marker and collapses it; later candidates or rework expand it again.
- Concurrent mutation response and server-sent event refreshes cannot leave an older catalog snapshot rendered last.
- Focused synchronization tests and `task check` pass.

## Validation

- `task check` passes with 22 Python maintenance tests, 26 application test files and 82 tests plus the production PWA build.
- `node --check` passes for the Studio browser modules.
- Focused tests prove a same-path atomic image replacement changes its media URL, overlapping refreshes produce one final pass containing every pending figure, and approval consumes the active **new** marker without hiding later candidates or rework.
- A real 42-card Studio API run returned `cache-control: no-store` and versioned Lindy Circle pose/current URLs. No mutation or paid image request was performed.

## Progress

Implemented versioned mutable-media URLs, no-store API/static responses, ordered/coalesced catalog refreshes, figure-scoped live synchronization, draft-safe Content refresh behavior, transcript mutation events, and approval-driven **new** marker consumption.

## Next action

None; the repair is complete.
