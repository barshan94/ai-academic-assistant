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
  return (
    <form action={updateQuestionClassification} className="review-form classification-form">
      <input type="hidden" name="questionId" value={question.id} />
      <div className="question-fields">
        <label>Reference syllabus version
          <select name="catalogId" defaultValue={question.syllabus_catalog_id ?? ""}>
            <option value="">Use manual labels below</option>
            {catalogs.map((catalog) => (
              <option key={catalog.id} value={catalog.id}>
                {catalog.board} · {catalog.qualification} · {catalog.subject} · {catalog.version} ({catalog.status})
              </option>
            ))}
          </select>
        </label>
        <label>Chapter reference
          <select name="chapterId" defaultValue={question.syllabus_chapter_id ?? ""}>
            <option value="">No chapter selected</option>
            {chapters.map((chapter) => {
              const catalog = catalogs.find((item) => item.id === chapter.catalog_id);
              return <option key={chapter.id} value={chapter.id}>
                {(catalog ? catalog.subject + " · " + catalog.version + " · " : "")}
                {chapter.chapter_code ? chapter.chapter_code + " · " : ""}{chapter.title}
              </option>;
            })}
          </select>
        </label>
        <label>Topic reference
          <select name="topicId" defaultValue={question.syllabus_topic_id ?? ""}>
            <option value="">No topic selected</option>
            {topics.map((topic) => {
              const chapter = chapters.find((item) => item.id === topic.chapter_id);
              const catalog = catalogs.find((item) => item.id === chapter?.catalog_id);
              return <option key={topic.id} value={topic.id}>
                {(catalog ? catalog.subject + " · " : "")}
                {chapter?.title ?? "Chapter"} · {topic.topic_code ? topic.topic_code + " · " : ""}{topic.title}
              </option>;
            })}
          </select>
        </label>
      </div>
      <p className="question-card-meta">Selecting a structured version fills board, qualification, subject and version from your catalogue. Chapter options show their version; choose one from the selected version. A catalogue must be verified before its mapping can be confirmed. To use manual labels, clear the version, chapter and topic selections first.</p>
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
