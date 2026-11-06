import { describe, expect, it } from "vitest";
import type { SeasonalRule } from "../availability/seasonal.ts";
import { travelTime } from "../travel/travel-time.ts";
import {
  DEFAULT_DAY_WINDOW,
  scheduleDay,
  type DayPlan,
  type SchedulablePlace,
  type StopInput,
} from "./schedule.ts";

const t = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// 2026-11-09 is a Monday.
const MONDAY = "2026-11-09";
const KM_PER_DEGREE_LAT = 111.195;

/** A Place in Rome, `kmNorth` km north of a fixed point. Open every day, 1 hour visit by default. */
const place = (
  id: string,
  overrides: Partial<SchedulablePlace> & { kmNorth?: number } = {},
): SchedulablePlace => {
  const { kmNorth = 0, ...rest } = overrides;
  return {
    id,
    latitude: 41.9 + kmNorth / KM_PER_DEGREE_LAT,
    longitude: 12.5,
    city: "Rome",
    hours: "Daily 0:00-24:00",
    hours_status: "known",
    duration_minutes: 60,
    ...rest,
  };
};

const stop = (p: SchedulablePlace, rules: SeasonalRule[] = []): StopInput => ({
  place: p,
  rules,
});

const plan = (
  stops: StopInput[],
  overrides: Partial<DayPlan> = {},
): DayPlan => ({
  date: MONDAY,
  window: DEFAULT_DAY_WINDOW,
  mode: "public-transport",
  stops,
  ...overrides,
});

describe("scheduleDay", () => {
  describe("timing", () => {
    it("returns an empty day that 'ends' at the window start", () => {
      expect(scheduleDay(plan([]))).toEqual({
        stops: [],
        endsAt: t("9:00"),
        warningCount: 0,
      });
    });

    it("starts the first Stop at the window start, with no travel", () => {
      const [first] = scheduleDay(plan([stop(place("a"))])).stops;
      expect(first).toMatchObject({
        placeId: "a",
        travel: null,
        arrive: t("9:00"),
        start: t("9:00"),
        end: t("10:00"),
        warnings: [],
      });
    });

    it("starts each Stop when the previous one ends, plus Travel Time", () => {
      const a = place("a");
      const b = place("b", { kmNorth: 3 });
      const day = scheduleDay(plan([stop(a), stop(b)]));
      const travel = travelTime(a, b, "public-transport");

      expect(day.stops[1].travel).toEqual(travel);
      expect(day.stops[1].arrive).toBe(t("10:00") + travel.minutes);
      expect(day.endsAt).toBe(t("11:00") + travel.minutes);
    });

    it("uses the Transport Mode for Travel Time", () => {
      const a = place("a");
      const b = place("b", { kmNorth: 30 });
      const car = scheduleDay(plan([stop(a), stop(b)], { mode: "rental-car" }));
      expect(car.stops[1].travel).toEqual(travelTime(a, b, "rental-car"));
    });

    it("uses the visit duration, or 60 minutes when it is missing", () => {
      const day = scheduleDay(
        plan([
          stop(place("a", { duration_minutes: 90 })),
          stop(place("b", { duration_minutes: null })),
        ]),
      );
      expect(day.stops[0].end).toBe(t("10:30"));
      expect(day.stops[1].end).toBe(t("11:30"));
    });

    it("respects a custom Day Window", () => {
      const day = scheduleDay(
        plan([stop(place("a"))], {
          window: { start: t("8:00"), end: t("20:00") },
        }),
      );
      expect(day.stops[0].start).toBe(t("8:00"));
    });
  });

  describe("notBefore (e.g. dinner from 19:00)", () => {
    it("holds the visit until notBefore", () => {
      const [first] = scheduleDay(
        plan([{ ...stop(place("dinner")), notBefore: t("19:00") }]),
      ).stops;
      expect(first).toMatchObject({
        arrive: t("9:00"),
        start: t("19:00"),
        warnings: [],
      });
    });

    it("has no effect when you arrive later anyway", () => {
      const day = scheduleDay(
        plan([
          stop(place("long", { duration_minutes: 11 * 60 })), // 9:00-20:00
          { ...stop(place("dinner")), notBefore: t("19:00") },
        ]),
      );
      expect(day.stops[1].start).toBe(t("20:00"));
    });

    it("still waits for opening time if the Place opens after notBefore", () => {
      const [first] = scheduleDay(
        plan([
          {
            ...stop(place("dinner", { hours: "19:30-23:00" })),
            notBefore: t("19:00"),
          },
        ]),
      ).stops;
      expect(first.start).toBe(t("19:30"));
    });
  });

  describe("waiting for opening time", () => {
    it("starts the visit when the Place opens, if you arrive early", () => {
      const [first] = scheduleDay(
        plan([stop(place("a", { hours: "10:00-18:00" }))]),
      ).stops;
      expect(first).toMatchObject({
        arrive: t("9:00"),
        start: t("10:00"),
        end: t("11:00"),
        warnings: [],
      });
    });

    it("waits for the next opening after a midday break", () => {
      const day = scheduleDay(
        plan([
          stop(place("long", { duration_minutes: 6 * 60 })), // 9:00-15:00
          stop(place("dinner", { hours: "12:00-14:30, 19:00-22:30" })),
        ]),
      );
      expect(day.stops[1]).toMatchObject({
        arrive: t("15:00"),
        start: t("19:00"),
        warnings: [],
      });
    });

    it("handles hours that run past midnight", () => {
      const day = scheduleDay(
        plan(
          [
            stop(place("late", { duration_minutes: 14 * 60 + 30 })), // 9:00-23:30
            stop(place("bar", { hours: "19:30-02:00" })),
          ],
          { window: { start: t("9:00"), end: t("26:00") } },
        ),
      );
      expect(day.stops[1]).toMatchObject({ start: t("23:30"), warnings: [] });
    });
  });

  describe("warnings", () => {
    it("warns when the Place is closed that weekday", () => {
      const [first] = scheduleDay(
        plan([stop(place("a", { hours: "Tue-Sun 9:00-18:00" }))]),
      ).stops;
      expect(first.warnings).toEqual([{ kind: "closed", reason: "weekday" }]);
      expect(first.start).toBe(first.arrive); // no waiting for a closed Place
    });

    it("warns when the Place is out of season", () => {
      const [first] = scheduleDay(
        plan([stop(place("a"), [{ kind: "months", from: 4, to: 10 }])]),
      ).stops;
      expect(first.warnings).toEqual([{ kind: "closed", reason: "season" }]);
    });

    it("warns when you arrive after it has closed for the day", () => {
      const day = scheduleDay(
        plan([
          stop(place("long", { duration_minutes: 4 * 60 })), // 9:00-13:00
          stop(place("morning", { hours: "8:00-12:00" })),
        ]),
      );
      expect(day.stops[1].warnings).toEqual([
        {
          kind: "closed-on-arrival",
          arrivesAt: t("13:00"),
          closedAt: t("12:00"),
        },
      ]);
    });

    it("warns when the visit runs past closing time", () => {
      const day = scheduleDay(
        plan([
          stop(place("long", { duration_minutes: 8 * 60 })), // 9:00-17:00
          stop(place("museum", { hours: "9:00-18:00", duration_minutes: 120 })),
        ]),
      );
      expect(day.stops[1].warnings).toEqual([
        { kind: "past-closing", endsAt: t("19:00"), closesAt: t("18:00") },
      ]);
    });

    it("never warns about hours it doesn't know", () => {
      const [first] = scheduleDay(
        plan([stop(place("a", { hours: null, hours_status: "unknown" }))]),
      ).stops;
      expect(first.availability).toEqual({ kind: "unknown" });
      expect(first.warnings).toEqual([]);
    });

    it("warns when travel from the previous Stop is over the limit", () => {
      const a = place("a");
      const b = place("b", { kmNorth: 50, duration_minutes: 240 }); // regional, ~105 min
      const day = scheduleDay(plan([stop(a), stop(b)]));
      expect(day.stops[1].warnings).toEqual([
        {
          kind: "long-travel",
          minutes: travelTime(a, b, "public-transport").minutes,
          reason: "over-limit",
        },
      ]);
    });

    it("warns when travel takes longer than the visit itself", () => {
      // 3 km in-city is ~26 min; the visit is 15 min.
      const day = scheduleDay(
        plan([
          stop(place("a")),
          stop(place("b", { kmNorth: 3, duration_minutes: 15 })),
        ]),
      );
      expect(day.stops[1].warnings).toEqual([
        expect.objectContaining({
          kind: "long-travel",
          reason: "longer-than-visit",
        }),
      ]);
    });

    it("does not warn for a short walk to a longer visit", () => {
      const day = scheduleDay(
        plan([stop(place("a")), stop(place("b", { kmNorth: 0.5 }))]),
      );
      expect(day.stops[1].warnings).toEqual([]);
    });

    it("warns on the last Stop only when the day runs past the window", () => {
      const day = scheduleDay(
        plan([
          stop(place("a", { duration_minutes: 13 * 60 })), // 9:00-22:00
          stop(place("b")), // 22:00-23:00
        ]),
      );
      expect(day.stops[0].warnings).toEqual([]);
      expect(day.stops[1].warnings).toEqual([
        { kind: "past-day-window", endsAt: t("23:00"), windowEnd: t("22:30") },
      ]);
    });

    it("does not warn when the day ends exactly at the window end", () => {
      const day = scheduleDay(
        plan([stop(place("a", { duration_minutes: 13 * 60 + 30 }))]), // 9:00-22:30
      );
      expect(day.stops[0].warnings).toEqual([]);
    });

    it("counts every Warning on the day", () => {
      const day = scheduleDay(
        plan([
          stop(place("closed", { hours: "Tue-Sun 9:00-18:00" })),
          stop(place("far", { kmNorth: 50, duration_minutes: 12 * 60 })),
        ]),
      );
      // closed + long travel + past day window
      expect(day.warningCount).toBe(3);
    });
  });
});
