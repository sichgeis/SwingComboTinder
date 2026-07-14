# Dance Card Image Studio

The repository includes a local TypeScript studio and CLI for generating card-image candidates through OpenAI's Image API. Both interfaces share the same figure discovery, prompt assembly, request, concurrency, candidate storage, and promotion code.

## Authentication

Provide an OpenAI API key only to the local process. The browser never receives it.

```sh
export OPENAI_API_KEY="..."
```

`IMAGE_MODEL` optionally overrides the default `gpt-image-2`. Do not commit either value.

## Browser studio

```sh
npm run images:studio
```

Open <http://127.0.0.1:4174>. The studio shows the teaching frame, live master or fallback card, and latest generated candidate together. It can generate explicit selections, every missing master, figures whose `Needs rework` checkbox is checked, or the complete catalog. Independent figure requests run concurrently and report live status in the browser.

Generation never replaces live artwork. Use **Promote latest** after reviewing a candidate. Promotion archives an existing `generated/current.png`, installs the candidate atomically, switches a fallback `figure.ts` import to the generated master, and clears the rework checkbox.

## CLI batches

Preview a production plan without spending API credits:

```sh
npm run images:generate -- --mode missing --dry-run
npm run images:generate -- --mode marked --style lindy --dry-run
```

Generate candidates with three parallel requests:

```sh
npm run images:generate -- --mode missing --concurrency 3
npm run images:generate -- --mode marked --quality medium --count 2
npm run images:generate -- --mode all --concurrency 3
```

Generate explicit figures:

```sh
npm run images:generate -- \
  --mode selected \
  --ids lindy/swingout-open,charleston/kick-throughs
```

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
