# Swing Thing

A phone-first Swing vocabulary refresher. Build a focused deck from Lindy Hop, partnered Charleston, and Collegiate Shag figures, mark what feels comfortable or adventurous, and get three personalized mini-combos for the social floor.

The interface and complete move guides can be switched between German and English. German is the default while canonical figure names stay unchanged.

Selected move guides link to matching tutorials, technique lessons, variations, and historical context. YouTube links and their teaching-frame provenance are managed with the figure they describe.

Every figure is a self-contained package under `figures/<style>/<figure-id>/`. Its typed definition, localized copy, live card image, teaching photographs, generation history, YouTube links, and editorial notes stay together. See [`figures/README.md`](figures/README.md) for the add and rework workflow. The broader source catalogs and their tooling live in `research/reference-catalog/`; none of those research assets are deployed.

[Open Swing Thing](https://sichgeis.github.io/SwingComboTinder/)

## Development

Use Node.js 22, install the pinned dependencies, and start Vite:

```sh
npm ci
npm run dev
```

The terminal prints the local URL. Useful quality commands:

```sh
npm run check   # lint, strict types, tests, and production build
npm run build   # typecheck and create dist/
npm run preview # serve the production build locally
```

## Architecture

- `figures/` is the source of truth for all 42 figure packages and provides the build-discovered catalog.
- `src/domain/` contains the derived catalog export and pure deck, session, and combo rules.
- `src/infrastructure/` owns resilient local-session persistence and migration of the existing v2 schema.
- `src/ui/` contains the browser controller that renders and coordinates the current interface.
- `src/main.ts` is the small composition root for storage, UI, and PWA registration.

Vite eagerly discovers each `figure.ts`, sorts definitions by their explicit `order`, and converts each figure's best available source image into a hashed 600 × 900 WebP at quality 80. `teaching-frames/`, full-resolution generated sources, and `notes.md` remain source-only.

The design deliberately uses two stateful classes—`SwingThingController` and `LocalSessionStore`—while keeping business rules as immutable functions. This keeps the control flow visible without introducing a framework or a layer for every operation.

## Gestures

- Swipe left: not tonight
- Swipe right: I know this
- Swipe up: try tonight
- Tap a card to flip between its illustrated front and its complete move guide
- Scroll vertically on the back to read; swipe decisions remain available horizontally

Basic-step flashcards are intentionally omitted. The app stores deck focus and progress locally and installs as an offline-capable PWA. Vite generates a versioned service worker, and GitHub Pages checks the project and deploys only `dist/` from `main`.

Open Graph and Twitter Card metadata provide a 1200×630 preview when sharing the GitHub Pages URL through WhatsApp, X/Twitter, Slack, and similar services.

## Release

Every push to `main` runs the full quality check and publishes the generated `dist/` artifact to GitHub Pages. Build output and dependencies are intentionally not committed.
