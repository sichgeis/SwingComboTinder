# Swing Thing

A phone-first Swing vocabulary refresher for building and browsing a focused deck from Lindy Hop, partnered Charleston, and Collegiate Shag figures. Prepare for the evening by removing figures that do not belong tonight, then use the dedicated Browse mode to revisit the remaining cards and their detailed guides on the social floor.

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
| `task images:studio` | Start the local Content Studio and Image Queue |
| `task images:studio:debug` | Start the studio with image-request traces and error stacks |
| `task images:plan` | Preview the missing-image batch without API calls |
| `task images:generate` | Generate the missing-image batch through LiteLLM |

Arguments after `--` are forwarded to Vite, Vitest, or the image CLI. Image tasks also accept Task variables:

```sh
task dev -- --host
task test -- --reporter=verbose
task images:plan MODE=marked -- --style lindy
task images:generate MODE=all CONCURRENCY=3 -- --quality medium --count 2
task images:generate MODE=marked -- --debug
```

## Development workflow

Current feature status, validation evidence, and the next action live in [`FEATURES.md`](FEATURES.md). Substantial approved work receives a dedicated specification under [`specs/`](specs/README.md); small fixes and routine maintenance remain intentionally lightweight. Repository-wide operating and delivery rules live in [`AGENTS.md`](AGENTS.md).

## Content and image production

Card artwork is generated locally with OpenAI GPT Image through a LiteLLM proxy. Create the ignored `.env` file, replace its placeholder values, and start the studio:

```sh
task env
task images:studio
```

The studio runs at <http://127.0.0.1:4174> by default. Its Content workspace provides a searchable figure library, structured bilingual copy and resource editing, and the same front/back card presentation used by the app. It validates and saves a complete `figure.ts` atomically and detects external file changes before writing. Its Image Queue previews source frames and candidates, runs independent figure requests concurrently, and only changes live artwork when a candidate is explicitly promoted.

Required settings are `LITELLM_API_KEY` and `LITELLM_BASE_URL`; `IMAGE_MODEL` names the image-capable alias configured on the proxy. See [`.env.example`](.env.example) and [`image-generation/IMAGE_STUDIO.md`](image-generation/IMAGE_STUDIO.md) for configuration, batch modes, storage, and promotion details.

The image tools write timestamped diagnostic logs to the terminal. Set `IMAGE_STUDIO_LOG_LEVEL=debug`, use `task images:studio:debug`, or add `--debug` to an image-generation CLI command for request attempts, timings, paths, and complete error stacks. API keys and authorization values are redacted.

## Figure packages

Every figure is a self-contained package under `figures/<style>/<figure-id>/`:

```text
figure.ts
card.jpg
teaching-frames/
generated/
notes.md
```

`figure.ts` contains the typed metadata, localized copy, video provenance, and app-visible YouTube or web resources. A figure can use `generated/current.png` as its full-resolution card source or fall back to `card.jpg`. Vite discovers all figure definitions automatically, orders them by their explicit `order`, and emits the selected artwork as a hashed 600 × 900 WebP at quality 80. Teaching frames remain versioned source material. Generation runs, metadata, and archived masters stay local; only a promoted `generated/current.png` is committed so clean checkouts can reproduce the production build.

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

## Build, Browse, and local state

- Build starts with every figure from the selected dance styles; swipe left to remove a figure from tonight's deck, right for “I know this,” or up for “try tonight.”
- Browse shows every figure not explicitly removed. Swipe left or right to move through the deck without changing its contents.
- Tap a card in either mode to switch between its illustrated front and move guide.
- In Browse, horizontal navigation stays on the current front or detail side; scroll vertically on the back to read the complete guide.

Deck focus, decisions, progress, and the last Browse position are stored locally. The application installs as an offline-capable PWA, automatically activates versioned releases, and checks for service-worker updates whenever an installed app returns to the foreground. Its share metadata includes a 1200 × 630 preview for messaging and social platforms.

## Release

Every push to `main` runs `npm run check` in GitHub Actions and publishes the generated `dist/` artifact to GitHub Pages. Dependencies, local `.env` files, unpromoted or archived image output, and build output are intentionally not committed.
