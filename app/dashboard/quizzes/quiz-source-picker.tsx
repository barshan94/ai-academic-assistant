"use client";

import { useState } from "react";
import {
  getPreselectedQuizSourceIds,
  getQuizQuestionsForSubject,
  type QuizSourceQuestion,
  type QuizSourceImportance,
} from "@/lib/quiz-source-selection";

type QuizSourcePickerProps = {
  subjects: string[];
  questions: QuizSourceQuestion[];
  importanceMarks: QuizSourceImportance[];
  defaultSubject: string;
};

export function QuizSourcePicker({
  subjects,
  questions,
  importanceMarks,
  defaultSubject,
}: QuizSourcePickerProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    getPreselectedQuizSourceIds(questions, importanceMarks, defaultSubject),
  );
  const visibleQuestions = getQuizQuestionsForSubject(questions, subject);
  const importanceByQuestion = new Map(
    importanceMarks.map((mark) => [mark.question_id, mark.importance_level]),
  );

  function changeSubject(nextSubject: string) {
    setSubject(nextSubject);
    setSelectedIds(getPreselectedQuizSourceIds(questions, importanceMarks, nextSubject));
  }

  return (
    <>
      <label>
        Subject
        <select
          name="subject"
          required
          value={subject}
          onChange={(event) => changeSubject(event.target.value)}
        >
          {subjects.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="chapter-source-picker">
        <strong>Select 1–20 approved source questions from the selected subject</strong>
        <p className="question-card-meta">
          Only questions from the selected subject are shown. Important questions are preselected first.
          Priority is a teacher&apos;s revision choice, not an exam prediction.
        </p>
        <p className="question-card-meta" aria-live="polite">
          {selectedIds.length} of 20 source questions selected.
        </p>
        {visibleQuestions.length ? visibleQuestions.map((question) => {
          const priority = importanceByQuestion.get(question.id);
          const checked = selectedIds.includes(question.id);
          return (
            <label className="chapter-source-option" key={question.id}>
              <input
                type="checkbox"
                name="questionIds"
                value={question.id}
                checked={checked}
                disabled={!checked && selectedIds.length >= 20}
                onChange={(event) => {
                  const nextChecked = event.target.checked;
                  setSelectedIds((current) => nextChecked
                    ? [...current, question.id]
                    : current.filter((id) => id !== question.id));
                }}
              />
              <span>
                <strong>{question.subject ?? "Unspecified subject"}</strong>
                {question.chapter ? " · " + question.chapter : ""}
                {question.question_number ? " · Q" + question.question_number : ""}
                {priority ? <span className="document-status"> · {priority.toUpperCase()} PRIORITY</span> : null}
                <br />{question.question_text.slice(0, 360)}
              </span>
            </label>
          );
        }) : <p className="question-card-meta">No approved questions are available for this subject.</p>}
      </div>
    </>
  );
}
