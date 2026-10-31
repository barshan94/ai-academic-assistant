export function canSafelyReplaceExtractedPages(input: {
  questionReferences: number;
  chapterNoteReferences: number;
}) {
  return input.questionReferences === 0 && input.chapterNoteReferences === 0;
}
