import { describe, expect, it } from "vitest";
import { assessOcrTextQuality } from "@/lib/documents/ocr-quality";

describe("assess OCR text quality", () => {
  it("flags empty and very short extraction", () => {
    expect(assessOcrTextQuality("")).toBe("needs_correction");
    expect(assessOcrTextQuality("x y z")).toBe("needs_correction");
  });

  it("flags text dominated by single-character fragments", () => {
    expect(assessOcrTextQuality("Question 1 a b c d e f g h i j k l m n o p q r s t u v w x y z")).toBe("needs_correction");
  });

  it("flags unexpected mixed-script noise in otherwise Latin OCR", () => {
    expect(assessOcrTextQuality("Questio\u043b 1: Explain how the surface area of a cylinder is calculated.")).toBe("needs_correction");
  });

  it("flags readable OCR when textbook table row and column relationships were flattened", () => {
    const flattenedExerciseTable = [
      "solid object radius vertical height curved surface area total surface area",
      "(a) sphere 3 cm *",
      "(b) cylinder 4 cm 5 cm *",
      "(c) cone 6 cm 8 cm *",
      "(d) cylinder 0.7 m 1 m *",
    ].join("\n");

    expect(assessOcrTextQuality(flattenedExerciseTable)).toBe("needs_correction");
  });

  it("does not flag a table when explicit column separators survived extraction", () => {
    const tabSeparatedTable = [
      "solid object\tradius\tvertical height\tcurved surface area\ttotal surface area",
      "(a)\tsphere\t3 cm\t*\t",
      "(b)\tcylinder\t4 cm\t5 cm\t*",
      "(c)\tcone\t6 cm\t8 cm\t*",
    ].join("\n");

    expect(assessOcrTextQuality(tabSeparatedTable)).toBe("likely_readable");
  });

  it("does not mistake readable variable-heavy mathematics for OCR noise", () => {
    expect(assessOcrTextQuality("Let x = 2, y = 3, and z = 4. Find x + y + z. Explain your answer using the values given above and show each calculation clearly.")).toBe("likely_readable");
  });

  it("accepts ordinary English and Bengali text as likely readable", () => {
    expect(assessOcrTextQuality("Question 1: Explain how the surface area of a cylinder is calculated.")).toBe("likely_readable");
    expect(assessOcrTextQuality("প্রশ্ন ১: একটি সিলিন্ডারের বক্রতলের ক্ষেত্রফল কীভাবে নির্ণয় করবে?")).toBe("likely_readable");
  });
});
