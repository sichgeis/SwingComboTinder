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

`figure.ts` is the typed source of truth for metadata, English and German card copy, teaching-source YouTube videos, and the links shown on the card back. `card.jpg` is imported by Vite and shipped in the PWA. Teaching frames and full-resolution generation files stay beside the figure for research, but are not imported and do not enter the production build.

## Reworking a figure

1. Read `notes.md` and inspect `teaching-frames/`.
2. Preserve new full-resolution candidates under `generated/`; move replaced versions into `generated/archive/` with descriptive names.
3. Replace `generated/current.png` and derive the optimized `card.jpg` from it.
4. Update the artwork status and pose observations in `notes.md`.
5. Update YouTube provenance or card links in `figure.ts` when sources change.
6. Run `npm run check` before publishing.

## Adding a figure

Copy an existing package in the appropriate style directory, assign a unique stable `id` and `order`, provide complete English/German guides, add a card image, and update its local sources and notes. The catalog discovers `figure.ts` files automatically; no central registration edit is needed.
