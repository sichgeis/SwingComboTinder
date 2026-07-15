# Flexible bilingual card guides

- Status: Proposed
- Maturity: Draft; implementation is not authorized.
- Goal: Give each localized card guide a flexible ordered body without losing the stable card title, short description, or closing memory cue.

## Context

Each figure currently stores fixed English fields for description, steps, body, lead, connection, and cue. German adds follow and practice. The app and Content Studio turn those fields into a predetermined list of sections with centrally translated headings.

That model is tidy but makes the content structure an application decision. A guide cannot omit an irrelevant section, add a figure-specific perspective, split a topic into two sections, or order its teaching ideas differently without changing the shared TypeScript model and UI.

The completed figure-model alignment deliberately said to reassess individual guide fields when a concrete editing workflow no longer needs them. Flexible figure-specific sections are now that concrete need.

## Proposed content model

The canonical figure name remains `move.name` and is the card title in both languages. Localized figure names are not introduced.

Each localized guide contains exactly three editorial fields:

```ts
interface MoveGuide {
  readonly description: string;
  readonly body: string;
  readonly remember: string;
}
```

- `description` is the short localized subtitle shown on the front and beneath the title on the back.
- `body` is one ordered, sectioned text authored independently in English and German.
- `remember` is the localized closing memory cue rendered in the existing highlighted Remember/Merken treatment.

English and German use the same shape. German-only follow and practice ideas remain possible as ordinary titled sections rather than special fields.

## Authoring syntax

The body uses a deliberately small Markdown-like dialect. It is stored as one string and supports only:

- a section heading beginning with `## `;
- one or more plain-text paragraphs beneath that heading;
- blank lines separating paragraphs and sections.

Example:

```md
## Rhythm & footwork

Use an eight-count swing rhythm. Keep the final triple traveling away from the shared center.

## A useful second take

Think of the figure as a circle that opens, rather than sending one person away.

## Connection

Let the arms lengthen because both dancers continue moving, not because either dancer pulls.
```

Every body must begin with a section heading, every heading must have non-empty copy, and every section must have a non-empty heading. Duplicate headings are allowed because editorial meaning and order belong to the author.

No other Markdown is interpreted in the first version. In particular, `#`/`###` headings, lists, block quotes, links, images, emphasis, code, and raw HTML have no formatting semantics. The parser treats section copy as plain text and the renderer escapes it. This keeps the format readable in source, safe in previews, dependency-free, and small enough to validate with precise line-oriented errors.

Multiple paragraphs within one section are preserved and rendered as separate paragraphs. A literal line beginning with `## ` is therefore reserved for a new section.

## Product behavior

- The front card continues to show the canonical figure title and localized short description.
- The back card and full-guide dialog render body sections in authored order using their authored localized headings.
- The closing memory treatment continues after the body and uses `remember`.
- App-visible resources and the existing guide disclaimer remain after the memory cue in their current order.
- English and German may use different section names, section counts, content, and ordering.
- Card scrolling, touch behavior, offline behavior, and resource language filtering remain unchanged.

## Content Studio

The English and German editors each expose three fields: Description, Guide body, and Remember.

Guide body is a multiline plain-text editor, not a rich-text editor. The field includes a concise syntax hint and an example or placeholder. The existing live card preview is the primary visual feedback and must use the same parser and presentation path as production.

Validation reports line-oriented body problems against the localized body field and blocks saving. It does not enforce particular section names, counts, or parity between languages.

## Migration

All 42 figures migrate mechanically without editorial rewrites:

- English body order: Rhythm & footwork, Body & pathway, Lead & hands, Frame/tension/release.
- German body order: Rhythmus & Schritte, Körper & Weg, Als Lead, Als Follow, Verbindung, Frage zum Üben.
- Existing `description` remains `description`.
- Existing `cue` becomes `remember`.
- Existing section prose is copied verbatim beneath the corresponding currently rendered localized heading.

The migration must be audited for every removed field so no prose is lost and the current visible order is preserved. Later editorial work may then simplify, add, rename, remove, or reorder sections figure by figure.

## Scope

- Replace fixed localized guide slots with `description`, `body`, and `remember`.
- Add a shared parser and validator for the constrained section syntax.
- Render parsed sections in both the card back and full-guide dialog.
- Align Content Studio DTO validation, editing, shared live preview, deterministic serialization, and field counts.
- Migrate all English and German figure guides without prose changes.
- Update tests and durable figure/content documentation.

## Non-goals

- General-purpose Markdown or a general Markdown dependency
- Rich-text or section-builder controls
- Formatting inside section copy
- Links, images, video embeds, or arbitrary HTML inside guide bodies
- Localized figure titles
- Requiring matching sections between English and German
- Changing guide prose during the mechanical migration
- Changing resources, factual figure metadata, artwork, Build, or Browse behavior

## Acceptance criteria

- Every figure has a non-empty description, valid sectioned body, and non-empty remember cue in English and German.
- Each language can independently add, remove, rename, duplicate, and reorder titled sections without a TypeScript model or renderer change.
- Invalid bodies identify the localized body field and useful line context and cannot be saved by Content Studio.
- Studio source round-trips preserve section order, paragraph breaks, headings, and copy deterministically.
- Studio live preview and production use the same parser and render equivalent markup for a guide.
- The mechanical migration preserves all existing guide prose and current visible section order across all 42 figures.
- The card back and full-guide dialog preserve title, subtitle, memory, resources, disclaimer, scrolling, and safe escaped rendering.
- `npm run check` passes.

## Proposed delivery increments

1. Introduce the guide model plus shared parser/validation tests, then mechanically migrate all figure packages with a lossless audit.
2. Update shared card presentation and the full-guide dialog to render arbitrary parsed sections, with focused rendering and safety tests.
3. Align Content Studio editing, validation, preview, persistence, documentation, and canonical validation.

## Open decisions before approval

- Confirm that plain paragraphs are sufficient initially, with no bullet-list syntax or inline emphasis.
- Confirm that the figure title remains the shared canonical `move.name`; only description, body, and remember are localized.
- Confirm the stored field names `description`, `body`, and `remember`.

## Next action

Review the proposed syntax and open decisions. Explicit approval, with any requested revisions, changes this feature to Approved and authorizes implementation within the agreed scope.
