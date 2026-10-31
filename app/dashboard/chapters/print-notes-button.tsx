"use client";

export default function PrintNotesButton() {
  return (
    <button className="document-action note-print-control" type="button" onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  );
}
