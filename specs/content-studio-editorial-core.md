# Content Studio editorial core

- Status: Done
- Approved: 2026-07-15
- Goal: Turn the local image-oriented studio into a master-detail editor where one figure can be found, edited, previewed, validated, and saved safely.

> Subsequent change: [`figure-model-and-flow-cleanup.md`](figure-model-and-flow-cleanup.md) removes aliases, static familiarity, flow suggestions, and production teaching-source fields from the completed editor while preserving its safe editing foundation.

## Context

Swing Thing has 42 self-contained figure packages. Complete production content lives in each typed `figure.ts`: titles and metadata, English and German guides, teaching-source videos, app-visible videos, and the artwork import. The current local studio manages artwork and generation notes in a large figure grid but cannot maintain the rest of that content.

Option A of the master-detail Content Studio proposal is the approved next iteration. It establishes the content-editing foundation while retaining the existing image-generation workflow as a separate workspace. The possible extended maintenance workflow is recorded independently in [`content-studio-maintenance-workspace.md`](content-studio-maintenance-workspace.md) and is not part of this approval.

## User flow

1. Open the local Swing Thing Content Studio in the Content workspace.
2. Search or filter the compact figure library and select a figure.
3. Edit its Basics, English, German, or Resources section.
4. Inspect unsaved changes immediately in a mobile-sized app-card preview, switching between English/German and front/back.
5. Correct field-level validation problems and save the complete figure in one operation.
6. Continue with another figure. If unsaved changes exist, switching or leaving requires confirmation.

The top-level Content and Image Queue workspaces remain clearly available. Image Queue preserves the current batch-oriented generation workflow.

## Layout

On wide screens, use three coordinated areas:

- A compact figure library with search, dance-style filtering, and factual content indicators.
- A structured editor with Basics, English, German, and Resources sections.
- A sticky live card preview at mobile card dimensions.

On narrower screens, keep the library usable and expose Editor and Preview as switchable views rather than compressing three columns.

## Editable content

### Basics

- Canonical name and alias
- Family
- Count
- Motion
- Ending position
- Familiarity
- Flow suggestions

Stable ID, style, directory/slug, asset import, and global order are visible but read-only in this iteration because changing them affects identity, discovery, or filesystem structure.

### English

- Description
- Steps
- Body
- Lead
- Connection
- Cue

### German

- Description
- Steps
- Body
- Lead
- Follow
- Connection
- Cue
- Practice question
- Custom section headings

The canonical figure name remains shared between languages. Localized figure titles are not introduced by this iteration.

### Resources

The editor supports ordered resources and clearly distinguishes:

- Teaching-source YouTube videos used as editorial provenance and not shown on the card.
- App-visible YouTube videos.
- App-visible generic web resources such as articles or reference pages.

Resource fields include the relevant URL or YouTube video ID, title, category, language when useful, and editorial notes when applicable. The content DTO uses a discriminated resource representation; its storage adapter may map that representation onto the existing `youtube` structure plus a new web-resource field in `figure.ts`.

An empty optional resource collection is valid. The library may report “0 links,” but it must not label that figure invalid merely because no app-visible resources exist.

## Live preview

- Reflect unsaved editor values immediately without writing source files.
- Switch between English and German.
- Switch between the illustrated front and detailed back.
- Use the current promoted artwork or valid fallback artwork.
- Show app-visible YouTube and generic web resources as the production app will show them.
- Render through a presentation module and relevant styles shared with the production app, not a separately maintained approximation.
- Treat draft text as text and escape it safely in preview markup.

Extracting the existing card presentation from `SwingThingController` must preserve current build and browse behavior.

## Figure library and validation

The library supports search by name, alias, or stable ID and filtering by dance style. It reports factual states that can be derived reliably, including:

- Content valid or invalid
- German guide complete or incomplete
- Number of app-visible resources
- Promoted or fallback artwork
- Unsaved local changes
- External source change detected

Required text must not be blank. German practice copy retains its current question requirement. YouTube IDs, URLs, resource categories, referenced teaching frames, and the existing domain constraints must be validated before saving.

“Needs review,” approval, and editorial completeness policy are intentionally excluded until the extended maintenance workflow is reconsidered.

## Persistence and conflict handling

`figure.ts` remains the production source of truth. The client edits a storage-independent complete figure-content DTO rather than TypeScript syntax.

Loading a figure returns its DTO and a revision derived from the current source. Saving submits the full DTO with that revision through a figure-specific content endpoint.

The server must:

1. Reject unknown figures and attempted changes to read-only identity or asset fields.
2. Validate the complete DTO before writing.
3. Detect an externally changed source revision and return a conflict instead of overwriting it.
4. Parse and serialize only the controlled `figure.ts` structure used by the repository.
5. Preserve the existing card import and stable identity fields.
6. Write and validate a temporary TypeScript file.
7. Atomically replace the original only after validation succeeds.

A failed or conflicted save leaves the original file unchanged. The generated source is deterministic so ordinary edits produce reviewable Git diffs.

## Scope

- Rename the local tool to Swing Thing Content Studio.
- Add Content and Image Queue workspace navigation.
- Add the master-detail Content workspace and responsive layout.
- Introduce the content DTO, validation, reader, deterministic writer, source revision, and atomic save path.
- Edit all existing Basics, English, German, and YouTube fields.
- Add generic app-visible web resources to the content model and production card.
- Share the production card presentation with the live preview.
- Preserve current image generation, candidate, promotion, note, and approval behavior in Image Queue.
- Document the resulting content-maintenance workflow.

## Non-goals

- Creating, deleting, renaming, or moving figure packages
- Editing stable IDs, styles, global order, or artwork import paths
- Draft/publish or content-approval states
- Catalog-wide maintenance queues or “Save and next”
- Bulk editing, import/export, or version history
- AI-assisted writing or translation
- Migrating figure content to JSON, YAML, or a remote CMS
- Redesigning the image generation and promotion workflow
- Remote hosting, authentication, or multi-user editing

## Acceptance criteria

- All 42 existing figures load into the editor without information loss.
- A maintainer can edit and round-trip every in-scope existing content field.
- Existing teaching sources and card-visible YouTube links round-trip unchanged when not edited.
- A generic web resource can be added, reordered, previewed, saved, reloaded, and opened from the production card.
- Invalid required text, URLs, YouTube IDs, categories, or frame references produce field-level feedback and block saving.
- A figure with no optional app-visible resources remains valid.
- Both promoted artwork and valid fallback artwork preview correctly.
- Unsaved values appear in the shared front/back German/English preview.
- Switching figures or leaving with unsaved changes requires confirmation.
- An external `figure.ts` modification produces a conflict and is not overwritten.
- Cancelled, invalid, conflicted, or failed saves do not modify the source file.
- Successful saving produces deterministic, valid TypeScript and a focused Git diff.
- Existing deck building, browsing, image generation, candidate promotion, and image approval behavior remain intact.
- `npm run check` passes from a clean checkout.

## Technical constraints

- Keep `figure.ts` as production source of truth for this iteration.
- Keep the editor/API centered on a storage-independent DTO so a later storage migration does not require redesigning the UI.
- Use the installed TypeScript tooling for controlled parsing and validation; do not evaluate arbitrary source text.
- Keep content persistence and image operations separate so a failure in one cannot corrupt the other.
- Keep content validation and DTO-to-domain mapping independent from TypeScript-source parsing and filesystem persistence.
- Keep Content workspace state and DOM ownership inside its own client module; the studio entry point orchestrates workspaces and shared figure refreshes.
- Do not introduce a frontend framework solely for this feature.
- Keep the studio bound to the local development environment and do not expose filesystem mutation remotely.

## Validation

- Automated: DTO validation, parser/serializer round trips across representative figure shapes, all-figure read coverage, deterministic output, conflict detection, atomic failure behavior, resource rendering, shared preview rendering, existing image-studio tests, and `npm run check`.
- Manual: Edit and reload one figure per style; verify German/English front/back preview; add and remove YouTube and web resources; test unsaved-change confirmation; simulate an external edit; verify the unchanged Image Queue workflow.

## Decisions

- Option A, Editorial Core, is the approved next iteration.
- The existing source format is preserved behind a storage-independent DTO.
- Complete-figure atomic saving is preferred over independent per-field writes.
- Image Queue remains a separate batch workspace.
- Empty optional resources and fallback artwork are factual states, not automatic errors.
- Stable identity and filesystem-affecting fields remain read-only.
- Option B is recorded separately as a Proposed draft and receives no implementation authority from this approval.

## Delivery increments

1. Content DTO, validation, revision-safe reader/writer tests, and read-only master-detail shell.
2. Basics and bilingual editing with shared live preview and safe atomic saving.
3. YouTube and generic web-resource editing plus production card rendering.
4. Studio rename/navigation, preserved Image Queue integration, documentation, and full regression validation.

## Progress

- 2026-07-15: Option A selected and specification approved before implementation.
- 2026-07-15: Added a storage-independent content DTO, field validation, safe TypeScript parsing and deterministic serialization, source revisions, atomic replacement, and conflict/failure tests.
- 2026-07-15: Extracted the production card presentation, added generic language-aware web resources, and used the shared renderer for live unsaved previews.
- 2026-07-15: Reworked the local tool into Content and Image Queue workspaces with searchable figure navigation, structured Basics/English/German/Resources editing, responsive Editor/Preview switching, and unsaved-change protection.
- 2026-07-15: Updated repository documentation and completed automated and browser validation.
- 2026-07-15: Refactored the completed studio without behavior changes: isolated Content workspace state, separated content-model validation from source persistence, and reduced server routing to named content actions.

## Validation evidence

- Automated: `npm run check` passed linting, strict type checks, 21 test files with 56 tests, and the production PWA build.
- Persistence: all 42 figure definitions load; deterministic round trips, valid atomic saves, invalid content, and stale-write conflicts are covered by focused tests.
- Browser: verified the 42-figure library, live unsaved bilingual preview, front/back switching, field-level invalid-resource feedback, generic web-resource preview, mobile Editor/Preview switching, and preserved Image Queue with all 42 figures.
- Safety: browser test drafts were removed without saving; no production figure content changed during manual validation.

## Next action

None. Exercise the completed workflow on real content maintenance; reassess the separate Proposed maintenance-workspace draft only after practical use.
