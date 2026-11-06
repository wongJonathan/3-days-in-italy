import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "../../utils/preferences/preferences.ts";
import { DEFAULT_DAY_WINDOW } from "../../utils/schedule/schedule.ts";
import {
  canUseStorage,
  parseTrip,
  saveTrip,
  serializeTrip,
  STORAGE_KEY,
} from "../storage.ts";
import type { Trip } from "../trip.ts";

const stop = (placeId: string) => ({
  placeId,
  origin: "generated" as const,
  meal: null,
});

const TRIP: Trip = {
  version: 1,
  startDate: "2026-11-09",
  prefs: { ...DEFAULT_PREFERENCES, mustSees: ["a", "gone"] },
  startEmpty: false,
  openDay: 0,
  days: [
    {
      date: "2026-11-09",
      window: DEFAULT_DAY_WINDOW,
      dayArea: null,
      status: "finalized",
      plan: {
        date: "2026-11-09",
        baseCity: "Rome",
        chosenForYou: true,
        stops: [stop("a"), stop("gone"), stop("b")],
      },
      saved: {
        date: "2026-11-09",
        baseCity: "Rome",
        chosenForYou: true,
        stops: [stop("a"), stop("gone")],
      },
    },
    {
      date: "2026-11-10",
      window: DEFAULT_DAY_WINDOW,
      dayArea: "Florence",
      status: "draft",
      plan: null,
      saved: null,
    },
    {
      date: "2026-11-11",
      window: DEFAULT_DAY_WINDOW,
      dayArea: null,
      status: "draft",
      plan: null,
      saved: null,
    },
  ],
};

const ALL_IDS = new Set(["a", "b", "gone"]);

describe("serializeTrip / parseTrip", () => {
  it("restores the Trip exactly (spec: no refresh loses work)", () => {
    expect(parseTrip(serializeTrip(TRIP), ALL_IDS)).toEqual({
      trip: TRIP,
      removedStops: 0,
    });
  });

  it("returns null when nothing is saved, or the save is unreadable", () => {
    expect(parseTrip(null, ALL_IDS)).toBeNull();
    expect(parseTrip("not json{", ALL_IDS)).toBeNull();
    expect(parseTrip('"a string"', ALL_IDS)).toBeNull();
    expect(parseTrip("{}", ALL_IDS)).toBeNull();
  });

  it("returns null for a save from a different version", () => {
    const old = JSON.stringify({ ...TRIP, version: 0 });
    expect(parseTrip(old, ALL_IDS)).toBeNull();
  });

  it("drops Stops whose Place no longer exists, and says how many", () => {
    const loaded = parseTrip(serializeTrip(TRIP), new Set(["a", "b"]))!;
    expect(loaded.removedStops).toBe(1);
    expect(loaded.trip.days[0].plan?.stops.map((s) => s.placeId)).toEqual([
      "a",
      "b",
    ]);
    expect(loaded.trip.days[0].saved?.stops.map((s) => s.placeId)).toEqual([
      "a",
    ]);
    expect(loaded.trip.prefs.mustSees).toEqual(["a"]);
  });
});

const memoryStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
};

const fullStorage = (): Storage => ({
  ...memoryStorage(),
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
});

describe("canUseStorage", () => {
  it("is true for working storage", () => {
    expect(canUseStorage(memoryStorage())).toBe(true);
  });

  it("is false when there is no storage at all", () => {
    expect(canUseStorage(undefined)).toBe(false);
  });

  it("is false when writing throws (private mode, quota full)", () => {
    expect(canUseStorage(fullStorage())).toBe(false);
  });
});

describe("saveTrip", () => {
  it("writes the Trip and reports success", () => {
    const storage = memoryStorage();
    expect(saveTrip(storage, TRIP)).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBe(serializeTrip(TRIP));
  });

  it("clears the saved Trip when there is none (Start over)", () => {
    const storage = memoryStorage();
    saveTrip(storage, TRIP);
    expect(saveTrip(storage, null)).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("reports failure instead of throwing when the quota fills up later", () => {
    expect(saveTrip(fullStorage(), TRIP)).toBe(false);
  });
});
