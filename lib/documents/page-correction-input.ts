import { z } from "zod";

const pageCorrectionInputSchema = z.object({
  pageId: z.string().uuid(),
  documentId: z.string().uuid(),
  extractedText: z.string().trim().min(1).max(50_000),
});

export function parsePageCorrectionInput(input: {
  pageId: unknown;
  documentId: unknown;
  extractedText: unknown;
}) {
  return pageCorrectionInputSchema.safeParse(input);
}
