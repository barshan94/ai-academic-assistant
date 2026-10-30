import { describe, expect, it } from "vitest";
import { questionClassificationSchema } from "@/lib/questions/classification";

const base = {
  questionId: "d2719c3a-2a77-4f1b-9b65-3d70d7a3a010",
  catalogId: "",
  chapterId: "",
  topicId: "",
  board: "Pearson Edexcel",
  qualification: "International GCSE",
  subject: "Physics",
  syllabusVersion: "4PH1 (2025–2027)",
  chapter: "Forces",
  topic: "Moments",
  classificationStatus: "confirmed",
  classificationConfidence: "0.95",
};

describe("question syllabus classification", () => {
  it("accepts a complete confirmed syllabus mapping", () => {
    const result = questionClassificationSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.classificationConfidence).toBe(0.95);
  });

  it("does not allow an incomplete mapping to be marked confirmed", () => {
    const result = questionClassificationSchema.safeParse({
      ...base,
      syllabusVersion: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows uncertain or unreviewed mappings to retain missing metadata", () => {
    expect(questionClassificationSchema.safeParse({
      ...base,
      board: "",
      qualification: "",
      subject: "",
      syllabusVersion: "",
      classificationStatus: "uncertain",
      classificationConfidence: "",
    }).success).toBe(true);
  });

  it("rejects confidence values outside the zero-to-one range", () => {
    expect(questionClassificationSchema.safeParse({
      ...base,
      classificationConfidence: "1.1",
    }).success).toBe(false);
    expect(questionClassificationSchema.safeParse({
      ...base,
      classificationConfidence: "-0.1",
    }).success).toBe(false);
  });

  it("accepts a confirmed mapping from a selected structured syllabus catalogue", () => {
    const result = questionClassificationSchema.safeParse({
      ...base,
      catalogId: "d2719c3a-2a77-4f1b-9b65-3d70d7a3a011",
      board: "",
      qualification: "",
      subject: "",
      syllabusVersion: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a chapter without a selected syllabus catalogue", () => {
    expect(questionClassificationSchema.safeParse({
      ...base,
      chapterId: "d2719c3a-2a77-4f1b-9b65-3d70d7a3a012",
    }).success).toBe(false);
  });

  it("rejects a topic without a selected chapter", () => {
    expect(questionClassificationSchema.safeParse({
      ...base,
      catalogId: "d2719c3a-2a77-4f1b-9b65-3d70d7a3a011",
      topicId: "d2719c3a-2a77-4f1b-9b65-3d70d7a3a013",
    }).success).toBe(false);
  });

  it("rejects malformed question IDs and unsupported review states", () => {
    expect(questionClassificationSchema.safeParse({
      ...base,
      questionId: "not-a-uuid",
    }).success).toBe(false);
    expect(questionClassificationSchema.safeParse({
      ...base,
      classificationStatus: "approved",
    }).success).toBe(false);
  });
});
