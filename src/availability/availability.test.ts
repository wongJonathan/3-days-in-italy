import { describe, expect, it } from "vitest";
import type { CleanPlace } from "../data/place.ts";
import { availabilityOn } from "./availability.ts";
import type { SeasonalRule } from "./seasonal.ts";

type Hours = Pick<CleanPlace, "hours" | "hours_status">;
const known = (hours: string): Hours => ({ hours, hours_status: "known" });

// 2026-11-09 is a Monday, 2026-11-08 a Sunday.
const MONDAY = "2026-11-09";
const SUNDAY = "2026-11-08";

describe("availabilityOn", () => {
  it("is open with that weekday's hours", () => {
    expect(availabilityOn(known("Mon-Sat 9:00-18:00"), [], MONDAY)).toEqual({
      kind: "open",
      ranges: [{ open: 540, close: 1080 }],
      hoursStatus: "known",
    });
  });

  it("is closed on a weekday the hours leave out", () => {
    expect(availabilityOn(known("Mon-Sat 9:00-18:00"), [], SUNDAY)).toEqual({
      kind: "closed",
      reason: "weekday",
    });
  });

  it("passes an assumed Hours Status through", () => {
    const result = availabilityOn(
      { hours: "Daily 0:00-24:00", hours_status: "assumed" },
      [],
      MONDAY,
    );
    expect(result).toMatchObject({ kind: "open", hoursStatus: "assumed" });
  });

  describe("vague phrases become assumed hours", () => {
    it('reads "Evenings" as 18:00-24:00', () => {
      expect(
        availabilityOn(
          { hours: "Evenings", hours_status: "assumed" },
          [],
          MONDAY,
        ),
      ).toEqual({
        kind: "open",
        ranges: [{ open: 1080, close: 1440 }],
        hoursStatus: "assumed",
      });
    });

    it('reads "Morning only" as 08:00-12:00', () => {
      expect(
        availabilityOn(
          { hours: "Morning only", hours_status: "assumed" },
          [],
          MONDAY,
        ),
      ).toEqual({
        kind: "open",
        ranges: [{ open: 480, close: 720 }],
        hoursStatus: "assumed",
      });
    });
  });

  it("is unknown when there are no hours", () => {
    expect(
      availabilityOn({ hours: null, hours_status: "unknown" }, [], MONDAY),
    ).toEqual({ kind: "unknown" });
  });

  describe("seasonal rules", () => {
    const aprilToOctober: SeasonalRule[] = [
      { kind: "months", from: 4, to: 10 },
    ];

    it("is closed out of season, even when the hours say open", () => {
      expect(
        availabilityOn(known("9:00-19:00"), aprilToOctober, "2026-11-10"),
      ).toEqual({
        kind: "closed",
        reason: "season",
      });
    });

    it("is closed out of season even when the hours are unknown", () => {
      expect(
        availabilityOn(
          { hours: null, hours_status: "unknown" },
          [{ kind: "months", from: 10, to: 10 }],
          "2026-07-01",
        ),
      ).toEqual({ kind: "closed", reason: "season" });
    });

    it("is open in season", () => {
      expect(
        availabilityOn(known("9:00-19:00"), aprilToOctober, "2026-05-10"),
      ).toMatchObject({ kind: "open" });
    });

    it("uses seasonal hours in their months", () => {
      const rules: SeasonalRule[] = [
        { kind: "hours-in-months", from: 6, to: 8, hours: "8:15-19:30" },
      ];
      expect(
        availabilityOn(known("8:15-16:30"), rules, "2026-07-14"),
      ).toMatchObject({
        ranges: [{ open: 495, close: 1170 }],
      });
      expect(
        availabilityOn(known("8:15-16:30"), rules, "2026-11-10"),
      ).toMatchObject({
        ranges: [{ open: 495, close: 990 }],
      });
    });

    it("checks the season before the weekday", () => {
      // Brera: weekends only, and only the 3rd weekend. The 2nd Saturday is out of season.
      const brera: SeasonalRule[] = [{ kind: "nth-weekend", n: 3 }];
      expect(
        availabilityOn(known("Sat-Sun 9:00-19:00"), brera, "2026-11-14"),
      ).toEqual({
        kind: "closed",
        reason: "season",
      });
      expect(
        availabilityOn(known("Sat-Sun 9:00-19:00"), brera, "2026-11-21"),
      ).toMatchObject({ kind: "open" });
    });
  });
});
