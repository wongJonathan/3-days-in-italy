import type { PlannedDay } from "../generator/generate-day.ts";
import type { Trip } from "./trip.ts";

/** The localStorage key the Trip is saved under. */
export const STORAGE_KEY = "3-days-in-italy:trip";

export type LoadedTrip = {
  trip: Trip;
  /** Stops dropped because their Place no longer exists in the data. */
  removedStops: number;
};

export const serializeTrip = (trip: Trip): string => JSON.stringify(trip);

/**
 * Reads a saved Trip. Returns null when nothing usable is saved (missing,
 * unreadable, or from another version), so the app simply starts fresh.
 * Stops whose Place has left the data are dropped and counted, so the UI
 * can say "2 Stops no longer exist and were removed."
 */
export const parseTrip = (
  json: string | null,
  placeIds: Set<string>,
): LoadedTrip | null => {
  if (json === null) return null;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!looksLikeTrip(data)) return null;

  let removedStops = 0;
  const keepKnown = (plan: PlannedDay | null, count: boolean) => {
    if (!plan) return plan;
    const stops = plan.stops.filter((s) => placeIds.has(s.placeId));
    if (count) removedStops += plan.stops.length - stops.length;
    return { ...plan, stops };
  };

  const trip: Trip = {
    ...data,
    prefs: {
      ...data.prefs,
      mustSees: data.prefs.mustSees.filter((id) => placeIds.has(id)),
    },
    days: data.days.map((day) => ({
      ...day,
      plan: keepKnown(day.plan, true),
      // The saved copy is a snapshot of the same Stops, so it isn't counted twice.
      saved: keepKnown(day.saved, false),
    })),
  };
  return { trip, removedStops };
};

/**
 * A light shape check, enough to reject other data or an old version.
 * It trusts the rest, because only this app writes the key.
 */
const looksLikeTrip = (data: unknown): data is Trip => {
  if (typeof data !== "object" || data === null) return false;
  const trip = data as Partial<Trip>;
  return (
    trip.version === 1 &&
    typeof trip.startDate === "string" &&
    Array.isArray(trip.days) &&
    trip.days.length === 3 &&
    Array.isArray(trip.prefs?.mustSees)
  );
};

/**
 * True when the browser will actually keep what we save. Private modes and
 * full quotas can throw on write, so it tries a real write.
 */
export const canUseStorage = (storage: Storage | undefined): boolean => {
  if (!storage) return false;
  try {
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
};
