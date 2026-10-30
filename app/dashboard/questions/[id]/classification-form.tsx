"use client";

import { useState } from "react";
import { updateQuestionClassification } from "./classification-actions";
import { rankSyllabusTextMatches } from "@/lib/questions/syllabus-matcher";

type ClassificationQuestion = {
  id: string;
  question_text: string;
  board: string | null;
  qualification: string | null;
  subject: string | null;
  syllabus_version: string | null;
  chapter: string | null;
  topic: string | null;
  syllabus_catalog_id: string | null;
  syllabus_chapter_id: string | null;
  syllabus_topic_id: string | null;
  classification_status: string;
  classification_confidence: number | null;
};

type CatalogOption = {
  id: string;
  board: string;
  qualification: string;
  subject: string;
  version: string;
  status: string;
  source_url: string | null;
  source_title: string | null;
  source_checked_at: string | null;
};

type ChapterOption = {
  id: string;
  catalog_id: string;
  title: string;
  chapter_code: string | null;
};

type TopicOption = {
  id: string;
  chapter_id: string;
  title: string;
  topic_code: string | null;
};

type EvidenceOption = {
  id: string;
  chapter_id: string;
  topic_id: string | null;
  source_url: string;
  source_title: string;
  source_locator: string | null;
  evidence_excerpt: string | null;
  created_at: string;
};

export function ClassificationForm({
  question,
  catalogs,
  chapters,
  topics,
  evidence,
}: {
  question: ClassificationQuestion;
  catalogs: CatalogOption[];
  chapters: ChapterOption[];
  topics: TopicOption[];
  evidence: EvidenceOption[];
}) {
  const [selectedCatalogId, setSelectedCatalogId] = useState(question.syllabus_catalog_id ?? "");
  const [selectedChapterId, setSelectedChapterId] = useState(question.syllabus_chapter_id ?? "");
  const [selectedTopicId, setSelectedTopicId] = useState(question.syllabus_topic_id ?? "");
  const availableChapters = chapters.filter((chapter) => chapter.catalog_id === selectedCatalogId);
  const availableTopics = topics.filter((topic) => topic.chapter_id === selectedChapterId);
  const chapterSuggestions = rankSyllabusTextMatches(question.question_text, availableChapters);
  const topicSuggestions = rankSyllabusTextMatches(question.question_text, availableTopics, 3);
  const selectedEvidence = evidence.filter((item) =>
    item.chapter_id === selectedChapterId &&
    (selectedTopicId ? item.topic_id === selectedTopicId : item.topic_id === null),
  );

  return (
    <form action={updateQuestionClassification} className="review-form classification-form">
      <input type="hidden" name="questionId" value={question.id} />
      <div className="question-fields">
        <label>Reference syllabus version
          <select
            name="catalogId"
            value={selectedCatalogId}
            onChange={(event) => {
              setSelectedCatalogId(event.target.value);
              setSelectedChapterId("");
              setSelectedTopicId("");
            }}
          >
            <option value="">Use manual labels below</option>
            {catalogs.map((catalog) => (
              <option key={catalog.id} value={catalog.id}>
                {catalog.board} · {catalog.qualification} · {catalog.subject} · {catalog.version} ({catalog.status})
              </option>
            ))}
          </select>
        </label>
        <label>Chapter reference
          <select
            name="chapterId"
            value={selectedChapterId}
            disabled={!selectedCatalogId || availableChapters.length === 0}
            onChange={(event) => {
              setSelectedChapterId(event.target.value);
              setSelectedTopicId("");
            }}
          >
            <option value="">No chapter selected</option>
            {availableChapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.chapter_code ? chapter.chapter_code + " · " : ""}{chapter.title}
              </option>
            ))}
          </select>
        </label>
        <label>Topic reference
          <select name="topicId" value={selectedTopicId}
            onChange={(event) => setSelectedTopicId(event.target.value)}
            disabled={!selectedChapterId || availableTopics.length === 0}>
            <option value="">No topic selected</option>
            {availableTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.topic_code ? topic.topic_code + " · " : ""}{topic.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="question-card-meta">Chapter choices are restricted to the selected syllabus version, and topic choices to the selected chapter. Changing the version clears the chapter and topic. A catalogue must be verified before its mapping can be confirmed.</p>
      {selectedCatalogId && selectedChapterId ? (
        <div className="classification-provenance">
          <strong>Selected mapping evidence</strong>
          {selectedEvidence.length ? selectedEvidence.map((item) => (
            <span key={item.id}>
              <a href={item.source_url} target="_blank" rel="noreferrer">{item.source_title} ↗</a>
              {item.source_locator ? " · " + item.source_locator : ""}
              {item.evidence_excerpt ? <small>{item.evidence_excerpt}</small> : null}
            </span>
          )) : <span>No source citation recorded for this exact {selectedTopicId ? "topic" : "chapter"}.</span>}
          <small>Only owner-recorded citations count toward confirmation. The application does not independently certify source authenticity or content.</small>
        </div>
      ) : null}
      {selectedCatalogId ? (() => {
        const selectedCatalog = catalogs.find((catalog) => catalog.id === selectedCatalogId);
        if (!selectedCatalog) return null;
        return (
          <div className="classification-provenance">
            <strong>Catalogue source provenance</strong>
            {selectedCatalog.source_title ? <span>{selectedCatalog.source_title}</span> : <span>Source title not recorded</span>}
            {selectedCatalog.source_url ? <a href={selectedCatalog.source_url} target="_blank" rel="noreferrer">Open source document ↗</a> : <span>No source URL recorded</span>}
            <small>{selectedCatalog.source_checked_at ? "Source checked: " + new Date(selectedCatalog.source_checked_at).toLocaleDateString() : "Source has not been checked by the owner"} · Status: {selectedCatalog.status}</small>
          </div>
        );
      })() : null}
      {selectedCatalogId ? (
        <section className="classification-suggestions" aria-label="Text-match suggestions">
          <h3>Possible chapter matches</h3>
          <p className="question-card-meta">Suggestions are ranked only by shared words between this question and your catalogue labels. They are not AI predictions, official evidence, or probabilities.</p>
          {chapterSuggestions.length ? (
            <ul className="classification-suggestion-list">
              {chapterSuggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <div><strong>{suggestion.title}</strong><span>{suggestion.reasons.join(" · ")}</span></div>
                  <button type="button" className="secondary-action" onClick={() => {
                    setSelectedChapterId(suggestion.id);
                    setSelectedTopicId("");
                  }}>Select chapter</button>
                </li>
              ))}
            </ul>
          ) : <p className="question-card-meta">No meaningful catalogue terms matched. Choose the chapter manually.</p>}
          {selectedChapterId ? (
            <>
              <h3>Possible topic matches</h3>
              {topicSuggestions.length ? (
                <ul className="classification-suggestion-list">
                  {topicSuggestions.map((suggestion) => (
                    <li key={suggestion.id}>
                      <div><strong>{suggestion.title}</strong><span>{suggestion.reasons.join(" · ")}</span></div>
                      <button type="button" className="secondary-action" onClick={() => setSelectedTopicId(suggestion.id)}>Select topic</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="question-card-meta">No meaningful topic terms matched this question.</p>}
            </>
          ) : null}
        </section>
      ) : null}
      <details className="classification-manual">
        <summary>Manual labels (without a structured catalogue)</summary>
        <div className="question-fields">
          <label>Exam board<input name="board" defaultValue={question.board ?? ""} maxLength={100} placeholder="e.g. Pearson Edexcel" /></label>
          <label>Qualification<input name="qualification" defaultValue={question.qualification ?? ""} maxLength={100} placeholder="e.g. International GCSE" /></label>
          <label>Subject<input name="subject" defaultValue={question.subject ?? ""} maxLength={120} placeholder="e.g. Physics" /></label>
          <label>Syllabus version<input name="syllabusVersion" defaultValue={question.syllabus_version ?? ""} maxLength={80} placeholder="Exact specification/version" /></label>
          <label>Chapter<input name="chapter" defaultValue={question.chapter ?? ""} maxLength={160} placeholder="Chapter name or number" /></label>
          <label>Topic<input name="topic" defaultValue={question.topic ?? ""} maxLength={160} placeholder="Specific topic" /></label>
        </div>
      </details>
      <label htmlFor="classification-status">Classification review state</label>
      <select id="classification-status" name="classificationStatus" defaultValue={question.classification_status}>
        <option value="unreviewed">Not yet reviewed</option>
        <option value="uncertain">Uncertain — needs checking</option>
        <option value="confirmed">Confirmed by owner</option>
      </select>
      <label htmlFor="classification-confidence">Classifier confidence (optional, 0–1)</label>
      <input id="classification-confidence" name="classificationConfidence" type="number" min="0" max="1" step="0.01" defaultValue={question.classification_confidence ?? ""} placeholder="Leave blank if unknown" />
      <p className="question-card-meta">Confidence is a separate numeric estimate, not a substitute for human review.</p>
      <button className="primary-action" type="submit">Save syllabus classification →</button>
    </form>
  );
}
