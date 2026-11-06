# AI and release limitations

## AI provider configuration
The AI assistant uses an OpenAI-compatible chat-completions endpoint. Configure these server-only environment variables in the Vercel project (Production and Preview as needed):
- `AI_BASE_URL`: provider API base URL (without the `/chat/completions` suffix).
- `AI_API_KEY`: provider key; never expose it with a `NEXT_PUBLIC_` prefix.
- `AI_MODEL`: model identifier enabled for that key.

Free-only setup: Google AI Studio provides API keys for Gemini models and an OpenAI-compatible endpoint. Use the current endpoint and model shown in the provider's official AI Studio documentation, then set the key as a Secret. Confirm free-tier eligibility, rate limits and regional availability in your own account. The repository and Vercel project currently have no `AI_BASE_URL`, `AI_API_KEY` or `AI_MODEL` configured. The application does not silently fall back to paid inference; missing configuration returns HTTP 503.

## Safety and correctness
- Generated content is labelled unverified and is not teacher-approved.
- Syllabus classification is a suggestion; verify board, qualification, chapter and topic against the official current syllabus.
- Chapter notes and revision sets use only approved questions in the user's own library. They do not prove syllabus completeness.
- A bounded scanner checks only explicit one-step arithmetic equalities printed in the answer. It does not validate symbolic algebra, multi-step derivations, dimensional analysis, units, OCR diagrams, or marking-scheme accuracy. A passing scan is not full verification.
- Generated outputs are persisted in an owner-scoped table with arithmetic-check evidence and a teacher review state. They remain unverified until reviewed. Approval is blocked when the explicit arithmetic scanner finds a failed equality; a passing scan still does not prove correctness.

## Remaining release gates
1. Add a free-quota provider endpoint, API key and model to Vercel Production/Preview; then run authenticated end-to-end generation tests.
2. Configure an OpenAI-compatible provider with a free quota and verify real authenticated generation; no provider credentials are stored in the repository.
3. Implement broader deterministic mathematics/physics checks with tests and explicit unsupported-case handling; the current scanner is intentionally narrow.
4. Validate syllabus metadata against official board specifications and record syllabus versions.
5. Exercise Drive OAuth, upload, OCR, correction and disconnect using the actual owner account.
6. Complete restore/recovery, accessibility, mobile-device and production security checks before public release.
7. CI currently passes (install, production dependency audit, lint, type-check, tests and production build) on commit `3b9da033ee45113ab0589b12fc47180fec9ac62c`. Obtain a successful Vercel deployment when the build limit permits.
