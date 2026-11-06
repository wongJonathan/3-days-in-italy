// The spec's success criteria, checked as properties over the real dataset:
// whole 3-day Trips generated for a year of Start Dates × several Preference sets.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { availabilityOn } from "../src/utils/availability/availability.ts";
import { rulesFor } from "../src/utils/availability/seasonal-notes.ts";
import type { CleanPlace } from "../src/utils/data/place.ts";
import {
  generateDay,
  MEAL_WINDOWS,
  type GeneratedDay,
} from "../src/utils/generator/generate-day.ts";
import { addDays } from "../src/utils/hours/calendar.ts";
import { baseCityOf } from "../src/utils/preferences/base-cities.ts";
import {
  DEFAULT_PREFERENCES,
  SIGHTS_PER_PACE,
  type Preferences,
} from "../src/utils/preferences/preferences.ts";
import {
  DEFAULT_DAY_WINDOW,
  DEFAULT_VISIT_MINUTES,
  LONG_TRAVEL_MINUTES,
} from "../src/utils/schedule/schedule.ts";

const places = JSON.parse(
  readFileSync(
    new URL("../src/utils/data/italy-clean.json", import.meta.url),
    "utf8",
  ),
) as CleanPlace[];
const byId = new Map(places.map((p) => [p.id, p]));

// Every 9th day for a year: covers every season and, since 9 isn't a multiple
// of 7, every weekday.
const START_DATES = Array.from({ length: 41 }, (_, i) =>
  addDays("2026-11-06", i * 9),
);

const PREFERENCE_SETS: Record<string, Preferences> = {
  "no Preferences": DEFAULT_PREFERENCES,
  "food + wine, €, lunch + dinner": {
    ...DEFAULT_PREFERENCES,
    interests: ["food", "wine"],
    budget: "€",
    lunch: true,
    dinner: true,
  },
  "avoid crowds + historic, packed, car": {
    ...DEFAULT_PREFERENCES,
    interests: ["avoid-crowds", "historic"],
    pace: "packed",
    mode: "rental-car",
  },
  "relaxed, Venice + Milan, dinner": {
    ...DEFAULT_PREFERENCES,
    pace: "relaxed",
    tripArea: ["Venice", "Milan"],
    dinner: true,
  },
  "Must-Sees in 3 cities": {
    ...DEFAULT_PREFERENCES,
    // Uffizi (closed Mondays), Burano, Hard Rock Cafe (rated 2.1)
    mustSees: ["place_026", "place_070", "place_025"],
  },
  "scenic + outdoors, Florence, packed, car, lunch": {
    ...DEFAULT_PREFERENCES,
    interests: ["scenic", "outdoors"],
    tripArea: ["Florence"],
    pace: "packed",
    mode: "rental-car",
    lunch: true,
  },
};

/** Plans a whole Trip one day at a time, the way the app will. */
const planTrip = (start: string, prefs: Preferences): GeneratedDay[] => {
  const generated: GeneratedDay[] = [];
  [0, 1, 2].forEach((dayIndex) => {
    generated.push(
      generateDay({
        date: addDays(start, dayIndex),
        places,
        prefs,
        window: DEFAULT_DAY_WINDOW,
        dayArea: null,
        otherDays: generated.map((g) => g.day),
        kept: [],
      }),
    );
  });
  return generated;
};

const TRIPS = Object.entries(PREFERENCE_SETS).flatMap(([label, prefs]) =>
  START_DATES.map((start) => ({
    label,
    start,
    prefs,
    days: planTrip(start, prefs),
  })),
);

describe(`success criteria over ${TRIPS.length} generated Trips`, () => {
  it("never repeats a Place across Trip Days", () => {
    TRIPS.forEach(({ label, start, days }) => {
      const ids = days.flatMap((d) => d.day.stops.map((s) => s.placeId));
      expect(new Set(ids).size, `${label}, ${start}`).toBe(ids.length);
    });
  });

  it("never breaks a planner rule silently: every broken rule has a matching Warning", () => {
    TRIPS.forEach(({ label, start, days }) => {
      days.forEach(({ day, schedule }) => {
        const where = `${label}, ${start}, ${day.date}`;
        schedule.stops.forEach((s, i) => {
          const place = byId.get(s.placeId)!;
          const kinds = s.warnings.map((w) => w.kind);
          const visit = place.duration_minutes ?? DEFAULT_VISIT_MINUTES;

          // Checked from first principles, not with the scheduler's own logic.
          const availability = availabilityOn(
            place,
            rulesFor(place.id),
            day.date,
          );
          if (availability.kind === "closed") {
            expect(kinds, where).toContain("closed");
          }
          if (availability.kind === "open") {
            const range = availability.ranges.find(
              (r) => s.start >= r.open && s.start < r.close,
            );
            if (!range) expect(kinds, where).toContain("closed-on-arrival");
            else if (s.end > range.close)
              expect(kinds, where).toContain("past-closing");
          }
          if (s.travel && s.travel.minutes > LONG_TRAVEL_MINUTES) {
            expect(kinds, where).toContain("long-travel");
          } else if (s.travel && s.travel.minutes > visit) {
            expect(kinds, where).toContain("long-travel");
          }
          if (
            i === schedule.stops.length - 1 &&
            s.end > DEFAULT_DAY_WINDOW.end
          ) {
            expect(kinds, where).toContain("past-day-window");
          }
        });
      });
    });
  });

  it("only puts Warnings on Stops the traveler insisted on (Must-Sees)", () => {
    TRIPS.forEach(({ label, days }) => {
      days.forEach(({ day, schedule }) => {
        day.stops.forEach((stop, i) => {
          if (stop.origin === "generated") {
            expect(schedule.stops[i].warnings, `${label}, ${day.date}`).toEqual(
              [],
            );
          }
        });
      });
    });
  });

  it("keeps time moving forward: arrive ≥ previous end, start ≥ arrive, end > start", () => {
    TRIPS.forEach(({ days }) => {
      days.forEach(({ schedule }) => {
        schedule.stops.forEach((s, i) => {
          if (i > 0)
            expect(s.arrive).toBeGreaterThanOrEqual(schedule.stops[i - 1].end);
          expect(s.start).toBeGreaterThanOrEqual(s.arrive);
          expect(s.end).toBeGreaterThan(s.start);
        });
      });
    });
  });

  it("starts every Meal Stop inside its meal window", () => {
    TRIPS.forEach(({ days }) => {
      days.forEach(({ day, schedule }) => {
        day.stops.forEach((stop, i) => {
          if (stop.meal === null) return;
          const { from, latestStart } = MEAL_WINDOWS[stop.meal];
          expect(schedule.stops[i].start).toBeGreaterThanOrEqual(from);
          expect(schedule.stops[i].start).toBeLessThanOrEqual(latestStart);
        });
      });
    });
  });

  it("stays inside the Trip Area when one is chosen", () => {
    TRIPS.forEach(({ prefs, days }) => {
      if (prefs.tripArea.length === 0) return;
      days.forEach(({ day }) => {
        expect(prefs.tripArea).toContain(day.baseCity);
        day.stops.forEach((stop) => {
          expect(prefs.tripArea).toContain(baseCityOf(byId.get(stop.placeId)!));
        });
      });
    });
  });

  it("never silently drops a Must-See: it is planned, or still listed as unplanned", () => {
    TRIPS.forEach(({ label, start, prefs, days }) => {
      const planned = new Set(
        days.flatMap((d) => d.day.stops.map((s) => s.placeId)),
      );
      const stillUnplanned = new Set(days[2].unplannedMustSees);
      prefs.mustSees.forEach((id) => {
        expect(
          planned.has(id) || stillUnplanned.has(id),
          `${label}, ${start}: ${id}`,
        ).toBe(true);
      });
    });
  });

  it("generates a full Trip Day from a Start Date alone", () => {
    TRIPS.forEach(({ label, start, days }) => {
      if (label !== "no Preferences") return;
      days.forEach(({ day }) => {
        expect(day.stops.length, `${start}, ${day.date}`).toBe(
          SIGHTS_PER_PACE.balanced,
        );
      });
    });
  });

  it("gives the same Trip for the same input", () => {
    const { start, prefs, days } = TRIPS[7];
    expect(planTrip(start, prefs)).toEqual(days);
  });
});
