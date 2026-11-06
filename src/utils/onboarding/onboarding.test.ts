import { describe, expect, it } from "vitest";
import type { CleanPlace } from "../data/place.ts";
import { DEFAULT_PREFERENCES } from "../preferences/preferences.ts";
import {
  cityCounts,
  headsUps,
  headsUpText,
  isPastDate,
  tripDates,
  tuneSummary,
} from "./onboarding.ts";

const place = (
  id: string,
  overrides: Partial<CleanPlace> = {},
): CleanPlace => ({
  id,
  name: id,
  type: "museum",
  city: "Rome",
  region: "",
  neighborhood: null,
  description: "",
  latitude: 41.9,
  longitude: 12.49,
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

// Fri 6, Sat 7, Sun 8 November 2026.
const START = "2026-11-06";

describe("tripDates", () => {
  it("gives the 3 consecutive dates", () => {
    expect(tripDates(START)).toEqual([
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
  });
});

describe("headsUps", () => {
  it("lists Places closed on a Trip weekday, best rated first", () => {
    const places = [
      place("museum", {
        name: "Small Museum",
        hours: "Mon-Sat 9:00-18:00",
        rating: 4.1,
      }),
      place("vatican", {
        name: "Vatican Museums",
        hours: "Mon-Sat 9:00-18:00",
        rating: 4.8,
      }),
      place("open", { name: "Always Open" }),
    ];
    expect(headsUps(places, START)).toEqual([
      {
        kind: "weekday",
        date: "2026-11-08",
        names: ["Vatican Museums", "Small Museum"],
      },
    ]);
  });

  it("lists Places out of season on the Trip's dates", () => {
    const places = [
      // place_035 has the seasonal rule "April-October only".
      place("place_035", {
        name: "Chianti Day Trip by Bike",
        city: "Florence",
      }),
    ];
    expect(headsUps(places, START)).toEqual([
      { kind: "season", date: START, names: ["Chianti Day Trip by Bike"] },
    ]);
  });

  it("says nothing when everything is open", () => {
    expect(headsUps([place("open")], START)).toEqual([]);
  });
});

describe("cityCounts", () => {
  it("counts Places and the ones open on at least one Trip date, per Base City", () => {
    const places = [
      place("a"),
      place("sundayOnly", { hours: "Sun 9:00-18:00" }), // open Sun 8: counts as open
      place("closedAll", { hours: "Mon-Thu 9:00-18:00" }), // closed Fri-Sun
      place("siena", { city: "Siena", latitude: 43.3186, longitude: 11.3307 }),
    ];
    const counts = cityCounts(places, START);
    expect(counts.Rome).toEqual({ total: 3, open: 2, towns: [] });
    expect(counts.Florence).toEqual({ total: 1, open: 1, towns: ["Siena"] });
    expect(counts.Milan).toEqual({ total: 0, open: 0, towns: [] });
  });
});

describe("isPastDate", () => {
  it("is true only before today", () => {
    expect(isPastDate("2026-11-04", "2026-11-05")).toBe(true);
    expect(isPastDate("2026-11-05", "2026-11-05")).toBe(false);
    expect(isPastDate("2026-11-06", "2026-11-05")).toBe(false);
  });
});

describe("tuneSummary", () => {
  it("summarises the defaults", () => {
    expect(tuneSummary(DEFAULT_PREFERENCES)).toBe(
      "Balanced · Any budget · Public transport · No meals",
    );
  });

  it("names Interests, Budget, car, meals and Must-Sees when set", () => {
    expect(
      tuneSummary({
        ...DEFAULT_PREFERENCES,
        interests: ["food", "wine"],
        pace: "packed",
        budget: "€€",
        mode: "rental-car",
        lunch: true,
        dinner: true,
        mustSees: ["a", "b"],
      }),
    ).toBe(
      "Food, Wine · Packed · €€ · Rental car · Lunch + Dinner · 2 Must-Sees",
    );
  });
});

describe("headsUpText", () => {
  it("names the top Place and counts the rest for a weekday", () => {
    expect(
      headsUpText({
        kind: "weekday",
        date: "2026-11-08",
        names: ["Vatican Museums", "A", "B"],
      }),
    ).toBe("Sunday: Vatican Museums and 2 other places are closed.");
  });

  it("uses the singular for one Place", () => {
    expect(
      headsUpText({
        kind: "weekday",
        date: "2026-11-08",
        names: ["Vatican Museums"],
      }),
    ).toBe("Sunday: Vatican Museums is closed.");
    expect(
      headsUpText({ kind: "weekday", date: "2026-11-08", names: ["A", "B"] }),
    ).toBe("Sunday: A and 1 other place are closed.");
  });

  it("names two Places and counts the rest for the season", () => {
    expect(
      headsUpText({
        kind: "season",
        date: "2026-11-06",
        names: ["Lake Como", "Chianti", "C", "D"],
      }),
    ).toBe("November: Lake Como, Chianti and 2 more are out of season.");
    expect(
      headsUpText({ kind: "season", date: "2026-11-06", names: ["Chianti"] }),
    ).toBe("November: Chianti is out of season.");
    expect(
      headsUpText({ kind: "season", date: "2026-11-06", names: ["A", "B"] }),
    ).toBe("November: A and B are out of season.");
  });
});
