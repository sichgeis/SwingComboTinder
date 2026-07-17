# Card publication state

- Status: Proposed
- Maturity: Draft; implementation is not authorized.
- Goal: Let a maintainer prepare complete figure cards in the local Content Studio without releasing them in the production app until they are deliberately published.

## Context

Every self-contained `figure.ts` package is currently discovered into the public app catalog. The Content Studio can safely edit and preview those definitions, but it has no durable way to distinguish work in progress from cards intended for the public deck. Artwork approval and rework flags describe image-production work and must remain separate from card publication.

The requested workflow is binary: a card is either available in the production app or remains a Studio-only draft. `published` and `draft` describe that lifecycle more clearly than `published` and `hidden`, because an unpublished card is being prepared rather than merely concealed.

## User flow

1. Open any figure in the Content Studio, including an existing draft.
2. Use an “Include in production” checkbox in Basics to choose its publication state.
3. See the unsaved state immediately in the editor and preview as with any other content edit.
4. Save the complete figure atomically.
5. Find Draft and Published badges and filters in the dense figure library.
6. Continue editing, previewing, and producing artwork for drafts normally.
7. On the next production build, only published figures appear in style counts, Build, Browse, card lookup, and sharing.

## Requirements

- Define one shared enum-like type with exactly `published` and `draft` values.
- Store the publication state explicitly in every `figure.ts`; missing or unknown values are invalid rather than implicitly published.
- Migrate all existing figures to `published` so the current public catalog is unchanged.
- Represent the state in the storage-independent Content Studio DTO and preserve it through parsing, validation, deterministic serialization, conflict detection, preview, and atomic saving.
- Present the enum as an “Include in production” checkbox: checked maps to `published`, unchecked maps to `draft`.
- Show a durable Published or Draft badge for every Studio library entry and add dedicated publication filters without removing the existing attention filters.
- Keep all filesystem-discovered figures available to Content and Image Queue regardless of publication state.
- Derive the public application catalog exclusively from published definitions. Draft figures must not affect style counts or enter Build, Browse, card lookup, and sharing.
- Changing publication state must not delete a figure package, artwork, content, or existing local session choices. If the same stable ID is republished later, ordinary session reconciliation may reuse any retained local choice for that ID.

## Scope

- Typed publication state on the figure definition
- Explicit state migration for all current figure packages
- Content DTO validation and source persistence
- Studio checkbox, badges, counts, and filters
- Public catalog filtering and catalog/test distinction between all source figures and published figures where needed
- Documentation for preparing, publishing, and withdrawing a card

## Non-goals

- More than two lifecycle states, review gates, or approval history
- Scheduled publication or release dates
- User accounts, permissions, remote Studio access, or multi-user workflows
- Bulk publication changes
- Creating or deleting figure packages from the Studio
- Automatically committing, pushing, building, or deploying when the checkbox is saved
- Resetting local sessions when a published card becomes a draft
- Treating draft source as confidential; the state controls public app behavior, not repository access or secrecy of compiled source material
- Changing image approval, candidate promotion, or needs-rework semantics

## Acceptance criteria

- Every existing figure has an explicit valid publication state and remains published after migration.
- A new or edited definition with a missing or unknown state fails validation.
- The Studio loads, previews, edits, saves, and reloads both states without content loss.
- Checking and unchecking “Include in production” produces `published` and `draft` respectively, participates in dirty/revert/save behavior, and uses the existing atomic conflict-safe save path.
- The Studio library clearly identifies each card as Draft or Published and can filter to either state.
- Draft cards remain available in Content and Image Queue, including artwork generation and promotion workflows.
- A draft fixture is absent from the public figures/moves catalog, style counts, deck inputs, and public card lookup, while published fixtures retain their explicit order.
- Re-publishing the same stable figure makes it available to the app again without migrating or deleting local session data.
- Existing Build, Browse, preview, resources, and image-production behavior remains intact.
- `npm run check` passes.

## Technical constraints

- Keep `figure.ts` as the source of truth and the Studio DTO storage-independent.
- Keep publication separate from `Move`, which remains factual dance metadata, and separate from image-maintenance state in `notes.md`.
- Preserve a complete source-catalog view for validation and Studio tooling while exposing a published-only catalog to the production application.
- Do not introduce a dependency for this feature.

## Validation

- Automated: enum validation, missing/unknown-state rejection, deterministic parser/serializer round trips, all-figure explicit-state audit, published-only catalog behavior, unchanged published style counts, draft card lookup exclusion, Studio summary/filter data, and `npm run check`.
- Manual: In a local Studio, switch one card to Draft, verify badges and filters plus Content/Image Queue access, build or run the app and verify its absence, then switch it back to Published and verify its return. Do not send paid image-generation requests.

## Decisions proposed for approval

- Use `published` and `draft`, not `published` and `hidden`.
- Make the state explicit and required on every figure to prevent accidental publication through a default.
- Use a direct “Include in production” checkbox for the frequent decision while retaining the enum in persisted data.
- Keep draft cards fully workable in both Studio workspaces.
- Filter drafts from user-visible production behavior without claiming a confidentiality boundary.

## Progress

- 2026-07-17: Traced figure discovery, public catalog composition, Content Studio DTO persistence, editor filtering, preview, and Image Queue filesystem discovery. Recorded the proposed binary workflow and its production boundary.

## Next action

Obtain explicit user approval for this specification, then implement and validate it as one coherent feature.
