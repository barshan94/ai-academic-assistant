import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSyllabusImportText } from "../lib/questions/syllabus-import";

const physics = readFileSync(
  new URL("../data/syllabus-imports/cambridge-o-level-physics-5054-2026-2028.json", import.meta.url),
  "utf8",
);
const chemistry = readFileSync(
  new URL("../data/syllabus-imports/cambridge-o-level-chemistry-5070-2026-2028.json", import.meta.url),
  "utf8",
);

describe("bundled Cambridge O Level syllabus chapter-index drafts", () => {
  it("validates the Physics 5054 2026–2028 chapter index as a private draft import", () => {
    const parsed = parseSyllabusImportText(physics);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.catalog.board).toBe("Cambridge International");
    expect(parsed.data.catalog.qualification).toBe("Cambridge O Level");
    expect(parsed.data.catalog.version).toContain("5054");
    expect(parsed.data.chapters).toHaveLength(6);
    expect(parsed.data.chapters.map((chapter) => chapter.title)).toEqual([
      "Motion, forces and energy",
      "Thermal physics",
      "Waves",
      "Electricity and magnetism",
      "Nuclear physics",
      "Space physics",
    ]);
    expect(parsed.data.chapters.every((chapter) => chapter.topics.length === 0)).toBe(true);
  });

  it("validates the Chemistry 5070 2026–2028 chapter index as a private draft import", () => {
    const parsed = parseSyllabusImportText(chemistry);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.catalog.board).toBe("Cambridge International");
    expect(parsed.data.catalog.qualification).toBe("Cambridge O Level");
    expect(parsed.data.catalog.version).toContain("5070");
    expect(parsed.data.chapters).toHaveLength(12);
    expect(parsed.data.chapters[0]?.title).toBe("States of matter");
    expect(parsed.data.chapters[11]?.title).toBe("Experimental techniques and chemical analysis");
    expect(parsed.data.chapters.every((chapter) => chapter.topics.length === 0)).toBe(true);
  });
});
