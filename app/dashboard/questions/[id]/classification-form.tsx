"use client";

import { useState } from "react";
import { updateQuestionClassification } from "./classification-actions";

type ClassificationQuestion = {
  id: string;
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

export function ClassificationForm({
  question,
  catalogs,
  chapters,
  topics,
}: {
  question: ClassificationQuestion;
  catalogs: CatalogOption[];
  chapters: ChapterOption[];
  topics: TopicOption[];
}) {
  const [selectedCatalogId, setSelectedCatalogId] = useState(question.syllabus_catalog_id ?? "");
  const [selectedChapterId, setSelectedChapterId] = useState(question.syllabus_chapter_id ?? "");
  const availableChapters = chapters.filter((chapter) => chapter.catalog_id === selectedCatalogId);
  const availableTopics = topics.filter((topic) => topic.chapter_id === selectedChapterId);

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
            onChange={(event) => setSelectedChapterId(event.target.value)}
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
          <select name="topicId" defaultValue={question.syllabus_topic_id ?? ""} key={selectedChapterId}
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
