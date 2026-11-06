import { describe, expect, it } from "vitest";
import type { CleanPlace } from "../../utils/data/place.ts";
import {
  BASE_CITIES,
  type BaseCity,
} from "../../utils/preferences/base-cities.ts";
import {
  DEFAULT_PREFERENCES,
  type Preferences,
} from "../../utils/preferences/preferences.ts";
import { DEFAULT_DAY_WINDOW } from "../../utils/schedule/schedule.ts";
import {
  createTrip,
  tripReducer,
  unplannedMustSees,
  type Trip,
  type TripAction,
} from "../trip.ts";

/** A made-up Place ~220 m × slot from the city centre; open daily, 60 min. */
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

const PLACES = Array.from({ length: 16 }, (_, i) =>
  place(`rome${i + 1}`, "Rome", i),
);
const START = "2026-11-09";

const newTrip = (
  overrides: { prefs?: Partial<Preferences>; startEmpty?: boolean } = {},
): Trip =>
  createTrip(
    {
      startDate: START,
      prefs: { ...DEFAULT_PREFERENCES, ...overrides.prefs },
      startEmpty: overrides.startEmpty ?? false,
    },
    PLACES,
  );

const reduce = tripReducer(PLACES);
const apply = (trip: Trip, ...actions: TripAction[]): Trip =>
  actions.reduce(reduce, trip);
const stopIds = (trip: Trip, day: number) =>
  trip.days[day].plan?.stops.map((s) => s.placeId) ?? [];

describe("createTrip", () => {
  it("makes 3 days on consecutive dates with the default window", () => {
    const trip = newTrip();
    expect(trip.days.map((d) => d.date)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
    ]);
    expect(trip.days.every((d) => d.window === DEFAULT_DAY_WINDOW)).toBe(true);
    expect(trip.days.every((d) => d.dayArea === null)).toBe(true);
  });

  it("plans and opens Day 1 only (ADR 0002: one day at a time)", () => {
    const trip = newTrip();
    expect(trip.openDay).toBe(0);
    expect(trip.days[0].status).toBe("editing");
    expect(trip.days[0].plan?.stops.length).toBeGreaterThan(0);
    expect(trip.days[1]).toMatchObject({ status: "draft", plan: null });
    expect(trip.days[2]).toMatchObject({ status: "draft", plan: null });
  });

  it("opens an empty Day 1 for 'Start with empty days'", () => {
    const trip = newTrip({ startEmpty: true });
    expect(trip.days[0].status).toBe("editing");
    expect(trip.days[0].plan).toMatchObject({ stops: [], baseCity: null });
  });
});

describe("tripReducer", () => {
  describe("openDay", () => {
    it("plans a day the first time it opens, avoiding Places used on other days", () => {
      const trip = apply(newTrip(), { type: "openDay", day: 1 });
      expect(trip.openDay).toBe(1);
      expect(trip.days[1].status).toBe("editing");
      const day1 = new Set(stopIds(trip, 0));
      expect(stopIds(trip, 1).length).toBeGreaterThan(0);
      expect(stopIds(trip, 1).some((id) => day1.has(id))).toBe(false);
    });

    it("does not re-plan a day that already has a plan", () => {
      const opened = apply(newTrip(), { type: "openDay", day: 1 });
      const again = apply(
        opened,
        { type: "openDay", day: 0 },
        {
          type: "openDay",
          day: 1,
        },
      );
      expect(again.days[1].plan).toEqual(opened.days[1].plan);
    });

    it("opens empty days for an empty-start Trip", () => {
      const trip = apply(newTrip({ startEmpty: true }), {
        type: "openDay",
        day: 2,
      });
      expect(trip.days[2].plan?.stops).toEqual([]);
    });
  });

  describe("editing Stops", () => {
    it("moves a Stop", () => {
      const trip = newTrip();
      const [a, b, c] = stopIds(trip, 0);
      const moved = apply(trip, { type: "moveStop", day: 0, from: 0, to: 2 });
      expect(stopIds(moved, 0).slice(0, 3)).toEqual([b, c, a]);
    });

    it("ignores a move out of range", () => {
      const trip = newTrip();
      expect(apply(trip, { type: "moveStop", day: 0, from: 0, to: 99 })).toBe(
        trip,
      );
    });

    it("removes a Stop", () => {
      const trip = newTrip();
      const [first, ...rest] = stopIds(trip, 0);
      const removed = apply(trip, { type: "removeStop", day: 0, index: 0 });
      expect(stopIds(removed, 0)).toEqual(rest);
      expect(stopIds(removed, 0)).not.toContain(first);
    });

    it("adds a Place as 'added by you'", () => {
      const trip = apply(newTrip(), {
        type: "addPlace",
        day: 0,
        placeId: "rome16",
      });
      expect(trip.days[0].plan?.stops).toContainEqual({
        placeId: "rome16",
        origin: "added",
        meal: null,
      });
    });

    it("does not add a Place twice to the same day", () => {
      const trip = newTrip();
      const existing = stopIds(trip, 0)[0];
      expect(apply(trip, { type: "addPlace", day: 0, placeId: existing })).toBe(
        trip,
      );
    });

    it("lets the same Place be added on another day (Glossary: Stop)", () => {
      const trip = apply(
        newTrip(),
        { type: "openDay", day: 1 },
        { type: "addPlace", day: 1, placeId: stopIds(newTrip(), 0)[0] },
      );
      expect(stopIds(trip, 1)).toContain(stopIds(trip, 0)[0]);
    });

    it("never mutates the Trip it was given", () => {
      const trip = newTrip();
      const snapshot = structuredClone(trip);
      apply(trip, { type: "removeStop", day: 0, index: 0 });
      expect(trip).toEqual(snapshot);
    });
  });

  describe("regenerate", () => {
    it("keeps Must-Sees and added Stops, and replaces the generated ones", () => {
      const trip = apply(
        newTrip({ prefs: { mustSees: ["rome15"] } }),
        { type: "addPlace", day: 0, placeId: "rome16" },
        { type: "removeStop", day: 0, index: 0 },
        { type: "regenerate", day: 0 },
      );
      const stops = trip.days[0].plan!.stops;
      expect(stops.map((s) => s.placeId)).toEqual(
        expect.arrayContaining(["rome15", "rome16"]),
      );
      expect(stops.find((s) => s.placeId === "rome15")?.origin).toBe(
        "must-see",
      );
      expect(stops.find((s) => s.placeId === "rome16")?.origin).toBe("added");
    });

    it("uses the Day Area and window set on the day", () => {
      const places = [
        ...PLACES,
        ...Array.from({ length: 6 }, (_, i) => place(`milan${i}`, "Milan", i)),
      ];
      const trip = [
        { type: "setDayArea", day: 0, city: "Milan" },
        { type: "regenerate", day: 0 },
      ].reduce(
        (t, a) => tripReducer(places)(t, a as TripAction),
        createTrip(
          { startDate: START, prefs: DEFAULT_PREFERENCES, startEmpty: false },
          places,
        ),
      );
      expect(trip.days[0].plan?.baseCity).toBe("Milan");
      expect(trip.days[0].plan?.chosenForYou).toBe(false);
    });
  });

  describe("finalize and revert", () => {
    it("finalizes a day, saves it, and opens the next day", () => {
      const trip = apply(newTrip(), { type: "finalize", day: 0 });
      expect(trip.days[0].status).toBe("finalized");
      expect(trip.days[0].saved).toEqual(trip.days[0].plan);
      expect(trip.openDay).toBe(1);
      expect(trip.days[1].status).toBe("editing");
      expect(trip.days[1].plan?.stops.length).toBeGreaterThan(0);
    });

    it("stays on the last day once every day is finalized", () => {
      const trip = apply(
        newTrip(),
        { type: "finalize", day: 0 },
        { type: "finalize", day: 1 },
        { type: "finalize", day: 2 },
      );
      expect(trip.days.every((d) => d.status === "finalized")).toBe(true);
      expect(trip.openDay).toBe(2);
    });

    it("marks a finalized day as editing when changed, keeping the saved copy", () => {
      const finalized = apply(newTrip(), { type: "finalize", day: 0 });
      const edited = apply(finalized, { type: "removeStop", day: 0, index: 0 });
      expect(edited.days[0].status).toBe("editing");
      expect(edited.days[0].saved).toEqual(finalized.days[0].saved);
    });

    it("reverts to the saved copy", () => {
      const finalized = apply(newTrip(), { type: "finalize", day: 0 });
      const reverted = apply(
        finalized,
        { type: "removeStop", day: 0, index: 0 },
        { type: "revert", day: 0 },
      );
      expect(reverted.days[0].status).toBe("finalized");
      expect(reverted.days[0].plan).toEqual(finalized.days[0].saved);
    });

    it("ignores revert on a day never finalized", () => {
      const trip = newTrip();
      expect(apply(trip, { type: "revert", day: 0 })).toBe(trip);
    });
  });

  describe("day settings and Preferences", () => {
    it("sets the Day Window, which counts as an edit", () => {
      const window = { start: 10 * 60, end: 20 * 60 };
      const trip = apply(
        newTrip(),
        { type: "finalize", day: 0 },
        { type: "setWindow", day: 0, window },
      );
      expect(trip.days[0]).toMatchObject({ window, status: "editing" });
    });

    it("sets the Day Area without re-planning (the traveler chooses when)", () => {
      const trip = newTrip();
      const pinned = apply(trip, {
        type: "setDayArea",
        day: 0,
        city: "Florence",
      });
      expect(pinned.days[0].dayArea).toBe("Florence");
      expect(pinned.days[0].plan).toEqual(trip.days[0].plan);
    });

    it("toggles a Must-See on and off", () => {
      const on = apply(newTrip(), { type: "toggleMustSee", placeId: "rome9" });
      expect(on.prefs.mustSees).toEqual(["rome9"]);
      const off = apply(on, { type: "toggleMustSee", placeId: "rome9" });
      expect(off.prefs.mustSees).toEqual([]);
    });
  });
});

describe("unplannedMustSees", () => {
  it("lists Must-Sees that no day's plan contains yet", () => {
    const trip = apply(newTrip({ prefs: { mustSees: ["rome15"] } }), {
      type: "toggleMustSee",
      placeId: "venice1",
    });
    // rome15 was planned into Day 1; venice1 is not on any day.
    expect(unplannedMustSees(trip)).toEqual(["venice1"]);
  });

  it("is empty when every Must-See is planned", () => {
    expect(unplannedMustSees(newTrip())).toEqual([]);
  });
});
