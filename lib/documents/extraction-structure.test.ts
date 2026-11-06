import { describe, expect, it } from "vitest";
import { getExtractionStructureWarning } from "@/lib/documents/extraction-structure";

describe("extraction structure warning", () => {
  it("warns when fewer review pages are produced than the original PDF page count", () => {
    expect(getExtractionStructureWarning(12, 1)).toContain("original PDF has 12 pages");
    expect(getExtractionStructureWarning(12, 1)).toContain("page-by-page alignment is unavailable");
  });

  it("does not warn when extracted and source page counts match", () => {
    expect(getExtractionStructureWarning(3, 3)).toBeNull();
  });

  it("does not invent a source page count when metadata is unavailable", () => {
    expect(getExtractionStructureWarning(null, 1)).toBeNull();
  });

  it("rejects invalid page counts without producing a warning", () => {
    expect(getExtractionStructureWarning(0, 0)).toBeNull();
    expect(getExtractionStructureWarning(4, -1)).toBeNull();
    expect(getExtractionStructureWarning(4, 1.5)).toBeNull();
  });
});
