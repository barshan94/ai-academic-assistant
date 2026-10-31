"use client";

export function PrintPracticeButton() {
  return <button className="document-action practice-print-control" type="button" onClick={() => window.print()}>Print / Save as PDF</button>;
}
