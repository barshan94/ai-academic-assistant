"use client";

import { buildChapterNoteMarkdown, chapterNoteMarkdownFilename, type ChapterNoteExportContent } from "@/lib/notes/chapter-note-export";

export default function DownloadChapterNoteButton({ title, content }: { title: string; content: ChapterNoteExportContent }) {
  function download() {
    const blob = new Blob([buildChapterNoteMarkdown(title, content)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = chapterNoteMarkdownFilename(title);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button className="document-action" type="button" onClick={download}>Download note · Markdown</button>;
}
