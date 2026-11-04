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

  it("does not mistake readable variable-heavy mathematics for OCR noise", () => {
    expect(assessOcrTextQuality("Let x = 2, y = 3, and z = 4. Find x + y + z. Explain your answer using the values given above and show each calculation clearly.")).toBe("likely_readable");
  });

  it("accepts ordinary English and Bengali text as likely readable", () => {
    expect(assessOcrTextQuality("Question 1: Explain how the surface area of a cylinder is calculated.")).toBe("likely_readable");
    expect(assessOcrTextQuality("প্রশ্ন ১: একটি সিলিন্ডারের বক্রতলের ক্ষেত্রফল কীভাবে নির্ণয় করবে?")).toBe("likely_readable");
  });
});
