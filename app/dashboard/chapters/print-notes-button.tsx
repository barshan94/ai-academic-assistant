"use client";

export default function PrintNotesButton({ noteId }: { noteId?: string }) {
  return (
    <button className="document-action note-print-control" type="button" onClick={() => {
      if (!noteId) {
        window.print();
        return;
      }
      document.body.dataset.printNote = noteId;
      const clearTarget = () => {
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
