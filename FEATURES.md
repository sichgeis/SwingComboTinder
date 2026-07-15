# Feature Work

This file is the compact current-work surface for Swing Thing. Detailed accepted behavior belongs in an approved specification under [`specs/`](specs/); implemented behavior remains authoritative in source code and tests.

## Implemented product baseline

- Status: Done
- Goal: Preserve a concise, evidence-based record of the product capabilities delivered before the specification workflow was introduced.
- Scope: Deck building, figure content and assets, the local image studio, PWA delivery, and deck browsing through commit `d905877`.
- Acceptance: The delivered capability groups and their Git evidence are recorded in [`specs/implemented-baseline.md`](specs/implemented-baseline.md) without replacing current source code, tests, or specialized documentation as the authority.
- Validation: Historical commits were audited and the resulting baseline was checked against the current README, figure documentation, source, and tests.
- Next action: None; update current product documentation and feature specifications as behavior changes.

## Card Studio full content editing

- Status: Proposed
- Goal: Evolve the image-oriented Card Studio into a complete maintenance workflow for figure titles, metadata, bilingual descriptions, YouTube links, web resources, and artwork.
- Scope: Select one of the three researched product and architecture approaches, then turn the chosen direction into a repository specification before implementation.
- Non-goals: Do not redesign the studio, migrate figure storage, or change production content before an approach and specification are explicitly approved.
- Acceptance: The user has selected an approach; the chosen user flow, content model, technical boundaries, staged delivery, and validation expectations are captured in an approved repository specification.
- Progress: Three approaches and a recommendation are recorded in Fundus at `Fundus/SwingComboTinder/card-studio-full-content-editing-approaches.md`, verified against the studio and figure sources at `d905877`.
- Validation: Research checked against `tools/image-studio/`, `figures/define-figure.ts`, `figures/README.md`, and the current figure package format.
- Next action: User reviews the Fundus options and selects the solution approach.
