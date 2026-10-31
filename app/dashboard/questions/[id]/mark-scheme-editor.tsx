"use client";

import { useState } from "react";
import { saveQuestionSolutionMarkScheme } from "./actions";

type PointDraft = {
  id: string;
  description: string;
  keyPhrases: string;
  marks: string;
};

export function MarkSchemeEditor({ solutionId, board, qualification, subject }: {
  solutionId: string;
  board: string;
  qualification: string;
  subject: string;
}) {
  const [points, setPoints] = useState<PointDraft[]>([
    { id: "M1", description: "", keyPhrases: "", marks: "1" },
  ]);

  const updatePoint = (index: number, field: keyof PointDraft, value: string) => {
    setPoints((current) => current.map((point, pointIndex) =>
      pointIndex === index ? { ...point, [field]: value } : point,
    ));
  };

  const addPoint = () => {
    setPoints((current) => current.length >= 80 ? current : [
      ...current,
      { id: "M" + (current.length + 1), description: "", keyPhrases: "", marks: "1" },
    ]);
  };

  const removePoint = (index: number) => {
    setPoints((current) => current.length <= 1 ? current : current.filter((_, pointIndex) => pointIndex !== index));
  };

  const serializedPoints = JSON.stringify(points.map((point) => ({
    id: point.id.trim(),
    description: point.description.trim(),
    keyPhrases: point.keyPhrases.split("\n").map((phrase) => phrase.trim()).filter(Boolean),
    ...(point.marks.trim() === "" ? {} : { marks: Number(point.marks) }),
  })));

  return (
    <form action={saveQuestionSolutionMarkScheme} className="review-form">
      <input type="hidden" name="solutionId" value={solutionId} />
      <label htmlFor="mark-scheme-title">Mark scheme title</label>
      <input id="mark-scheme-title" name="title" required maxLength={200} placeholder="Exact title from your source" />
      <label htmlFor="mark-scheme-board">Awarding body</label>
      <input id="mark-scheme-board" name="awardingBody" required maxLength={100} defaultValue={board} />
      <label htmlFor="mark-scheme-qualification">Qualification</label>
      <input id="mark-scheme-qualification" name="qualification" required maxLength={100} defaultValue={qualification} />
      <label htmlFor="mark-scheme-subject">Subject</label>
      <input id="mark-scheme-subject" name="subject" required maxLength={100} defaultValue={subject} />
      <label htmlFor="mark-scheme-paper">Paper reference (optional)</label>
      <input id="mark-scheme-paper" name="paperReference" maxLength={100} />
      <label htmlFor="mark-scheme-url">HTTPS source URL</label>
      <input id="mark-scheme-url" name="sourceUrl" type="url" required placeholder="https://..." />
      <input type="hidden" name="points" value={serializedPoints} />
      <div className="classification-suggestions">
        <h4>Mark points</h4>
        <p className="question-card-meta">Add each point exactly as recorded in the source. Enter one or more literal key phrases, one per line. Leave marks blank if the source does not specify them.</p>
        {points.map((point, index) => (
          <fieldset className="question-fields" key={index}>
            <legend>Point {index + 1}</legend>
            <label>Point ID
              <input value={point.id} required maxLength={40} onChange={(event) => updatePoint(index, "id", event.target.value)} />
            </label>
            <label>Description
              <textarea value={point.description} required maxLength={1000} rows={2} onChange={(event) => updatePoint(index, "description", event.target.value)} />
            </label>
            <label>Key phrases (one per line)
              <textarea value={point.keyPhrases} maxLength={1600} rows={3} placeholder={"e.g. resultant force\nacceleration is proportional"} onChange={(event) => updatePoint(index, "keyPhrases", event.target.value)} />
            </label>
            <label>Marks listed in source
              <input type="number" min="0" max="20" step="1" value={point.marks} onChange={(event) => updatePoint(index, "marks", event.target.value)} />
            </label>
            <button type="button" className="secondary-action" disabled={points.length <= 1} onClick={() => removePoint(index)}>Remove point</button>
          </fieldset>
        ))}
        <button type="button" className="secondary-action" disabled={points.length >= 80} onClick={addPoint}>Add mark point</button>
      </div>
      <p className="question-card-meta">The server validates every point and rejects duplicate IDs, invalid marks, and unsupported source URLs. Phrase matching remains a review aid only; it never awards marks.</p>
      <button className="primary-action" type="submit">Save mark scheme reference →</button>
    </form>
  );
}
