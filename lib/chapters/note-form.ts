import { z } from "zod";

const noteSchema = z.object({
  catalogId: z.string().uuid(),
  chapterId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(4000),
  concepts: z.string().max(8000),
  formulas: z.string().max(5000),
  workedExamples: z.string().max(10000),
  revisionPrompts: z.string().max(5000),
  questionIds: z.array(z.string().uuid()).max(20),
  documentPageIds: z.array(z.string().uuid()).max(20),
  supersedesId: z.union([z.string().uuid(), z.literal("")]),
});

const generationSchema = z.object({
  catalogId: z.string().uuid(),
  chapterId: z.string().uuid(),
  supersedesId: z.union([z.string().uuid(), z.literal("")]),
});

const statusSchema = z.object({
  noteId: z.string().uuid(),
  status: z.enum(["approved", "archived"]),
});

export function parseChapterNoteDraftInput(input: unknown) {
  return noteSchema.safeParse(input);
}

export function parseChapterNoteGenerationInput(input: unknown) {
  return generationSchema.safeParse(input);
}

export function parseChapterNoteStatusInput(input: unknown) {
  return statusSchema.safeParse(input);
}
