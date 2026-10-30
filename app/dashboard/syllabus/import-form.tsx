import { importSyllabusCatalog } from "./actions";

const example = `{
  "formatVersion": 1,
  "catalog": {
    "board": "REPLACE WITH EXAM BOARD",
    "qualification": "REPLACE WITH QUALIFICATION",
    "subject": "REPLACE WITH SUBJECT",
    "version": "REPLACE WITH EXACT SYLLABUS VERSION",
    "effectiveFrom": null,
    "effectiveTo": null,
    "sourceUrl": "https://REPLACE-WITH-OFFICIAL-SOURCE",
    "sourceTitle": "Official specification title"
  },
  "chapters": [
    {
      "code": "1",
      "title": "REPLACE WITH CHAPTER TITLE",
      "sortOrder": 1,
      "topics": [
        {
          "code": "1.1",
          "title": "REPLACE WITH TOPIC TITLE",
          "sortOrder": 1
        }
      ]
    }
  ]
}`;

export function SyllabusImportForm() {
  return (
    <details className="syllabus-import-panel">
      <summary>Import a syllabus from JSON</summary>
      <p className="question-card-meta">
        Import a complete chapter/topic structure in one atomic operation. The document must include a real HTTPS source.
        Imported versions always start as drafts; importing does not verify that the content matches the official specification.
      </p>
      <form action={importSyllabusCatalog} className="review-form">
        <label htmlFor="syllabus-json-import">Syllabus JSON (maximum 512 KB)</label>
        <textarea
          id="syllabus-json-import"
          name="payload"
          required
          rows={18}
          maxLength={512000}
          defaultValue={example}
          spellCheck={false}
          className="syllabus-json-input"
        />
        <button className="primary-action" type="submit">Validate and import syllabus →</button>
      </form>
      <p className="question-card-meta">Format version 1 · Up to 300 chapters and 3,000 topics · Duplicate chapter/topic titles are rejected · No existing catalogue is overwritten.</p>
    </details>
  );
}
