# Zero-cost operating mode

This project can run its deterministic study workflows without an AI API subscription or paid search provider. The application must be deployed within the free quotas of its existing hosting, Supabase and Google account. Free tiers have limits and can change; this document does not promise unlimited usage.

## Required environment behavior

Set:

```dotenv
AI_ENABLED=false
AI_ALLOW_PROVIDER_FALLBACKS=false
```

Leave these unset or empty:

```dotenv
AI_API_KEY=
AI_MODEL=
AI_PROVIDER_POOL=
BRAVE_SEARCH_API_KEY=
```

For a strict no-search-provider setup, also unset `WEB_SEARCH_PROVIDER`. The search route will report that web research is not configured rather than calling a provider.

The server-side Supabase and Google Drive OAuth credentials are still required for the hosted cloud-storage workflows. They are not AI subscriptions. Use the existing Supabase Free project and an existing Google account/Drive; do not create another database or enable a paid Supabase plan.

## Features available without AI-provider spend

- Owner-authored question bank, syllabus catalogues, classification/review and source-linked chapter notes.
- Offline chapter-note drafts assembled deterministically from up to 12 approved questions and their extracted source pages. Candidate expressions retain source references and are not claimed to be correct formulas.
- Browser-only chapter practice sessions with source-order or shuffled questions, a private working/answer area, attempted tracking, self-assessed confidence and progress. Learners can export a plain-text answer sheet locally without uploading their work. All working and progress remain in component memory only; they are not sent to the server or persisted and disappear when the session ends or page reloads.
- Manual worked examples, summaries, revision prompts and note revisions.
- Formula syntax warnings, printing and note export already provided by the workspace.
- Existing document upload/OCR workflow, subject to Google Drive, hosting and Supabase free-tier quotas.

## Features intentionally unavailable in strict zero-cost mode

- AI-generated solutions, Bengali/English AI explanations, AI-generated worked examples and AI-generated chapter notes.
- Provider-based web research.
- Automatic AI grading or claims that an extracted formula or answer is correct.

These features fail closed while `AI_ENABLED=false`; a key being present is not enough to enable provider calls. No fallback provider is contacted.

## Academic integrity

Offline extraction is not an AI tutor and is not a mark-scheme verifier. OCR can misread symbols, indices, diagrams and mathematical notation. Check every extracted page against its original PDF and have a teacher review content before treating it as a trusted revision resource.

## Cost controls

- Do not add paid provider keys or provider pools.
- Keep AI fallbacks disabled.
- Do not configure a search-provider key.
- Stay within the existing free hosting/database/storage quotas; monitor quota dashboards and pause uploads/workers if a quota is reached.
- Do not create a second database for backup. Keep source PDFs in the existing Google Drive account and export important notes through the existing download/print controls.
