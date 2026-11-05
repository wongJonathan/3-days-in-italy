import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatMonth,
  formatTime,
  formatWeekday,
  parseTimeInput,
} from "./format.ts";

describe("formatDate", () => {
  it("shows the weekday, day and month", () => {
    expect(formatDate("2026-11-06")).toBe("Fri 6 Nov");
    expect(formatDate("2027-01-01")).toBe("Fri 1 Jan");
  });
});

describe("formatWeekday / formatMonth", () => {
  it("spells them out", () => {
    expect(formatWeekday("2026-11-08")).toBe("Sunday");
    expect(formatMonth("2026-11-08")).toBe("November");
  });
});

describe("formatTime", () => {
  it("pads to HH:MM", () => {
    expect(formatTime(570)).toBe("09:30");
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(1350)).toBe("22:30");
  });

  it("wraps times past midnight", () => {
    expect(formatTime(1440)).toBe("00:00");
    expect(formatTime(1500)).toBe("01:00");
  });
});

describe("parseTimeInput", () => {
  it("reads an <input type=time> value as minutes", () => {
    expect(parseTimeInput("09:30")).toBe(570);
    expect(parseTimeInput("22:30")).toBe(1350);
  });

  it("returns null for an empty or invalid value", () => {
    expect(parseTimeInput("")).toBeNull();
    expect(parseTimeInput("25:00")).toBeNull();
    expect(parseTimeInput("nope")).toBeNull();
  });
});
