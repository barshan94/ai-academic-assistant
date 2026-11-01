# Syllabus JSON import format

The syllabus catalogue supports a versioned JSON import so a complete chapter/topic hierarchy can be loaded in one transaction instead of entering every row manually.

## Important accuracy rule

An import is **always created as a draft**. Supplying a URL does not prove that the URL is official, that the file is current, or that the imported chapter structure matches it. The owner must inspect the source and imported structure before explicitly marking the version verified.

The current importer creates a private catalogue for the signed-in owner. It is not yet a shared, centrally curated board dataset.

## Format version 1

```json
{
  "formatVersion": 1,
  "catalog": {
    "board": "Exact exam board",
    "qualification": "Exact qualification",
    "subject": "Subject name",
    "version": "Exact specification/version",
    "effectiveFrom": null,
    "effectiveTo": null,
    "sourceUrl": "https://official-board-domain.example/specification",
    "sourceTitle": "Official specification title"
  },
  "chapters": [
    {
      "code": "1",
      "title": "Chapter title",
      "sortOrder": 1,
      "topics": [
        {
          "code": "1.1",
          "title": "Topic title",
          "sortOrder": 1
        }
      ]
    }
  ]
}
```

Replace every illustrative value with data checked against the actual board specification. Use ISO dates (`YYYY-MM-DD`) or `null`. Chapter codes, topic codes, order and topic arrays are optional; titles are required.

## Validation and safety

- Maximum JSON document size: 512 KB.
- Maximum 300 chapters and 3,000 topics in total.
- Maximum 500 topics in one chapter.
- Chapter titles must be unique within a version; topic titles must be unique within a chapter (case-insensitive).
- Source URL must be HTTPS.
- Unknown properties and unsupported format versions are rejected.
- A duplicate version or duplicate chapter/topic causes the complete import to roll back. No partial hierarchy is saved.
- The database derives `owner_id` from the authenticated Supabase identity; it is never accepted from the JSON.
- Imports cannot set `verified` status or a source-check timestamp.
- The importer does not fetch external URLs. This avoids server-side request forgery and keeps source verification an explicit human step.

## Future extensions

CSV and official-board-specific import adapters can be added after this stable format has been exercised. A centrally maintained dataset needs separate editorial provenance, version-update and correction workflows; it should not be conflated with private user imports.


## Bundled topic-index drafts

The repository includes two illustrative-but-source-checked private import drafts under `data/syllabus-imports/`:

- Cambridge O Level Physics 5054, 2026–2028, Version 2.
- Cambridge O Level Chemistry 5070, 2026–2028, Version 1.

They contain the official top-level content chapters and numbered topic-section headings transcribed from the official syllabus PDFs. They do not reproduce the detailed learning objectives beneath each heading and are not a substitute for the complete syllabus. They do not constitute a centrally curated shared reference dataset, and must remain drafts until a curator checks every chapter and topic against the current official source and confirms qualification availability for the relevant administrative zone. Recheck the PDFs before each exam cycle.


### Pearson Edexcel International GCSE draft imports

Two additional owner-private topic-index drafts are available:
- Physics 4PH1, linear 2017 specification, Issue 4 (September 2024).
- Chemistry 4CH1, linear 2017 specification, Issue 3 (September 2024).

Pearson's September 2026 update confirms that the linear 2017 International GCSE science specifications remain unchanged for students starting courses in September 2026. The imports contain topic-section headings only, not the detailed bullet-point learning objectives. Official PDFs are linked in the JSON metadata and in `data/syllabus-imports/README.md`.


## Database-enforced lifecycle

Private catalogue lifecycle transitions are enforced by PostgreSQL, not only by the dashboard action. New catalogues must begin as drafts. A draft can remain a draft, be retired, or be verified; verification requires an HTTPS source URL, a non-empty source title and at least one chapter. PostgreSQL generates `source_checked_at` during the verification transition, so clients cannot pre-date or forge that timestamp. Catalogue ownership cannot be transferred. Verified catalogues can only remain verified or be retired, and the existing metadata guard prevents changes to their syllabus identity and provenance. Retired catalogues reject all further updates.

The database cannot establish that a URL is genuinely published by an exam board or that the syllabus transcription is accurate. A human still has to inspect the source. The database enforces recorded provenance and lifecycle invariants, not factual certification.
