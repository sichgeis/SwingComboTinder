# Swing Thing

A phone-first Swing vocabulary refresher for building a focused deck from Lindy Hop, partnered Charleston, and Collegiate Shag figures. Swipe through the deck, mark what feels comfortable or adventurous, and get three personalized mini-combos for the social floor.

The interface and complete move guides support German and English. German is the default, while canonical figure names remain unchanged. Selected guides include curated tutorials, technique lessons, variations, and historical context.

[Open Swing Thing](https://sichgeis.github.io/SwingComboTinder/)

## Quick start

The project uses Node.js 22 and [Task](https://taskfile.dev/) 3. Run:

```sh
task install
task dev
```

Vite prints the local application URL. Run `task` at any time to list the available commands. The underlying npm scripts remain available when Task is not installed:

```sh
npm ci
npm run dev
```

## Common tasks

| Command | Purpose |
| --- | --- |
| `task dev` | Start the Vite development server |
| `task check` | Run linting, strict type checks, tests, and a production build |
| `task build` | Create the production build in `dist/` |
| `task preview` | Build and serve the production application locally |
| `task images:studio` | Start the local image-generation studio |
| `task images:plan` | Preview the missing-image batch without API calls |
| `task images:generate` | Generate the missing-image batch through LiteLLM |

Arguments after `--` are forwarded to Vite, Vitest, or the image CLI. Image tasks also accept Task variables:

```sh
task dev -- --host
task test -- --reporter=verbose
task images:plan MODE=marked -- --style lindy
task images:generate MODE=all CONCURRENCY=3 -- --quality medium --count 2
```

## Image generation

Card artwork is generated locally with OpenAI GPT Image through a LiteLLM proxy. Create the ignored `.env` file, replace its placeholder values, and start the studio:

```sh
task env
task images:studio
```

The studio runs at <http://127.0.0.1:4174> by default. It previews source frames and candidates, runs independent figure requests concurrently, and only changes live artwork when a candidate is explicitly promoted.

Required settings are `LITELLM_API_KEY` and `LITELLM_BASE_URL`; `IMAGE_MODEL` names the image-capable alias configured on the proxy. See [`.env.example`](.env.example) and [`image-generation/IMAGE_STUDIO.md`](image-generation/IMAGE_STUDIO.md) for configuration, batch modes, storage, and promotion details.

## Figure packages

Every figure is a self-contained package under `figures/<style>/<figure-id>/`:

```text
figure.ts
card.jpg
teaching-frames/
generated/
notes.md
```

`figure.ts` contains the typed metadata, localized copy, video provenance, and card links. A figure can use `generated/current.png` as its full-resolution card source or fall back to `card.jpg`. Vite discovers all figure definitions automatically, orders them by their explicit `order`, and emits the selected artwork as a hashed 600 × 900 WebP at quality 80. Teaching frames, generation history, and editorial notes stay source-only.

See [`figures/README.md`](figures/README.md) for the add and rework workflow.

## Architecture

- `figures/` is the source of truth for Lindy Hop, Charleston, and Shag figure packages.
- `src/domain/` contains the derived catalog and pure deck, session, video-reference, and combo rules.
- `src/infrastructure/` owns local-session persistence and schema migration.
- `src/ui/` renders and coordinates the interface.
- `src/styles/` and `src/assets/decorative/` contain presentation code and bundled artwork.
- `src/main.ts` composes styles, storage, UI, and PWA registration.
- `public/brand/` contains fixed-URL manifest, Apple touch, and social-sharing assets.
- `image-generation/` contains the generation prompt, pipeline contract, and style references.
- `tools/image-studio/` contains the shared image-generation server, CLI, and tests.

The application keeps its stateful control flow in `SwingThingController` and `LocalSessionStore`; domain rules remain immutable functions.

## Gestures and local state

- Swipe left: not tonight
- Swipe right: I know this
- Swipe up: try tonight
- Tap a card: switch between its illustrated front and move guide
- Scroll vertically on the back: read the guide while horizontal swipe decisions remain available

Deck focus and progress are stored locally. The application installs as an offline-capable PWA, and its share metadata includes a 1200 × 630 preview for messaging and social platforms.

## Release

Every push to `main` runs `npm run check` in GitHub Actions and publishes the generated `dist/` artifact to GitHub Pages. Dependencies, local `.env` files, image candidates, and build output are intentionally not committed.
