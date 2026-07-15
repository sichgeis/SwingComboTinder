# Swing Thing Content Studio

The repository includes a local Content Studio for maintaining figure copy, resources, and artwork, plus a CLI for generating card-image candidates through a LiteLLM proxy backed by OpenAI's Image API. The browser studio and CLI share the same figure discovery, prompt assembly, request, concurrency, candidate storage, and promotion code.

## Authentication

Copy the example configuration and add your LiteLLM virtual key and proxy URL. The browser never receives either credential.

```sh
cp .env.example .env
# Edit .env and set LITELLM_API_KEY and LITELLM_BASE_URL.
```

Both the studio and CLI load `.env` from the repository root. Existing shell environment variables take precedence. `IMAGE_MODEL` is the image-capable alias exposed by the proxy. The file also supports `IMAGE_SIZE`, `IMAGE_QUALITY`, `REQUEST_TIMEOUT_SECONDS`, `IMAGE_STUDIO_PORT`, and `IMAGE_STUDIO_LOG_LEVEL`; see [`.env.example`](../.env.example). Never commit `.env`.

## Diagnostic logging

Both entry points emit timestamped logs to stderr. The default `info` level reports configuration state, batch plans, job lifecycle, preprocessing, LiteLLM response status and request IDs, token usage, output locations, and elapsed times. Use debug logging when diagnosing a failure:

```sh
task images:studio:debug
task images:generate MODE=marked -- --debug
IMAGE_STUDIO_LOG_LEVEL=debug npm run images:generate -- --mode missing --dry-run
```

Supported levels are `error`, `warn`, `info`, and `debug`. Set `IMAGE_STUDIO_LOG_LEVEL` in `.env` for a persistent choice. Debug adds inbound studio requests, proxy attempts, retry decisions, prepared input sizes, candidate writes, and complete nested error stacks. Credentials and authorization-shaped fields are redacted, prompts and image payloads are never printed, and signed query strings are removed from logged image URLs.

When reporting a LiteLLM failure, include the timestamp, figure ID, HTTP status, proxy `requestId`, and the final error block. These fields make it possible to correlate a local job with proxy-side logs without sharing credentials.

## Content workspace

```sh
task env
# Edit .env, then:
task images:studio
```

Open <http://127.0.0.1:4174> in a desktop browser. The Studio is a desktop-only local production tool; mobile and tablet workflows are not supported targets. The default **Content** workspace lists every figure and can filter by style or derived attention facts such as invalid content, missing resources, or fallback artwork. Select a figure to edit typed Basics, English and German guide copy, and the ordered app-visible YouTube or web resources. Each localized guide has Description, Guide body, and Remember fields; start every body section with `## Heading` and separate plain-text paragraphs with a blank line. The Studio remembers the last selected figure for the current browser session. Unsaved values appear immediately in the shared German/English front/back card preview. Stable IDs, style, order, directory, and artwork import remain read-only inside **Technical identity**. Teaching-source provenance remains in each figure's `notes.md` rather than production content.

**Revert** restores the loaded source, **Save** stays on the current figure, and **Save + next** advances through the currently visible list. Saving validates the complete figure, detects source changes made after the editor loaded, writes and checks a temporary TypeScript file, and atomically replaces `figure.ts`. Invalid or conflicted saves leave the source untouched. Switching figures, changing workspaces, or closing the page with unsaved changes requires confirmation. A catalog-load failure shows restart guidance rather than resembling an empty library.

## Image Queue

Choose **Image Queue** to enter a derived **Needs attention** view of new candidates, rework, missing masters, missing pose references, and artwork that is not approved. Other views keep approved work and individual exception groups reachable without letting them dominate the default queue. Compact counts summarize the complete catalog; **Select visible** and **Clear selection** support review batches, and the request plan states the eligible figure, candidate, and image-request counts before generation.

Each review card shows the teaching frame, live master or fallback card, and latest generated candidate together. Expand **All candidates** to compare every locally generated option, open any candidate at its original pixel dimensions, and promote the chosen one directly. Close an image preview with its button, the backdrop, or Escape. Expand **Generation note** on a figure to save a short pose correction directly into that figure's `notes.md`. The correction is appended only to that figure's effective prompt, which can be checked with **Prompt** before generation. Choose **Approve image** when a move has artwork you like: the approval is saved in `notes.md` and completed work collapses in the approved view. Approved artwork with new candidates or a rework marker keeps its full review controls. Choose **Reopen** to restore an otherwise completed card's review controls. The queue can generate explicit selections, every missing master, figures whose `Needs rework` checkbox is checked, or the complete catalog. Independent figure requests run concurrently and report live status in the browser.

Starting a generation run clears the previous run's review markers. Each figure that successfully receives new candidates is highlighted with a **new** pill showing the candidate count. These markers remain after the run finishes and across studio refreshes in the same browser tab, making the latest run's review set easy to find. Failed and blocked figures are not marked; the next generation run replaces the marker set.

Generation never replaces live artwork. Use **Promote latest** for the newest option or **Promote** beside any entry in **All candidates**. Promotion archives an existing `generated/current.png`, installs the selected candidate atomically, switches a fallback `figure.ts` import to the generated master, and clears the rework checkbox.

Promoting a different candidate also clears an existing image approval so changed artwork returns to the review queue.

## CLI batches

Preview a production plan without spending API credits:

```sh
task images:plan
task images:plan MODE=marked -- --style lindy
```

Generate candidates with three parallel requests:

```sh
task images:generate
task images:generate MODE=marked -- --quality medium --count 2
task images:generate MODE=all CONCURRENCY=3
```

Generate explicit figures:

```sh
task images:generate MODE=selected -- \
  --ids lindy/swingout-open,charleston/kick-throughs
```

The Task commands delegate to the npm scripts. If Task is unavailable, use `npm run images:studio` or `npm run images:generate --` with the same CLI options.

Add `--promote` only when the first returned candidate should immediately become the live master. Normal production runs should generate candidates first and promote them after review.

## Storage and recovery

Each request writes an immutable run beneath the figure package:

```text
figures/<style>/<move>/generated/candidates/<run-id>/
  candidate-1.png
  candidate-2.png
  metadata.json
```

`metadata.json` records the model, quality, output size, effective prompt and hash, original input hashes and dimensions, request ID, duration, and token usage when returned. The entire generated workspace stays local and is ignored by Git, including candidates, metadata, and archived masters. The sole exception is a promoted `generated/current.png`, which is versioned because it is the source used by clean production builds.

The `missing` and `all` modes report figures without `teaching-frames/selected.png` as blocked. They are not downgraded to text-only generation because the teaching pose is an authoritative input.
