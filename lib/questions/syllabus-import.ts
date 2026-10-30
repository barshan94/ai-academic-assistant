import { z } from "zod";

const importTopicSchema = z.object({
  code: z.string().trim().max(40).optional(),
  title: z.string().trim().min(1).max(160),
  sortOrder: z.number().int().min(0).max(10000).optional(),
}).strict();

const importChapterSchema = z.object({
  code: z.string().trim().max(40).optional(),
  title: z.string().trim().min(1).max(160),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  topics: z.array(importTopicSchema).max(500).default([]),
}).strict();

const importCatalogSchema = z.object({
  board: z.string().trim().min(1).max(100),
  qualification: z.string().trim().min(1).max(100),
  subject: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(80),
  effectiveFrom: z.iso.date().nullable().optional(),
  effectiveTo: z.iso.date().nullable().optional(),
  sourceUrl: z.string().trim().url().refine((value) => {
    try { return new URL(value).protocol === "https:"; }
    catch { return false; }
  }),
  sourceTitle: z.string().trim().max(200).optional(),
}).strict().superRefine((value, context) => {
  if (value.effectiveFrom && value.effectiveTo && value.effectiveTo < value.effectiveFrom) {
    context.addIssue({
      code: "custom",
      path: ["effectiveTo"],
      message: "The end date must not be earlier than the start date.",
    });
  }
});

export const syllabusImportSchema = z.object({
  formatVersion: z.literal(1),
  catalog: importCatalogSchema,
  chapters: z.array(importChapterSchema).max(300),
}).strict().superRefine((value, context) => {
  const chapterNames = new Set<string>();
  let topicCount = 0;

  value.chapters.forEach((chapter, chapterIndex) => {
    const normalizedChapter = chapter.title.toLocaleLowerCase();
    if (chapterNames.has(normalizedChapter)) {
      context.addIssue({
        code: "custom",
        path: ["chapters", chapterIndex, "title"],
        message: "Chapter titles must be unique within a syllabus version.",
      });
    }
    chapterNames.add(normalizedChapter);

    const topicNames = new Set<string>();
    chapter.topics.forEach((topic, topicIndex) => {
      topicCount += 1;
      const normalizedTopic = topic.title.toLocaleLowerCase();
      if (topicNames.has(normalizedTopic)) {
        context.addIssue({
          code: "custom",
          path: ["chapters", chapterIndex, "topics", topicIndex, "title"],
          message: "Topic titles must be unique within a chapter.",
        });
      }
      topicNames.add(normalizedTopic);
    });
  });

  if (topicCount > 3000) {
    context.addIssue({
      code: "custom",
      path: ["chapters"],
      message: "A syllabus import may contain at most 3000 topics.",
    });
  }
});

export type SyllabusImportPayload = z.infer<typeof syllabusImportSchema>;

export function parseSyllabusImportText(raw: string) {
  if (new TextEncoder().encode(raw).byteLength > 512_000) {
    return { success: false as const, error: "The import document exceeds the 512 KB limit." };
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { success: false as const, error: "The import is not valid JSON." };
  }

  const parsed = syllabusImportSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "The import document is invalid.",
    };
  }

  return { success: true as const, data: parsed.data };
}
