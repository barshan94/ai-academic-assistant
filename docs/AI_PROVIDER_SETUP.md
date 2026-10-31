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

Fallback is disabled by default. Set `AI_ALLOW_PROVIDER_FALLBACKS=true` only when every configured endpoint is explicitly approved for the possible additional usage charges. When enabled, another provider is attempted after a provider/response failure; invalid local input is never retried against another provider.

The router does not yet estimate per-model token cost or dynamically score quality, latency or historical availability. Priority is a manual owner-controlled choice, not an automatic price optimizer. AI answer and chapter-note request quotas still apply.

Do not enable a paid endpoint or fallback without explicit budget approval. Review each provider's data-processing and retention terms before sending question text or opt-in source context.