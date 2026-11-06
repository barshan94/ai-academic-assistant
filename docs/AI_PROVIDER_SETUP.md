# AI provider setup

## Supported protocol

The current adapter pool supports OpenAI-compatible Chat Completions endpoints. This includes compatible gateways and vendors only when they implement the same endpoint and JSON response format. Native Anthropic, Gemini or other non-compatible APIs need a dedicated adapter before they can be added.

AI is disabled until at least one valid server-side provider configuration exists. No provider is contacted by merely opening the app.

## Single-provider configuration

Set these values in `.env.local` and the deployment's server environment:

```dotenv
AI_PROVIDER_NAME=openai-compatible
AI_API_BASE_URL=https://api.openai.com/v1
AI_API_KEY=
AI_MODEL=
AI_ALLOW_PROVIDER_FALLBACKS=false
```

Use HTTPS endpoints. Plain HTTP is allowed only for localhost development. Do not use public-prefixed variables for credentials. Do not commit real keys.

## Optional task-aware provider pool

To configure up to eight compatible providers, set `AI_PROVIDER_POOL` to a JSON array. Each entry requires `name`, `baseUrl`, `apiKey`, `model` and a non-empty `tasks` array containing `answer`, `chapter-note`, or both. `priority` is an optional integer from 0 to 1000; lower numbers are tried first. `enabled` defaults to true.

Example shape (replace the placeholders only in the server environment):

```json
[
  {
    "name": "primary",
    "baseUrl": "https://api.example.com/v1",
    "apiKey": "SERVER_SECRET",
    "model": "approved-model",
    "tasks": ["answer", "chapter-note"],
    "priority": 10,
    "enabled": true
  },
  {
    "name": "secondary",
    "baseUrl": "https://gateway.example.net/v1",
    "apiKey": "SECOND_SERVER_SECRET",
    "model": "approved-fallback-model",
    "tasks": ["answer"],
    "priority": 20
  }
]
```

The router filters providers by task and orders them by owner-defined priority. It records the actual provider/model used with each saved answer or chapter note.

## Fallback and cost safety

Fallback is disabled by default. Set `AI_ALLOW_PROVIDER_FALLBACKS=true` only when every configured endpoint is explicitly approved for the possible additional usage charges. When enabled, another provider is attempted only after network/timeout unavailability, malformed/empty provider responses, or HTTP 408, 425, 429 and 5xx responses. Permanent 4xx failures (including invalid requests, authentication/authorization failures, missing models and payload-size rejection) stop immediately rather than being retried against another provider. Invalid local input is never retried. This avoids spending on fallback calls that cannot repair a permanent configuration or request error.

The router does not yet estimate per-model token cost or dynamically score quality, latency or historical availability. Priority is a manual owner-controlled choice, not an automatic price optimizer. AI answer and chapter-note request quotas still apply.

Do not enable a paid endpoint or fallback without explicit budget approval. Review each provider's data-processing and retention terms before sending question text or opt-in source context.
## No-billing option: Google AI Studio free tier

The existing OpenAI-compatible adapter can call Gemini without a new SDK or code path. Google's official compatibility endpoint supports Chat Completions:

`https://generativelanguage.googleapis.com/v1beta/openai`

For a no-billing trial, create a Gemini API key in [Google AI Studio](https://aistudio.google.com/api-keys), keep the project on Google's **Free** tier, and configure these server-side variables:

```dotenv
AI_ENABLED=true
AI_PROVIDER_NAME=gemini-ai-studio
AI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_API_KEY=YOUR_GEMINI_API_KEY
AI_MODEL=gemini-3.6-flash
AI_ALLOW_PROVIDER_FALLBACKS=false
```

Do not enable Cloud Billing or switch the AI Studio project to a paid tier. The free tier has model-specific rate limits and may not be sufficient for a busy production app. Google's pricing page identifies free input/output token access for selected models, while paid tiers provide higher limits. Bangladesh is listed among the supported Gemini API regions.

**Privacy warning:** Google states that Free-tier content may be used to improve its products. Do not send confidential student records, personal identifiers, private exam materials or other sensitive content through this tier unless the data-use terms are acceptable. The application currently sends question text and any selected source context to the configured provider. For sensitive academic content, keep `AI_ENABLED=false` until a suitable data-processing arrangement is in place.

References:
- [Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)
- [Gemini API pricing and free tier](https://ai.google.dev/gemini-api/docs/pricing)
- [Available regions](https://ai.google.dev/gemini-api/docs/available-regions)

This is an optional owner-controlled configuration. No API key is created or stored by this repository, and AI remains disabled until the owner adds the key and explicitly sets `AI_ENABLED=true`.
