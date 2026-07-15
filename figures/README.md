# Figure library

Every dance figure is managed as one self-contained package under its style directory:

```text
figures/<style>/<figure-id>/
  figure.ts
  card.jpg
  teaching-frames/
  generated/
  notes.md
```

`figure.ts` is the typed source of truth for factual metadata, English and German card copy, and the YouTube or generic web resources shown on the card back. Known family, count, motion, and ending-position values are constrained by shared domain types and Content Studio controls rather than stored as display text. `notes.md` keeps teaching-source provenance and artwork decisions out of production content. Figures with a full-resolution `generated/current.png` use it as their card source; figures without one fall back to `card.jpg`. Vite converts either source to a 600 × 900 WebP at quality 80 for the PWA. Teaching frames remain versioned source material but do not enter the production build. Of the generated files, only the promoted `generated/current.png` is versioned; candidates, metadata, and archived masters remain local.

Use `task images:studio` to edit existing figure content through the local master-detail Content workspace. It provides a shared app-card preview, field validation, external-change detection, and atomic full-figure saving. Identity, style, order, directory, and artwork imports remain source-maintained fields rather than editable studio content.

## Reworking a figure

1. Read `notes.md` and inspect `teaching-frames/`.
2. Generate and compare candidates locally. Candidate runs and replaced versions under `generated/archive/` are ignored by Git.
3. Promote the selected candidate to `generated/current.png`; this is the only generated file committed, and the production WebP is derived from it during the Vite build.
4. Update the artwork status and pose observations in `notes.md`.
   Use its optional `Generation note` for a short correction that should be appended to this figure's next image-generation prompt.
5. Update teaching-source provenance in `notes.md` and app-visible YouTube or web resources in the Content Studio when sources change.
6. Run `task check` (or `npm run check`) before publishing.

## Adding a figure

Copy an existing package in the appropriate style directory, assign a unique stable `id` and `order`, provide complete English/German guides, add a card image, and update its local sources and notes. The catalog discovers `figure.ts` files automatically; no central registration edit is needed.
