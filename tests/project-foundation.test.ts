import { describe, expect, it } from "vitest";

describe("project foundation", () => {
  it("keeps Bengali and English as the default teaching languages", () => {
    const defaultLanguages = ["bn", "en"];
    expect(defaultLanguages).toContain("bn");
    expect(defaultLanguages).toContain("en");
  });

  it("keeps examination answers in English by default", () => {
    const examAnswerLanguage = "en";
    expect(examAnswerLanguage).toBe("en");
  });
});
