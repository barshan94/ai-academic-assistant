# AI and release limitations

## AI provider configuration
The AI assistant uses an OpenAI-compatible chat-completions endpoint. Configure these server-only environment variables in the deployment:
- `AI_BASE_URL`: provider API base URL (without the `/chat/completions` suffix).
- `AI_API_KEY`: provider key; never expose it with a `NEXT_PUBLIC_` prefix.
- `AI_MODEL`: model identifier enabled for that key.

Use a provider/model with a free quota. Provider free tiers, model availability and rate limits can change. The application does not silently fall back to paid inference. Missing configuration returns HTTP 503.

## Safety and correctness
- Generated content is labelled unverified and is not teacher-approved.
- Syllabus classification is a suggestion; verify board, qualification, chapter and topic against the official current syllabus.
- Chapter notes and revision sets use only approved questions in the user's own library. They do not prove syllabus completeness.
- A bounded scanner checks only explicit one-step arithmetic equalities printed in the answer. It does not validate symbolic algebra, multi-step derivations, dimensional analysis, units, OCR diagrams, or marking-scheme accuracy. A passing scan is not full verification.
- Generated outputs are persisted in an owner-scoped table with arithmetic-check evidence and a teacher review state. They remain unverified until reviewed.

## Remaining release gates
1. Configure a provider with a suitable free quota and run authenticated end-to-end tests.
2. Add durable solution history and teacher correction/versioning.
3. Implement deterministic mathematics/physics checks with tests and explicit unsupported-case handling.
4. Validate syllabus metadata against official board specifications.
5. Exercise Drive OAuth, upload, OCR, correction and disconnect using the actual owner account.
6. Complete restore/recovery, accessibility, mobile-device and production security checks before public release.


CI acceptance: this change exists to trigger the repository's full lint, type-check, test and production-build workflow against the AI workspace changes.
