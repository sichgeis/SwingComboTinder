# Figure library

Every dance figure is managed as one self-contained package under its style directory:

```text
figures/<style>/<figure-id>/
  figure.ts
  card.jpg
  teaching-frames/
  generated/
  transcripts/      # optional imported research transcripts
  notes.md
```

`figure.ts` is the typed source of truth for the required `draft` or `published` state, factual metadata, English and German card copy, and one ordered discriminated list of YouTube or generic web resources shown on the card back. Each localized guide keeps a short `description`, a sectioned `body`, and a closing `remember` cue. Body sections begin with `## Heading`; plain-text paragraphs are separated by blank lines. English and German may use different headings, section counts, and ordering. Known family, count, motion, ending-position, resource-category, and optional resource-language values are constrained by shared domain types and server-supplied Content Studio controls rather than stored as display text. `notes.md` keeps teaching-source provenance and artwork decisions out of production content. Figures with a full-resolution `generated/current.png` use it as their card source; figures without one fall back to `card.jpg`. Vite converts either source to a 600 × 900 WebP at quality 80 for the PWA. Teaching frames remain versioned source material but do not enter the production build. Of the generated files, only the promoted `generated/current.png` is versioned; candidates, metadata, and archived masters remain local.

`transcripts/` contains optional research copies of complete captions retrieved for that figure. These
Markdown files are versioned source material but are not loaded by the application. Download a
newly researched YouTube source directly through the free keyless provider with:

```sh
task transcripts:download FIGURE=lindy/lindy-circle URL='https://youtu.be/P083vG0JKB8'
```

The downloader validates the figure package, caches provider responses locally, writes auditable
timestamped Markdown, and skips a video ID that is already present. Pass `OVERWRITE=1` only when a
known transcript should be refreshed. Full CLI usage, including multiple URLs and source metadata
overrides, is documented in [`tools/transcripts/README.md`](../tools/transcripts/README.md).

The earlier sibling-project batch output can still be previewed or imported with:

```sh
task transcripts:plan
task transcripts:import
task transcripts:import SOURCE=/custom/transcript/output
```

The importer reads completed entries from `index.csv`, preserves filenames and metadata, skips
identical files, and refuses to replace differing files unless `OVERWRITE=1` is supplied.

When transcripts are used to write or revise the bilingual card copy, follow the
[`card-back style guide`](CARD_BACK_STYLE_GUIDE.md). It defines the German-first synthesis workflow,
Swing Denglisch, spatial precision, compact section structure, English adaptation, remember cues,
and review checklist.

Use `task studio` to edit figure content through the local Dance Card Studio. It provides a shared app-card preview, field validation, external-change detection, and atomic full-figure saving. **New card** scaffolds a complete draft package, assigns its stable slug and next global order, installs provisional bilingual copy and a named 600 × 900 placeholder, and opens it in the existing editor. “Include in production” maps the typed publication state to `published` when checked and `draft` when unchecked. Drafts remain in Content and Image Queue for ordinary copy and artwork work; only published figures enter the public app. In Image Queue, **Teaching poses** accepts PNG, JPEG, or WebP input through file selection, drag and drop, or clipboard paste; it installs the first pose as `selected.png` and keeps later uploads as explicit alternatives. After creation, identity, style, order, directory, and artwork imports remain source-maintained fields rather than editable studio content.

## Reworking a figure

1. Read `notes.md` and inspect `teaching-frames/`.
2. Generate and compare candidates locally. Candidate runs and replaced versions under `generated/archive/` are ignored by Git.
3. Promote the selected candidate to `generated/current.png`; this is the only generated file committed, and the production WebP is derived from it during the Vite build.
4. Update the artwork status and pose observations in `notes.md`.
   Use its optional `Generation note` for a short correction that should be appended to this figure's next image-generation prompt.
5. Update teaching-source provenance in `notes.md` and app-visible YouTube or web resources in the Content Studio when sources change.
6. Run `task check` (or `npm run check`) before publishing.

## Adding a figure

Copy an existing package in the appropriate style directory, immediately set `publication` to `draft`, assign a unique stable `id` and `order`, provide complete English/German guides, add a card image, and update its local sources and notes. The Studio discovers the package regardless of publication state; the public catalog includes it only after it is deliberately changed to `published`. No central registration edit is needed.
