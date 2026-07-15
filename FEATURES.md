# Feature Work

This file is the compact current-work surface for Swing Thing. Detailed accepted behavior belongs in an approved specification under [`specs/`](specs/); implemented behavior remains authoritative in source code and tests.

## Implemented product baseline

- Status: Done
- Goal: Preserve a concise, evidence-based record of the product capabilities delivered before the specification workflow was introduced.
- Scope: Deck building, figure content and assets, the local image studio, PWA delivery, and deck browsing through commit `d905877`.
- Acceptance: The delivered capability groups and their Git evidence are recorded in [`specs/implemented-baseline.md`](specs/implemented-baseline.md) without replacing current source code, tests, or specialized documentation as the authority.
- Validation: Historical commits were audited and the resulting baseline was checked against the current README, figure documentation, source, and tests.
- Next action: None; update current product documentation and feature specifications as behavior changes.

## Content Studio editorial core

- Status: Done
- Goal: Turn the image-oriented studio into a master-detail editor for complete figure content with safe saving and a live app-card preview.
- Scope: Figure library, structured Basics/English/German/Resources editing, shared front/back preview, generic web resources, atomic `figure.ts` persistence, and preservation of the existing Image Queue.
- Non-goals: Do not add review states, maintenance queues, bulk editing, AI writing, content-file migration, or a broader image-workflow redesign.
- Specification: [`specs/content-studio-editorial-core.md`](specs/content-studio-editorial-core.md)
- Progress: All four approved increments were implemented on 2026-07-15. A subsequent behavior-preserving Goldene-Mitte refactor separated the Content workspace controller, content model, source persistence, and named server actions while preserving the workflow and Image Queue.
- Validation: `npm run check` passes with 21 test files and 56 tests. Browser validation covered all-figure loading, unsaved live preview, web-resource rendering, German/English front/back controls, mobile Editor/Preview switching, and the 42-card Image Queue without saving test drafts.
- Next action: None; use the completed editorial core for real content maintenance and evaluate the separate Option B draft from that experience.

## Content Studio maintenance workspace

- Status: Proposed
- Maturity: Draft; implementation is not authorized.
- Goal: Potentially extend the editorial core into a catalog-wide maintenance and review workflow after Option A has been explored in practice.
- Scope: Draft ideas include review states, maintenance filters, change summaries, selected-figure artwork controls, and “Save and next.”
- Dependency: Reassess after the approved editorial core is implemented; its usability and architecture may change or eliminate these requirements.
- Specification: [`specs/content-studio-maintenance-workspace.md`](specs/content-studio-maintenance-workspace.md)
- Next action: None until the editorial core produces implementation and usage feedback.

## Figure model and flow cleanup

- Status: Done
- Approved: 2026-07-15
- Goal: Return the figure library and nightly deck workflow to a smaller factual model before reconsidering recommendations or long-term learning state.
- Scope: Remove aliases, static per-figure familiarity, flow suggestions, generated combos, and production teaching-source metadata; preserve swipe decisions as local session-scoped Build choices; use Curious/Neugierig as the undecided card state; retain user-visible resources and ending-position metadata; migrate teaching provenance into figure notes.
- Non-goals: Do not redesign the remaining family/count/motion/end metadata, add durable mastery tracking, remove transition figures, or redesign Build and Browse.
- Specification: [`specs/figure-model-and-flow-cleanup.md`](specs/figure-model-and-flow-cleanup.md)
- Progress: Removed aliases, static familiarity, flow suggestions, generated combos, and production teaching sources across the app, Content Studio, and all 42 figure packages. Preserved nightly swipe choices with a central Curious/Neugierig default, retained user-visible resources and ending positions, migrated all 113 teaching-source records into figure notes, and changed sharing to list selected figures without generated sequences.
- Validation: `npm run check` passes with 20 test files and 52 tests plus the production PWA build. A provenance audit compared every removed teaching source with its migrated note and found no missing IDs, titles, channels, timestamps, frame references, or editorial notes.
- Next action: None; reassess future recommendation or durable mastery concepts from the simplified model.

## Typed figure metadata

- Status: In progress
- Approved: 2026-07-15
- Goal: Replace the remaining known-value figure metadata strings with semantic, runtime-validated types without changing visible card meaning.
- Scope: Introduce shared enum-like unions and Content Studio dropdowns for family, count, and motion; replace slash-delimited ending strings with a structured `any` or position-list model; migrate all 42 figures and preserve localized labels.
- Non-goals: Do not redesign the existing family taxonomy, change figure classifications, add recommendation behavior, or restructure free-text guide and resource content.
- Specification: [`specs/typed-figure-metadata.md`](specs/typed-figure-metadata.md)
- Progress: Family, count, and motion now use semantic enum-like codes across the domain, all 42 figures, runtime validation, localized card presentation, and Content Studio dropdowns.
- Validation: Increment-one type checks, linting, 20 test files with 53 tests, and a complete 42-figure enum audit pass.
- Next action: Replace free-text endings with structured ending positions.
