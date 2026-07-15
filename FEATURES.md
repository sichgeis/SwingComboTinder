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
- Progress: All four approved increments were implemented on 2026-07-15: safe content persistence, structured bilingual editing, shared preview and generic resources, responsive workspace navigation, and preserved Image Queue behavior.
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
