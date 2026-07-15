# Implemented product baseline

- Status: Done
- Historical baseline: `47e4e2a` through `d905877`
- Recorded after implementation: This document summarizes observed delivered behavior. It is not a reconstruction of requirements or approval history.

## Goal

Keep a durable, compact record of the major product capabilities that existed when specification-driven development was introduced.

Current source code and tests remain authoritative. [`README.md`](../README.md), [`figures/README.md`](../figures/README.md), and the image-generation documentation describe the current operating details.

## Delivered capabilities

### Deck builder and learning content

- The phone-first app offers Lindy Hop, partnered Charleston, and Collegiate Shag figures in German and English.
- A selected style begins with all of its figures. Swiping removes or marks figures while preparing a deck for the evening.
- Cards open into detailed guides with curated videos, web resources, variations, and combinations where available.
- Deck focus, decisions, and progress persist locally.

Evidence: initial working product snapshot `47e4e2a`; current behavior is covered by the domain, UI, and persistence tests.

### Figure library and asset pipeline

- Each figure is a self-contained package with typed metadata, localized copy, artwork, teaching frames, sources, and generation notes.
- Vite discovers figure packages and produces optimized card artwork for the application build.
- Only promoted generated artwork is versioned; candidates, run metadata, archives, secrets, and build output remain local.
- Obsolete assets and catalog structures were removed while clean-checkout catalog validation was retained.

Evidence: `9b675c7`, `fb9caa1`–`b9b3ebd`, `05b781a`, `37f1593`, `e94bfd2`, and `3085b0d`.

### Local image-production studio

- A local studio and command-line workflow generate figure artwork through an image-capable LiteLLM endpoint.
- Maintainers can plan or run batches, compare candidates, preview them at full size, add per-figure prompt notes, and explicitly promote a chosen image.
- The studio tracks approval and latest-run state and provides redacted diagnostic logging for generation failures.

Evidence: `35be992`, `5a3917f`, `9bd2426`, `7125f34`–`b749bf9`, and `d467408`–`d347226`.

### PWA and release delivery

- The app builds as an installable, offline-capable PWA and handles version updates when an installed app returns to the foreground.
- Pushes to `main` are validated and published to GitHub Pages by GitHub Actions.
- Brand, manifest, and sharing assets have explicit ownership and stable public paths.

Evidence: `47e4e2a`, `f7abbfe`, `deedf8a`, `b9b3ebd`, and `514a2b6`.

### Deck browsing

- A persistent top-level control switches between deck building and browsing.
- Browse mode contains every selected-style figure not explicitly removed during building.
- Horizontal swipes move backward and forward without changing deck membership; no redundant bottom controls are shown.
- Browse cards share the builder layout. Tapping flips the card, and horizontal navigation preserves the current front or detail side.

Evidence: `6a4a4cf`, `4c2d81a`, `e221974`, and `41134e8`.

## Validation

- Historical commit audit: all commits from the initial snapshot through `d905877` were reviewed and grouped by delivered capability.
- Current automated validation: `npm run check` runs linting, strict type checks, tests, and a production build.
- Ongoing changes belong in a current feature entry and, when substantial, an approved dedicated specification.
