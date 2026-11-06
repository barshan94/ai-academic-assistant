"use client";

import { useState } from "react";

type Question = { id: string; question_text: string; subject: string | null; chapter: string | null; review_status: string };
type Task = "solve" | "classify" | "chapter_notes" | "revision_set";
type Solution = { id: string; task_type: string; prompt_text: string; output_text: string; review_status: string; created_at: string };

export default function SolverWorkspace({ questions, solutions }: { questions: Question[]; solutions: Solution[] }) {
  const [task, setTask] = useState<Task>("solve");
  const [questionId, setQuestionId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [language, setLanguage] = useState<"english" | "bengali" | "both">("both");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(solutions);
  const [reviewing, setReviewing] = useState("");

  async function review(id: string, status: "approved" | "rejected") {
    setReviewing(id); setError("");
    try {
      const response = await fetch("/api/ai/solutions/" + id + "/review", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not save review.");
      setHistory((items) => items.map((item) => item.id === id ? { ...item, review_status: status } : item));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Review failed."); }
    finally { setReviewing(""); }
  }

  async function run() {
    setBusy(true); setError(""); setResult("");
    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, questionId: questionId || undefined, questionText: questionText || undefined, subject: subject || undefined, chapter: chapter || undefined, language, count: 8 }),
      });
      const payload = await response.json() as { answer?: string; error?: string; reviewNotice?: string };
      if (!response.ok) throw new Error(payload.error || "Request failed.");
      setResult((payload.answer || "No answer returned.") + "

" + (payload.reviewNotice || ""));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally { setBusy(false); }
  }

  return (
    <section className="section solver-layout">
      <div className="solver-panel">
        <label htmlFor="solver-task">What do you want to do?</label>
        <select id="solver-task" value={task} onChange={(event) => { setTask(event.target.value as Task); setResult(""); }}>
          <option value="solve">Solve a question</option>
          <option value="classify">Classify subject and syllabus topic</option>
          <option value="chapter_notes">Build chapter notes from approved questions</option>
          <option value="revision_set">Create an exam revision set</option>
        </select>
        {(task === "solve" || task === "classify") && <>
          <label htmlFor="solver-question">Saved question</label>
          <select id="solver-question" value={questionId} onChange={(event) => setQuestionId(event.target.value)}>
            <option value="">Use typed question instead</option>
            {questions.map((question) => <option key={question.id} value={question.id}>{question.subject || "Unclassified"} · {question.question_text.slice(0, 90)}</option>)}
          </select>
          <label htmlFor="solver-text">Question text</label>
          <textarea id="solver-text" rows={6} value={questionText} onChange={(event) => setQuestionText(event.target.value)} placeholder="Paste the question here if it is not saved in your library." />
        </>}
        {(task === "chapter_notes" || task === "revision_set") && <>
          <label htmlFor="solver-subject">Subject (optional exact filter)</label>
          <input id="solver-subject" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Physics" />
          <label htmlFor="solver-chapter">Chapter (optional exact filter)</label>
          <input id="solver-chapter" value={chapter} onChange={(event) => setChapter(event.target.value)} placeholder="e.g. Forces and motion" />
        </>}
        <label htmlFor="solver-language">Explanation language</label>
        <select id="solver-language" value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>
          <option value="both">English exam answer + Bengali teaching explanation</option>
          <option value="english">English</option>
          <option value="bengali">বাংলা</option>
        </select>
        <button className="primary-action" type="button" onClick={run} disabled={busy}>{busy ? "Working…" : "Generate"}</button>
        {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      </div>
      <div className="solver-result" aria-live="polite">
        <div className="section-heading"><div><p className="eyebrow">GENERATED OUTPUT</p><h2>Working answer</h2></div><span className="document-status">Unverified</span></div>
        {result ? <pre className="solver-output">{result}</pre> : <div className="empty-state"><h3>No generated output yet</h3><p>Choose a task and generate an answer. Outputs are not saved as verified solutions; check them against your textbook and marking scheme.</p></div>}
      </div>
    </section>
  );
}
