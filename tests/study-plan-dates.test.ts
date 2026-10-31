import { describe, expect, it } from "vitest";
import { addCalendarDays, dateFromKey, dateKeyInTimeZone, formatCalendarDay, isValidTimeZone, mondayOf } from "@/lib/study-plan-dates";

describe("study plan date handling", () => {
  it("uses the selected timezone to determine today's date", () => {
    const instant = new Date("2026-10-31T18:30:00.000Z");
    expect(dateKeyInTimeZone(instant, "Asia/Dhaka")).toBe("2026-11-01");
    expect(dateKeyInTimeZone(instant, "America/Los_Angeles")).toBe("2026-10-31");
  });

  it("performs date-only arithmetic without daylight-saving or host-timezone drift", () => {
    const sunday = dateFromKey("2026-03-08");
    expect(addCalendarDays(sunday, 1).toISOString()).toBe("2026-03-09T00:00:00.000Z");
    expect(addCalendarDays(sunday, -1).toISOString()).toBe("2026-03-07T00:00:00.000Z");
  });

  it("finds Monday for a Sunday date and formats date-only values consistently", () => {
    const monday = mondayOf(dateFromKey("2026-11-01"));
    expect(monday.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(formatCalendarDay(monday)).toBe("Monday, Oct 26");
  });

  it("rejects invalid timezone identifiers and invalid date keys", () => {
    expect(isValidTimeZone("Asia/Dhaka")).toBe(true);
    expect(isValidTimeZone("Not/A_Timezone")).toBe(false);
    expect(() => dateFromKey("2026-02-30")).toThrow("Invalid calendar date");
    expect(() => dateFromKey("not-a-date")).toThrow("Invalid calendar date");
  });
});
