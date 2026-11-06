import { describe, expect, it } from "vitest";
import type { Trip, TripDay } from "../../stores/trip.ts";
import { PLACES } from "../data/places.ts";
import type { PlannedStop } from "../generator/generate-day.ts";
import { DEFAULT_PREFERENCES } from "../preferences/preferences.ts";
import { DEFAULT_DAY_WINDOW, type DayWindow } from "../schedule/schedule.ts";
import { readSharedTrip, shareQuery } from "./share.ts";

const stop = (
  n: number,
  origin: PlannedStop["origin"] = "generated",
  meal: PlannedStop["meal"] = null,
): PlannedStop => ({
  placeId: `place_${String(n).padStart(3, "0")}`,
  origin,
  meal,
});

const day = (
  date: string,
  baseCity: TripDay["dayArea"],
  stops: PlannedStop[],
  window: DayWindow = DEFAULT_DAY_WINDOW,
): TripDay => {
  const plan = { date, baseCity, chosenForYou: false, stops };
  return {
    date,
    window,
    dayArea: null,
    plan,
    status: "finalized",
    saved: plan,
  };
};

const TRIP: Trip = {
  version: 1,
  startDate: "2026-11-10",
  prefs: {
    ...DEFAULT_PREFERENCES,
    mode: "rental-car",
    interests: ["food", "hidden-gem"],
    mustSees: ["place_001"],
  },
  startEmpty: false,
  openDay: 2,
  days: [
    day("2026-11-10", "Rome", [
      stop(1, "must-see"),
      stop(5),
      stop(12, "generated", "lunch"),
      stop(30, "added", "dinner"),
    ]),
    day("2026-11-11", null, []),
    day("2026-11-12", "Florence", [stop(41)], { start: 8 * 60, end: 23 * 60 }),
  ],
};

const ALL_IDS = new Set(PLACES.map((p) => p.id));

/** Decodes and fails the test when the link is rejected. */
const read = (query: string, ids = ALL_IDS) => {
  const loaded = readSharedTrip(query, ids);
  if (!loaded) throw new Error(`rejected: ${query}`);
  return loaded;
};

const VALID =
  "v=1&start=2026-11-10&transport=car&day1=rome:1m,5,12l,30ad&day2=&day3=florence:41&hours3=08:00-23:00";

describe("shareQuery", () => {
  it("writes the Trip as short, readable params", () => {
    expect(shareQuery(TRIP)).toBe(
      "v=1&start=2026-11-10&transport=car&interests=food,hidden-gem" +
        "&day1=rome:1m,5,12l,30ad&day2=&day3=florence:41&hours3=08:00-23:00",
    );
  });

  it("leaves out interests when there are none", () => {
    const trip = { ...TRIP, prefs: { ...TRIP.prefs, interests: [] } };
    expect(shareQuery(trip)).not.toContain("interests");
  });

  it("writes public transport as transit", () => {
    const trip = {
      ...TRIP,
      prefs: { ...TRIP.prefs, mode: "public-transport" as const },
    };
    expect(shareQuery(trip)).toContain("transport=transit");
  });
});

describe("readSharedTrip", () => {
  it("rebuilds the same Trip Overview from its own link", () => {
    const { trip, removedStops } = read(shareQuery(TRIP));
    expect(removedStops).toBe(0);
    expect(trip.startDate).toBe(TRIP.startDate);
    expect(trip.prefs.mode).toBe("rental-car");
    expect(trip.prefs.interests).toEqual(["food", "hidden-gem"]);
    trip.days.forEach((d, i) => {
      expect(d.date).toBe(TRIP.days[i].date);
      expect(d.window).toEqual(TRIP.days[i].window);
      expect(d.status).toBe("finalized");
      expect(d.plan?.baseCity).toBe(TRIP.days[i].plan?.baseCity);
      expect(d.plan?.stops).toEqual(TRIP.days[i].plan?.stops);
    });
  });

  it("works out the Must-Sees from the Stops", () => {
    expect(read(VALID).trip.prefs.mustSees).toEqual(["place_001"]);
  });

  it("accepts a leading ?, any flag order, any city case, and extra params", () => {
    const { trip } = read(
      `?${VALID.replace("30ad", "30da").replace("rome", "Rome")}&utm_source=x`,
    );
    expect(trip.days[0].plan?.stops[3]).toEqual(stop(30, "added", "dinner"));
    expect(trip.days[0].plan?.baseCity).toBe("Rome");
  });

  it("reads percent-encoded commas and colons", () => {
    expect(
      read(VALID.replace("rome:1m,5", "rome%3A1m%2C5")).trip.days[0].plan
        ?.stops,
    ).toHaveLength(4);
  });

  it("round-trips every Place id in the dataset", () => {
    const stops = PLACES.map((p) => ({
      placeId: p.id,
      origin: "generated" as const,
      meal: null,
    }));
    const trip = {
      ...TRIP,
      days: [day("2026-11-10", null, stops), TRIP.days[1], TRIP.days[2]],
    };
    expect(read(shareQuery(trip)).trip.days[0].plan?.stops).toEqual(stops);
  });

  it("drops and counts Stops whose Place no longer exists", () => {
    const ids = new Set([...ALL_IDS].filter((id) => id !== "place_005"));
    const { trip, removedStops } = read(VALID, ids);
    expect(removedStops).toBe(1);
    expect(trip.days[0].plan?.stops.map((s) => s.placeId)).not.toContain(
      "place_005",
    );
  });

  it("drops unknown Interests rather than rejecting the link", () => {
    expect(read(`${VALID}&interests=food,ghosts`).trip.prefs.interests).toEqual(
      ["food"],
    );
  });

  it("accepts a Start Date in the past", () => {
    expect(read(VALID.replace("2026-11-10", "2020-01-01")).trip.startDate).toBe(
      "2020-01-01",
    );
  });

  it.each([
    ["no version", VALID.replace("v=1&", "")],
    ["an unknown version", VALID.replace("v=1", "v=2")],
    ["no start date", VALID.replace("start=2026-11-10&", "")],
    ["a malformed date", VALID.replace("2026-11-10", "10-11-2026")],
    ["an impossible date", VALID.replace("2026-11-10", "2026-02-30")],
    ["no transport", VALID.replace("transport=car&", "")],
    ["an unknown transport", VALID.replace("=car", "=bike")],
    ["a missing day", VALID.replace("&day2=", "")],
    ["an unknown city", VALID.replace("rome", "naples")],
    ["a Stop that isn't a number", VALID.replace("5,", "five,")],
    ["an unknown flag", VALID.replace("12l", "12x")],
    ["a repeated flag", VALID.replace("12l", "12ll")],
    ["two origins", VALID.replace("1m", "1ma")],
    ["two meals", VALID.replace("12l", "12ld")],
    ["the same Place twice in a day", VALID.replace("5,", "5,5,")],
    ["an empty Stop", VALID.replace("5,", ",")],
    ["a malformed window", VALID.replace("08:00-23:00", "8-23")],
    [
      "a window ending before it starts",
      VALID.replace("08:00-23:00", "23:00-08:00"),
    ],
    ["an impossible time", VALID.replace("23:00", "25:00")],
  ])("rejects a link with %s", (_, query) => {
    expect(readSharedTrip(query, ALL_IDS)).toBeNull();
  });
});
