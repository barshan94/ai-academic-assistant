# Chapter intelligence and note versioning

This module establishes the persistence and safety contract for M6. It deliberately does not generate or publish notes automatically.

## Data model

- `chapter_note_versions` stores one immutable content snapshot for one owner, syllabus catalogue and chapter.
- Revisions are new rows with increasing chapter-local version numbers. `supersedes_id` links a revision to the prior note.
- `content_json` is a bounded JSON object so the application can later store structured summaries, concepts, formula cards, worked examples and revision prompts without losing structure.
- `chapter_note_sources` records the exact owner-owned question or document page used by a note. It stores references and optional locators, not copied source documents or OCR text.

## Approval and safety

- New notes must be drafts. AI output must never be marked approved on insert.
- A note cannot be approved until at least one source reference exists.
- Note content and source references are immutable. Corrections create a new version; sources are append-only.
- Only the owner can read or write their notes. Teacher access is not inherited from question-level sharing.
- Authenticated users can update only the note status. The database trigger controls approval metadata and allowed transitions.
- These records are not official exam-board material. Approval means owner-reviewed, not independently certified.

## Implemented application work

1. An owner-only chapter workspace lists syllabus chapters, approved linked questions, source pages and immutable note-version history.
2. Retrieval selects up to 12 approved questions classified to the selected chapter and loads only their owner-linked extracted pages.
3. AI drafting produces a structured, unverified note with explicit question/page source references. Citation-like labels are checked against the supplied source keys and required in factual note sections; this is structural validation, not proof that a source supports a claim.
4. Manual and AI draft forms can start a new note series or explicitly supersede an existing version. The owner-scoped database function verifies the revision target belongs to the same owner, catalogue and chapter, assigns the next chapter-local version number under an advisory transaction lock, and stores an immutable supersedes link.
5. Approval remains an explicit owner action and revalidates that sources are still approved and correctly classified. AI notes remain marked unverified.
6. Formula syntax warnings flag selected malformed patterns; they do not establish mathematical or dimensional correctness.
7. Source previews, standalone Markdown download and browser print/save-as-PDF are available. Automated browser acceptance of downloads and print layout remains outstanding.

## Remaining acceptance

- Configure and run a live AI provider with explicit cost approval; grade source quality and subject accuracy independently.
- Verify AI revision selection, version sequencing and approval behavior in an authenticated browser workflow.
- Review whether a future evidence-coverage report should distinguish cited claims, uncited background explanations and claims with weak source support.

No sample syllabus, question or note content is seeded. Live AI generation remains blocked until a provider is explicitly configured and its cost is approved.
