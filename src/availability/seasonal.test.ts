import { describe, expect, it } from "vitest";
import { inSeason, seasonalHours, type SeasonalRule } from "./seasonal.ts";

describe("inSeason", () => {
  it("is always true with no rules", () => {
    expect(inSeason([], "2026-01-15")).toBe(true);
  });

  describe("months", () => {
    const aprilToOctober: SeasonalRule[] = [{ kind: "months", from: 4, to: 10 }];

    it("includes the first and last month", () => {
      expect(inSeason(aprilToOctober, "2026-04-01")).toBe(true);
      expect(inSeason(aprilToOctober, "2026-10-31")).toBe(true);
    });

    it("excludes the months just outside", () => {
      expect(inSeason(aprilToOctober, "2026-03-31")).toBe(false);
      expect(inSeason(aprilToOctober, "2026-11-01")).toBe(false);
    });

    it("wraps across the new year (November-March)", () => {
      const winter: SeasonalRule[] = [{ kind: "months", from: 11, to: 3 }];
      expect(inSeason(winter, "2026-12-25")).toBe(true);
      expect(inSeason(winter, "2027-02-01")).toBe(true);
      expect(inSeason(winter, "2026-07-01")).toBe(false);
    });

    it("handles a single month", () => {
      const october: SeasonalRule[] = [{ kind: "months", from: 10, to: 10 }];
      expect(inSeason(october, "2026-10-15")).toBe(true);
      expect(inSeason(october, "2026-09-30")).toBe(false);
    });
  });

  describe("nth-weekend (3rd Saturday of the month and the Sunday after)", () => {
    const third: SeasonalRule[] = [{ kind: "nth-weekend", n: 3 }];

    it("opens on the 3rd Saturday and the Sunday after it", () => {
      // November 2026: Saturdays fall on the 7th, 14th, 21st and 28th.
      expect(inSeason(third, "2026-11-21")).toBe(true);
      expect(inSeason(third, "2026-11-22")).toBe(true);
    });

    it("is closed on other weekends and on weekdays", () => {
      expect(inSeason(third, "2026-11-14")).toBe(false); // 2nd Saturday
      expect(inSeason(third, "2026-11-15")).toBe(false); // Sunday after the 2nd
      expect(inSeason(third, "2026-11-28")).toBe(false); // 4th Saturday
      expect(inSeason(third, "2026-11-20")).toBe(false); // Friday before
    });

    it("works when the month starts on a Saturday", () => {
      // August 2026 starts on Saturday: the 3rd Saturday is the 15th.
      expect(inSeason(third, "2026-08-15")).toBe(true);
      expect(inSeason(third, "2026-08-16")).toBe(true);
      expect(inSeason(third, "2026-08-22")).toBe(false);
    });

    it("does not count a Sunday on the 1st (its Saturday was last month)", () => {
      // November 2026 starts on Sunday.
      expect(inSeason([{ kind: "nth-weekend", n: 1 }], "2026-11-01")).toBe(false);
      expect(inSeason([{ kind: "nth-weekend", n: 1 }], "2026-11-07")).toBe(true);
    });
  });

  it("requires every rule to pass", () => {
    const rules: SeasonalRule[] = [
      { kind: "months", from: 4, to: 10 },
      { kind: "nth-weekend", n: 3 },
    ];
    expect(inSeason(rules, "2026-08-15")).toBe(true);
    expect(inSeason(rules, "2026-11-21")).toBe(false); // right weekend, wrong month
  });

  it("ignores hours-in-months (it changes hours, not the season)", () => {
    expect(
      inSeason([{ kind: "hours-in-months", from: 6, to: 8, hours: "8:15-19:30" }], "2026-01-10"),
    ).toBe(true);
  });
});

describe("seasonalHours", () => {
  const summer: SeasonalRule[] = [{ kind: "hours-in-months", from: 6, to: 8, hours: "8:15-19:30" }];

  it("returns the override inside its months", () => {
    expect(seasonalHours(summer, "2026-07-10")).toBe("8:15-19:30");
  });

  it("returns null outside its months, or with no override", () => {
    expect(seasonalHours(summer, "2026-05-31")).toBeNull();
    expect(seasonalHours([{ kind: "months", from: 4, to: 10 }], "2026-07-10")).toBeNull();
  });
});
