# Studio transcript import

- Status: Done
- Approved: 2026-07-17
- Goal: Download a YouTube video's complete available captions into the currently selected figure package without leaving the Dance Card Studio.

## Context

The repository already has a keyless Python downloader that validates figure targets, deduplicates by YouTube video ID, reads an ignored local cache, and falls back to the free hosted `youtube-transcript.ai` caption endpoint. Importing still requires a terminal command, even though research and copy editing happen in the figure-scoped Content workspace.

This feature integrates that existing downloader instead of creating a second caption implementation.

## User flow

1. Select a figure in Content and open **Research transcripts**.
2. Paste a YouTube watch, short, live, embed, or `youtu.be` URL and choose **Download transcript** (or press Enter).
3. The Studio backend invokes the existing free downloader for that exact figure and waits for its bounded result.
4. A new transcript is named from the public YouTube video title and written under `figures/<style>/<figure>/transcripts/`.
5. The section refreshes its filesystem-backed file list and reports the saved path. A video already archived for the figure is reported as available without another provider request.

## Requirements

- Keep transcript import in the selected figure's Content context and send the stable figure ID with the pasted URL.
- Reuse `tools/transcripts/download_transcripts.py`, its URL validation, cache, free hosted provider, oEmbed title/channel metadata, Markdown rendering, and video-ID duplicate detection.
- Add a machine-readable downloader mode for the backend while preserving the existing human-readable CLI and Task command.
- Name new Studio-imported files `<sanitized original video title>.md`; if that filename belongs to another video, append the stable video ID rather than overwrite it.
- Validate the returned path remains inside the selected figure's direct `transcripts/` directory.
- Bound URL length, child-process output, and execution time; never invoke a shell.
- Show existing Markdown transcript filenames and repository-relative paths after loading a figure and immediately after an import.
- Display useful unavailable-caption, invalid-URL, provider, timeout, and duplicate messages without changing figure content.

## Scope

- Machine-readable and title-filename options in the existing Python downloader.
- A bounded Studio backend adapter and figure-scoped API endpoint.
- A Research transcripts section in Content with paste/Enter/button interaction and filesystem-backed results.
- Focused Python/TypeScript tests, browser verification, and maintenance documentation.

## Non-goals

- Do not search YouTube, crawl channels, rank sources, add transcripts as app-visible resources, summarize or rewrite card copy, support bulk Studio imports, refresh/overwrite existing transcripts, translate captions, transcribe audio, or add a paid provider/API key.
- Do not expose arbitrary process arguments, filesystem destinations, language/provider controls, or downloader caches in the UI.

## Acceptance criteria

- A selected figure accepts one pasted supported YouTube URL and saves a title-named Markdown transcript in that figure's `transcripts/` directory.
- The saved file retains the downloader's title, channel, canonical URL, video ID, timestamps, retrieval metadata, and full available caption body.
- Repeating an archived video reports the existing file and makes no duplicate.
- Invalid URLs, unavailable captions, subprocess failures, timeouts, and path escapes produce no out-of-scope file and show an error.
- Existing CLI behavior remains available, automated checks pass, and a real Studio duplicate-import flow succeeds without a paid request.

## Decisions

- The Node backend invokes Python with an argument array and JSON output. This keeps caption/provider behavior centralized and avoids a new Node dependency or parser.
- Title-only filenames apply to new Studio imports. The CLI keeps its stable video-ID prefix by default for backward compatibility.
- Transcript download is independent of the editable `figure.ts` draft, so it neither marks the form dirty nor requires saving card content.

## Progress

- Implemented title-based and JSON downloader modes, the bounded no-shell backend adapter, contained-path verification, figure-scoped import API, filesystem-backed transcript lists, Content paste/Enter/button workflow, focused coverage, and durable documentation.

## Validation

- Automated: `task check` passes with 22 Python maintenance tests, 23 application test files and 78 tests, lint, strict type checks, and the production PWA build. `node --check tools/image-studio/static/content-workspace.js` passes. Coverage includes title-based naming, title collision fallback, JSON duplicate results, exact backend arguments, contained paths, downloader failures, and existing transcript listing.
- Browser: An isolated Studio on port 4179 loaded the real 42-card catalog. Lindy Circle showed seven filesystem transcripts and their repository paths. Pasting `https://www.youtube.com/watch?v=P083vG0JKB8` and choosing Download transcript reported the existing title-named file, kept the count at seven, left the content state saved, and produced no browser errors. Duplicate detection happened before any provider request.
- Filesystem: A cache-backed real download of `ejRJAQmvf_k` created `Get more rotation in your Lindy Circle.md` with the original title, SwingStepTV channel, canonical URL, video ID, retrieval metadata, and complete returned timestamp blocks. The validation file was removed afterward. No paid provider or live remote request was used.

## Next action

None; select a figure and use Research transcripts for the next researched YouTube source.
