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
| `task studio` | Start the local Dance Card Studio |
| `task studio:debug` | Start the Studio with detailed diagnostic logging |
| `task images:plan` | Preview the missing-image batch without API calls |
| `task images:generate` | Generate the missing-image batch through OpenAI or LiteLLM |
| `task transcripts:download FIGURE=… URL=…` | Download free hosted captions into a figure package |

Arguments after `--` are forwarded to Vite, Vitest, or the image CLI. Image tasks also accept Task variables:

```sh
task dev -- --host
task test -- --reporter=verbose
task images:plan MODE=marked -- --style lindy
task images:generate MODE=all CONCURRENCY=3 -- --quality medium --count 2
task images:generate MODE=marked -- --debug
task transcripts:download FIGURE=lindy/lindy-circle URL='https://youtu.be/P083vG0JKB8'
```

## Development workflow

Current feature status, validation evidence, and the next action live in [`FEATURES.md`](FEATURES.md). Substantial approved work receives a dedicated specification under [`specs/`](specs/README.md); small fixes and routine maintenance remain intentionally lightweight. Repository-wide operating and delivery rules live in [`AGENTS.md`](AGENTS.md).

## Content and image production

Card artwork is generated locally with OpenAI GPT Image, either through the direct OpenAI API or a LiteLLM proxy. Create the ignored `.env` file, replace its placeholder values, and start the Dance Card Studio:

```sh
task env
task studio
```

The studio runs at <http://127.0.0.1:4174> by default. Its desktop workbench separates Content editing from artwork production. Content provides a searchable, resizable figure library, structured bilingual copy and resource editing, figure-scoped YouTube transcript downloads, explicit Draft/Published controls, keyboard search and save shortcuts, and the same front/back card presentation used by the app. **New card** creates a complete unpublished figure package with provisional bilingual copy and local placeholder art, then opens it for editing. Draft cards remain fully editable and available to the Image Queue but do not enter the public app catalog until “Include in production” is selected and saved. The Studio validates and saves a complete `figure.ts` atomically and detects external file changes before writing. Image Queue keeps review filters separate from the explicit generation composer, previews source frames and candidates, accepts teaching-pose images through file selection, drag and drop, or clipboard paste, lets alternate PNG frames swap into the selected generation slot, runs independent figure requests concurrently, and only changes live artwork when a candidate is explicitly promoted.

For direct OpenAI, keep `IMAGE_API_PROVIDER=openai` and set `OPENAI_API_KEY`; the base URL defaults to `https://api.openai.com`. For LiteLLM, select `litellm` and set `LITELLM_API_KEY` plus `LITELLM_BASE_URL`. Existing LiteLLM-only `.env` files remain supported. `IMAGE_MODEL` is either the direct OpenAI model name or the image-capable proxy alias. See [`.env.example`](.env.example) and [`image-generation/IMAGE_STUDIO.md`](image-generation/IMAGE_STUDIO.md) for configuration, batch modes, storage, and promotion details.

The Studio and image-generation CLI write timestamped diagnostic logs to the terminal. Set `IMAGE_STUDIO_LOG_LEVEL=debug`, use `task studio:debug`, or add `--debug` to an image-generation CLI command for request attempts, timings, paths, and complete error stacks. API keys and authorization values are redacted.

## Figure packages

Every figure is a self-contained package under `figures/<style>/<figure-id>/`:

```text
figure.ts
card.jpg
teaching-frames/
generated/
notes.md
```

`figure.ts` contains an explicit `draft` or `published` state, factual typed metadata, localized copy, and one ordered list of app-visible YouTube or web resources. Family, count, motion, resource categories, and optional resource language use shared semantic codes; endings are either `any` or a validated list of known positions. Each language owns an independently sectioned guide body. Editorial teaching-source provenance and artwork decisions live in `notes.md`, while optional research transcripts can support copy revisions without entering the app. A figure can use `generated/current.png` as its full-resolution card source or fall back to `card.jpg`. Vite discovers all figure definitions automatically, orders published figures by their explicit `order`, and emits the selected artwork as a hashed 600 × 900 WebP at quality 80. Teaching frames and transcripts remain versioned source material. Generation runs, metadata, and archived masters stay local; only a promoted `generated/current.png` is committed so clean checkouts can reproduce the production build.

Research can add a complete available YouTube caption transcript directly to a figure without an
API key or paid provider. The downloader uses a local ignored cache followed by the free hosted
caption endpoint, validates the target package, and skips a video already present there. See
[`tools/transcripts/README.md`](tools/transcripts/README.md) for single- and multi-URL commands,
metadata overrides, and overwrite behavior.

See [`figures/README.md`](figures/README.md) for the add and rework workflow and the
[`card-back style guide`](figures/CARD_BACK_STYLE_GUIDE.md) for transcript-based bilingual copy.

## Architecture

- `figures/` is the source of truth for Lindy Hop, Charleston, and Shag figure packages.
- `src/domain/` contains the derived catalog and pure deck, session, and resource-reference rules.
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
