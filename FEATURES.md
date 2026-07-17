# Feature Work

This file is the compact current-work surface for Swing Thing. Detailed accepted behavior belongs in an approved specification under [`specs/`](specs/); implemented behavior remains authoritative in source code and tests.

## Studio UI workbench

- Status: Done
- Approved: 2026-07-17
- Goal: Rework the local Dance Card Studio into a calmer, more polished desktop editorial workbench with clearer hierarchy, safer action emphasis, and faster Content and Image Queue workflows.
- Scope: Refine the dark art-deco visual system; simplify the Content library, editor command bar, form sections, resources, and live preview; separate Image Queue review filters from generation settings; clarify selection, request planning, card actions, and runtime states.
- Non-goals: Do not change the figure model, persistence, server APIs, generation defaults, provider configuration, production app, dependency-free architecture, or desktop-only support boundary; do not send paid image requests during validation.
- Specification: [`specs/studio-ui-workbench.md`](specs/studio-ui-workbench.md)
- Progress: Shipped the compact Dance Card Studio shell, exception-first catalog, sticky content command bar, refined editor and resources, prominent live preview, keyboard search/save affordances, separated artwork review and generation controls, persistent selection summary, compact metrics, and clearer queue-card decisions. Renamed the local entry points to `task studio`, `task studio:debug`, and `npm run studio`; image-only planning and generation remain under `images:*`.
- Validation: `npm run check` passes with 21 test files and 62 tests plus the production PWA build. The real 42-figure Studio ran at 1600 × 1000 without browser errors; Content selection, English back preview, keyboard search/resize, Image Queue filtering, 15-card bulk selection, accurate 7-request plan, and clearing selection were verified without saving content or sending an image request.
- Next action: None; use the redesigned workbench and derive future adjustments from observed production friction.

## Card publication state

- Status: Done
- Approved: 2026-07-17
- Goal: Let the Content Studio keep unfinished figure cards as drafts and deliberately include or exclude each card from the production app.
- Scope: Add an explicit `published` or `draft` state to every figure definition; edit it as an “Include in production” control in the Studio; show and filter the state in the dense library; keep drafts editable and previewable in both Studio workspaces; expose only published figures to the public app catalog.
- Non-goals: Do not add multi-stage approval, scheduling, roles, remote publishing, bulk status changes, or automatic Git/deployment controls.
- Specification: [`specs/card-publication-state.md`](specs/card-publication-state.md)
- Progress: Added the required typed state, migrated all 42 existing cards to `published`, integrated the state with conflict-safe Studio editing and immediate dense-library badges/filters, kept drafts in both Studio workspaces, exposed only published cards to the app, and retained local choices for temporarily withdrawn stable IDs.
- Validation: `npm run check` passes with 21 test files and 62 tests plus the production PWA build. A real Studio draft/save/filter cycle kept the card in the 42-card Image Queue while reducing the running app's Charleston count from 6 to 5; republishing restored 6 and left every source card published. No paid image request was sent.
- Next action: None; use Draft while preparing a card and select “Include in production” when it is ready to release.

## Flexible bilingual card guides

- Status: Done
- Approved: 2026-07-15
- Goal: Let each English and German card guide use its own ordered set of titled teaching sections while keeping the figure name, short description, and closing memory cue as explicit fields.
- Scope: Replace the fixed steps/body/lead/follow/connection/practice guide slots with one constrained Markdown-like body per language; parse, validate, edit, preview, and render the same format in the app and Content Studio; migrate all 42 guides without changing their prose or visible section order.
- Non-goals: Do not add general-purpose Markdown, embedded HTML, links or media in guide copy, rich-text editing, localized figure names, or changes to factual metadata and resources.
- Specification: [`specs/flexible-bilingual-card-guides.md`](specs/flexible-bilingual-card-guides.md)
- Progress: Approved the shared canonical title plus localized description/body/remember model and the constrained `##` heading with plain-paragraph syntax. Migrated all 42 bilingual guides losslessly and aligned the domain model, shared renderer, full-guide dialog, Content Studio, tests, and durable documentation.
- Validation: `npm run check` passes with 21 test files and 59 tests plus the production PWA build. A field-by-field audit verified all 84 localized guides against their pre-migration fields without prose loss. Browser validation covered the German phone card back and the expanded German Studio editor with its real shared live preview, without saving content or sending image requests.
- Next action: None; use the flexible body syntax for figure-specific editorial structures.

## Studio editorial cockpit

- Status: Done
- Approved: 2026-07-15
- Goal: Make Content and Image Queue a compact, attention-first editorial cockpit while retaining the Studio's art-deco identity and safe local workflows.
- Scope: Desktop-only compact shell, derived Content filters, clear loading/error/draft states, collapsible technical identity, revert/save/save-next actions, attention-first Image Queue filters, compact metrics, bulk visible selection, and a generation request plan.
- Non-goals: Do not support mobile or tablet Studio workflows, change the figure model, add durable copy-review state or AI writing, trigger paid generation during validation, add dependencies, or replace the Studio architecture.
- Specification: [`specs/studio-editorial-cockpit.md`](specs/studio-editorial-cockpit.md)
- Progress: Implemented the compact shell, derived Content and Image Queue filters, clearer loading/draft/validation states, collapsible identity, revert/save/save-next, attention metrics, visible bulk selection, request planning, and a self-contained live app-card preview. The supported Studio target was subsequently clarified as desktop-only. The figure library now has a persistent, keyboard-accessible horizontal resize handle so names and metadata can receive more room when needed.
- Validation: `npm run check` passes with 21 test files and 59 tests. A temporary Studio loaded the real 42-figure catalog without browser errors; desktop Content and Image Queue flows were verified without saving content or sending paid image requests. Browser automation additionally verified drag resizing, persisted width restoration, keyboard resizing, complete style labels, and the real live preview.
- Next action: None; use the cockpit for real editorial work and reassess only from observed friction.

## Figure model and Studio alignment

- Status: Done
- Approved: 2026-07-15
- Goal: Remove duplicated presentation and adapter fields and keep Content Studio editing the same typed figure model consumed by the app.
- Scope: Centralize repeated German headings, keep runtime moves metadata-only, unify app-visible resources as one ordered discriminated list, and serve all known Studio option values from shared typed definitions.
- Non-goals: Do not change figure classifications or prose, remove German follow/practice content or ending metadata, or add combo, flow, recommendation, or mastery behavior.
- Specification: [`specs/figure-model-alignment.md`](specs/figure-model-alignment.md)
- Progress: Repository-wide audit completed. Removed 252 repeated heading values and duplicated runtime guide fields; migrated all 42 packages from split YouTube/web wrappers to one ordered resource list; aligned Studio validation, persistence, controls, preview, and app rendering.
- Validation: `npm run check` passes with 20 test files and 56 tests. Persistence loads and round-trips all 42 definitions. A temporary Studio instance on port 4175 returned all shared option lists and rendered Tuck Turn without legacy heading data through the real German preview API.
- Next action: None; reassess individual guide fields only when a concrete editing or product workflow no longer needs them.

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
- Validation: `npm run check` passes with 21 test files and 56 tests. Browser validation covered all-figure loading, unsaved live preview, web-resource rendering, German/English front/back controls, and the 42-card Image Queue without saving test drafts.
- Next action: None; use the completed editorial core for real content maintenance and evaluate the separate Option B draft from that experience.

## Content Studio maintenance workspace

- Status: Proposed
- Maturity: Draft; implementation is not authorized.
- Goal: Potentially add durable catalog-wide copy review state only if real cockpit usage demonstrates that derived attention facts are insufficient.
- Scope: The completed editorial cockpit now owns maintenance filters and Save + next. Remaining draft ideas are durable review state, change summaries, and selected-figure artwork controls.
- Dependency: Reassess after the approved editorial core is implemented; its usability and architecture may change or eliminate these requirements.
- Specification: [`specs/content-studio-maintenance-workspace.md`](specs/content-studio-maintenance-workspace.md)
- Next action: None until cockpit usage produces evidence for durable review state.

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

- Status: Done
- Approved: 2026-07-15
- Goal: Replace the remaining known-value figure metadata strings with semantic, runtime-validated types without changing visible card meaning.
- Scope: Introduce shared enum-like unions and Content Studio dropdowns for family, count, and motion; replace slash-delimited ending strings with a structured `any` or position-list model; migrate all 42 figures and preserve localized labels.
- Non-goals: Do not redesign the existing family taxonomy, change figure classifications, add recommendation behavior, or restructure free-text guide and resource content.
- Specification: [`specs/typed-figure-metadata.md`](specs/typed-figure-metadata.md)
- Progress: Family, count, and motion now use semantic enum-like codes across the domain, all 42 figures, runtime validation, localized card presentation, and Content Studio dropdowns. Endings now use `any` or canonical validated position lists, with explicit Studio controls and both prior open/closed spellings normalized to one representation.
- Validation: `npm run check` passes with 20 test files and 56 tests plus the production PWA build. Catalog audits cover all 42 enum migrations and structured endings; persistence tests cover unknown values, empty and duplicate endings, and canonical ordering. A temporary live Content Studio instance returned the authoritative options and the normalized Promenade ending through its real content API.
- Next action: None; reassess taxonomy meaning separately if the product needs richer classification.
