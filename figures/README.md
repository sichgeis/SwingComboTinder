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

`figure.ts` is the typed source of truth for metadata, English and German card copy, teaching-source YouTube videos, and the links shown on the card back. Figures with a full-resolution `generated/current.png` use it as their card source; figures without one fall back to `card.jpg`. Vite converts either source to a 600 × 900 WebP at quality 80 for the PWA. Teaching frames remain versioned source material but do not enter the production build. Of the generated files, only the promoted `generated/current.png` is versioned; candidates, metadata, and archived masters remain local.

## Reworking a figure

1. Read `notes.md` and inspect `teaching-frames/`.
2. Generate and compare candidates locally. Candidate runs and replaced versions under `generated/archive/` are ignored by Git.
3. Promote the selected candidate to `generated/current.png`; this is the only generated file committed, and the production WebP is derived from it during the Vite build.
4. Update the artwork status and pose observations in `notes.md`.
5. Update YouTube provenance or card links in `figure.ts` when sources change.
6. Run `task check` (or `npm run check`) before publishing.

## Adding a figure

Copy an existing package in the appropriate style directory, assign a unique stable `id` and `order`, provide complete English/German guides, add a card image, and update its local sources and notes. The catalog discovers `figure.ts` files automatically; no central registration edit is needed.
