# Dance Card Image Studio

The repository includes a local TypeScript studio and CLI for generating card-image candidates through a LiteLLM proxy backed by OpenAI's Image API. Both interfaces share the same figure discovery, prompt assembly, request, concurrency, candidate storage, and promotion code.

## Authentication

Copy the example configuration and add your LiteLLM virtual key and proxy URL. The browser never receives either credential.

```sh
cp .env.example .env
# Edit .env and set LITELLM_API_KEY and LITELLM_BASE_URL.
```

Both the studio and CLI load `.env` from the repository root. Existing shell environment variables take precedence. `IMAGE_MODEL` is the image-capable alias exposed by the proxy. The file also supports `IMAGE_SIZE`, `IMAGE_QUALITY`, `REQUEST_TIMEOUT_SECONDS`, and `IMAGE_STUDIO_PORT`; see [`.env.example`](../.env.example). Never commit `.env`.

## Browser studio

```sh
task env
# Edit .env, then:
task images:studio
```

Open <http://127.0.0.1:4174>. The studio shows the teaching frame, live master or fallback card, and latest generated candidate together. It can generate explicit selections, every missing master, figures whose `Needs rework` checkbox is checked, or the complete catalog. Independent figure requests run concurrently and report live status in the browser.

Generation never replaces live artwork. Use **Promote latest** after reviewing a candidate. Promotion archives an existing `generated/current.png`, installs the candidate atomically, switches a fallback `figure.ts` import to the generated master, and clears the rework checkbox.

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

`metadata.json` records the model, quality, output size, effective prompt and hash, original input hashes and dimensions, request ID, duration, and token usage when returned. Candidate directories are ignored by Git. Promoted `current.png` files and archived masters remain normal repository assets.

The `missing` and `all` modes report figures without `teaching-frames/selected.png` as blocked. They are not downgraded to text-only generation because the teaching pose is an authoritative input.
