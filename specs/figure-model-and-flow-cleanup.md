# Figure model and flow cleanup

- Status: Done
- Approved: 2026-07-15
- Goal: Simplify each figure to factual card content and keep personal nightly decisions in local session state.

## Context

The current figure model mixes factual dance metadata with an English-only alias, a static editorial familiarity label, free-text flow suggestions, and internal YouTube teaching provenance. Swipe results are already stored separately as local `pass`, `keep`, or `star` choices. The completion screen independently generates combos from broad family matching rather than the stored flow suggestions.

The user approved removing these overlapping concepts so future recommendation or learning features can start from a clear model.

## Accepted behavior

### Nightly Build choices

- Keep left, right, and up swipe behavior and persistence for the active local session.
- No decision renders as Curious in English and Neugierig in German.
- Left remains Not tonight, right remains Got it, and up remains Try tonight.
- Not-today figures remain excluded from Browse; got-it and try-tonight figures remain included.
- Starting a fresh Build session continues to clear nightly choices.
- Do not introduce durable mastery or learning-progress state.

### Figure content

- Remove the English-only alias.
- Remove static per-figure familiarity; it must not be updated by swipes or used as the undecided state.
- Keep family, count, motion, and ending-position metadata unchanged.
- Remove free-text flow suggestions.
- Keep app-visible YouTube and web resources.
- Remove teaching-source metadata from production `figure.ts` content and the Content Studio.
- Preserve teaching-source URLs, timestamps, frame references, titles, channels, and editorial notes in each package's `notes.md` before deleting the structured production fields.
- Keep versioned teaching frames and the existing image-generation inputs.

### Flow and combo removal

- Remove generated combo domain rules, tests, UI, shuffling, session seed, translations, and styles.
- Remove flow suggestions from the detail dialog, Content Studio, types, validation, tests, and all figure packages.
- Keep actual dance figures categorized as transitions and retain `move.end`.
- Keep the result summary, Browse action, and share action, but sharing must describe selected figures without generating sequences or transitions.

## Non-goals

- Redesigning family, count, motion, or ending-position types
- Renaming or removing figures
- Adding long-term familiarity or mastery
- Adding new combo, recommendation, or transition behavior
- Migrating figure content away from TypeScript
- Redesigning Build, Browse, or the image-generation pipeline

## Acceptance criteria

- All 42 figures load without alias, familiarity, flows, or production teaching sources.
- An undecided Build or Browse card shows Curious/Neugierig.
- Existing `pass`, `keep`, and `star` choices survive reload and render the appropriate nightly state.
- Passed figures remain absent from Browse.
- The results screen contains no generated combos, sequence shuffling, or flow language.
- Shared text lists the selected figures without inventing an order or transition.
- App-visible YouTube and web resources continue to render.
- Teaching provenance from every removed source is retained in the corresponding `notes.md`.
- Content Studio can load, edit, preview, save, and round-trip all 42 simplified figures.
- Image generation continues to use the versioned teaching frame and figure notes independently of production figure content.
- `npm run check` passes.

## Delivery increments

1. Record the specification and migrate teaching provenance while simplifying all figure packages.
2. Remove flow/combo behavior and static alias/familiarity presentation from the app and session model.
3. Simplify the Content Studio DTO, editor, persistence, and tests.
4. Reconcile documentation, run canonical validation, review, commit, and publish.

## Progress

- 2026-07-15: User approved the cleanup after reviewing the distinction between static figure familiarity and persisted nightly swipe choices.
- 2026-07-15: Migrated all 113 structured teaching sources into the corresponding 42 figure notes, preserving source and editorial details before removing the production fields.
- 2026-07-15: Removed aliases, static familiarity, flow suggestions, combo generation, combo UI and session state, and their Content Studio fields.
- 2026-07-15: Added the central Curious/Neugierig undecided state, retained persisted `pass`/`keep`/`star` decisions, and changed sharing to grouped figure names without generated sequences.

## Validation

- `npm run check` passed linting, strict type checks, 20 test files with 52 tests, and the production PWA build.
- Automated card presentation coverage verifies Curious/Neugierig, Not tonight, Got it, and Try tonight states.
- All 42 simplified figure definitions load and round-trip through the Content Studio persistence layer.
- A repository audit compared all 113 former teaching-source objects with the migrated notes and found no missing video IDs, titles, channels, timestamps, frame paths, or editorial notes.

## Next action

None. Reassess recommendation or durable mastery concepts only when a concrete product workflow needs them.
