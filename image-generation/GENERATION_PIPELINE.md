# GPT Image 2 generation pipeline

Use this document as the implementation contract for generating dance-card artwork. The reusable creative prompt lives in [`PROMPT.md`](PROMPT.md).

The implemented local UI and batch commands are documented in [`IMAGE_STUDIO.md`](IMAGE_STUDIO.md).

## Request layout

Send a multipart request through the configured LiteLLM proxy to `POST /v1/images/edits`, with four ordered `image` fields:

1. The move's `figures/<style>/<move>/teaching-frames/selected.png` — authoritative for pose and composition.
2. `references/01-swingout-open.png` — style only.
3. `references/02-inside-turn.png` — style only.
4. `references/03-charleston-kick-throughs.png` — style only.

The fixed runtime prompt identifies Image 1 as the strict pose and composition reference. Every later uploaded image is style-only and must not contribute a pose or composition.

## Input preparation

Prepare upload copies without replacing the checked-in PNG masters.

| Input | Upload format | Compression | Dimensions |
| --- | --- | --- | --- |
| Teaching frame | WebP | Quality 90 | Preserve aspect ratio and native resolution; long edge at most 1536 px |
| Style references | WebP | Quality 90 | Keep the existing 1024 × 1536 px dimensions |

Rules:

- Never crop, stretch, or obscure heads, hands, connection points, legs, or shoes.
- Do not upscale a small teaching frame merely to reach a target size; upscaling does not restore pose detail.
- Prefer a teaching frame with a 768 px or larger short edge when the source genuinely provides it. A clear frame around 500 px on the short edge can remain at native resolution.
- Use PNG or lossless WebP instead when transparency or pixel-perfect annotations are meaningful.
- WebP quality 90 is an upload and storage optimization, not a direct API price optimization. Image-input cost is based on processed image tokens rather than compressed file bytes.

## API defaults

```text
endpoint: <LITELLM_BASE_URL>/v1/images/edits
authorization: Bearer <LITELLM_API_KEY>
model: <IMAGE_MODEL proxy alias>
size: 1024x1536
quality: medium
output_format: png
inputs: [teaching frame, style reference 1, style reference 2, style reference 3]
```

GPT Image 2 processes reference images at high fidelity automatically. Do not set `input_fidelity`; the model does not expose that choice.

Use the quality levels as follows:

- `low`: inexpensive pose and composition drafts.
- `medium`: normal generation and the production default.
- `high`: final attempts where medium quality repeatedly fails on anatomy, hands, texture, or other fine detail.

Keep the generated master as a 1024 × 1536 PNG. The application build should convert that master to WebP quality 80 for delivery. Do not repeatedly recompress an already lossy WebP.

## Prompt

Use [`DEFAULT_INSTRUCTIONS`](../tools/image-studio/prompt.ts) verbatim for every request. Do not add a move name, `Pose direction`, `Character direction`, or a second input-assignment preamble. The teaching frame itself carries the move-specific information.

## Validation and telemetry

Reject or flag generated images when either dancer has cropped shoes, missing or additional limbs, merged hands, broken connection points, floating feet, an ambiguous supporting leg, or a pose that materially differs from Image 1.

Record at least:

- model and model snapshot when returned;
- output size and quality;
- input file dimensions and byte sizes;
- request duration;
- `usage.input_tokens_details.image_tokens` when returned;
- output tokens and total usage;
- retry count and rejection reason.

Measure real requests before optimizing reference count. For draft generation, compare one style reference against all three; use all three when their consistency benefit justifies the additional high-fidelity image-input tokens.

## Current operational assumptions

- Changing an input from PNG to WebP or JPEG at the same decoded dimensions is not expected to materially change model price. It mainly changes upload size and may change visual quality if compression is excessive.
- Smaller upload files can reduce transfer time, but model generation normally dominates latency.
- Larger input dimensions can increase processing and image-token usage without improving results once the pose and style are already clear.
- Output size and quality are the main controllable output-cost and latency levers. Portrait 1024 × 1536 matches the product card format.

Recheck these assumptions when changing the model snapshot or SDK. Official references:

- [GPT Image 2 model](https://developers.openai.com/api/docs/models/gpt-image-2)
- [Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- [Image input requirements and token accounting](https://developers.openai.com/api/docs/guides/images-vision)
- [GPT Image prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
