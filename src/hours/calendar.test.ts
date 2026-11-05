import { describe, expect, it } from "vitest";
import { addDays, todayInRome, weekdayOf } from "./calendar.ts";

describe("weekdayOf", () => {
  it("returns 0 for Sunday through 6 for Saturday", () => {
    expect(weekdayOf("2026-11-08")).toBe(0); // Sunday
    expect(weekdayOf("2026-11-09")).toBe(1); // Monday
    expect(weekdayOf("2026-11-14")).toBe(6); // Saturday
  });

  it("handles leap days and year boundaries", () => {
    expect(weekdayOf("2028-02-29")).toBe(2); // Tuesday
    expect(weekdayOf("2027-01-01")).toBe(5); // Friday
  });
});

describe("todayInRome", () => {
  it("uses Rome’s date, not UTC: 23:30 UTC in summer is already tomorrow in Rome", () => {
    // Rome is UTC+2 in summer (CEST).
    expect(todayInRome(new Date("2026-07-14T23:30:00Z"))).toBe("2026-07-15");
  });

  it("follows the winter offset: 22:30 UTC is 23:30 the same day in Rome", () => {
    // Rome is UTC+1 in winter (CET).
    expect(todayInRome(new Date("2026-01-14T22:30:00Z"))).toBe("2026-01-14");
    expect(todayInRome(new Date("2026-01-14T23:30:00Z"))).toBe("2026-01-15");
  });
});

describe("addDays", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-09", 1)).toBe("2026-11-10");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });
});
