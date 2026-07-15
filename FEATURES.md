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

- Status: Approved
- Goal: Turn the image-oriented studio into a master-detail editor for complete figure content with safe saving and a live app-card preview.
- Scope: Figure library, structured Basics/English/German/Resources editing, shared front/back preview, generic web resources, atomic `figure.ts` persistence, and preservation of the existing Image Queue.
- Non-goals: Do not add review states, maintenance queues, bulk editing, AI writing, content-file migration, or a broader image-workflow redesign.
- Specification: [`specs/content-studio-editorial-core.md`](specs/content-studio-editorial-core.md)
- Progress: Option A selected and approved on 2026-07-15 after review against all 42 figure packages and the current studio implementation.
- Validation: Specification checked against `tools/image-studio/`, `figures/define-figure.ts`, `src/domain/move.ts`, and the production card renderer.
- Next action: Implement Increment 1: the content DTO, validation, revision-safe reader/writer tests, and read-only master-detail shell.

## Content Studio maintenance workspace

- Status: Proposed
- Maturity: Draft; implementation is not authorized.
- Goal: Potentially extend the editorial core into a catalog-wide maintenance and review workflow after Option A has been explored in practice.
- Scope: Draft ideas include review states, maintenance filters, change summaries, selected-figure artwork controls, and “Save and next.”
- Dependency: Reassess after the approved editorial core is implemented; its usability and architecture may change or eliminate these requirements.
- Specification: [`specs/content-studio-maintenance-workspace.md`](specs/content-studio-maintenance-workspace.md)
- Next action: None until the editorial core produces implementation and usage feedback.
