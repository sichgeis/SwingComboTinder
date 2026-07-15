# Figure model and Studio alignment

- Status: Done
- Approved: 2026-07-15
- Goal: Remove duplicated presentation and adapter fields from figure packages and keep the Content Studio driven by the same typed model as the app.

## Context

The typed-metadata increments constrained family, count, motion, and ending positions, but a repository-wide audit found three older seams still present:

- Every figure repeated the same six German section headings even though headings are interface copy.
- The runtime `Move` type flattened the English guide onto metadata objects although the owning `FigureDefinition` already retained that guide.
- Studio edited one ordered discriminated resource list but persistence split it into `youtube.cardLinks` and `resources.cardLinks`, losing cross-type order and writing empty wrapper objects.

The Studio also kept resource category and language choices in browser-local arrays rather than receiving the shared allowed values from its server contract.

## Accepted model

- `Move` contains factual identity and classification only: id, canonical name, style, family, count, motion, and ending.
- `FigureDefinition.guides` owns English and German teaching copy.
- German follow and practice copy remains figure-specific. The six identical German section headings move to the central translation table.
- `FigureDefinition.resources` is one ordered discriminated union of YouTube and web resources. An empty array is valid.
- Resource type-specific fields remain constrained: YouTube and web categories use shared literal unions, and optional web language uses the shared app language union.
- Studio receives family, count, motion, ending position, video category, web category, and resource language options from the shared server metadata contract.

## Non-goals

- Changing figure classifications or guide prose
- Removing app-visible resources, German follow/practice copy, or ending metadata
- Redesigning the family taxonomy or adding recommendation, combo, flow, or mastery behavior
- Making stable IDs, canonical names, localized copy, titles, URLs, or video IDs into enums

## Acceptance criteria

- All 42 figure packages load without per-figure headings or split resource wrappers.
- Stored resources retain their order across resource types and render in that order after language filtering.
- App cards and the detail dialog preserve the existing German headings and current YouTube presentation.
- Studio loads, previews, validates, saves, and deterministically round-trips the aligned model.
- No runtime `Move` duplicates guide fields.
- `npm run check` passes.

## Progress

- 2026-07-15: Audited all application, figure, Studio, test, and durable documentation consumers.
- 2026-07-15: Centralized 252 identical German heading values, removed flattened English guide fields, and deleted the now-redundant localization lookup module.
- 2026-07-15: Migrated all figures to one ordered discriminated resource list and aligned Studio persistence, validation, controls, preview, and app rendering.
- 2026-07-15: Moved resource enum options into the server-supplied Studio metadata contract.

## Validation

- `npm run check` passes linting, strict type checks, 20 test files with 56 tests, and the production PWA build.
- Persistence tests load all 42 definitions and verify deterministic ordered YouTube/web resource round-trips, validation, canonical endings, conflict detection, and atomic saves.
- A temporary Studio instance on port 4175 returned the complete shared metadata options, loaded Tuck Turn without legacy heading data, and rendered its preserved German heading and YouTube resource through the real preview API.

## Next action

None. Reassess individual guide fields only when a concrete editing or product workflow no longer needs them.
