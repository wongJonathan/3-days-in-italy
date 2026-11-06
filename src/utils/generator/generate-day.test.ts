import { describe, expect, it } from "vitest";
import type { CleanPlace } from "../data/place.ts";
import { BASE_CITIES, type BaseCity } from "../preferences/base-cities.ts";
import {
  DEFAULT_PREFERENCES,
  type Preferences,
} from "../preferences/preferences.ts";
import { DEFAULT_DAY_WINDOW } from "../schedule/schedule.ts";
import {
  generateDay,
  MEAL_WINDOWS,
  toStopInputs,
  type GenerateDayInput,
  type PlannedDay,
} from "./generate-day.ts";

const MONDAY = "2026-11-09";

/**
 * A made-up Place in a base city. `slot` spaces Places ~220 m apart, so moving
 * between them is a short walk. Open every day, 60 min, €€, rated 4.5.
 */
const place = (
  id: string,
  city: BaseCity,
  slot: number,
  overrides: Partial<CleanPlace> = {},
): CleanPlace => ({
  id,
  name: id,
  type: "museum",
  city,
  region: "",
  neighborhood: null,
  description: "",
  latitude: BASE_CITIES[city].latitude + slot * 0.002,
  longitude: BASE_CITIES[city].longitude,
  hours: "Daily 0:00-24:00",
  duration_minutes: 60,
  price_range: "€€",
  rating: 4.5,
  tags: [],
  seasonal_notes: null,
  booking_required: false,
  hours_status: "known",
  ...overrides,
});

/** `count` plain Places in a city, ids like "rome1", "rome2"… */
const cityPlaces = (city: BaseCity, count: number): CleanPlace[] =>
  Array.from({ length: count }, (_, i) =>
    place(`${city.toLowerCase()}${i + 1}`, city, i),
  );

const prefs = (p: Partial<Preferences> = {}): Preferences => ({
  ...DEFAULT_PREFERENCES,
  ...p,
});

const input = (
  places: CleanPlace[],
  overrides: Partial<GenerateDayInput> = {},
): GenerateDayInput => ({
  date: MONDAY,
  places,
  prefs: prefs(),
  window: DEFAULT_DAY_WINDOW,
  dayArea: null,
  otherDays: [],
  kept: [],
  ...overrides,
});

const day = (
  date: string,
  baseCity: BaseCity,
  placeIds: string[],
): PlannedDay => ({
  date,
  baseCity,
  chosenForYou: true,
  stops: placeIds.map((placeId) => ({
    placeId,
    origin: "generated",
    meal: null,
  })),
});

const ids = (result: ReturnType<typeof generateDay>) =>
  result.day.stops.map((s) => s.placeId);

describe("generateDay", () => {
  describe("choosing the day's city", () => {
    it("uses the Day Area when one is pinned", () => {
      const result = generateDay(
        input([...cityPlaces("Rome", 6), ...cityPlaces("Milan", 4)], {
          dayArea: "Milan",
        }),
      );
      expect(result.day).toMatchObject({
        baseCity: "Milan",
        chosenForYou: false,
      });
      expect(ids(result).every((id) => id.startsWith("milan"))).toBe(true);
    });

    it("picks the city with the best Places for day 1, and says it chose", () => {
      const result = generateDay(
        input([...cityPlaces("Florence", 3), ...cityPlaces("Rome", 6)]),
      );
      expect(result.day).toMatchObject({
        baseCity: "Rome",
        chosenForYou: true,
      });
    });

    it("stays in the previous day's city while it has enough Places left", () => {
      const result = generateDay(
        input([...cityPlaces("Rome", 8), ...cityPlaces("Florence", 8)], {
          otherDays: [day("2026-11-08", "Rome", ["rome1", "rome2"])],
        }),
      );
      expect(result.day.baseCity).toBe("Rome");
    });

    it("moves to the nearest city with enough Places once the previous one runs out", () => {
      const result = generateDay(
        input(
          [
            ...cityPlaces("Rome", 4),
            ...cityPlaces("Milan", 6),
            ...cityPlaces("Florence", 4),
          ],
          {
            otherDays: [
              day("2026-11-08", "Rome", ["rome1", "rome2", "rome3", "rome4"]),
            ],
          },
        ),
      );
      expect(result.day.baseCity).toBe("Florence"); // closer to Rome than Milan
    });

    it("skips a city whose Places are too far apart to fill a day without Warnings", () => {
      // Bologna's Places score higher, but sit in towns ~45 km apart: every hop
      // between them is over an hour, so a full day can't fit. Florence's can.
      const spread = [0, 1, 2, 3].map((i) =>
        place(`bologna${i + 1}`, "Bologna", i * 200, { rating: 5 }),
      );
      const result = generateDay(
        input([...spread, ...cityPlaces("Florence", 4)]),
      );
      expect(result.day.baseCity).toBe("Florence");
      expect(result.day.stops).toHaveLength(4);
    });

    it("visits a Trip Area city not seen yet before repeating one", () => {
      const result = generateDay(
        input([...cityPlaces("Rome", 10), ...cityPlaces("Venice", 4)], {
          prefs: prefs({ tripArea: ["Rome", "Venice"] }),
          otherDays: [day("2026-11-08", "Rome", ["rome1", "rome2"])],
        }),
      );
      expect(result.day.baseCity).toBe("Venice");
    });

    it("stays inside the Trip Area", () => {
      const result = generateDay(
        input([...cityPlaces("Rome", 10), ...cityPlaces("Bologna", 4)], {
          prefs: prefs({ tripArea: ["Bologna"] }),
        }),
      );
      expect(result.day.baseCity).toBe("Bologna");
    });

    it("goes where an unplanned Must-See is", () => {
      const result = generateDay(
        input([...cityPlaces("Rome", 8), ...cityPlaces("Venice", 4)], {
          prefs: prefs({ mustSees: ["venice2"] }),
          otherDays: [day("2026-11-08", "Rome", ["rome1"])],
        }),
      );
      expect(result.day.baseCity).toBe("Venice");
      expect(result.day.stops).toContainEqual({
        placeId: "venice2",
        origin: "must-see",
        meal: null,
      });
    });
  });

  describe("choosing Places", () => {
    it("fills the day to the Pace: Balanced is 4 sights", () => {
      expect(generateDay(input(cityPlaces("Rome", 10))).day.stops).toHaveLength(
        4,
      );
    });

    it("uses 3 sights for Relaxed and 6 for Packed", () => {
      const places = cityPlaces("Rome", 10);
      expect(
        generateDay(input(places, { prefs: prefs({ pace: "relaxed" }) })).day
          .stops,
      ).toHaveLength(3);
      expect(
        generateDay(input(places, { prefs: prefs({ pace: "packed" }) })).day
          .stops,
      ).toHaveLength(6);
    });

    it("never repeats a Place used on another day", () => {
      const result = generateDay(
        input(cityPlaces("Rome", 8), {
          otherDays: [day("2026-11-08", "Rome", ["rome1", "rome2"])],
        }),
      );
      expect(ids(result)).not.toContain("rome1");
      expect(ids(result)).not.toContain("rome2");
    });

    it("skips Places closed that day, and low-rated ones", () => {
      const places = [
        ...cityPlaces("Rome", 5),
        place("closedMonday", "Rome", 6, {
          hours: "Tue-Sun 9:00-18:00",
          rating: 5,
        }),
        place("lowRated", "Rome", 7, { rating: 3.5 }),
      ];
      const result = generateDay(input(places));
      expect(ids(result)).not.toContain("closedMonday");
      expect(ids(result)).not.toContain("lowRated");
    });

    it("prefers the best score", () => {
      const places = [
        ...cityPlaces("Rome", 5),
        place("foodie", "Rome", 6, { tags: ["food"], rating: 4.0 }),
      ];
      const result = generateDay(
        input(places, {
          prefs: prefs({ interests: ["food"], pace: "relaxed" }),
        }),
      );
      expect(ids(result)).toContain("foodie");
    });

    it("fills from within budget before other price groups", () => {
      const places = [
        place("cheap1", "Rome", 0, { price_range: "€" }),
        place("cheap2", "Rome", 1, { price_range: "€" }),
        place("cheap3", "Rome", 2, { price_range: "€" }),
        place("luxury", "Rome", 3, { price_range: "€€€€", rating: 5 }),
      ];
      const relaxed = prefs({ pace: "relaxed", budget: "€" });
      expect(ids(generateDay(input(places, { prefs: relaxed })))).not.toContain(
        "luxury",
      );
      // With fewer cheap Places, the other groups are used too.
      expect(
        ids(generateDay(input(places.slice(1), { prefs: relaxed }))),
      ).toContain("luxury");
    });

    it("adds no generated Stop that would cause a Warning", () => {
      // A short day: 9:00-12:00 fits two 60-minute visits plus walking, not three.
      const result = generateDay(
        input(cityPlaces("Rome", 10), {
          window: { start: 9 * 60, end: 12 * 60 },
        }),
      );
      expect(result.schedule.warningCount).toBe(0);
      expect(result.day.stops.length).toBeLessThan(4);
      expect(result.day.stops.length).toBeGreaterThan(0);
    });

    it("never offers restaurants as sights", () => {
      const places = [
        ...cityPlaces("Rome", 6),
        place("trattoria", "Rome", 7, { type: "restaurant", rating: 5 }),
      ];
      expect(ids(generateDay(input(places)))).not.toContain("trattoria");
    });
  });

  describe("Must-Sees and kept Stops", () => {
    it("always includes a Must-See, even when it gets a Warning", () => {
      const places = [
        ...cityPlaces("Rome", 5),
        place("uffiziLike", "Rome", 6, { hours: "Tue-Sun 9:00-18:00" }),
      ];
      const result = generateDay(
        input(places, { prefs: prefs({ mustSees: ["uffiziLike"] }) }),
      );
      expect(ids(result)).toContain("uffiziLike");
      const scheduled = result.schedule.stops.find(
        (s) => s.placeId === "uffiziLike",
      );
      expect(scheduled?.warnings).toEqual([
        { kind: "closed", reason: "weekday" },
      ]);
    });

    it("keeps kept Stops, in their order, with their origin", () => {
      const result = generateDay(
        input(cityPlaces("Rome", 8), {
          kept: [
            { placeId: "rome7", origin: "added", meal: null },
            { placeId: "rome2", origin: "must-see", meal: null },
          ],
        }),
      );
      const kept = result.day.stops.filter((s) => s.origin !== "generated");
      expect(kept).toEqual([
        { placeId: "rome7", origin: "added", meal: null },
        { placeId: "rome2", origin: "must-see", meal: null },
      ]);
    });

    it("lists Must-Sees in other cities that no day covers yet", () => {
      const result = generateDay(
        input([...cityPlaces("Rome", 6), ...cityPlaces("Venice", 2)], {
          dayArea: "Rome",
          prefs: prefs({ mustSees: ["venice1", "venice2"] }),
          otherDays: [day("2026-11-08", "Venice", ["venice2"])],
        }),
      );
      expect(result.unplannedMustSees).toEqual(["venice1"]);
    });
  });

  describe("meals", () => {
    const withRestaurants = [
      ...cityPlaces("Rome", 8),
      place("trattoria", "Rome", 9, {
        type: "restaurant",
        hours: "12:00-15:00, 19:00-23:00",
        duration_minutes: 90,
      }),
      place("osteria", "Rome", 10, {
        type: "restaurant",
        hours: "12:00-15:00, 19:00-23:00",
        duration_minutes: 90,
      }),
    ];

    it("adds a lunch Stop that starts in the lunch window", () => {
      const result = generateDay(
        input(withRestaurants, { prefs: prefs({ lunch: true }) }),
      );
      const lunch = result.day.stops.filter((s) => s.meal === "lunch");
      expect(lunch).toHaveLength(1);
      const start = result.schedule.stops.find(
        (s) => s.placeId === lunch[0].placeId,
      )!.start;
      expect(start).toBeGreaterThanOrEqual(MEAL_WINDOWS.lunch.from);
      expect(start).toBeLessThanOrEqual(MEAL_WINDOWS.lunch.latestStart);
    });

    it("adds a dinner Stop that starts in the dinner window", () => {
      const result = generateDay(
        input(withRestaurants, { prefs: prefs({ dinner: true }) }),
      );
      const dinner = result.day.stops.filter((s) => s.meal === "dinner");
      expect(dinner).toHaveLength(1);
      const start = result.schedule.stops.find(
        (s) => s.placeId === dinner[0].placeId,
      )!.start;
      expect(start).toBeGreaterThanOrEqual(MEAL_WINDOWS.dinner.from);
      expect(start).toBeLessThanOrEqual(MEAL_WINDOWS.dinner.latestStart);
    });

    it("uses two different restaurants for lunch and dinner, on top of the sights", () => {
      const result = generateDay(
        input(withRestaurants, { prefs: prefs({ lunch: true, dinner: true }) }),
      );
      const meals = result.day.stops.filter((s) => s.meal !== null);
      expect(new Set(meals.map((m) => m.placeId)).size).toBe(2);
      expect(result.day.stops.filter((s) => s.meal === null)).toHaveLength(4);
      expect(result.schedule.warningCount).toBe(0);
    });

    it("adds no Meal Stops when meals are off", () => {
      const result = generateDay(input(withRestaurants));
      expect(result.day.stops.every((s) => s.meal === null)).toBe(true);
    });
  });

  it("gives the same day for the same input", () => {
    const places = [...cityPlaces("Rome", 10), ...cityPlaces("Florence", 10)];
    expect(generateDay(input(places))).toEqual(generateDay(input(places)));
  });
});

describe("toStopInputs", () => {
  it("holds Meal Stops until their meal window opens", () => {
    const places = new Map([
      ["a", place("a", "Rome", 0)],
      ["b", place("b", "Rome", 1, { type: "restaurant" })],
    ]);
    expect(
      toStopInputs(
        [
          { placeId: "a", origin: "generated", meal: null },
          { placeId: "b", origin: "generated", meal: "dinner" },
        ],
        places,
      ).map((s) => s.notBefore),
    ).toEqual([undefined, MEAL_WINDOWS.dinner.from]);
  });
});
