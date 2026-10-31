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

## Planned application work

1. Add an owner-only chapter workspace with version history.
2. Build a retrieval layer that selects approved questions and their source pages for a specific chapter.
3. Generate draft notes with explicit question/page citations and a clear evidence-coverage report.
4. Require owner review before approval; reprocessing always creates a new version.
5. Add deterministic checks for formula consistency and citation completeness before presenting a draft.

No sample syllabus, question or note content is seeded. Live AI generation remains disabled until a provider is explicitly configured and its cost is approved.
