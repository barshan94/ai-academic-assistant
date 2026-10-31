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

describe("bundled Cambridge O Level syllabus topic-index drafts", () => {
  it("validates the Physics 5054 2026–2028 chapter and topic index as a private draft import", () => {
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
    expect(parsed.data.chapters.map((chapter) => chapter.topics.length)).toEqual([17, 9, 7, 17, 8, 5]);
    expect(parsed.data.chapters[0]?.topics[0]).toMatchObject({ code: "1.1", title: "Physical quantities and measurement techniques" });
    expect(parsed.data.chapters[5]?.topics[4]).toMatchObject({ code: "6.2.3", title: "The Universe" });
  });

  it("validates the Chemistry 5070 2026–2028 chapter and topic index as a private draft import", () => {
    const parsed = parseSyllabusImportText(chemistry);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.catalog.board).toBe("Cambridge International");
    expect(parsed.data.catalog.qualification).toBe("Cambridge O Level");
    expect(parsed.data.catalog.version).toContain("5070");
    expect(parsed.data.chapters).toHaveLength(12);
    expect(parsed.data.chapters[0]?.title).toBe("States of matter");
    expect(parsed.data.chapters[11]?.title).toBe("Experimental techniques and chemical analysis");
    expect(parsed.data.chapters.map((chapter) => chapter.topics.length)).toEqual([2, 7, 3, 2, 1, 4, 3, 5, 6, 3, 8, 5]);
    expect(parsed.data.chapters[10]?.topics[7]).toMatchObject({ code: "11.8", title: "Polymers" });
    expect(parsed.data.chapters[11]?.topics[4]).toMatchObject({ code: "12.5", title: "Identification of ions and gases" });
  });
});
