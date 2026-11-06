export function getExtractionStructureWarning(sourcePageCount: number | null, extractedPageCount: number) {
  if (
    sourcePageCount === null
    || !Number.isInteger(sourcePageCount)
    || sourcePageCount < 1
    || !Number.isInteger(extractedPageCount)
    || extractedPageCount < 0
    || extractedPageCount === sourcePageCount
  ) {
    return null;
  }

  return `The original PDF has ${sourcePageCount} pages, but extraction produced ${extractedPageCount} review page(s). Google Docs text export may not preserve page breaks. This does not prove text is missing, but page-by-page alignment is unavailable: compare all extracted text with the original PDF before approving it.`;
}
