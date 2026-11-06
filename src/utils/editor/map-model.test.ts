import { describe, expect, it } from "vitest";
import type { CleanPlace } from "../data/place.ts";
import type { PlannedDay } from "../generator/generate-day.ts";
import { BASE_CITIES, type BaseCity } from "../preferences/base-cities.ts";
import { DEFAULT_PREFERENCES } from "../preferences/preferences.ts";
import {
  DEFAULT_DAY_WINDOW,
  type ScheduledDay,
  type ScheduledStop,
} from "../schedule/schedule.ts";
import type { Trip } from "../../stores/trip.ts";
import { dayMapModel } from "./map-model.ts";

const place = (
  id: string,
  latitude: number,
  longitude: number,
): CleanPlace => ({
  id,
  name: `Place ${id}`,
  type: "museum",
  city: "Rome",
  region: "",
  neighborhood: null,
  description: "",
  latitude,
  longitude,
  hours: "Daily 0:00-24:00",
  duration_minutes: 60,
  price_range: "€€",
  rating: 4.5,
  tags: [],
  seasonal_notes: null,
  booking_required: false,
  hours_status: "known",
});

const PLACES = [
  place("a", 41.9, 12.5),
  place("b", 41.95, 12.45),
  place("c", 41.88, 12.52),
];
const byId = new Map(PLACES.map((p) => [p.id, p]));

const scheduled = (
  placeId: string,
  warnings: ScheduledStop["warnings"] = [],
): ScheduledStop => ({
  placeId,
  travel: null,
  arrive: 0,
  start: 0,
  end: 60,
  availability: { kind: "unknown" },
  warnings,
});

const schedule = (stops: ScheduledStop[]): ScheduledDay => ({
  stops,
  endsAt: 0,
  warningCount: stops.reduce((n, s) => n + s.warnings.length, 0),
});

const trip = (
  plan: PlannedDay | null,
  dayArea: BaseCity | null = null,
): Trip => ({
  version: 1,
  startDate: "2026-11-09",
  prefs: DEFAULT_PREFERENCES,
  startEmpty: false,
  openDay: 0,
  days: [
    {
      date: "2026-11-09",
      window: DEFAULT_DAY_WINDOW,
      dayArea,
      status: "editing",
      saved: null,
      plan,
    },
    {
      date: "2026-11-10",
      window: DEFAULT_DAY_WINDOW,
      dayArea: null,
      status: "draft",
      saved: null,
      plan: null,
    },
    {
      date: "2026-11-11",
      window: DEFAULT_DAY_WINDOW,
      dayArea: null,
      status: "draft",
      saved: null,
      plan: null,
    },
  ],
});

const plan = (baseCity: BaseCity | null, ids: string[]): PlannedDay => ({
  date: "2026-11-09",
  baseCity,
  chosenForYou: true,
  stops: ids.map((placeId) => ({ placeId, origin: "generated", meal: null })),
});

describe("dayMapModel", () => {
  it("numbers a pin per Stop, in schedule order, matching the Stop badges", () => {
    const model = dayMapModel(
      trip(plan("Rome", ["b", "a"])),
      0,
      schedule([scheduled("b"), scheduled("a")]),
      byId,
    );
    expect(model.markers).toEqual([
      {
        placeId: "b",
        number: 1,
        name: "Place b",
        position: [41.95, 12.45],
        hasWarning: false,
      },
      {
        placeId: "a",
        number: 2,
        name: "Place a",
        position: [41.9, 12.5],
        hasWarning: false,
      },
    ]);
  });

  it("draws the path through the Stops in order", () => {
    const model = dayMapModel(
      trip(plan("Rome", ["a", "b", "c"])),
      0,
      schedule([scheduled("a"), scheduled("b"), scheduled("c")]),
      byId,
    );
    expect(model.path).toEqual([
      [41.9, 12.5],
      [41.95, 12.45],
      [41.88, 12.52],
    ]);
  });

  it("marks pins whose Stop has a Warning", () => {
    const model = dayMapModel(
      trip(plan("Rome", ["a"])),
      0,
      schedule([scheduled("a", [{ kind: "closed", reason: "weekday" }])]),
      byId,
    );
    expect(model.markers[0].hasWarning).toBe(true);
  });

  it("fits the map around all the Stops", () => {
    const model = dayMapModel(
      trip(plan("Rome", ["a", "b", "c"])),
      0,
      schedule([scheduled("a"), scheduled("b"), scheduled("c")]),
      byId,
    );
    expect(model.focus).toEqual({
      kind: "fit",
      bounds: [
        [41.88, 12.45],
        [41.95, 12.52],
      ],
    });
  });

  it("centres closely on a single Stop instead of fitting a point", () => {
    const model = dayMapModel(
      trip(plan("Rome", ["a"])),
      0,
      schedule([scheduled("a")]),
      byId,
    );
    expect(model.focus).toEqual({
      kind: "center",
      center: [41.9, 12.5],
      zoom: 15,
    });
  });

  it("centres on the day's city when there are no Stops (a pinned city wins)", () => {
    const rome = BASE_CITIES.Rome;
    expect(
      dayMapModel(trip(plan("Rome", [])), 0, schedule([]), byId).focus,
    ).toEqual({
      kind: "center",
      center: [rome.latitude, rome.longitude],
      zoom: 13,
    });
    const florence = BASE_CITIES.Florence;
    expect(
      dayMapModel(trip(plan("Rome", []), "Florence"), 0, schedule([]), byId)
        .focus,
    ).toEqual({
      kind: "center",
      center: [florence.latitude, florence.longitude],
      zoom: 13,
    });
  });

  it("shows all of Italy when the day has no Stops and no city", () => {
    const model = dayMapModel(trip(plan(null, [])), 0, schedule([]), byId);
    expect(model.focus).toMatchObject({ kind: "center", zoom: 6 });
    expect(model.markers).toEqual([]);
    expect(model.path).toEqual([]);
  });

  it("copes with a day that has not been planned yet", () => {
    expect(dayMapModel(trip(null), 0, null, byId).markers).toEqual([]);
  });
});
