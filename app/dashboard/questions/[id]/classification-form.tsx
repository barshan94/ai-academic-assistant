import { updateQuestionClassification } from "./classification-actions";

type ClassificationQuestion = {
  id: string;
  board: string | null;
  qualification: string | null;
  subject: string | null;
  syllabus_version: string | null;
  chapter: string | null;
  topic: string | null;
  classification_status: "unreviewed" | "confirmed" | "uncertain";
  classification_confidence: number | null;
};

export function ClassificationForm({ question }: { question: ClassificationQuestion }) {
  return (
    <form action={updateQuestionClassification} className="review-form classification-form">
      <input type="hidden" name="questionId" value={question.id} />
      <div className="question-fields">
        <label>Exam board
          <input name="board" defaultValue={question.board ?? ""} maxLength={100} placeholder="e.g. Pearson Edexcel" />
        </label>
        <label>Qualification
          <input name="qualification" defaultValue={question.qualification ?? ""} maxLength={100} placeholder="e.g. International GCSE" />
        </label>
        <label>Subject
          <input name="subject" defaultValue={question.subject ?? ""} maxLength={120} placeholder="e.g. Physics" />
        </label>
        <label>Syllabus version
          <input name="syllabusVersion" defaultValue={question.syllabus_version ?? ""} maxLength={80} placeholder="e.g. 4PH1 (2025–2027)" />
        </label>
        <label>Chapter
          <input name="chapter" defaultValue={question.chapter ?? ""} maxLength={160} placeholder="Chapter name or number" />
        </label>
        <label>Topic
          <input name="topic" defaultValue={question.topic ?? ""} maxLength={160} placeholder="Specific topic" />
        </label>
      </div>
      <label htmlFor="classification-status">Classification review state</label>
      <select id="classification-status" name="classificationStatus" defaultValue={question.classification_status}>
        <option value="unreviewed">Not yet reviewed</option>
        <option value="uncertain">Uncertain — needs checking</option>
        <option value="confirmed">Confirmed by owner</option>
      </select>
      <label htmlFor="classification-confidence">Classifier confidence (optional, 0–1)</label>
      <input id="classification-confidence" name="classificationConfidence" type="number" min="0" max="1" step="0.01" defaultValue={question.classification_confidence ?? ""} placeholder="Leave blank if unknown" />
      <p className="question-card-meta">Only mark a mapping confirmed after checking the official board, qualification and syllabus version. Confidence is a separate numeric estimate, not a substitute for human review.</p>
      <button className="primary-action" type="submit">Save syllabus classification →</button>
    </form>
  );
}
