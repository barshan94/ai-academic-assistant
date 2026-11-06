export const MAX_SOURCE_CONTEXT_CHARS = 8000;

export type SourcePageContext = {
  pageNumber: number;
  extractionMethod: "pdf_text" | "ocr" | "manual";
  text: string;
};

export function prepareSourcePageContext(input: {
  pageNumber: number;
  extractionMethod: string | null;
  extractedText: string | null;
}): SourcePageContext {
  const text = input.extractedText?.trim() ?? "";
  if (!Number.isInteger(input.pageNumber) || input.pageNumber < 1) {
    throw new Error("SOURCE_PAGE_INVALID");
  }
  if (!text) throw new Error("SOURCE_CONTEXT_EMPTY");
  if (input.extractionMethod !== "pdf_text" && input.extractionMethod !== "ocr" && input.extractionMethod !== "manual") {
    throw new Error("SOURCE_METHOD_INVALID");
  }
  return {
    pageNumber: input.pageNumber,
    extractionMethod: input.extractionMethod,
    text: text.slice(0, MAX_SOURCE_CONTEXT_CHARS),
  };
}
