# Studio UI workbench

- Status: Done
- Approved: 2026-07-17
- Goal: Rework the local Dance Card Studio into a calmer, more polished desktop editorial workbench with clearer hierarchy, safer action emphasis, and faster Content and Image Queue workflows.

## Context

The Studio already supports complete content editing and image production, but its current interface gives most controls, statuses, and panels equal visual weight. Repeated borders and healthy-state badges make the Content library noisy, editor state competes with the form, the live preview feels secondary, and the Image Queue combines review filters with paid-generation settings in one dense toolbar.

This iteration preserves the existing behavior and dark art-deco identity while improving information architecture, visual rhythm, state communication, and action hierarchy.

## User flow

### Content

1. Open a compact workbench shell and immediately see the active workspace and connection state.
2. Search or filter a quiet figure library where exceptional states stand out and healthy metadata recedes.
3. Select a figure and edit clearly grouped Basics, English, German, and Resources sections.
4. Keep save state and the primary workflow actions visible while moving through the form.
5. Inspect a prominent live app-card preview in German or English and on its front or back.
6. Save, save and continue, revert, or resolve validation and conflict feedback without losing the draft.

### Image Queue

1. Filter the review queue independently from generation settings.
2. Understand catalog attention counts and current selection without scanning a large toolbar.
3. Review teaching pose, current artwork, and latest candidate with a clear next decision.
4. Expand generation settings deliberately, confirm the request plan, and start only an eligible explicit run.
5. Continue to inspect, promote, approve, reopen, mark, and annotate artwork with clear action grouping and live status.

## Requirements

- Retain the dark teal, amber, mint, red, serif-display, and compact art-deco identity while establishing reusable visual tokens and a calmer surface hierarchy.
- Optimize the supported experience for desktop browser windows; narrow-window behavior may remain graceful but is not a separate mobile workflow.
- Keep the Content library resizable with its existing pointer, keyboard, persistence, and reset behavior.
- Emphasize Draft, Invalid, Unsaved, missing-resource, and fallback-art states; reduce repetition for healthy publication and resource facts.
- Keep Revert, Save, and Save + next tied to the current dirty and validation state.
- Preserve shared live card rendering and make preview updating, live, validation, and unavailable states clear.
- Add keyboard save and catalog-search focus shortcuts without bypassing validation or unsaved-change protection.
- Separate Image Queue review filters from generation settings and keep the image-request plan visible before generation.
- Keep bulk selection count and actions understandable throughout review.
- Preserve all current loading, empty, disconnected, running, blocked, failed, success, approved, and conflict behavior while improving its presentation.
- Keep focus indicators, pointer targets, semantic status text, and reduced-motion behavior accessible.

## Scope

- Rework `tools/image-studio/static/index.html`, `styles.css`, `content-workspace.js`, and `app.js`.
- Update durable Studio workflow documentation where labels or layout change.
- Capture real desktop screenshots and validation evidence.

## Non-goals

- Changing the figure DTO, metadata model, persistence format, server API contracts, provider configuration, generation defaults, or production app.
- Replacing the dependency-free browser modules with a framework or adding UI dependencies.
- Adding durable editorial review state, AI writing, authentication, remote hosting, or multi-user behavior.
- Adding mobile or tablet Studio support.
- Triggering a paid image request during validation.

## Acceptance criteria

- The Studio shell and both workspaces show materially clearer hierarchy with fewer competing borders and repeated healthy states.
- Content search, filters, resize behavior, selection, editing, validation, preview, Revert, Save, Save + next, conflict handling, and unsaved-change protection continue to work.
- The live card preview is prominent and its language, face, and update state are easy to understand.
- Keyboard users can focus search and save a valid dirty figure through documented shortcuts.
- Image Queue review filters and generation settings are distinct, selection count is visible, and the request plan remains accurate before Generate is enabled.
- Candidate inspection, prompt viewing, generation-note saving, promotion, approval/reopen, rework, and live run states continue to work.
- Loading, empty, error, and disconnected states do not resemble valid empty data.
- `npm run check` passes.
- Real desktop screenshots demonstrate Content and Image Queue using repository data without a paid generation run.

## Technical constraints

- Continue using the current local Node server and dependency-free ES modules.
- Keep `content-workspace.js` responsible for Content state and `app.js` responsible for workspace orchestration and Image Queue state.
- Reuse the existing API endpoints, shared app-card renderer, escaping, revision checks, atomic save, confirmation, and EventSource behavior.

## Decisions

- The approved direction is a focused editorial workbench, not a new application architecture.
- Brand character remains in color, typography, and restrained decorative details rather than large ornamental surfaces.
- Exceptional states and the next meaningful action receive emphasis; healthy repeated facts recede.
- Paid-generation controls remain explicit and visible, but are separated from ordinary queue review.

## Progress

- 2026-07-17: The user approved the implementation plan and authorized the UI rework.
- 2026-07-17: Implemented the compact application shell, calmer visual tokens and surfaces, exception-first Content library, sticky editor command bar, refined forms/resources, elevated preview inspector, keyboard search/save affordances, separated queue filters and generation composer, persistent selection summary, compact metrics, and clearer review-card actions.
- 2026-07-17: Updated the README and Studio workflow guide for the lasting interface and keyboard behavior.
- 2026-07-17: Renamed the mixed content/artwork Studio entry points to `task studio`, `task studio:debug`, and `npm run studio`; retained `images:plan` and `images:generate` for image-only CLI work.

## Validation

- Automated: `npm run check` passes with linting, strict type checking, 21 test files and 62 tests, plus the production PWA build. `node --check` passes for both dependency-free Studio browser modules.
- Manual: The real Studio loaded all 42 repository figures at 1600 × 1000 without browser console errors. Content verification covered selection, the English back preview, `/` search focus, keyboard library resizing from 320 to 336 pixels, visible sections, and saved-state presentation without saving source. Image Queue loaded 15 attention cards; Select visible reported 15 selected, the eligible plan reported 7 figures × 1 candidate = 7 image requests, and Clear returned to 0 selected. No image generation or content save was triggered.
- Screenshots: `/private/tmp/swing-thing-studio-content-workbench.png` and `/private/tmp/swing-thing-studio-image-workbench.png`.

## Next action

None; use the redesigned workbench and derive future adjustments from observed production friction.