# Feature Work

This file is the compact current-work surface for Swing Thing. Detailed accepted behavior belongs in an approved specification under [`specs/`](specs/); implemented behavior remains authoritative in source code and tests.

## Studio transcript import

- Status: Done
- Approved: 2026-07-17
- Goal: Paste a YouTube URL into a selected figure's Content context and save its complete available captions in that figure package.
- Scope: Figure-scoped Research transcripts UI; existing free downloader integration; machine-readable backend protocol; title-based safe filenames; existing-file list; bounded process execution; tests and documentation.
- Non-goals: Do not search/crawl YouTube, bulk import through Studio, refresh existing files, summarize/edit card copy, add app-visible resources, translate/transcribe audio, or use paid providers/API keys.
- Specification: [`specs/studio-transcript-import.md`](specs/studio-transcript-import.md)
- Progress: Added title-based and JSON downloader modes, a bounded no-shell backend adapter, contained-path verification, the figure-scoped API, filesystem-backed transcript lists, Content paste/Enter/button workflow, focused coverage, and documentation.
- Validation: `task check` passes with 22 Python maintenance tests, 23 application test files and 78 tests plus the production PWA build; browser syntax checking passes. The real 42-card Studio listed seven Lindy Circle transcripts and safely reported an archived pasted URL without another request, dirtying content, creating a duplicate, or logging an error. A separate cache-backed download created the exact title-named Markdown with complete metadata/timestamps and was removed afterward; no paid or live remote request was used.
- Next action: None; select a figure and use Research transcripts for the next researched YouTube source.

## Studio teaching-pose upload

- Status: Done
- Approved: 2026-07-17
- Goal: Add a teaching-pose image from a file, drag and drop, or clipboard paste without leaving the Dance Card Studio.
- Scope: Universal pose-manager action; picker/drop/paste ingestion; PNG/JPEG/WebP validation and PNG normalization; safe first-pose or alternative persistence; immediate refresh; tests and documentation.
- Non-goals: Do not crop/edit/delete/rename/bulk-upload poses, accept URLs/video/SVG/GIF, replace an existing selection silently, trigger generation, or change card workflow state.
- Specification: [`specs/studio-teaching-pose-upload.md`](specs/studio-teaching-pose-upload.md)
- Progress: Added bounded server-side PNG normalization, exclusive first-pose installation, safe uniquely named alternatives, a universal pose manager, picker/drop/paste ingestion, immediate refresh, focused coverage, and workflow documentation.
- Validation: `npm run check` passes with 22 test files and 76 tests plus the production PWA build; browser syntax checking passes. The real 42-card Studio accepted a clipboard PNG and file-picked WebP as normalized Texas Tommy alternatives, preserved the selected pose, refreshed the dialog, and logged no browser errors; temporary validation images were removed and no generation request was sent.
- Next action: None; use Teaching poses whenever a figure needs a new generation reference.

## Direct OpenAI image provider

- Status: Done
- Approved: 2026-07-17
- Goal: Use the OpenAI Image API directly from the Studio and CLI while retaining the existing LiteLLM route.
- Scope: Explicit provider selection; standard OpenAI key and default base URL; legacy LiteLLM inference; provider-aware status/errors/logging; `.env.example`, tests, and workflow documentation.
- Non-goals: Do not add an SDK, change prompts/models, send a paid validation request, expose credentials, remove LiteLLM, or add provider failover.
- Specification: [`specs/direct-openai-image-provider.md`](specs/direct-openai-image-provider.md)
- Progress: Added explicit OpenAI/LiteLLM selection, standard direct OpenAI variables and default URL, backward-compatible LiteLLM precedence, the shared OpenAI-compatible `image[]` multipart contract, provider-aware Studio/CLI status and errors, and updated configuration/workflow documentation. Corrected the LiteLLM request encoding after its multipart parser rejected repeated singular `image` fields.
- Validation: `task check` passes with 22 Python maintenance tests, 23 application test files and 78 tests plus the production PWA build. Focused generation coverage verifies the shared four-image `image[]` request, teaching-frame-first ordering, filenames, response handling, and missing OpenAI credentials. An isolated Studio previously reported `gpt-image-2` via configured provider `openai` through `/api/config`; no image request was sent for this compatibility fix.
- Next action: None; copy `.env.example`, set `OPENAI_API_KEY`, and use the existing Studio or CLI generation flow.

## Studio teaching-pose selection

- Status: Done
- Approved: 2026-07-17
- Goal: Choose an existing alternate PNG teaching pose from Image Queue while keeping `teaching-frames/selected.png` as the generation contract and preserving the previous selection.
- Scope: Discover direct PNG alternatives, compare them in a pose dialog, atomically exchange a chosen alternate with `selected.png`, validate paths, refresh Studio state, test, and document the workflow.
- Non-goals: Do not upload/edit/delete frames, change current artwork or approval state, trigger generation, rewrite notes, or support non-PNG alternatives.
- Specification: [`specs/studio-teaching-pose-selection.md`](specs/studio-teaching-pose-selection.md)
- Progress: Image Queue discovers direct PNG pose options, exposes a visual chooser on both active and approved cards, validates the requested alternate, and atomically exchanges it with `selected.png` with recovery on failure.
- Validation: `npm run check` passes with 22 test files and 68 tests plus the production PWA build; both dependency-free Studio modules pass `node --check`. The real 42-card Studio showed all three Texas Tommy poses, swapped `alternative.png` into the generation slot, and restored both original SHA-256 hashes by repeating the UI swap without browser errors or an image request.
- Next action: None; use Swap teaching pose when a figure package contains alternate PNG frames.

## Studio card creation

- Status: Done
- Approved: 2026-07-17
- Goal: Create a new valid draft figure package from Content and open it immediately for ordinary editing.
- Scope: New card dialog; validated name/style/globally unique slug; next global order; atomic draft package with provisional bilingual content, notes, empty production directories, and a self-contained placeholder card; tests and documentation.
- Non-goals: Do not auto-publish, generate paid artwork, clone/import/rename/delete packages, infer final copy, add templates, or retain a validation-only card.
- Specification: [`specs/studio-card-creation.md`](specs/studio-card-creation.md)
- Progress: Content now creates an atomic valid draft package from a name, style, and suggested/editable slug; assigns the next global order; writes provisional bilingual content, notes, production directories, and named placeholder art; and opens the saved draft in the existing editor.
- Validation: `npm run check` passes with 22 test files and 68 tests plus the production PWA build; focused tests cover scaffold contents, 600 × 900 JPEG metadata, global ordering and ID uniqueness, validation, and failure cleanup. The real Studio created and opened an unpublished draft with a live preview, exposed its fallback/rework state in Image Queue, and reported no browser errors; the validation-only package was removed.
- Next action: None; use New card for the next figure and replace its provisional copy and artwork before publishing.

## URL-driven transcript downloader

- Status: Done
- Approved: 2026-07-17
- Goal: Download complete available YouTube captions directly into a selected figure package through a repository-native, keyless maintenance command.
- Scope: Validated figure targeting; one or more YouTube URLs; local cache plus the free hosted `youtube-transcript.ai` caption endpoint; public no-key video metadata; deterministic, timestamped Markdown output; safe duplicate and overwrite behavior; tests and workflow documentation.
- Non-goals: Do not search or rank videos, crawl channels, add a research manifest or GUI, use paid providers or API keys, transcribe audio, add dependencies, or load transcripts into the app.
- Specification: [`specs/url-driven-transcript-downloader.md`](specs/url-driven-transcript-downloader.md)
- Progress: Added the repository-native Python downloader, keyless hosted caption and oEmbed clients, ignored local caches, validated direct figure routing, complete timestamped Markdown rendering, deterministic video-ID filenames, legacy duplicate detection, explicit refresh/overwrite behavior, multi-URL failure isolation, Task entry point, and maintenance documentation.
- Validation: `task check` passes with 19 Python transcript tests, 21 application test files and 62 tests, lint, strict type checks, and the production PWA build. The real Task command detected and skipped the existing `P083vG0JKB8` Lindy Circle transcript by its embedded video ID without making a remote request. CLI help and Task discovery were also verified. No live hosted caption request was sent during validation.
- Next action: None; use the downloader during the next teaching-video research task.

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
