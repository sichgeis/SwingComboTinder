# Direct OpenAI image provider

- Status: Done
- Approved: 2026-07-17
- Goal: Let the Dance Card Studio and image CLI use the OpenAI Image API directly while preserving the existing LiteLLM path.

## Context

The generator already sends an OpenAI-compatible multipart request to `/v1/images/edits`, so `LITELLM_BASE_URL=https://api.openai.com` works at the protocol level. The configuration, errors, logs, CLI help, and documentation nevertheless describe LiteLLM as mandatory and require an OpenAI key to be placed in a misleading variable.

## Requirements

- Add an explicit `IMAGE_API_PROVIDER` choice with `openai` and `litellm` values.
- For direct OpenAI, read `OPENAI_API_KEY` and default the base URL to `https://api.openai.com`; allow an optional `OPENAI_BASE_URL` override.
- Preserve existing `.env` files by inferring LiteLLM when legacy `LITELLM_API_KEY` or `LITELLM_BASE_URL` variables are present and no provider is explicit.
- Keep the shared `/v1/images/edits` multipart implementation, retries, response parsing, candidate storage, and promotion behavior.
- Make runtime status, errors, logs, CLI help, and documentation provider-neutral or provider-aware.
- Make `.env.example` directly usable as an OpenAI configuration template and document the commented LiteLLM alternative.

## Non-goals

- Do not add the OpenAI SDK, change the prompt or model default, send a paid validation request, expose credentials to the browser, or remove LiteLLM compatibility.
- Do not add provider failover.

## Acceptance criteria

- `IMAGE_API_PROVIDER=openai` plus `OPENAI_API_KEY` targets `https://api.openai.com/v1/images/edits` by default.
- `IMAGE_API_PROVIDER=litellm` uses the existing LiteLLM key and base URL.
- A legacy LiteLLM-only environment continues to select LiteLLM.
- Missing credentials report the selected provider and required variables clearly.
- Automated tests cover direct OpenAI configuration, base-URL normalization, legacy LiteLLM inference, and the shared request contract.
- `npm run check` passes without making a real image request.

## Validation

- Automated: `task check` passes with 22 Python maintenance tests, 23 application test files and 78 tests plus the production PWA build. Environment tests cover direct OpenAI defaults and normalization, explicit/inferred LiteLLM, legacy precedence with mixed variables, explicit resolution, and invalid providers. Generation tests verify the shared four-image `image[]` encoding, teaching-frame-first ordering and filenames, shared response handling, and direct missing-key guidance.
- Manual: With a dummy key and no outbound generation, an isolated Studio on port 4177 logged `imageApiProvider: "openai"` and `imageApiConfigured: true`; `/api/config` returned the same provider and model `gpt-image-2`. CLI help describes direct OpenAI and LiteLLM. No paid image request was sent.

## Decisions

- Provider selection is explicit when configured. Without it, any legacy LiteLLM variables retain precedence so existing private `.env` files are not redirected by an ambient OpenAI key.
- Direct OpenAI is the default for a fresh configuration because `.env.example` now presents it as the primary path.

## Progress

- Verified the official direct endpoint and authentication contract; implemented provider-aware configuration, the shared OpenAI-compatible `image[]` multipart encoding, status/errors/logging, tests, and durable documentation. Corrected LiteLLM generation after its multipart parser rejected repeated singular `image` fields as duplicate parameters.

## Next action

None; the feature is complete.
