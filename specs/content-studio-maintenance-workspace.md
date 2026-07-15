# Content Studio maintenance workspace

> Partially superseded on 2026-07-15 by the approved [`studio-editorial-cockpit.md`](studio-editorial-cockpit.md), which adopts derived attention filters, save-and-next, and selected-figure queue controls without adding durable copy-review state. The remaining ideas stay unapproved.

- Status: Proposed
- Maturity: Draft; implementation is not authorized.
- Goal: Preserve the current idea for extending the editorial core into a catalog-wide maintenance and review workflow without committing to it before Option A produces practical feedback.

## Context

The approved [`Content Studio editorial core`](content-studio-editorial-core.md) focuses on reliably editing and previewing one figure at a time. During exploration, a broader Option B was identified: use the same master-detail foundation to operate a maintenance queue across the complete catalog and bring selected-figure artwork work into the detail view.

This draft records that direction because it may be valuable. It is deliberately provisional. Implementation experience and actual use of the editorial core may change its workflow, reduce its scope, or make parts unnecessary.

## Possible user flow

1. Filter the library to a concrete maintenance condition.
2. Select a figure and edit content, resources, or artwork.
3. Inspect both languages and card sides.
4. Review a concise semantic summary of the changes.
5. Save and deliberately mark the content reviewed.
6. Move to the next figure matching the active filter.

## Candidate scope

- Explicit computed content validity and deliberate human review state
- Maintenance filters such as invalid content, content not reviewed, incomplete German copy, no app-visible resources, image rework, fallback artwork, and recently changed
- “Save and next” within the active search and filter
- A semantic change summary before saving
- Selected-figure Artwork section with teaching pose, current image, candidates, generation note, generation, promotion, and image approval
- Continued separate Image Queue for batch generation controls
- Clear distinction between computed validity, content reviewed, image approved, and needs rework

Optional absence, including zero app-visible resources or fallback artwork, should remain a filterable fact rather than an automatic error.

## Candidate technical direction

- Build on the editorial core DTO, safe writer, resource model, and shared preview rather than introducing another content model.
- Keep content review state outside production card content, potentially in the existing figure `notes.md` maintenance metadata.
- Clear a previous content-review state whenever saved content changes.
- Keep content writes and image operations independently recoverable.
- Modularize the larger client in TypeScript without assuming that a frontend framework is required.

## Non-goals under current thinking

- Multi-user collaboration or authentication
- Remote hosting or editing
- Git commits or releases from the studio
- Full version history
- Bulk text replacement
- AI-generated editorial content
- Migrating production content away from `figure.ts`
- Making saves depend on third-party resource health

## Draft acceptance ideas

These are prompts for later refinement, not approved acceptance criteria:

- Library indicators distinguish validity, review, resources, and artwork state accurately.
- Editing content invalidates its prior review state.
- “Save and next” respects the current query and filters.
- Selected-figure image operations do not lose unsaved content edits.
- The batch Image Queue retains its existing behavior.
- The change summary covers edited fields, additions, removals, and reordering.
- Review and image-maintenance state survive restarting the studio.

## Questions to revisit after Option A

- Is an explicit content-review state actually useful for a personal repository where Git already exposes changes?
- Which library indicators lead to real maintenance actions rather than visual noise?
- Should Artwork live inside the figure detail view, or is switching to the selected item in Image Queue sufficient?
- Is “Save and next” useful enough to justify queue semantics?
- Does the shared preview remove the need for a separate change-summary step?
- Where should review metadata live if `notes.md` becomes too image-oriented?
- Does the vanilla client remain comfortable after Option A, or does the studio need a stronger typed UI structure?

## Dependency and decision boundary

Do not implement this draft as part of the approved editorial core. Revisit it only after Option A is implemented and has been used on real figure edits. Moving this specification to Approved requires an explicit new decision based on those findings.

## Progress

- 2026-07-15: Option B recorded as a Proposed draft while Option A was approved.

## Next action

After Option A is implemented and exercised, review its workflow and architecture against the open questions in this draft.
