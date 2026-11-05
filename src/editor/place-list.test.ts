import { describe, expect, it } from "vitest";
import type { CleanPlace } from "../data/place.ts";
import type { PlannedDay } from "../generator/generate-day.ts";
import { BASE_CITIES, type BaseCity } from "../preferences/base-cities.ts";
import {
  DEFAULT_PREFERENCES,
  type Preferences,
} from "../preferences/preferences.ts";
import { DEFAULT_DAY_WINDOW } from "../schedule/schedule.ts";
import type { Trip } from "../trip/trip.ts";
import {
  buildPlaceList,
  DEFAULT_FILTERS,
  type ListFilters,
  type PlaceList,
} from "./place-list.ts";

const place = (
  id: string,
  city: BaseCity,
  overrides: Partial<CleanPlace> = {},
): CleanPlace => ({
  id,
  name: id,
  type: "museum",
  city,
  region: "",
  neighborhood: null,
  description: "",
  latitude: BASE_CITIES[city].latitude,
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

const PLACES = [
  place("rome1", "Rome"),
  place("rome2", "Rome", { name: "Pantheon", rating: 4.8, tags: ["food"] }),
  place("cheap", "Rome", { price_range: "€", rating: 4.2 }),
  place("pricey", "Rome", { price_range: "€€€", rating: 4.9 }),
  place("luxury", "Rome", { price_range: "€€€€", rating: 4.4 }),
  place("closedMon", "Rome", {
    name: "Monday Museum",
    hours: "Tue-Sun 9:00-18:00",
  }),
  place("lowRated", "Rome", { rating: 2.1 }),
  place("crowded", "Rome", { tags: ["tourist-heavy"] }),
  place("uffizi", "Florence", { name: "Uffizi Gallery" }),
];

const plan = (
  date: string,
  baseCity: BaseCity | null,
  ids: string[],
): PlannedDay => ({
  date,
  baseCity,
  chosenForYou: true,
  stops: ids.map((placeId) => ({ placeId, origin: "generated", meal: null })),
});

// Day 1 is Monday 9 November 2026 in Rome with rome1; Day 2 already has rome2.
const trip = (
  prefs: Partial<Preferences> = {},
  day1City: BaseCity | null = "Rome",
): Trip => ({
  version: 1,
  startDate: "2026-11-09",
  prefs: { ...DEFAULT_PREFERENCES, ...prefs },
  startEmpty: false,
  openDay: 0,
  days: [
    {
      date: "2026-11-09",
      window: DEFAULT_DAY_WINDOW,
      dayArea: null,
      status: "editing",
      saved: null,
      plan: plan("2026-11-09", day1City, ["rome1"]),
    },
    {
      date: "2026-11-10",
      window: DEFAULT_DAY_WINDOW,
      dayArea: null,
      status: "editing",
      saved: null,
      plan: plan("2026-11-10", "Rome", ["rome2"]),
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

const list = (t: Trip, filters: Partial<ListFilters> = {}): PlaceList =>
  buildPlaceList(t, 0, PLACES, { ...DEFAULT_FILTERS, ...filters });

const ids = (result: PlaceList) =>
  result.groups.flatMap((g) => g.rows.map((r) => r.place.id));

describe("buildPlaceList", () => {
  describe("scope", () => {
    it("browses the open day's city by default", () => {
      const result = list(trip());
      expect(result.scopeCities).toEqual(["Rome"]);
      expect(ids(result)).not.toContain("uffizi");
    });

    it("browses the Trip Area for 'My Where'", () => {
      const result = list(trip({ tripArea: ["Rome", "Florence"] }), {
        scope: "trip",
      });
      expect(result.scopeCities).toEqual(["Rome", "Florence"]);
      expect(ids(result)).toContain("uffizi");
    });

    it("browses everything for 'All of Italy'", () => {
      const result = list(trip(), { scope: "all" });
      expect(result.scopeCities).toBeNull();
      expect(ids(result)).toContain("uffizi");
    });

    it("follows a newly pinned Day Area, even before the day is regenerated", () => {
      // Day 1's Stops are in Rome, but the traveler just pinned it to Florence.
      const pinned = trip();
      pinned.days[0] = { ...pinned.days[0], dayArea: "Florence" };
      const result = list(pinned);
      expect(result.scopeCities).toEqual(["Florence"]);
      expect(ids(result)).toEqual(["uffizi"]);
    });

    it("widens 'this day' when the day has no city yet", () => {
      expect(list(trip({}, null)).scopeCities).toBeNull();
      expect(list(trip({ tripArea: ["Florence"] }, null)).scopeCities).toEqual([
        "Florence",
      ]);
    });
  });

  describe("filters", () => {
    it("hides Places closed on the open day by default", () => {
      expect(ids(list(trip()))).not.toContain("closedMon");
    });

    it("shows closed Places with their availability when 'open' is off", () => {
      const row = list(trip(), { openOnly: false })
        .groups.flatMap((g) => g.rows)
        .find((r) => r.place.id === "closedMon");
      expect(row?.availability).toEqual({ kind: "closed", reason: "weekday" });
    });

    it("keeps Places matching at least one chosen Interest", () => {
      expect(ids(list(trip(), { interests: ["food"] }))).toEqual(["rome2"]);
    });

    it("drops tourist-heavy Places when filtering by Avoid Crowds", () => {
      expect(ids(list(trip(), { interests: ["avoid-crowds"] }))).not.toContain(
        "crowded",
      );
    });
  });

  describe("search", () => {
    it("matches names, ignoring case, and ignores the other filters", () => {
      // Monday Museum is closed today, but searching for it still finds it.
      expect(
        ids(list(trip(), { query: "monday", interests: ["food"] })),
      ).toEqual(["closedMon"]);
    });

    it("lists matches outside the scope separately", () => {
      const result = list(trip(), { query: "uffizi" });
      expect(ids(result)).toEqual([]);
      expect(result.outside.map((r) => r.place.id)).toEqual(["uffizi"]);
    });

    it("also matches the city", () => {
      expect(
        list(trip(), { query: "florence" }).outside.map((r) => r.place.id),
      ).toEqual(["uffizi"]);
    });
  });

  describe("budget groups", () => {
    it("uses one group when no Budget is set", () => {
      const result = list(trip());
      expect(result.groups.map((g) => g.group)).toEqual(["all"]);
    });

    it("always shows all four groups for a Budget, in fill order", () => {
      const result = list(trip({ budget: "€€" }));
      expect(result.groups.map((g) => g.group)).toEqual([
        "within",
        "a-little-under",
        "a-little-over",
        "other",
      ]);
      const byGroup = Object.fromEntries(
        result.groups.map((g) => [g.group, g.rows.map((r) => r.place.id)]),
      );
      expect(byGroup["a-little-under"]).toEqual(["cheap"]);
      expect(byGroup["a-little-over"]).toEqual(["pricey"]);
      expect(byGroup.other).toEqual(["luxury"]);
    });
  });

  describe("rows", () => {
    it("sorts by score, best first, with low-rated Places last", () => {
      const all = ids(list(trip()));
      expect(all[0]).toBe("pricey"); // rated 4.9
      expect(all.at(-1)).toBe("lowRated");
      const low = list(trip())
        .groups.flatMap((g) => g.rows)
        .find((r) => r.place.id === "lowRated");
      expect(low?.points).toBeNull();
    });

    it("hides Places already on this day, even from search", () => {
      // rome1 is on Day 1, the open day: it is in the schedule, not the list.
      expect(ids(list(trip()))).not.toContain("rome1");
      expect(ids(list(trip(), { query: "rome1" }))).toEqual([]);
    });

    it("marks Places that are on another day", () => {
      const rows = list(trip()).groups.flatMap((g) => g.rows);
      expect(rows.find((r) => r.place.id === "rome2")?.onOtherDays).toEqual([
        1,
      ]);
    });

    it("explains the score with reasons for the chips", () => {
      const row = list(trip({ interests: ["food"] }))
        .groups.flatMap((g) => g.rows)
        .find((r) => r.place.id === "rome2");
      expect(row?.reasons.map((r) => r.kind)).toContain("interest");
    });
  });
});
