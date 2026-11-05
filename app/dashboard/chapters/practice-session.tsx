"use client";

import { useMemo, useState } from "react";
import { getPracticeProgress, shufflePracticeQuestions, type PracticeQuestion } from "@/lib/chapters/practice-session";

export default function PracticeSession({ questions }: { questions: PracticeQuestion[] }) {
  const [queue, setQueue] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [attempted, setAttempted] = useState<Set<string>>(() => new Set());
  const [started, setStarted] = useState(false);

  const progress = useMemo(() => getPracticeProgress(queue.length, attempted, queue), [queue, attempted]);
  const current = queue[index];

  function start(shuffle: boolean) {
    const next = shuffle ? shufflePracticeQuestions(questions) : [...questions];
    setQueue(next);
    setIndex(0);
    setAttempted(new Set());
    setStarted(true);
  }

  function toggleAttempted() {
    if (!current) return;
    setAttempted((previous) => {
      const next = new Set(previous);
      if (next.has(current.id)) next.delete(current.id);
      else next.add(current.id);
      return next;
    });
  }

  if (!questions.length) return null;

  return (
    <section className="chapter-practice-session" aria-label="Free question practice">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ZERO-COST ACTIVE RECALL</p>
          <h4>Practice this chapter</h4>
        </div>
        <span className="section-count">{questions.length} approved questions</span>
      </div>
      {!started ? (
        <div className="hero-actions">
          <button className="document-action" type="button" onClick={() => start(false)}>Practice in source order</button>
          <button className="document-action" type="button" onClick={() => start(true)}>Shuffle practice</button>
          <p className="question-card-meta">Runs entirely in this browser session. No AI provider, API request, or paid service. Your attempts are not saved to the account.</p>
        </div>
      ) : current ? (
        <div className="chapter-practice-card">
          <div className="question-card-heading">
            <span className="document-status">Question {index + 1} of {queue.length}</span>
            <span className="question-card-meta">{progress.attempted}/{progress.total} attempted · {progress.remaining} remaining</span>
          </div>
          <div className="chapter-practice-progress" role="progressbar" aria-label="Practice progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
            <span style={{ width: progress.percent + "%" }} />
          </div>
          <p className="chapter-practice-question">{current.questionNumber ? current.questionNumber + ". " : ""}{current.questionText}</p>
          <p className="question-card-meta">Try it on paper first. This practice mode does not reveal or invent a solution.</p>
          <div className="hero-actions">
            <button className="document-action" type="button" onClick={toggleAttempted} aria-pressed={attempted.has(current.id)}>
              {attempted.has(current.id) ? "Unmark attempted" : "Mark attempted"}
            </button>
            <button className="document-action" type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>Previous</button>
            <button className="primary-action" type="button" disabled={index >= queue.length - 1} onClick={() => setIndex((value) => Math.min(queue.length - 1, value + 1))}>Next question →</button>
          </div>
          {progress.remaining === 0 ? <p className="notice notice-info" role="status">Every question has been marked attempted. Review your working against the original source material.</p> : null}
          {index === queue.length - 1 ? <button className="sign-in-link" type="button" onClick={() => { setStarted(false); setQueue([]); setAttempted(new Set()); setIndex(0); }}>End session</button> : null}
        </div>
      ) : null}
    </section>
  );
}
