# Typed figure metadata

- Status: Done
- Approved: 2026-07-15
- Goal: Constrain known figure metadata values at compile time, at Content Studio boundaries, and in the editor while preserving their current visible meaning.

## Context

After the figure-model cleanup, family, count, motion, and ending position remain required free-text strings even though the 42-figure catalog uses a small known set. This permits typos, makes localization depend on display strings, and represents multiple ending positions through ambiguous slash-delimited text.

The user approved both proposed increments: semantic enum codes for family/count/motion and a structured ending-position model.

## Accepted model

### Enum-like values

Use exported `as const` arrays plus derived TypeScript union types rather than native TypeScript enums. The arrays are shared by domain types, runtime validation, tests, localization, and Content Studio dropdowns.

Family codes preserve the current taxonomy:

```text
circular, linear, turn, position, rhythm, transition, travel,
charleston, charleston-turn, tandem, shag-rhythm, shag-turn
```

Count codes preserve the current six patterns:

```text
six, eight, six-or-eight, six-or-twelve, eight-or-sixteen, musical
```

Motion codes preserve the current five values:

```text
linear, rotational, circular, vertical, travel
```

Stored values are semantic codes. English and German display labels remain centralized presentation concerns.

### Ending positions

Replace `end: string` with:

```ts
type MoveEnding =
  | { readonly kind: "positions"; readonly positions: readonly EndPosition[] }
  | { readonly kind: "any" };
```

Allowed position codes are:

```text
open, closed, side-by-side, wrapped, tandem
```

Position collections must be non-empty, contain no duplicates, and serialize in the shared canonical order. Existing `Open / Closed` and `Closed / Open` both normalize to the same position set because the field describes possible endings, not a transition direction.

## Behavior and editing

- Cards and the detail dialog preserve current English and German labels.
- Content Studio uses dropdowns for family, count, and motion.
- Content Studio provides an explicit Any/Specific ending choice and position checkboxes for specific endings.
- Complete DTO validation rejects unknown enum codes, malformed endings, empty specific endings, and duplicate positions.
- Stable IDs, names, localized guides, resource titles, URLs, and editorial notes remain free text under their existing validation.

## Non-goals

- Normalizing or redesigning the family taxonomy
- Combining family and motion into tags
- Changing any figure's classification
- Adding filtering, recommendations, combos, flows, or long-term mastery
- Changing public resource or localized guide structures

## Acceptance criteria

- All 42 definitions use semantic family, count, and motion codes plus structured endings.
- TypeScript rejects unknown values in source definitions.
- Runtime DTO validation rejects unknown values and malformed endings.
- Content Studio exposes constrained controls and round-trips all 42 figures deterministically.
- English and German card metadata renders the same labels as before migration.
- The two formerly order-dependent open/closed strings share one normalized representation.
- `npm run check` passes.

## Delivery increments

1. Introduce family/count/motion enum-like unions, migrate the catalog, add shared labels and Studio dropdowns, validate, and commit.
2. Introduce structured ending positions, migrate the catalog, add editor controls and validation, finish documentation, validate, and commit.

## Progress

- 2026-07-15: User approved autonomous implementation of both increments.
- 2026-07-15: Migrated family, count, and motion to semantic codes; added compile-time unions, runtime validation, localized labels, and server-supplied Content Studio dropdown options.
- 2026-07-15: Replaced ending strings with `any` or canonical known-position lists; normalized both open/closed orders; added Studio ending-kind and position controls.

## Validation

- `npm run check` passes linting, strict type checks, 20 test files with 56 tests, and the production PWA build.
- All 42 definitions load and round-trip through the Content Studio persistence layer.
- Catalog tests enforce allowed family/count/motion codes plus non-empty, unique, canonical position lists.
- Runtime persistence tests reject unknown enum values, malformed endings, empty position lists, duplicate positions, and unknown positions.
- Presentation tests cover English/German enum labels, multi-position endings, and the `any` ending.
- A temporary live Content Studio instance on port 4175 successfully loaded the shared enum options and Promenade as `{ kind: "positions", positions: ["open", "closed"] }` through the real content API.

## Next action

None. Reassess taxonomy meaning separately if a concrete product workflow needs richer classification.
