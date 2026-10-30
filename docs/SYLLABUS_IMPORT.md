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
