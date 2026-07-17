# URL-driven transcript downloader

- Status: Done
- Approved: 2026-07-17
- Goal: Let maintenance work retrieve a complete available YouTube caption transcript directly into a selected figure package without a paid provider or API key.

## Context

Research transcripts already live under `figures/<style>/<figure-id>/transcripts/`, but the repository only imports output produced by a separate CSV-oriented project. Future research tasks need a small repository-native command that accepts discovered YouTube URLs and places their captions directly beside the relevant figure.

The approved direction is option 1 from the 2026-07-17 discussion: a URL-driven downloader rather than a durable research manifest. The implementation is informed by `sichgeis/swing-yt-transcript-downloader`, whose free hosted fallback reads timestamped captions from `youtube-transcript.ai`.

## User flow

1. Research identifies one or more relevant YouTube videos and the target figure package.
2. The maintainer runs one command with the figure path and YouTube URL or URLs.
3. The tool validates the target, retrieves keyless hosted captions, and writes one complete Markdown transcript per video into that figure's `transcripts/` directory.
4. Repeating the command reuses local caption metadata and does not create duplicate transcript files.

## Requirements

- Accept standard YouTube watch, short, embed, live, and `youtu.be` URLs, plus bare 11-character video IDs.
- Require an existing figure target expressed as `<style>/<figure-id>` and prevent paths from escaping `figures/`.
- Use only the free hosted `youtube-transcript.ai` caption endpoint; require no API key and never call `youtube-transcript.dev`.
- Retrieve public title and channel metadata without an API key when available, while allowing a caption download to succeed with safe fallback metadata.
- Preserve timestamps and complete returned caption coverage in readable Markdown with source URL, video ID, language, provider type, and retrieval time.
- Use deterministic video-ID-based filenames, atomic writes, a local ignored cache, duplicate detection, and explicit overwrite behavior.
- Continue across multiple supplied URLs, summarize outcomes, and return a failing exit status when any URL fails.

## Scope

- A repository-native Python maintenance CLI under `tools/transcripts/`.
- Focused offline tests with mocked network responses.
- Task, README, and figure-workflow documentation.

## Non-goals

- Do not search YouTube, crawl channels, rank teaching sources, or decide which videos belong to a figure.
- Do not add a CSV/JSON manifest, queue, GUI, or background service.
- Do not add paid providers, API keys, audio transcription, translation, or new third-party dependencies.
- Do not alter production figure data or load transcripts into the public application.
- Do not replace the existing legacy batch importer in this increment.

## Acceptance criteria

- A maintainer can download one or several available English transcripts into a validated figure package with a documented command.
- Generated files contain complete parsed timestamp segments and enough source metadata to audit the research source.
- A repeat invocation does not create a second file for the same video; overwrite must be requested to refresh an existing transcript.
- Invalid targets, malformed URLs, unavailable captions, and partial batch failures are reported without unsafe writes.
- Automated downloader tests and `npm run check` pass.

## Technical constraints

- Use Python 3.11+ and the standard library already available in the repository workflow.
- Tests must not make live YouTube or hosted-provider requests.
- Caption and metadata caches remain local and unversioned; research Markdown transcripts remain versioned source material.

## Validation

- Automated: `task check` passes with 19 Python transcript tests, 21 application test files and 62 tests, lint, strict type checks, and the production PWA build. Downloader coverage includes supported URL forms, malformed URLs, representative hosted responses, unavailable and out-of-order captions, target containment, deterministic Markdown, cache precedence, metadata fallback and overrides, existing-video skips, and overwrite refresh behavior.
- Manual: CLI help and Task discovery render successfully. `task transcripts:download FIGURE=lindy/lindy-circle URL=https://youtu.be/P083vG0JKB8` found the existing legacy transcript by embedded video ID, reported it unchanged, and made no remote request. No live hosted-caption call was sent because provider behavior is covered with representative mocked responses and live retrieval would be externally rate-limited.

## Decisions

- Use the free hosted endpoint as the sole remote caption provider. Local cache lookup precedes it, but there is no `youtube-transcript-api` or paid fallback in this approved increment.
- Target figure packages directly rather than producing an intermediate import tree.
- Use the video ID in each filename so title changes and same-title videos cannot create ambiguous duplicates.

## Progress

- Implemented the free-only URL workflow, local cache, direct figure routing, Markdown archive format, compatibility with existing imported transcripts, tests, Task entry point, and durable documentation.

## Next action

None; use the downloader during the next teaching-video research task.
