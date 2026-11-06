"use client";

export default function PrintNotesButton({ noteId }: { noteId?: string }) {
  return (
    <button className="document-action note-print-control" type="button" onClick={() => {
      if (!noteId) {
        window.print();
        return;
      }
      const target = document.querySelector<HTMLElement>(`.chapter-note-version[data-note-id="${noteId}"]`);
      if (!target) return;
      target.classList.add("print-selected-note");
      document.body.dataset.printNote = noteId;
      const clearTarget = () => {
        target.classList.remove("print-selected-note");
        delete document.body.dataset.printNote;
        window.removeEventListener("afterprint", clearTarget);
      };
      window.addEventListener("afterprint", clearTarget);
      window.print();
    }}>
      {noteId ? "Export this note · Save as PDF" : "Print all notes · Save as PDF"}
    </button>
  );
}
