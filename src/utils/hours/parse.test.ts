import { describe, expect, it } from "vitest";
import { parseHours, type OpenRange, type WeekHours } from "./parse.ts";

// '9:30' → 570. Keeps expectations readable.
const t = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const range = (open: string, close: string): OpenRange => ({
  open: t(open),
  close: t(close),
});

const SUN = 0;
const MON = 1;
const TUE = 2;
const WED = 3;
const THU = 4;
const FRI = 5;
const SAT = 6;

// Builds a week where the listed days get `ranges` and every other day is closed.
const weekOn = (days: number[], ranges: OpenRange[]): WeekHours =>
  [0, 1, 2, 3, 4, 5, 6].map((d) => (days.includes(d) ? ranges : []));
const everyDay = (ranges: OpenRange[]): WeekHours =>
  weekOn([0, 1, 2, 3, 4, 5, 6], ranges);

const weekly = (raw: string): WeekHours => {
  const parsed = parseHours(raw);
  if (parsed.kind !== "weekly")
    throw new Error(`expected weekly hours for "${raw}", got ${parsed.kind}`);
  return parsed.week;
};

describe("parseHours", () => {
  describe("no day prefix means every day", () => {
    it("parses a single 24-hour-clock range", () => {
      expect(weekly("9:00-19:00")).toEqual(everyDay([range("9:00", "19:00")]));
    });

    it("parses split hours (lunch and dinner)", () => {
      expect(weekly("12:00-14:30, 19:00-22:30")).toEqual(
        everyDay([range("12:00", "14:30"), range("19:00", "22:30")]),
      );
    });

    it('treats "Daily" the same as no prefix', () => {
      expect(weekly("Daily 10:00-24:00")).toEqual(
        everyDay([range("10:00", "24:00")]),
      );
    });
  });

  describe("12-hour clock", () => {
    it("parses am/pm hours", () => {
      expect(weekly("8am-7pm")).toEqual(everyDay([range("8:00", "19:00")]));
    });

    it("parses am/pm with minutes", () => {
      expect(weekly("9am-12:30pm")).toEqual(everyDay([range("9:00", "12:30")]));
    });

    it("reads 12am as midnight and 12pm as noon", () => {
      expect(weekly("12pm-12am")).toEqual(everyDay([range("12:00", "24:00")]));
    });
  });

  describe("past midnight", () => {
    it("pushes a close earlier than the open into the next day", () => {
      expect(weekly("8:00-01:00")).toEqual(
        everyDay([{ open: t("8:00"), close: t("25:00") }]),
      );
    });

    it("keeps 24:00 as the end of the same day", () => {
      expect(weekly("9:00-24:00")).toEqual(everyDay([range("9:00", "24:00")]));
    });
  });

  describe("day ranges", () => {
    it("closes the days outside the range", () => {
      expect(weekly("Mon-Sat 10:00-18:00")).toEqual(
        weekOn([MON, TUE, WED, THU, FRI, SAT], [range("10:00", "18:00")]),
      );
    });

    it('accepts both "Tue" and "Tues", "Thu" and "Thurs"', () => {
      expect(weekly("Tues-Sun 9:00-19:00")).toEqual(
        weekly("Tue-Sun 9:00-19:00"),
      );
      expect(weekly("Thurs-Sun 9:00-19:00")).toEqual(
        weekly("Thu-Sun 9:00-19:00"),
      );
    });

    it("wraps a range across the weekend (Wed-Mon)", () => {
      expect(weekly("Wed-Mon 10:00-18:00")).toEqual(
        weekOn([WED, THU, FRI, SAT, SUN, MON], [range("10:00", "18:00")]),
      );
    });

    it("applies split hours to every day in the range", () => {
      expect(weekly("Tues-Sat 12:30-14:00, 20:00-22:00")).toEqual(
        weekOn(
          [TUE, WED, THU, FRI, SAT],
          [range("12:30", "14:00"), range("20:00", "22:00")],
        ),
      );
    });
  });

  describe("several day groups", () => {
    it("gives each group its own hours", () => {
      expect(weekly("Mon-Fri 7:00-14:00, Sat 7:00-17:00")).toEqual([
        [],
        [range("7:00", "14:00")],
        [range("7:00", "14:00")],
        [range("7:00", "14:00")],
        [range("7:00", "14:00")],
        [range("7:00", "14:00")],
        [range("7:00", "17:00")],
      ]);
    });

    it("handles a weekday group followed by a Sunday group", () => {
      const week = weekly("Mon-Sat 9:30-17:15, Sun 14:00-17:00");
      expect(week[MON]).toEqual([range("9:30", "17:15")]);
      expect(week[SUN]).toEqual([range("14:00", "17:00")]);
    });

    it('joins a bare day onto the next group ("Tues, Thurs-Sun")', () => {
      expect(weekly("Tues, Thurs-Sun 10:00-18:00")).toEqual(
        weekOn([TUE, THU, FRI, SAT, SUN], [range("10:00", "18:00")]),
      );
    });
  });

  describe("non-weekly values", () => {
    it("reports null as missing", () => {
      expect(parseHours(null)).toEqual({ kind: "missing" });
    });

    it('reports "Evenings" and "Morning only" as vague, ignoring case', () => {
      expect(parseHours("Evenings")).toEqual({
        kind: "vague",
        phrase: "evenings",
      });
      expect(parseHours("morning only")).toEqual({
        kind: "vague",
        phrase: "morning-only",
      });
    });

    it("reports anything else as unrecognized instead of guessing", () => {
      expect(parseHours("By appointment")).toEqual({
        kind: "unrecognized",
        raw: "By appointment",
      });
      expect(parseHours("Mon-Sat")).toEqual({
        kind: "unrecognized",
        raw: "Mon-Sat",
      });
      expect(parseHours("25:00-26:00")).toEqual({
        kind: "unrecognized",
        raw: "25:00-26:00",
      });
      expect(parseHours("9:00-9:00")).toEqual({
        kind: "unrecognized",
        raw: "9:00-9:00",
      });
    });
  });
});
