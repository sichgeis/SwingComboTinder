# Studio card creation

- Status: Done
- Approved: 2026-07-17
- Goal: Create a new, safe draft figure package from the Dance Card Studio and open it immediately for ordinary editing.

## Context

The Content workspace edits complete existing figure DTOs but stable identity and filesystem structure are intentionally read-only. Adding a figure still requires copying a package by hand, choosing a globally unique ID and order, creating valid bilingual source, supplying fallback art, and writing notes before the Studio can discover it.

This feature adds a deliberately small creation boundary. It creates the filesystem identity and a valid draft scaffold; the existing editor remains responsible for all subsequent content work.

## User flow

1. Select **New card** in the Content library.
2. Enter a canonical name, dance style, and directory/stable-ID slug. The Studio suggests a slug from the name but allows deliberate edits.
3. Create the card. Validation errors remain in the dialog and no package is left behind.
4. On success, the new saved draft appears in the catalog and opens in Content with editable starter copy.
5. Replace the starter text, add resources and teaching frames, create artwork, and explicitly select **Include in production** only when the card is ready.

## Requirements

- Require a non-empty canonical name, one existing dance style, and a lowercase kebab-case slug.
- Treat the slug as both directory name and stable move ID; require it to be unique across every style because production IDs are globally unique.
- Assign the next global integer order after the highest existing figure order.
- Create the package atomically under `figures/<style>/<slug>/`; a failure leaves no final or partial package.
- Create a valid `figure.ts` with `publication: "draft"`, style-appropriate starter metadata, an `any` ending, empty resources, and visibly provisional English/German guide text.
- Create `notes.md`, `teaching-frames/`, `generated/`, and a self-contained 600 × 900 `card.jpg` placeholder that is visibly marked as a draft and names the new card.
- Mark the artwork as needing rework and leave image approval unchecked; do not create a teaching pose or generated master.
- Return the created content and open it through the existing Content editor in a clean saved state.
- Report field-level create errors for invalid or duplicate input.

## Scope

- One New card action and creation dialog in Content.
- A local-only create endpoint and atomic package scaffolder.
- Existing dependencies only; use the installed image tooling for the placeholder card.
- Persistence tests using temporary figure roots, browser verification without retaining a test package, and durable documentation.

## Non-goals

- Do not publish automatically, generate paid artwork, download teaching sources, or infer final bilingual copy.
- Do not clone an existing card, bulk import figures, rename/move/delete packages, reclaim order gaps, or edit identity after creation.
- Do not add templates, wizards, AI writing, remote storage, authentication, or multi-user coordination.
- Do not create a real product figure merely for validation.

## Acceptance criteria

- A maintainer can create a uniquely named draft for Lindy Hop, Charleston, or Collegiate Shag through the Studio.
- The new package is immediately discoverable in Content and Image Queue, opens in the existing editor, and remains excluded from the public catalog.
- The scaffold round-trips through existing content persistence and survives `npm run check` once created.
- Duplicate IDs, invalid slugs/styles/names, and pre-existing directories are rejected without modifying existing files.
- Automated tests cover scaffold contents, order allocation, globally duplicate IDs, validation, and atomic cleanup.
- The real Studio shows and validates the creation workflow without leaving a test card behind or making a paid request.

## Validation

- Automated: `npm run check` passes with 22 test files and 68 tests plus the production PWA build. Focused tests cover complete scaffold contents, the 600 × 900 JPEG placeholder, global next-order allocation, cross-style duplicate IDs, invalid input, and temporary-package cleanup after an injected render failure. `node --check` passes for both dependency-free Studio browser modules.
- Browser: An isolated Studio on port 4176 loaded the real 42-card catalog at 1600 × 1000. The New card dialog suggested `new-dance-figure` from “New Dance Figure.” A separate validation submission created a saved unpublished draft, raised the Studio catalog to 43, opened the existing editor and German live preview, and appeared in Image Queue with missing-pose, fallback-art, and rework states. There were no browser errors or paid requests; the validation package was removed and the catalog source returned to 42 figures.

## Decisions

- Creation writes a complete valid draft immediately instead of holding an unsaved virtual package; this keeps the existing preview/save/conflict model unchanged.
- Starter text is intentionally obvious and valid so the draft can be discovered and edited without weakening content validation.
- A generated local placeholder is preferable to borrowing another figure’s artwork or adding a shared production asset.

## Progress

- Implemented the atomic package scaffolder, local create endpoint, slug-suggesting dialog, field errors, immediate editor opening, focused tests, and durable workflow documentation.

## Next action

None; the feature is complete.
