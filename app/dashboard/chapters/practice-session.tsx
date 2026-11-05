"use client";

import { useMemo, useState } from "react";
import { buildPracticeAnswerSheet, getPracticeProgress, shufflePracticeQuestions, type PracticeQuestion } from "@/lib/chapters/practice-session";

export default function PracticeSession({ questions, chapterTitle }: { questions: PracticeQuestion[]; chapterTitle: string }) {
  const [queue, setQueue] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [attempted, setAttempted] = useState<Set<string>>(() => new Set());
  const [confident, setConfident] = useState<Set<string>>(() => new Set());
  const [working, setWorking] = useState<Record<string, string>>({});
  const [started, setStarted] = useState(false);

  const progress = useMemo(() => getPracticeProgress(queue.length, attempted, queue, confident), [queue, attempted, confident]);
  const current = queue[index];

  function start(shuffle: boolean) {
    const next = shuffle ? shufflePracticeQuestions(questions) : [...questions];
    setQueue(next);
    setIndex(0);
    setAttempted(new Set());
    setConfident(new Set());
    setWorking({});
    setStarted(true);
  }

  function exportAnswerSheet() {
    const content = buildPracticeAnswerSheet(chapterTitle, queue, working, attempted, confident);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = chapterTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "chapter";
    anchor.href = url;
    anchor.download = `${safeName}-practice-answers.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function toggleAttempted() {
    if (!current) return;
    const wasAttempted = attempted.has(current.id);
    setAttempted((previous) => {
      const next = new Set(previous);
      if (wasAttempted) next.delete(current.id);
      else next.add(current.id);
      return next;
    });
    if (wasAttempted) {
      setConfident((previous) => {
        const next = new Set(previous);
        next.delete(current.id);
        return next;
      });
    }
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
          <label className="practice-working-label">Your working / answer (kept only in this browser session; export before ending)
            <textarea rows={5} value={working[current.id] ?? ""} onChange={(event) => setWorking((previous) => ({ ...previous, [current.id]: event.target.value }))} placeholder="Write your method, calculations and final answer here. Nothing is uploaded or saved." />
          </label>
          <p className="question-card-meta">No AI solution is generated. Compare your working with your original source or teacher&apos;s mark scheme.</p>
          <p className="question-card-meta">{progress.confident} confident · {progress.needsReview} marked for more practice</p>
          <div className="hero-actions">
            <button className="document-action" type="button" onClick={() => {
              setAttempted((previous) => new Set(previous).add(current.id));
              setConfident((previous) => { const next = new Set(previous); next.delete(current.id); return next; });
            }}>Need more practice</button>
            <button className="document-action" type="button" onClick={() => {
              setAttempted((previous) => new Set(previous).add(current.id));
              setConfident((previous) => new Set(previous).add(current.id));
            }}>I can solve this</button>
            <button className="document-action" type="button" onClick={toggleAttempted} aria-pressed={attempted.has(current.id)}>
              {attempted.has(current.id) ? "Unmark attempted" : "Mark attempted"}
            </button>
            <button className="document-action" type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>Previous</button>
            <button className="primary-action" type="button" disabled={index >= queue.length - 1} onClick={() => setIndex((value) => Math.min(queue.length - 1, value + 1))}>Next question →</button>
          </div>
          {progress.remaining === 0 ? <p className="notice notice-info" role="status">Every question has been marked attempted. Your self-assessment shows {progress.confident} confident and {progress.needsReview} needing more practice. Review your working against the original source material.</p> : null}
          <div className="hero-actions"><button className="document-action" type="button" onClick={exportAnswerSheet}>Export my working (.txt)</button></div>
          <button className="sign-in-link" type="button" onClick={() => { setStarted(false); setQueue([]); setAttempted(new Set()); setConfident(new Set()); setWorking({}); setIndex(0); }}>End session</button>
        </div>
      ) : null}
    </section>
  );
}
